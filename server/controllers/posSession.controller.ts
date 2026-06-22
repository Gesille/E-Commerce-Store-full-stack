import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { odooRequest } from "../odoo/odoo.client.js";

import userModel from "../models/user.model.js";
import CashierShiftLog, { ShiftState } from "../models/Cashiershiftlog.js";
import POSOrder from "../models/POSOrder.js";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TAX_RATE = 0.17;

const PAYMENT_METHOD_IDS: Record<string, number> = {
  cash: 1,
  card: 2,
  bank: 3,
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CartItem {
  productId: number;
  qty: number;
  price: number;
  discount?: number;
  note?: string;
  name?: string;
}

interface PaymentLine {
  method: "cash" | "card" | "bank";
  amount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function resolveCashier(cashierId: string) {
  const user = await userModel.findById(cashierId);
  if (!user) throw new ErrorHandler("Cashier not found", 404);
  if (user.role !== "cashier" && user.role !== "admin")
    throw new ErrorHandler("User is not a cashier", 403);
  if (!user.odooPartnerId)
    throw new ErrorHandler(
      "Cashier has no linked Odoo partner (odooPartnerId missing)",
      422,
    );
  return user;
}

async function fetchOpenOdooSession(configId: number) {
  const sessions = await odooRequest(
    "pos.session",
    "search_read",
    [
      [
        ["state", "=", "opened"],
        ["config_id", "=", configId],
      ],
    ],
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

async function populateShift(shiftId: any) {
  return CashierShiftLog.findById(shiftId)
    .populate("cashierId", "name email role")
    .lean();
}

export const openSession = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { configId, cashierId } = req.body;

    if (!configId) return next(new ErrorHandler("configId is required", 400));
    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));

    const cashier = await resolveCashier(cashierId).catch((e) => next(e));
    if (!cashier) return;

    const existing = await odooRequest(
      "pos.session",
      "search_read",
      [
        [
          ["state", "in", ["opened", "opening_control"]],
          ["config_id", "=", configId],
        ],
      ],
      { fields: ["id", "name", "state"], limit: 1 },
    );

    if (existing?.length) {
      const existingSession = existing[0];

      if (existingSession.state === "opening_control") {
        return res.status(200).json({
          success: true,
          requiresOpeningBalance: true,
          sessionId: existingSession.id,
          state: existingSession.state,
          message:
            "An existing session is awaiting opening balance confirmation",
        });
      }

      const existingShift = await CashierShiftLog.findOne({
        odooSessionId: existingSession.id,
        cashierId: cashier._id,
        state: { $in: ["active", "paused"] },
      });

      if (!existingShift) {
        const newShift = await CashierShiftLog.create({
          odooSessionId: existingSession.id,
          cashierId: cashier._id,
          odooPartnerId: cashier.odooPartnerId,
          state: "active" as ShiftState,
          stateHistory: [
            {
              toState: "active",
              at: new Date(),
              reason: "Joined existing open session",
            },
          ],
        });
        const populated = await populateShift(newShift._id);
        return res.status(200).json({
          success: true,
          requiresOpeningBalance: false,
          session: existingSession,
          activeShift: populated,
          message: "Joined existing open session",
        });
      }

      const populatedExisting = await populateShift(existingShift._id);
      return res.status(200).json({
        success: true,
        requiresOpeningBalance: false,
        session: existingSession,
        activeShift: populatedExisting,
        message: "Resumed existing session and shift",
      });
    }

    const sessionId = await odooRequest("pos.session", "create", [
      { config_id: configId },
    ]);

    if (!sessionId) {
      return next(new ErrorHandler("Failed to create session in Odoo", 500));
    }

    const sessionData = await odooRequest(
      "pos.session",
      "read",
      [[sessionId]],
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
      },
    );

    const session = sessionData?.[0];

    if (!session) {
      return next(
        new ErrorHandler("Session was created but could not be retrieved", 500),
      );
    }

    if (session.state === "opening_control") {
      return res.status(200).json({
        success: true,
        requiresOpeningBalance: true,
        sessionId: session.id,
        state: session.state,
      });
    }

    const shiftLog = await CashierShiftLog.create({
      odooSessionId: sessionId,
      cashierId: cashier._id,
      odooPartnerId: cashier.odooPartnerId,
      state: "active" as ShiftState,
      stateHistory: [
        { toState: "active", at: new Date(), reason: "Session opened" },
      ],
    });

    const populated = await populateShift(shiftLog._id);

    res.status(201).json({
      success: true,
      requiresOpeningBalance: false,
      session,
      activeShift: populated,
    });
  },
);

