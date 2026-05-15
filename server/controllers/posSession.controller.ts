import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { odooRequest } from "../odoo/odoo.client.js";

import userModel from "../models/user.model.js";
import CashierShiftLog, { ShiftState } from "../models/Cashiershiftlog.js";
import POSOrder from "../models/POSOrder.js";

async function resolveCashier(cashierId: string) {
  const user = await userModel.findById(cashierId);
  if (!user) throw new ErrorHandler("Cashier not found", 404);
  if (user.role !== "cashier")
    throw new ErrorHandler("User is not a cashier", 403);
  if (!user.odooPartnerId)
    throw new ErrorHandler(
      "Cashier has no linked Odoo partner (odooPartnerId missing)",
      422,
    );
  return user;
}

/** Fetch the single open Odoo pos.session (if any). */
async function fetchOpenOdooSession() {
  const sessions = await odooRequest(
    "pos.session",
    "search_read",
    [[["state", "=", "opened"]]],
    {
      fields: [
        "id",
        "name",
        "state",
        "config_id",
        "user_id",
        "start_at",
        "cash_register_balance_start",
      ],
      limit: 1,
    },
  );
  return sessions?.[0] ?? null;
}

/**
 * Compute accurate per-shift totals by aggregating the Orders collection.
 * Use this for reports and reconciliation; the denormalised counters on
 * CashierShiftLog are for fast dashboard reads only.
 */
async function computeShiftTotalsFromOrders(shiftId: string) {
  const result = await POSOrder.aggregate([
    { $match: { shiftId: shiftId, status: "paid" } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSales: { $sum: "$subtotal" },
      },
    },
  ]);
  return result[0] ?? { totalOrders: 0, totalSales: 0 };
}

// Payment method IDs — keep in sync with your Odoo instance
// or call GET /api/pos/payment-methods to discover them.
const PAYMENT_METHOD_IDS: Record<string, number> = {
  cash: 1,
  card: 2,
  wallet: 3,
};

// ─────────────────────────────────────────────────────────────────────────────
//  SESSION  ──  OPEN / CLOSE / GET ACTIVE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/pos/session/open
 * Body: { configId, cashierId }
 *
 * Opens an Odoo POS session for the shift and immediately creates the first
 * CashierShiftLog (state: "active") for the opening cashier.
 */
export const openSession = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { configId, cashierId } = req.body;

    if (!configId) return next(new ErrorHandler("configId is required", 400));
    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));

    const cashier = await resolveCashier(cashierId).catch((e) => next(e));
    if (!cashier) return;

    // Guard: no duplicate open session for this config
    const existing = await odooRequest(
      "pos.session",
      "search_read",
      [
        [
          ["state", "=", "opened"],
          ["config_id", "=", configId],
        ],
      ],
      { fields: ["id", "name"], limit: 1 },
    );

    if (existing?.length) {
      return next(
        new ErrorHandler(
          `A session is already open for this config: ${existing[0].name}`,
          409,
        ),
      );
    }

    // Create the Odoo session
    const sessionId = await odooRequest("pos.session", "create", [
      { config_id: configId },
    ]);

    if (!sessionId) {
      return next(new ErrorHandler("Failed to create session in Odoo", 500));
    }

   await odooRequest("pos.session", "action_pos_session_open", [sessionId]);
   const sessions = await odooRequest(
  "pos.session",
  "read",
  [[sessionId]],
  { fields: ["id", "name", "state", "config_id", "user_id", "start_at"] }
);
    const session = sessions?.[0] ?? { id: sessionId };

    // Create the opening cashier's shift log
    const shiftLog = await CashierShiftLog.create({
      odooSessionId: sessionId,
      cashierId: cashier._id,
      odooPartnerId: cashier.odooPartnerId,
      state: "active" as ShiftState,
      stateHistory: [
        { toState: "active", at: new Date(), reason: "Session opened" },
      ],
    });

    res.status(201).json({
      status: "success",
      message: "Session opened successfully",
      session,
      activeShift: shiftLog,
    });
  },
);

