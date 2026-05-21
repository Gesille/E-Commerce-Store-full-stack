import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { odooRequest } from "../odoo/odoo.client.js";

import userModel from "../models/user.model.js";
import CashierShiftLog, { ShiftState } from "../models/Cashiershiftlog.js";
import POSOrder from "../models/POSOrder.js";

// helper to resolve cashier and validate they can open a shift
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



const PAYMENT_METHOD_IDS: Record<string, number> = {
  cash: 1,
  card: 2,
  bank: 3,
};

// open session
export const openSession = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { configId, cashierId } = req.body;

    if (!configId) return next(new ErrorHandler("configId is required", 400));
    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));

    const cashier = await resolveCashier(cashierId).catch((e) => next(e));
    if (!cashier) return;

    // Search for any existing session (opened OR still in opening_control)
    const existing = await odooRequest(
      "pos.session",
      "search_read",
      [
        [
          ["state", "in", ["opened", "opening_control"]],
          ["config_id", "=", configId],
        ],
      ],
      {
        fields: ["id", "name", "state"],
        limit: 1,
      },
    );

    if (existing?.length) {
      const existingSession = existing[0];

      // FIX #1: If the existing session is still awaiting an opening balance,
      // do NOT create a shift — tell the client to confirm the balance first.
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

      // Session is fully opened — join or resume the shift
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

    // No existing session — create a new one in Odoo
    const sessionId = await odooRequest("pos.session", "create", [
      {
        config_id: configId,
      },
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

    if (session.state !== "opened") {
      try {
        await odooRequest("pos.session", "action_pos_session_open", [
          [sessionId],
        ]);
      } catch (_) {}

      const openedSessionData = await odooRequest(
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

      const openedSession = openedSessionData?.[0];

      if (openedSession?.state !== "opened") {
        return next(
          new ErrorHandler(
            `Session could not be opened. Current state: ${openedSession?.state}`,
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
            reason: "Session opened",
          },
        ],
      });
      const populated = await populateShift(shiftLog._id);
      return res.status(201).json({
        success: true,
        requiresOpeningBalance: false,
        session: openedSession,
        activeShift: populated,
      });
    }

    // Session already opened on creation
    const shiftLog = await CashierShiftLog.create({
      odooSessionId: sessionId,
      cashierId: cashier._id,
      odooPartnerId: cashier.odooPartnerId,
      state: "active" as ShiftState,
      stateHistory: [
        {
          toState: "active",
          at: new Date(),
          reason: "Session opened",
        },
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

// confirm opening balance
export const confirmOpeningBalance = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      sessionId,
      cashierId,
      openingBalance = 0,
      configId,
    } = req.body;

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

    if (!sessionId) {
      return next(
        new ErrorHandler("sessionId is required", 400),
      );
    }

    if (!cashierId) {
      return next(
        new ErrorHandler("cashierId is required", 400),
      );
    }

    if (!configId) {
      return next(
        new ErrorHandler("configId is required", 400),
      );
    }

    const cashier = await resolveCashier(cashierId).catch(
      (e) => next(e),
    );

    if (!cashier) return;

    // --------------------------------------------------
    // READ SESSION
    // --------------------------------------------------

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
      console.error(
        "[POS] Failed to read session:",
        err,
      );

      return next(
        new ErrorHandler(
          "Failed to read POS session from Odoo",
          500,
        ),
      );
    }

    const current = currentSessions?.[0];

    console.log("[POS] SESSION:", current);

    if (!current) {
      return next(
        new ErrorHandler("Session not found", 404),
      );
    }

    // --------------------------------------------------
    // ALREADY OPENED
    // --------------------------------------------------

    if (current.state === "opened") {
      const existingShift =
        await CashierShiftLog.findOne({
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

      const session =
        await fetchOpenOdooSession(configId);

      const shift =
        await CashierShiftLog.findOne({
          odooSessionId: sessionId,
          cashierId: cashier._id,
        })
          .populate(
            "cashierId",
            "name email role",
          )
          .lean();

      return res.status(200).json({
        success: true,
        message: "Session already opened",
        session,
        activeShift: shift,
      });
    }

    // --------------------------------------------------
    // MUST BE opening_control
    // --------------------------------------------------

    if (current.state !== "opening_control") {
      return next(
        new ErrorHandler(
          `Invalid session state: ${current.state}`,
          409,
        ),
      );
    }

    // --------------------------------------------------
    // WRITE OPENING BALANCE
    // --------------------------------------------------

    try {
      await odooRequest(
        "pos.session",
        "write",
        [
          [sessionId],
          {
            cash_register_balance_start:
              Number(openingBalance) || 0,
          },
        ],
      );

      console.log(
        "[POS] Opening balance written:",
        openingBalance,
      );
    } catch (err) {
      console.error(
        "[POS] Failed writing opening balance:",
        err,
      );

      return next(
        new ErrorHandler(
          "Failed to write opening balance",
          500,
        ),
      );
    }

    // --------------------------------------------------
    // OPEN SESSION
    // --------------------------------------------------

    try {
      const result = await odooRequest(
        "pos.session",
        "action_pos_session_open",
        [[sessionId]],
      );

      console.log("[POS] OPEN RESULT:", result);
    } catch (err: any) {
      console.error(
        "[POS] action_pos_session_open ERROR:",
        err,
      );

      return next(
        new ErrorHandler(
          err?.message ||
            "Failed to open POS session",
          500,
        ),
      );
    }

    // --------------------------------------------------
    // WAIT
    // --------------------------------------------------

    await new Promise((resolve) =>
      setTimeout(resolve, 5000),
    );

    // --------------------------------------------------
    // VERIFY
    // --------------------------------------------------

    const verify = await odooRequest(
      "pos.session",
      "read",
      [[sessionId]],
      {
        fields: [
          "id",
          "name",
          "state",
          "cash_register_balance_start",
        ],
      },
    );

    console.log("[POS] VERIFY:", verify);

    const session = verify?.[0];

    // --------------------------------------------------
    // FORCE OPEN IF ODOO BUGS
    // --------------------------------------------------

    if (session?.state !== "opened") {
      console.log(
        "[POS] Forcing session state to opened...",
      );

      await odooRequest(
        "pos.session",
        "write",
        [
          [sessionId],
          {
            state: "opened",
          },
        ],
      );
    }

    // --------------------------------------------------
    // FINAL CHECK
    // --------------------------------------------------

    const finalVerify = await odooRequest(
      "pos.session",
      "read",
      [[sessionId]],
      {
        fields: [
          "id",
          "name",
          "state",
          "cash_register_balance_start",
        ],
      },
    );

    const finalSession = finalVerify?.[0];

    console.log(
      "[POS] FINAL SESSION:",
      finalSession,
    );

    if (
      !finalSession ||
      finalSession.state !== "opened"
    ) {
      return next(
        new ErrorHandler(
          `Session failed to open. Current state: ${finalSession?.state}`,
          500,
        ),
      );
    }

    // --------------------------------------------------
    // CREATE SHIFT
    // --------------------------------------------------

    const shiftLog =
      await CashierShiftLog.create({
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

    const populated = await populateShift(
      shiftLog._id,
    );

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------

    return res.status(201).json({
      success: true,
      message:
        "Opening balance confirmed. POS session is now open.",
      session: finalSession,
      activeShift: populated,
      openingBalance:
        Number(openingBalance) || 0,
    });
  },
);
// close session
export const closeSession = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { sessionId } = req.body;

    if (!sessionId) return next(new ErrorHandler("sessionId is required", 400));

    // FIX #2: Include "opening_control" in the search so a session stuck
    // in that state can still be found and force-closed / cleaned up.
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

    // Session is stuck in opening_control — it was never really opened,
    // so just clean up any MongoDB shift records and return.
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

      // Best-effort: attempt to delete or abandon the dangling Odoo session.
      try {
        await odooRequest("pos.session", "unlink", [[sessionId]]);
      } catch (_) {
        // Odoo may reject unlink on a non-new session — that's fine.
      }

      return res.status(200).json({
        status: "success",
        message:
          "Session was in opening_control and has been abandoned. No orders were taken.",
        sessionId,
        cashierReport: [],
      });
    }

    // Already closed — just sync MongoDB and return success
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

    // Close all active/paused shifts in MongoDB
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

    // Close session in Odoo
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

// get active session
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

    res.status(200).json({
      status: "success",
      session,
      stats,
      activeShifts,
    });
  },
);

// start cashier shift
export const startCashierShift = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { cashierId } = req.body;

    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));

    const cashier = await resolveCashier(cashierId).catch((e) => next(e));
    if (!cashier) return;

    const { configId } = req.body;

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
    const { cashierId, reason } = req.body;

    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));

    const { configId } = req.body;

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
    const { cashierId, reason } = req.body;

    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));

    const { configId } = req.body;

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
    const { cashierId } = req.body;

    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));

    const { configId } = req.body;

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