export const confirmOpeningBalance = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { sessionId, cashierId, openingBalance = 0, configId } = req.body;

    if (!sessionId) return next(new ErrorHandler("sessionId is required", 400));
    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));
    if (!configId) return next(new ErrorHandler("configId is required", 400));

    const cashier = await resolveCashier(cashierId).catch((e) => next(e));
    if (!cashier) return;

    let currentSessions: any[] = [];

    try {
      currentSessions = await odooRequest(
        "pos.session",
        "read",
        [[sessionId]],
        {
          fields: [
            "id",
            "name",
            "state",
            "config_id",
            "cash_register_balance_start",
          ],
        },
      );
      console.log(
        "[POS] FULL SESSION:",
        JSON.stringify(currentSessions, null, 2),
      );
    } catch (err) {
      console.error("[POS] Failed to read session:", err);
      return next(
        new ErrorHandler("Failed to read POS session from Odoo", 500),
      );
    }

    const current = currentSessions?.[0];

    console.log("[POS] SESSION:", current);

    if (!current) return next(new ErrorHandler("Session not found", 404));

    // ── Already opened ───────────────────────────
    if (current.state === "opened") {
      const existingShift = await CashierShiftLog.findOne({
        odooSessionId: sessionId,
        cashierId: cashier._id,
        state: { $in: ["active", "paused"] },
      });

      if (!existingShift) {
        await CashierShiftLog.create({
          odooSessionId: sessionId,
          cashierId: cashier._id,
          odooPartnerId: cashier.odooPartnerId,
          state: "active" as ShiftState,
          stateHistory: [
            {
              toState: "active",
              at: new Date(),
              reason: "Session already opened",
            },
          ],
        });
      }

      const session = await fetchOpenOdooSession(configId);
      const shift = await CashierShiftLog.findOne({
        odooSessionId: sessionId,
        cashierId: cashier._id,
      })
        .populate("cashierId", "name email role")
        .lean();

      return res.status(200).json({
        success: true,
        message: "Session already opened",
        session,
        activeShift: shift,
      });
    }

    if (current.state !== "opening_control") {
      return next(
        new ErrorHandler(`Invalid session state: ${current.state}`, 409),
      );
    }

    // ── Write opening balance ────────────────────
    try {
      await odooRequest("pos.session", "write", [
        [sessionId],
        { cash_register_balance_start: Number(openingBalance) || 0 },
      ]);
      console.log("[POS] Opening balance written:", openingBalance);
    } catch (err) {
      console.error("[POS] Failed writing opening balance:", err);
      return next(new ErrorHandler("Failed to write opening balance", 500));
    }

    // ── Open session ─────────────────────────────
    try {
      const result = await odooRequest(
        "pos.session",
        "action_pos_session_open",
        [[sessionId]],
      );
      console.log("[POS] OPEN RESULT:", result);
    } catch (err: any) {
      console.error("[POS] action_pos_session_open ERROR:", err);
      return next(
        new ErrorHandler(err?.message || "Failed to open POS session", 500),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // ── Verify ───────────────────────────────────
    const verify = await odooRequest("pos.session", "read", [[sessionId]], {
      fields: ["id", "name", "state", "cash_register_balance_start"],
    });

    console.log("[POS] VERIFY:", verify);

    const session = verify?.[0];

    // ── Force open if Odoo bugs ──────────────────
    if (session?.state !== "opened") {
      console.log("[POS] Forcing session state to opened...");
      await odooRequest("pos.session", "write", [
        [sessionId],
        { state: "opened" },
      ]);
    }

    // ── Final check ──────────────────────────────
    const finalVerify = await odooRequest(
      "pos.session",
      "read",
      [[sessionId]],
      { fields: ["id", "name", "state", "cash_register_balance_start"] },
    );

    const finalSession = finalVerify?.[0];

    console.log("[POS] FINAL SESSION:", finalSession);

    if (!finalSession || finalSession.state !== "opened") {
      return next(
        new ErrorHandler(
          `Session failed to open. Current state: ${finalSession?.state}`,
          500,
        ),
      );
    }

    const shiftLog = await CashierShiftLog.create({
      odooSessionId: sessionId,
      cashierId: cashier._id,
      odooPartnerId: cashier.odooPartnerId,
      state: "active" as ShiftState,
      stateHistory: [
        {
          toState: "active",
          at: new Date(),
          reason: `Session opened with opening balance ${openingBalance}`,
        },
      ],
    });

    const populated = await populateShift(shiftLog._id);

    return res.status(201).json({
      success: true,
      message: "Opening balance confirmed. POS session is now open.",
      session: finalSession,
      activeShift: populated,
      openingBalance: Number(openingBalance) || 0,
    });
  },
);

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
          [
            "state",
            "in",
            ["opening_control", "opened", "closing_control", "closed"],
          ],
        ],
      ],
      { fields: ["id", "name", "state"], limit: 1 },
    );

    if (!sessions?.length) {
      return next(new ErrorHandler("Session not found in Odoo", 404));
    }

    const session = sessions[0];

    // ── Stuck in opening_control — never really opened ───────────────────────
    if (session.state === "opening_control") {
      await CashierShiftLog.updateMany(
        { odooSessionId: sessionId, state: { $ne: "closed" } },
        {
          $set: { endTime: new Date(), state: "closed" },
          $push: {
            stateHistory: {
              toState: "closed",
              at: new Date(),
              reason: "Session closed before opening balance was confirmed",
            },
          },
        },
      );

      try {
        await odooRequest("pos.session", "unlink", [[sessionId]]);
      } catch (_) {
        // Odoo may reject unlink on a non-new session — that's fine
      }

      return res.status(200).json({
        status: "success",
        message:
          "Session was in opening_control and has been abandoned. No orders were taken.",
        sessionId,
        cashierReport: [],
      });
    }

    // ── Already closed ───────────────────────────────────────────────────────
    if (session.state === "closed") {
      await CashierShiftLog.updateMany(
        { odooSessionId: sessionId, state: { $ne: "closed" } },
        {
          $set: { endTime: new Date(), state: "closed" },
          $push: {
            stateHistory: {
              toState: "closed",
              at: new Date(),
              reason: "Session already closed in Odoo",
            },
          },
        },
      );

      return res.status(200).json({
        status: "success",
        message: "Session was already closed",
        sessionId,
        cashierReport: [],
      });
    }

    // ── Close active session ─────────────────────────────────────────────────
    const now = new Date();

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

    await odooRequest("pos.session", "action_pos_session_closing_control", [
      [sessionId],
    ]);

    const shiftLogs = await CashierShiftLog.find({ odooSessionId: sessionId })
      .populate("cashierId", "name email role")
      .lean();

    const cashierReport = await Promise.all(
      shiftLogs.map(async (log) => {
        const accurate = await computeShiftTotalsFromOrders(String(log._id));
        return {
          shiftId: log._id,
          cashier: log.cashierId,
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

export const getActiveSession = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const configId = Number(req.query.configId);

    const session = await fetchOpenOdooSession(configId);

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

      activeShifts = await CashierShiftLog.find({
        odooSessionId: session.id,
        state: { $in: ["active", "paused"] },
      })
        .populate("cashierId", "name email role")
        .lean();
    }

    res.status(200).json({ status: "success", session, stats, activeShifts });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Shift Controllers
// ─────────────────────────────────────────────────────────────────────────────

export const startCashierShift = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { cashierId, configId } = req.body;

    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));

    const cashier = await resolveCashier(cashierId).catch((e) => next(e));
    if (!cashier) return;

    const session = await fetchOpenOdooSession(configId);
    if (!session)
      return next(new ErrorHandler("No open POS session found", 409));

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

    const shiftLog = await CashierShiftLog.create({
      odooSessionId: session.id,
      cashierId: cashier._id,
      odooPartnerId: cashier.odooPartnerId,
      state: "active" as ShiftState,
      stateHistory: [
        { toState: "active", at: new Date(), reason: "Shift started" },
      ],
    });

    const populated = await populateShift(shiftLog._id);

    res.status(201).json({
      status: "success",
      message: "Cashier shift started",
      shift: populated,
    });
  },
);