/**
 * POST /api/pos/session/close
 * Body: { sessionId }
 *
 * Closes the Odoo session.  Forces all non-closed CashierShiftLog records
 * to "closed" and returns a per-cashier summary using accurate aggregation
 * from the Orders collection (not the denormalised counters).
 */
export const closeSession = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { sessionId } = req.body;

    if (!sessionId) return next(new ErrorHandler("sessionId is required", 400));

    const sessions = await odooRequest(
      "pos.session",
      "search_read",
      [
        [
          ["id", "=", sessionId],
          ["state", "=", "opened"],
        ],
      ],
      { fields: ["id", "name", "state"], limit: 1 },
    );

    if (!sessions?.length) {
      return next(new ErrorHandler("Session not found or already closed", 404));
    }

    const now = new Date();

    // Close all non-closed shifts for this session
    await CashierShiftLog.updateMany(
      { odooSessionId: sessionId, state: { $ne: "closed" } },
      {
        $set: { endTime: now, state: "closed" },
        $push: {
          stateHistory: {
            toState: "closed",
            at: now,
            reason: "Session closed",
          },
        },
      },
    );

    // Tell Odoo to close the session
    await odooRequest("pos.session", "action_pos_session_closing_control", [
      [sessionId],
    ]);

    // Build per-cashier report using accurate aggregation, not cached counters
    const shiftLogs = await CashierShiftLog.find({ odooSessionId: sessionId })
      .populate("cashierId", "name email role")
      .lean();

    const cashierReport = await Promise.all(
      shiftLogs.map(async (log) => {
        const accurate = await computeShiftTotalsFromOrders(String(log._id));
        return {
          shiftId: log._id,
          cashier: log.cashierId, // populated
          odooPartnerId: log.odooPartnerId,
          state: log.state,
          startTime: log.startTime,
          endTime: log.endTime,
          totalOrders: accurate.totalOrders,
          totalSales: accurate.totalSales,
        };
      }),
    );

    res.status(200).json({
      status: "success",
      message: "Session closed successfully",
      sessionId,
      cashierReport,
    });
  },
);

/**
 * GET /api/pos/session/active
 *
 * Returns the open Odoo session + its stats + all active/paused shift logs.
 */
export const getActiveSession = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await fetchOpenOdooSession();

    let stats = null;
    let activeShifts: any[] = [];

    if (session) {
      const orders = await odooRequest(
        "pos.order",
        "search_read",
        [
          [
            ["session_id", "=", session.id],
            ["state", "=", "paid"],
          ],
        ],
        { fields: ["amount_total"], limit: 1000 },
      );

      stats = {
        orderCount: orders.length,
        totalRevenue: orders.reduce(
          (s: number, o: any) => s + (o.amount_total ?? 0),
          0,
        ),
      };

      // Active and paused shifts (both mean cashier hasn't left)
      activeShifts = await CashierShiftLog.find({
        odooSessionId: session.id,
        state: { $in: ["active", "paused"] },
      })
        .populate("cashierId", "name email role")
        .lean();
    }

    res.status(200).json({
      status: "success",
      session,
      stats,
      activeShifts,
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
//  CASHIER SHIFT LOG  ──  START / PAUSE / RESUME / END
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/pos/shift/start
 * Body: { cashierId }
 *
 * Creates a new CashierShiftLog (state: "active") for a cashier inside
 * the currently open Odoo session.
 * One active-or-paused shift per cashier per session is allowed.
 * The Odoo session is NEVER modified.
 */
export const startCashierShift = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { cashierId } = req.body;

    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));

    const cashier = await resolveCashier(cashierId).catch((e) => next(e));
    if (!cashier) return;

    const session = await fetchOpenOdooSession();
    if (!session)
      return next(new ErrorHandler("No open POS session found", 409));

    // Prevent duplicate active/paused shift for the same cashier in the same session
    const existingShift = await CashierShiftLog.findOne({
      odooSessionId: session.id,
      cashierId: cashier._id,
      state: { $in: ["active", "paused"] },
    });

    if (existingShift) {
      return next(
        new ErrorHandler(
          `This cashier already has an ${existingShift.state} shift in the current session`,
          409,
        ),
      );
    }

    const now = new Date();
    const shiftLog = await CashierShiftLog.create({
      odooSessionId: session.id,
      cashierId: cashier._id,
      odooPartnerId: cashier.odooPartnerId,
      state: "active" as ShiftState,
      stateHistory: [{ toState: "active", at: now, reason: "Shift started" }],
    });

    res.status(201).json({
      status: "success",
      message: "Cashier shift started",
      shift: shiftLog,
    });
  },
);