interface CartItem {
  productId: number;
  qty: number;
  price: number;
  discount?: number;
  note?: string;
}

interface PaymentLine {
  method: "cash" | "card" | "bank";
  amount: number;
}

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

    // ── Validation ────────────────────────────────────────────────────────────
    if (!cart?.length) return next(new ErrorHandler("Cart is empty", 400));
    if (!paymentLines?.length)
      return next(new ErrorHandler("Payment method is required", 400));
    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));
    if (!configId) return next(new ErrorHandler("configId is required", 400));

    const cashier = await resolveCashier(cashierId).catch((e) => next(e));
    if (!cashier) return;

    const session = await fetchOpenOdooSession(configId);
    if (!session)
      return next(new ErrorHandler("No open POS session found", 409));

    const shift = await CashierShiftLog.findOne({
      odooSessionId: session.id,
      cashierId: cashier._id,
      state: "active",
    });

    if (!shift) {
      return next(
        new ErrorHandler(
          "Cashier does not have an active shift. Start or resume a shift first.",
          409,
        ),
      );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const TAX_RATE = 0.1; // 10% — keep in sync with frontend

    // ── Totals ────────────────────────────────────────────────────────────────
    // subtotal = sum of line totals before tax
    const subtotal = round2(
      cart.reduce(
        (s: number, item: CartItem) =>
          s + item.price * item.qty * (1 - (item.discount ?? 0) / 100),
        0,
      ),
    );

    const taxAmount = round2(subtotal * TAX_RATE);
    const totalWithTax = round2(subtotal + taxAmount);

    // amountPaid is what the customer actually handed over (tax-inclusive)
    const amountPaid = round2(
      paymentLines.reduce((s: number, p: PaymentLine) => s + p.amount, 0),
    );

    // Validate that the customer paid at least the tax-inclusive total
    if (amountPaid < totalWithTax - 0.01) {
      return next(
        new ErrorHandler(
          `Underpayment: amount paid ($${amountPaid}) is less than order total ($${totalWithTax})`,
          400,
        ),
      );
    }

    const amountReturn = round2(Math.max(0, amountPaid - totalWithTax));

    // ── Order lines ───────────────────────────────────────────────────────────
    const orderLines = cart.map((item: CartItem) => {
      const lineSubtotal = round2(
        item.price * item.qty * (1 - (item.discount ?? 0) / 100),
      );
      const lineSubtotalInclTax = round2(lineSubtotal * (1 + TAX_RATE));

      return [
        0,
        0,
        {
          // Ensure product_id is always a plain integer for Odoo
          product_id: parseInt(String(item.productId), 10),
          qty: item.qty,
          price_unit: item.price,
          discount: item.discount ?? 0,
          // price_subtotal = pre-tax line total
          price_subtotal: lineSubtotal,
          // price_subtotal_incl = tax-inclusive line total
          price_subtotal_incl: lineSubtotalInclTax,
          customer_note: item.note ?? "",
        },
      ];
    });

    // ── Payment lines ─────────────────────────────────────────────────────────
    let paymentIds: any[];
    try {
      paymentIds = paymentLines.map((p: PaymentLine) => {
        const methodId = PAYMENT_METHOD_IDS[p.method];
        if (!methodId)
          throw new Error(`Unknown payment method: ${p.method}`);
        return [0, 0, { amount: p.amount, payment_method_id: methodId }];
      });
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 400));
    }

    const odooRef = `SHIFT-${shift._id}`;

    // ── Create order in Odoo ──────────────────────────────────────────────────
    let orderId: number;
    try {
      orderId = await odooRequest("pos.order", "create", [
        {
          session_id: session.id,
          partner_id: customerId ?? false,
          to_invoice: false,
          pos_reference: odooRef,
          internal_note: note ?? "",
          lines: orderLines,
          payment_ids: paymentIds,
          // These must all use the tax-inclusive total so Odoo validation passes
          amount_paid: amountPaid,
          amount_total: totalWithTax,
          amount_tax: taxAmount,
          amount_return: amountReturn,
        },
      ]);
    } catch (err: any) {
      console.error("[POS] Odoo order create failed:", err);
      return next(
        new ErrorHandler(
          err?.message ?? "Failed to create order in Odoo",
          500,
        ),
      );
    }

    if (!orderId) {
      return next(new ErrorHandler("Failed to create order in Odoo", 500));
    }

    // ── Mark order as paid in Odoo ────────────────────────────────────────────
    try {
      await odooRequest("pos.order", "action_pos_order_paid", [[orderId]]);
    } catch (err: any) {
      console.error("[POS] action_pos_order_paid failed:", err);
      // Order was created — don't block the response, just log it
    }

    // ── Mirror order in MongoDB ───────────────────────────────────────────────
    let mongoOrder: any = null;
    try {
      mongoOrder = await POSOrder.create({
        sessionId: session.id,
        shiftId: shift._id,
        cashierId: cashier._id,
        openedBy: cashier._id,
        odooOrderId: orderId,
        cart: cart.map((item) => ({
          productId: item.productId,
          name: `Product#${item.productId}`,
          price: item.price,
          qty: item.qty,
          discount: item.discount ?? 0,
          note: item.note ?? "",
        })),
        paymentLines,
        subtotal,
        taxAmount,      // ← now correctly stored
        discountAmount: 0,
        total: totalWithTax,  // ← tax-inclusive total
        amountPaid,
        change: amountReturn,
        note: note ?? "",
        status: "paid",
        receiptNumber: `RCP-${Date.now()}-${orderId}`,
      });
    } catch (mongoErr) {
      console.error(
        `[POS] MongoDB order mirror failed for Odoo orderId=${orderId}, shiftId=${shift._id}:`,
        mongoErr,
      );
    }

    // ── Update shift totals ───────────────────────────────────────────────────
    // Use totalWithTax so shift reports match what customers actually paid
    await CashierShiftLog.findByIdAndUpdate(shift._id, {
      $inc: { totalOrders: 1, totalSales: totalWithTax },
    });

    res.status(201).json({
      status: "success",
      message: "Order created successfully",
      orderId,
      mongoOrderId: mongoOrder?._id ?? null,
      cashierShiftId: shift._id,
    });
  },
);
/** GET /api/pos/orders/:sessionId */
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
      [domain],
      {
        fields: ["id", "name", "phone", "email", "street"],
        limit: 100,
      },
    );
    res
      .status(200)
      .json({ status: "success", count: customers.length, customers });
  },
);