export const pauseCashierShift = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { cashierId, reason, configId } = req.body;

    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));

    const session = await fetchOpenOdooSession(configId);
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

    shift.state = "paused";
    shift.stateHistory.push({
      toState: "paused",
      at: new Date(),
      reason: reason ?? "Paused by cashier",
    });
    await shift.save();

    res
      .status(200)
      .json({ status: "success", message: "Cashier shift paused", shift });
  },
);

export const resumeCashierShift = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { cashierId, reason, configId } = req.body;

    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));

    const session = await fetchOpenOdooSession(configId);
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

    shift.state = "active";
    shift.stateHistory.push({
      toState: "active",
      at: new Date(),
      reason: reason ?? "Resumed by cashier",
    });
    await shift.save();

    res
      .status(200)
      .json({ status: "success", message: "Cashier shift resumed", shift });
  },
);

export const endCashierShift = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { cashierId, configId } = req.body;

    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));

    const session = await fetchOpenOdooSession(configId);
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

export const getActiveShifts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const configId = Number(req.query.configId);

    const session = await fetchOpenOdooSession(configId);
    if (!session)
      return next(new ErrorHandler("No open POS session found", 409));

    const shifts = await CashierShiftLog.find({
      odooSessionId: session.id,
      state: { $in: ["active", "paused"] },
    })
      .populate("cashierId", "name email role")
      .lean();

    res.status(200).json({ status: "success", count: shifts.length, shifts });
  },
);