/**
 * POST /api/pos/shift/pause
 * Body: { cashierId, reason? }
 *
 * Pauses the active shift for a cashier.
 * Orders CANNOT be created while a shift is paused.
 */
export const pauseCashierShift = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { cashierId, reason } = req.body;

    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));

    const session = await fetchOpenOdooSession();
    if (!session)
      return next(new ErrorHandler("No open POS session found", 409));

    const shift = await CashierShiftLog.findOne({
      odooSessionId: session.id,
      cashierId,
      state: "active",
    });

    if (!shift) {
      return next(
        new ErrorHandler(
          "No active shift found for this cashier in the current session",
          404,
        ),
      );
    }

    const now = new Date();
    shift.state = "paused";
    shift.stateHistory.push({
      toState: "paused",
      at: now,
      reason: reason ?? "Paused by cashier",
    });
    await shift.save();

    res.status(200).json({
      status: "success",
      message: "Cashier shift paused",
      shift,
    });
  },
);

/**
 * POST /api/pos/shift/resume
 * Body: { cashierId, reason? }
 *
 * Resumes a paused shift.
 */
export const resumeCashierShift = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { cashierId, reason } = req.body;

    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));

    const session = await fetchOpenOdooSession();
    if (!session)
      return next(new ErrorHandler("No open POS session found", 409));

    const shift = await CashierShiftLog.findOne({
      odooSessionId: session.id,
      cashierId,
      state: "paused",
    });

    if (!shift) {
      return next(
        new ErrorHandler(
          "No paused shift found for this cashier in the current session",
          404,
        ),
      );
    }

    const now = new Date();
    shift.state = "active";
    shift.stateHistory.push({
      toState: "active",
      at: now,
      reason: reason ?? "Resumed by cashier",
    });
    await shift.save();

    res.status(200).json({
      status: "success",
      message: "Cashier shift resumed",
      shift,
    });
  },
);

/**
 * POST /api/pos/shift/end
 * Body: { cashierId }
 *
 * Closes the active or paused shift for a cashier.
 * Returns accurate totals by aggregating the Orders collection.
 */
export const endCashierShift = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { cashierId } = req.body;

    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));

    const session = await fetchOpenOdooSession();
    if (!session)
      return next(new ErrorHandler("No open POS session found", 409));

    const shift = await CashierShiftLog.findOne({
      odooSessionId: session.id,
      cashierId,
      state: { $in: ["active", "paused"] },
    });

    if (!shift) {
      return next(
        new ErrorHandler(
          "No active or paused shift found for this cashier in the current session",
          404,
        ),
      );
    }

    const now = new Date();
    shift.endTime = now;
    shift.state = "closed";
    shift.stateHistory.push({
      toState: "closed",
      at: now,
      reason: "Shift ended by cashier",
    });
    await shift.save();

    // Return accurate figures from the Orders collection
    const accurate = await computeShiftTotalsFromOrders(String(shift._id));

    res.status(200).json({
      status: "success",
      message: "Cashier shift ended",
      shift: {
        shiftId: shift._id,
        cashierId: shift.cashierId,
        odooPartnerId: shift.odooPartnerId,
        startTime: shift.startTime,
        endTime: shift.endTime,
        state: shift.state,
        stateHistory: shift.stateHistory,
        totalOrders: accurate.totalOrders,
        totalSales: accurate.totalSales,
      },
    });
  },
);