export const createCustomer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, phone, email } = req.body;
    if (!name) return next(new ErrorHandler("Customer name is required", 400));

    const customerId = await odooRequest("res.partner", "create", [
      { name, phone: phone ?? false, email: email ?? false, customer_rank: 1 },
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

// export const getPOSConfigs = CatchAsyncError(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const configs = await odooRequest(
//       "pos.config",
//       "search_read",
//       [[["active", "=", true]]],
//       { fields: ["id", "name", "currency_id"] },
//     );
//     res.status(200).json({ status: "success", configs });
//   },
// );

// export const debugPOSConfig = CatchAsyncError(
//   async (req: Request, res: Response) => {
//     const { configId } = req.body;
//     const config = await odooRequest("pos.config", "read", [[configId]], {
//       fields: ["id", "name", "cash_control", "payment_method_ids"],
//     });
//     res.json(config);
//   },
// );


export const getOrderReceiptPdf = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const orderId = Number(req.params.orderId);
    if (!orderId) return next(new ErrorHandler("orderId is required", 400));

    // جيب PDF من أودو مباشرةً
    const pdfResponse = await fetch(
      `${process.env.ODOO_URL}/report/pdf/point_of_sale.report_receipt/${orderId}`,
      {
        headers: {
          "X-Openerp-Session-Id": process.env.ODOO_SESSION_ID ?? "",
          Cookie: `session_id=${process.env.ODOO_SESSION_ID ?? ""}`,
        },
      }
    );

    if (!pdfResponse.ok) {
      return next(new ErrorHandler("Failed to fetch receipt from Odoo", 502));
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="receipt-${orderId}.pdf"`);
    res.send(Buffer.from(pdfBuffer));
  }
);

export const createOdooInvoice = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { odooOrderId } = req.body;
    if (!odooOrderId)
      return next(new ErrorHandler("odooOrderId is required", 400));

    // 1. Fetch order from Odoo
   const orders = await odooRequest(
  "pos.order",
  "search_read",
  [[["id", "=", odooOrderId]]],
  { fields: ["id", "partner_id", "lines", "amount_total"], limit: 1 }
);
    const order = orders?.[0];
    if (!order)
      return next(new ErrorHandler("Order not found in Odoo", 404));

    // 2. Fetch order lines
   const lines = await odooRequest(
  "pos.order.line",
  "search_read",
  [[["id", "in", order.lines]]],
  { fields: ["product_id", "qty", "price_unit", "discount"] },
);

    // 3. Create invoice
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
  }
);