export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      cart,
      paymentLines,
      cashierId,
      customerId,
      note,
      configId,
    }: {
      cart: CartItem[];
      paymentLines: PaymentLine[];
      cashierId: string;
      customerId?: number;
      note?: string;
      configId: number;
    } = req.body;

    // ─── VALIDATION ───────────────────────────────────────────────

    if (!cart?.length) {
      return next(new ErrorHandler("Cart is empty", 400));
    }

    if (!paymentLines?.length) {
      return next(new ErrorHandler("Payment method is required", 400));
    }

    if (!cashierId) {
      return next(new ErrorHandler("cashierId is required", 400));
    }

    if (!configId) {
      return next(new ErrorHandler("configId is required", 400));
    }

    // ─── CASHIER ──────────────────────────────────────────────────

    const cashier = await resolveCashier(cashierId).catch((e) => next(e));
    if (!cashier) return;

    // ─── SESSION ──────────────────────────────────────────────────

    const session = await fetchOpenOdooSession(configId);

    if (!session) {
      return next(new ErrorHandler("No open POS session found", 409));
    }

    // ─── SHIFT ────────────────────────────────────────────────────

    const shift = await CashierShiftLog.findOne({
      odooSessionId: session.id,
      cashierId: cashier._id,
      state: "active",
    });

    if (!shift) {
      return next(
        new ErrorHandler("Cashier does not have an active shift.", 409),
      );
    }

    // ─── POS CONFIG ───────────────────────────────────────────────

    const posConfig = await odooRequest(
      "pos.config",
      "search_read",
      [[["id", "=", configId]]],
      { fields: ["picking_type_id"], limit: 1 },
    );

    const pickingTypeId = posConfig?.[0]?.picking_type_id?.[0];

    if (!pickingTypeId) {
      return next(new ErrorHandler("POS picking type not configured", 500));
    }

    // ─── PICKING TYPE ─────────────────────────────────────────────

    const pickingType = await odooRequest(
      "stock.picking.type",
      "search_read",
      [[["id", "=", pickingTypeId]]],
      {
        fields: ["default_location_src_id", "default_location_dest_id"],
        limit: 1,
      },
    );

    const sourceLocationId = pickingType?.[0]?.default_location_src_id?.[0];
    const destLocationId = pickingType?.[0]?.default_location_dest_id?.[0];

    if (!sourceLocationId || !destLocationId) {
      return next(new ErrorHandler("Stock locations missing", 500));
    }

    // ─── RESOLVE PRODUCTS + STOCK CHECK ───────────────────────────

    const resolvedCart: any[] = [];

    for (const item of cart) {
      const product = await odooRequest(
        "product.product",
        "search_read",
        [[["product_tmpl_id", "=", Number(item.productId)]]],
        { fields: ["id", "name", "uom_id", "qty_available"], limit: 1 },
      );

      if (!product.length) {
        return next(
          new ErrorHandler(`Product ${item.productId} not found`, 400),
        );
      }

      const realProduct = product[0];
      const availableQty = Math.max(0, Number(realProduct.qty_available) || 0);

      console.log(
        "[STOCK CHECK]",
        realProduct.name,
        "| AVAILABLE:",
        availableQty,
        "| REQUESTED:",
        item.qty,
      );

      if (availableQty <= 0) {
        return next(
          new ErrorHandler(`"${realProduct.name}" is out of stock`, 400),
        );
      }

      if (availableQty < item.qty) {
        return next(
          new ErrorHandler(
            `"${realProduct.name}" only has ${availableQty} unit(s) left in stock`,
            400,
          ),
        );
      }

      resolvedCart.push({
        ...item,
        realProductId: realProduct.id,
        realProductName: realProduct.name,
        uomId: realProduct.uom_id?.[0],
      });
    }

    // ─── TOTALS ───────────────────────────────────────────────────

    let subtotal = 0;
    let totalTaxAmount = 0;

    const orderLines = resolvedCart.map((item) => {
      const lineSubtotal =
        item.price * item.qty * (1 - (item.discount || 0) / 100);

      const lineTax = Math.round(lineSubtotal * TAX_RATE * 100) / 100;

      subtotal += lineSubtotal;
      totalTaxAmount += lineTax;

      return [
        0,
        0,
        {
          product_id: item.realProductId,
          qty: item.qty,
          price_unit: item.price,
          discount: item.discount || 0,
          tax_ids: [[6, 0, []]],
          price_subtotal: lineSubtotal,
          price_subtotal_incl: lineSubtotal + lineTax,
        },
      ];
    });

    const amountTotal = Math.round((subtotal + totalTaxAmount) * 100) / 100;
    const amountPaid = paymentLines.reduce((sum, p) => sum + p.amount, 0);
    const amountReturn = Math.max(
      0,
      Math.round((amountPaid - amountTotal) * 100) / 100,
    );

    if (amountPaid < amountTotal) {
      return next(new ErrorHandler("Order not fully paid", 400));
    }

    // ─── PAYMENTS ─────────────────────────────────────────────────

    const payment_ids = paymentLines.map((p) => {
      const methodId = PAYMENT_METHOD_IDS[p.method];
      return [0, 0, { amount: p.amount, payment_method_id: methodId }];
    });

    // ─── CREATE ORDER ─────────────────────────────────────────────

    const odooRef = `POS-${Date.now()}`;
    let orderId: number;

    try {
      orderId = await odooRequest("pos.order", "create", [
        {
          session_id: session.id,
          partner_id: customerId || false,
          pos_reference: odooRef,
          name: odooRef,
          lines: orderLines,
          payment_ids: payment_ids,
          amount_paid: amountPaid,
          amount_total: amountTotal,
          amount_tax: totalTaxAmount,
          amount_return: amountReturn,
        },
      ]);

      console.log("[POS] ORDER CREATED:", orderId);
    } catch (err: any) {
      console.error(err);
      return next(
        new ErrorHandler(err?.message || "Failed to create POS order", 500),
      );
    }

    // ─── MARK PAID (non-fatal) ────────────────────────────────────

    try {
      await odooRequest("pos.order", "action_pos_order_paid", [[orderId]]);
      console.log("[POS] ORDER MARKED PAID");
    } catch (err: any) {
      console.error("[POS PAYMENT ERROR]", err?.message);
    }

    // ─── FORCE STOCK DECREASE ─────────────────────────────────────

    try {
      const pickingId = await odooRequest("stock.picking", "create", [
        {
          picking_type_id: pickingTypeId,
          location_id: sourceLocationId,
          location_dest_id: destLocationId,
          origin: odooRef,
        },
      ]);

      console.log("[PICKING CREATED]", pickingId);

      for (const item of resolvedCart) {
        const moveId = await odooRequest("stock.move", "create", [
          {
            description_picking: item.realProductName,
            product_id: item.realProductId,
            product_uom_qty: item.qty,

            location_id: sourceLocationId,
            location_dest_id: destLocationId,
            picking_id: pickingId,
          },
        ]);

        console.log("[MOVE CREATED]", moveId);

        await odooRequest("stock.move.line", "create", [
          {
            move_id: moveId,
            product_id: item.realProductId,

            qty_done: item.qty,
            location_id: sourceLocationId,
            location_dest_id: destLocationId,
            picking_id: pickingId,
          },
        ]);

        console.log("[MOVE LINE CREATED]", item.qty);
      }

      await odooRequest("stock.picking", "action_confirm", [[pickingId]]);
      await odooRequest("stock.picking", "button_validate", [[pickingId]]);

      console.log("[STOCK UPDATED SUCCESSFULLY]");
    } catch (err: any) {
      // ✅ Full error logging — catches Odoo XML-RPC faults
      console.error("[STOCK UPDATE ERROR] message:", err?.message);
      console.error("[STOCK UPDATE ERROR] faultCode:", err?.faultCode);
      console.error("[STOCK UPDATE ERROR] faultString:", err?.faultString);
      console.error("[STOCK UPDATE ERROR] full:", err);
      // Non-fatal — order is already created
    }

    // ─── UPDATE SHIFT ─────────────────────────────────────────────

    await CashierShiftLog.findByIdAndUpdate(shift._id, {
      $inc: {
        totalOrders: 1,
        totalSales: amountTotal,
      },
    });

    // ─── RESPONSE ─────────────────────────────────────────────────

    res.status(201).json({
      success: true,
      message: "Order created successfully and stock updated",
      orderId,
    });
  },
);

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

    res.status(200).json({ status: "success", count: orders.length, orders });
  },
);