/**
 * GET /api/pos/shift/active
 *
 * Returns all active and paused cashier shifts for the open session.
 */
export const getActiveShifts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await fetchOpenOdooSession();
    if (!session)
      return next(new ErrorHandler("No open POS session found", 409));

    const shifts = await CashierShiftLog.find({
      odooSessionId: session.id,
      state: { $in: ["active", "paused"] },
    })
      .populate("cashierId", "name email role")
      .lean();

    res.status(200).json({
      status: "success",
      count: shifts.length,
      shifts,
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
//  ORDERS
// ─────────────────────────────────────────────────────────────────────────────

interface CartItem {
  productId: number;
  qty: number;
  price: number;
  discount?: number;
}

interface PaymentLine {
  method: "cash" | "card" | "wallet";
  amount: number;
}

/**
 * POST /api/pos/order
 * Body: { cart, paymentLines, cashierId, customerId?, note? }
 *
 * Creates the order in Odoo, then saves a mirrored POSOrder in MongoDB
 * linked to the exact CashierShiftLog (shiftId) and stores the returned
 * Odoo order id (odooOrderId) for cross-system traceability.
 *
 * Counter update strategy:
 *  • $inc on CashierShiftLog is kept as an optimistic fast-path for dashboards.
 *  • For guaranteed-accurate totals, callers should use computeShiftTotalsFromOrders.
 *  • If the MongoDB order write fails after Odoo success we log the discrepancy
 *    but still return 201 so the cashier isn't blocked (Odoo is the financial
 *    ledger; MongoDB is the analytics layer).
 */
export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      cart,
      paymentLines,
      cashierId,
      customerId,
      note,
    }: {
      cart: CartItem[];
      paymentLines: PaymentLine[];
      cashierId: string;
      customerId?: number;
      note?: string;
    } = req.body;

    // ── Validation ────────────────────────────────────────────────────
    if (!cart?.length) return next(new ErrorHandler("Cart is empty", 400));
    if (!paymentLines?.length)
      return next(new ErrorHandler("Payment method is required", 400));
    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));

    // ── Resolve cashier (MongoDB is source of truth) ──────────────────
    const cashier = await resolveCashier(cashierId).catch((e) => next(e));
    if (!cashier) return;

    // ── Verify cashier has an ACTIVE (not paused) shift ───────────────
    const session = await fetchOpenOdooSession();
    if (!session)
      return next(new ErrorHandler("No open POS session found", 409));

    const shift = await CashierShiftLog.findOne({
      odooSessionId: session.id,
      cashierId: cashier._id,
      state: "active", // paused cashiers cannot create orders
    });

    if (!shift) {
      return next(
        new ErrorHandler(
          "Cashier does not have an active shift. Start or resume a shift first.",
          409,
        ),
      );
    }

    // ── Calculate amounts ─────────────────────────────────────────────
    const amountPaid = paymentLines.reduce(
      (s: number, p: PaymentLine) => s + p.amount,
      0,
    );

    const subtotal = cart.reduce(
      (s: number, item: CartItem) =>
        s + item.price * item.qty * (1 - (item.discount ?? 0) / 100),
      0,
    );

    const amountReturn = Math.max(0, amountPaid - subtotal);

    // ── Build Odoo order lines ────────────────────────────────────────
    const orderLines = cart.map((item: CartItem) => [
      0,
      0,
      {
        product_id: item.productId,
        qty: item.qty,
        price_unit: item.price,
        discount: item.discount ?? 0,
        price_subtotal:
          item.price * item.qty * (1 - (item.discount ?? 0) / 100),
        price_subtotal_incl:
          item.price * item.qty * (1 - (item.discount ?? 0) / 100),
      },
    ]);

    // ── Create order in Odoo ──────────────────────────────────────────
    // user_id links the Odoo order back to the cashier for traceability.
    // pos_reference embeds the MongoDB shiftId so debugging across
    // systems is instant without a lookup.
    const odooRef = `SHIFT-${shift._id}`;

    const orderId = await odooRequest("pos.order", "create", [
      {
        session_id: session.id,
        partner_id: customerId ?? false,
        user_id: cashier.odooPartnerId, // Odoo-side cashier mapping
        pos_reference: odooRef, // traceability back to MongoDB shift
        note: note ?? "",
        lines: orderLines,
        amount_paid: amountPaid,
        amount_total: subtotal,
        amount_tax: 0,
        amount_return: amountReturn,
      },
    ]);

    if (!orderId) {
      return next(new ErrorHandler("Failed to create order in Odoo", 500));
    }

    // ── Register payments ─────────────────────────────────────────────
    for (const p of paymentLines) {
      const methodId = PAYMENT_METHOD_IDS[p.method];
      if (!methodId) {
        return next(
          new ErrorHandler(`Unknown payment method: ${p.method}`, 400),
        );
      }

      await odooRequest("pos.payment", "create", [
        {
          pos_order_id: orderId,
          amount: p.amount,
          payment_method_id: methodId,
        },
      ]);
    }

    // ── Confirm payment in Odoo ───────────────────────────────────────
    await odooRequest("pos.order", "action_pos_order_paid", [[orderId]]);

    // ── Mirror order in MongoDB ───────────────────────────────────────
    // shiftId links the order directly to the exact CashierShiftLog.
    // odooOrderId allows cross-system reconciliation without a search.
    let mongoOrder: any = null;
    try {
      const receiptNumber = `RCP-${Date.now()}-${orderId}`;
      mongoOrder = await POSOrder.create({
        sessionId: session.id, // Note: Odoo numeric id; cast as needed for your schema
        shiftId: shift._id, // ← direct shift reference
        cashierId: cashier._id,
        openedBy: cashier._id, // adjust if opened-by is tracked separately
        odooOrderId: orderId, // ← Odoo cross-reference
        customerId: undefined,
        cart: cart.map((item) => ({
          productId: item.productId,
          name: `Product#${item.productId}`, // replace with real name if available
          price: item.price,
          qty: item.qty,
          discount: item.discount ?? 0,
        })),
        paymentLines,
        subtotal,
        taxAmount: 0,
        discountAmount: 0,
        total: subtotal,
        amountPaid,
        change: amountReturn,
        note: note ?? "",
        status: "paid",
        receiptNumber,
      });
    } catch (mongoErr) {
      // MongoDB write failure MUST NOT roll back the Odoo order (Odoo is the
      // financial ledger). Log for later reconciliation and continue.
      console.error(
        `[POS] MongoDB order mirror failed for Odoo orderId=${orderId}, shiftId=${shift._id}:`,
        mongoErr,
      );
    }

    // ── Increment cached counters (optimistic fast-path) ─────────────
    // These are eventually-consistent estimates for dashboards.
    // Accurate totals are always computed from the Orders collection.
    await CashierShiftLog.findByIdAndUpdate(shift._id, {
      $inc: {
        totalOrders: 1,
        totalSales: subtotal,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Order created successfully",
      orderId, // Odoo order id
      mongoOrderId: mongoOrder?._id ?? null,
      cashierShiftId: shift._id,
    });
  },
);