export const getSessionReport = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const sessionId = Number(req.params.sessionId);
    if (!sessionId) return next(new ErrorHandler("sessionId is required", 400));

    const shiftLogs = await CashierShiftLog.find({ odooSessionId: sessionId })
      .populate("cashierId", "name email role")
      .lean();

    const cashierSummaries = await Promise.all(
      shiftLogs.map(async (log) => {
        const accurate = await computeShiftTotalsFromOrders(String(log._id));
        return {
          shiftId: log._id,
          cashier: log.cashierId,
          odooPartnerId: log.odooPartnerId,
          state: log.state,
          startTime: log.startTime,
          endTime: log.endTime ?? null,
          stateHistory: log.stateHistory,
          totalOrders: accurate.totalOrders,
          totalSales: accurate.totalSales,
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
      summary: { totalOrders, totalSales, cashierCount: shiftLogs.length },
      cashierBreakdown: cashierSummaries,
    });
  },
);

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
    res
      .status(200)
      .json({ status: "success", count: products.length, products });
  },
);

export const getCustomers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const search = (req.query.search as string) ?? "";
    const domain: any[] = [["customer_rank", ">", 0]];
    if (search) domain.push(["name", "ilike", search]);

    const customers = await odooRequest(
      "res.partner",
      "search_read",
       [[["id", "=", 21]]],
      {
        fields: [
          "id", "name", "phone", "email",
          "street", "city", "country_id",
          "commercial_company_name", 
          "parent_id",               
          "is_company",
        ],
        limit: 100,
      },
    );

    const formatted = customers.map((c: any) => ({
      id: c.id,
      name: c.name,
      phone: c.phone || undefined,
      email: c.email || undefined,
      street: c.street || undefined,
      city: c.city || undefined,
      country: c.country_id ? c.country_id[1] : undefined,
      // Show parent company name, or the commercial_company_name fallback
      company: c.parent_id
        ? c.parent_id[1]
        : c.commercial_company_name || undefined,
    }));

    res.status(200).json({ status: "success", count: formatted.length, customers: formatted });
  },
);

export const createCustomer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, phone, email, street, city, country, company } = req.body;
    if (!name) return next(new ErrorHandler("Customer name is required", 400));

    let countryId: number | false = false;
    if (country) {
      const countryMatch = await odooRequest(
        "res.country",
        "search_read",
        [[["name", "ilike", country]]],
        { fields: ["id"], limit: 1 },
      );
      countryId = countryMatch[0]?.id ?? false;
    }

    // If a company name is provided, find or create the company partner
    let parentId: number | false = false;
    if (company) {
      const existingCompany = await odooRequest(
        "res.partner",
        "search_read",
        [[["name", "=", company], ["is_company", "=", true]]],
        { fields: ["id"], limit: 1 },
      );

      if (existingCompany.length > 0) {
        parentId = existingCompany[0].id;
      } else {
        // Create the company partner first
        parentId = await odooRequest("res.partner", "create", [
          { name: company, is_company: true, customer_rank: 1 },
        ]);
      }
    }

    const customerId = await odooRequest("res.partner", "create", [
      {
        name,
        phone: phone ?? false,
        email: email ?? false,
        street: street ?? false,
        city: city ?? false,
        country_id: countryId,
        parent_id: parentId,   // ✅ replaces company_name
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

export const debugPOSConfig = CatchAsyncError(
  async (req: Request, res: Response) => {
    const { configId } = req.body;
    const config = await odooRequest("pos.config", "read", [[configId]], {
      fields: ["id", "name", "cash_control", "payment_method_ids"],
    });
    res.json(config);
  },
);

export const createOdooInvoice = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { odooOrderId } = req.body;
    if (!odooOrderId)
      return next(new ErrorHandler("odooOrderId is required", 400));

    const orders = await odooRequest(
      "pos.order",
      "search_read",
      [[["id", "=", odooOrderId]]],
      { fields: ["id", "partner_id", "lines", "amount_total"], limit: 1 },
    );
    const order = orders?.[0];
    if (!order) return next(new ErrorHandler("Order not found in Odoo", 404));

    const lines = await odooRequest(
      "pos.order.line",
      "search_read",
      [[["id", "in", order.lines]]],
      { fields: ["product_id", "qty", "price_unit", "discount"] },
    );

    const invoiceId = await odooRequest("account.move", "create", [
      {
        move_type: "out_invoice",
        partner_id: order.partner_id ? order.partner_id[0] : false,
        invoice_line_ids: lines.map((line: any) => [
          0,
          0,
          {
            product_id: line.product_id[0],
            quantity: line.qty,
            price_unit: line.price_unit,
            discount: line.discount ?? 0,
          },
        ]),
      },
    ]);

    if (!invoiceId)
      return next(new ErrorHandler("Failed to create invoice", 500));

    res.status(201).json({
      status: "success",
      invoiceId,
      pdfUrl: `${process.env.ODOO_URL}/report/pdf/account.report_invoice/${invoiceId}`,
    });
  },
);

export const getPosOrders = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as string | undefined; // "paid" | "invoiced" | "nothing"
    const search = req.query.search as string | undefined;
    const dateFrom = req.query.date_from as string | undefined;
    const dateTo = req.query.date_to as string | undefined;

    const domain: any[] = [];

    if (status) domain.push(["state", "=", status]);
    if (dateFrom) domain.push(["date_order", ">=", `${dateFrom} 00:00:00`]);
    if (dateTo) domain.push(["date_order", "<=", `${dateTo} 23:59:59`]);
    if (search) domain.push(["name", "ilike", search]);

    const orders = await odooRequest("pos.order", "search_read", [domain], {
      fields: [
        "name",
        "date_order",
        "state",
        "amount_total",
        "amount_tax",
        "lines",
        "session_id",
        "user_id",
        "payment_ids",
      ],
      order: "date_order desc, id desc",
      limit,
      offset: (page - 1) * limit,
    });

    const total = await odooRequest("pos.order", "search_count", [domain]);

    // Enrich with payment method names
    const paymentIds = orders.flatMap((o: any) => o.payment_ids ?? []);
    const payments = paymentIds.length
      ? await odooRequest(
          "pos.payment",
          "search_read",
          [[["id", "in", paymentIds]]],
          { fields: ["id", "payment_method_id", "amount", "pos_order_id"] },
        )
      : [];

    const paymentMap: Record<number, any[]> = {};
    for (const p of payments) {
      const oid = p.pos_order_id[0];
      if (!paymentMap[oid]) paymentMap[oid] = [];
      paymentMap[oid].push({
        method: p.payment_method_id?.[1] ?? "Unknown",
        amount: p.amount,
      });
    }

    const items = orders.map((o: any) => ({
      id: o.id,
      ref: o.name,
      date: o.date_order,
      status: o.state,
      total: o.amount_total,
      tax: o.amount_tax,
      lineCount: (o.lines ?? []).length,
      session: o.session_id?.[1] ?? "—",
      cashier: o.user_id?.[1] ?? "—",
      payments: paymentMap[o.id] ?? [],
    }));

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      orders: items,
    });
  },
);