/**
 * GET /api/pos/orders/:sessionId
 *
 * Returns all Odoo orders for a session.
 */
export const getSessionOrders = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const sessionId = Number(req.params.sessionId);

    if (!sessionId) return next(new ErrorHandler("sessionId is required", 400));

    const orders = await odooRequest(
      "pos.order",
      "search_read",
      [[["session_id", "=", sessionId]]],
      {
        fields: [
          "id",
          "name",
          "date_order",
          "partner_id",
          "user_id",
          "pos_reference",
          "amount_total",
          "amount_paid",
          "amount_return",
          "state",
          "lines",
          "payment_ids",
        ],
        order: "date_order desc",
      },
    );

    res.status(200).json({
      status: "success",
      count: orders.length,
      orders,
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
//  SESSION REPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/pos/session/:sessionId/report
 *
 * Returns a per-cashier performance report for any session (open or closed).
 *
 * Totals are computed by aggregating the Orders collection (accurate) and
 * also returned alongside the cached counters so callers can detect drift.
 */
export const getSessionReport = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const sessionId = Number(req.params.sessionId);

    if (!sessionId) return next(new ErrorHandler("sessionId is required", 400));

    const shiftLogs = await CashierShiftLog.find({ odooSessionId: sessionId })
      .populate("cashierId", "name email role")
      .lean();

    // For each shift, compute accurate totals from Orders collection
    const cashierSummaries = await Promise.all(
      shiftLogs.map(async (log) => {
        const accurate = await computeShiftTotalsFromOrders(String(log._id));
        return {
          shiftId: log._id,
          cashier: log.cashierId, // populated
          odooPartnerId: log.odooPartnerId,
          state: log.state,
          startTime: log.startTime,
          endTime: log.endTime ?? null,
          stateHistory: log.stateHistory,
          // Accurate figures (aggregated from Orders)
          totalOrders: accurate.totalOrders,
          totalSales: accurate.totalSales,
          // Cached counters (fast-path, may diverge on failed writes)
          cachedTotalOrders: log.totalOrders,
          cachedTotalSales: log.totalSales,
        };
      }),
    );

    const totalOrders = cashierSummaries.reduce((s, l) => s + l.totalOrders, 0);
    const totalSales = cashierSummaries.reduce((s, l) => s + l.totalSales, 0);

    res.status(200).json({
      status: "success",
      odooSessionId: sessionId,
      summary: {
        totalOrders,
        totalSales,
        cashierCount: shiftLogs.length,
      },
      cashierBreakdown: cashierSummaries,
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
//  PRODUCT / CUSTOMER / PAYMENT METHOD / CONFIG  (pure Odoo pass-through)
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/pos/products */
export const getProducts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const products = await odooRequest(
      "product.product",
      "search_read",
      [
        [
          ["available_in_pos", "=", true],
          ["active", "=", true],
        ],
      ],
      {
        fields: [
          "id",
          "name",
          "list_price",
          "barcode",
          "categ_id",
          "uom_id",
          "image_128",
        ],
        limit: 500,
      },
    );

    res.status(200).json({
      status: "success",
      count: products.length,
      products,
    });
  },
);

/** GET /api/pos/customers?search=... */
export const getCustomers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const search = (req.query.search as string) ?? "";
    const domain: any[] = [["customer_rank", ">", 0]];
    if (search) domain.push(["name", "ilike", search]);

    const customers = await odooRequest(
      "res.partner",
      "search_read",
      [domain],
      {
        fields: ["id", "name", "phone", "email", "street"],
        limit: 100,
      },
    );

    res.status(200).json({
      status: "success",
      count: customers.length,
      customers,
    });
  },
);

/** POST /api/pos/customers */
export const createCustomer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, phone, email } = req.body;
    if (!name) return next(new ErrorHandler("Customer name is required", 400));

    const customerId = await odooRequest("res.partner", "create", [
      {
        name,
        phone: phone ?? false,
        email: email ?? false,
        customer_rank: 1,
      },
    ]);

    res.status(201).json({
      status: "success",
      message: "Customer created successfully",
      customerId,
    });
  },
);

/** GET /api/pos/payment-methods */
export const getPaymentMethods = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const methods = await odooRequest(
      "pos.payment.method",
      "search_read",
      [[["active", "=", true]]],
      { fields: ["id", "name", "is_cash_count"] },
    );

    res.status(200).json({ status: "success", methods });
  },
);

/** GET /api/pos/configs */
export const getPOSConfigs = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const configs = await odooRequest(
      "pos.config",
      "search_read",
      [[["active", "=", true]]],
      { fields: ["id", "name", "currency_id"] },
    );

    res.status(200).json({ status: "success", configs });
  },
);