export const getPosOrderById = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);

    const [order] = await odooRequest(
      "pos.order",
      "search_read",
      [[["id", "=", id]]],
      {
        fields: [
          "name",
          "date_order",
          "state",
          "amount_total",
          "amount_tax",
          "lines",
          "session_id",
          "user_id",
          "payment_ids",
        ],
      },
    );

    if (!order) return next(new ErrorHandler("Order not found", 404));

    // Lines detail - UPDATED FIELDS ARRAY HERE
    const lines = order.lines?.length
      ? await odooRequest(
          "pos.order.line",
          "search_read",
          [[["id", "in", order.lines]]],
          {
            fields: [
              "product_id",
              "qty",
              "price_unit",
              "price_subtotal_incl",
              "discount",
            ],
          },
        )
      : [];

    // Payments detail
    const payments = order.payment_ids?.length
      ? await odooRequest(
          "pos.payment",
          "search_read",
          [[["id", "in", order.payment_ids]]],
          { fields: ["payment_method_id", "amount"] },
        )
      : [];

    res.status(200).json({
      success: true,
      order: {
        id: order.id,
        ref: order.name,
        date: order.date_order,
        status: order.state,
        total: order.amount_total,
        tax: order.amount_tax,
        session: order.session_id?.[1] ?? "—",
        cashier: order.user_id?.[1] ?? "—",
        lines: lines.map((l: any) => ({
          product: l.product_id?.[1] ?? "—",
          qty: l.qty,
          price: l.price_unit,
          subtotal: l.price_subtotal_incl,
          discount: l.discount,
        })),
        payments: payments.map((p: any) => ({
          method: p.payment_method_id?.[1] ?? "Unknown",
          amount: p.amount,
        })),
      },
    });
  },
);



// Save held order to Odoo as draft quotation
export const holdOrderToOdoo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { cart, customerId, orderName, discount } = req.body;

    if (!customerId)
      return next(new ErrorHandler("Customer required to hold order", 400));
    if (!cart?.length) return next(new ErrorHandler("Cart is empty", 400));

    // 1. Create draft sale order
    const saleOrderId = await odooRequest("sale.order", "create", [
      {
        partner_id: customerId,
        state: "draft", // quotation = unpaid held order
        origin: `POS_HOLD:${orderName || "Unnamed"}`,
        note: `Held POS order: ${orderName}`,
      },
    ]);

    // 2. Add lines
    for (const item of cart) {
      // get variant
      const variant = await odooRequest(
        "product.product",
        "search_read",
        [[["product_tmpl_id", "=", item.productId]]],
        { fields: ["id"], limit: 1 },
      );

      if (!variant[0]) continue;

      await odooRequest("sale.order.line", "create", [
        {
          order_id: saleOrderId,
          product_id: variant[0].id,
          product_uom_qty: item.qty,
          price_unit: item.price,
          discount: item.discount || 0,
          name: item.note ? `${item.name} - ${item.note}` : item.name,
        },
      ]);
    }

    res.json({
      success: true,
      message: "Order held in Odoo",
      odooOrderId: saleOrderId,
    });
  },
);

export const getHeldOrders = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const orders = await odooRequest(
      "sale.order",
      "search_read",
      [
        [
          ["state", "=", "draft"],
          ["origin", "like", "POS_HOLD:%"],
        ],
      ],
      {
        fields: [
          "id",
          "name",
          "partner_id",
          "date_order",
          "amount_total",
          "origin",
          "order_line",
        ],
        order: "date_order desc",
        limit: 50,
      },
    );

    if (!orders.length) {
      return res.json({ success: true, orders: [] });
    }

    // Fetch lines for each order
    const allLineIds = orders.flatMap((o: any) => o.order_line ?? []);
    const lines = allLineIds.length
      ? await odooRequest(
          "sale.order.line",
          "search_read",
          [[["id", "in", allLineIds]]],
          {
            fields: [
              "id",
              "order_id",
              "product_id",
              "product_uom_qty",
              "price_unit",
              "discount",
              "name",
            ],
          },
        )
      : [];

    // Group lines by order
    const linesByOrder: Record<number, any[]> = {};
    for (const line of lines) {
      const oid = line.order_id[0];
      if (!linesByOrder[oid]) linesByOrder[oid] = [];
      linesByOrder[oid].push({
        productName: line.product_id?.[1] ?? line.name,
        qty: line.product_uom_qty,
        price: line.price_unit,
        discount: line.discount,
      });
    }

    const result = orders.map((o: any) => ({
      odooOrderId: o.id,
      name: o.name,
      customer: o.partner_id
        ? { id: o.partner_id[0], name: o.partner_id[1] }
        : null,
      date: o.date_order,
      total: o.amount_total,
      lines: linesByOrder[o.id] ?? [],
    }));

    res.json({ success: true, orders: result });
  },
);


