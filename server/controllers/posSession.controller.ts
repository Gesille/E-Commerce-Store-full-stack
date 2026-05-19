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

async function pollUntilOpened(sessionId: number) {
  let session: any = null;

  for (let i = 0; i < 20; i++) {
    // was 15
    const result = await odooRequest("pos.session", "read", [[sessionId]], {
      fields: [
        "id",
        "name",
        "state",
        "config_id",
        "user_id",
        "start_at",
        "cash_register_balance_start",
      ],
    });

    session = result?.[0];
    console.log(`[POS] Poll ${i + 1}/20: state = ${session?.state}`);

    if (session?.state === "opened") break;

    // Don't retry open calls in the poll — they've already been attempted above.
    // Just wait and re-read.
    await new Promise((r) => setTimeout(r, 1200)); // was 800ms
  }

  return session;
}

const PAYMENT_METHOD_IDS: Record<string, number> = {
  cash: 1,
  card: 2,
  wallet: 3,
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

    // ─────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────
    if (!sessionId) {
      return next(new ErrorHandler("sessionId is required", 400));
    }

    if (!cashierId) {
      return next(new ErrorHandler("cashierId is required", 400));
    }

    if (!configId) {
      return next(new ErrorHandler("configId is required", 400));
    }

    // ─────────────────────────────────────────────
    // Resolve cashier
    // ─────────────────────────────────────────────
    const cashier = await resolveCashier(cashierId).catch((e) => next(e));

    if (!cashier) return;

    // ─────────────────────────────────────────────
    // Read current session
    // ─────────────────────────────────────────────
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
            "cash_register_balance_end_real",
          ],
        },
      );
    } catch (err) {
      console.error("[POS] Failed to read session:", err);

      return next(
        new ErrorHandler("Failed to read POS session from Odoo", 500),
      );
    }

    const current = currentSessions?.[0];

    console.log("[POS] Current session:", current);

    if (!current) {
      return next(new ErrorHandler("Session not found in Odoo", 404));
    }

    // ─────────────────────────────────────────────
    // Already opened
    // ─────────────────────────────────────────────
    if (current.state === "opened") {
      let existingShift = await CashierShiftLog.findOne({
        odooSessionId: sessionId,
        cashierId: cashier._id,
        state: { $in: ["active", "paused"] },
      });

      if (!existingShift) {
        existingShift = await CashierShiftLog.create({
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

      const populated = await populateShift(existingShift._id);

      return res.status(200).json({
        success: true,
        message: "Session already opened",
        session: current,
        activeShift: populated,
      });
    }

    // ─────────────────────────────────────────────
    // Must be opening_control
    // ─────────────────────────────────────────────
    if (current.state !== "opening_control") {
      return next(
        new ErrorHandler(
          `Session is not awaiting opening balance. Current state: ${current.state}`,
          409,
        ),
      );
    }

    // ─────────────────────────────────────────────
    // Write opening balance
    // ─────────────────────────────────────────────
    try {
      await odooRequest("pos.session", "write", [
        [sessionId],
        {
          cash_register_balance_start:
            Number(openingBalance) || 0,

          cash_register_balance_end_real:
            Number(openingBalance) || 0,
        },
      ]);

      console.log(
        "[POS] Opening balance written:",
        openingBalance,
      );
    } catch (err) {
      console.error(
        "[POS] Failed to write opening balance:",
        err,
      );

      return next(
        new ErrorHandler(
          "Failed to write opening balance",
          500,
        ),
      );
    }

    // ─────────────────────────────────────────────
    // Open session
    // ─────────────────────────────────────────────
    try {
      await odooRequest(
        "pos.session",
        "action_pos_session_open",
        [[sessionId]],
      );

      console.log("[POS] action_pos_session_open called");
    } catch (err: any) {
      console.error(
        "[POS] action_pos_session_open failed:",
        err?.message,
      );

      return next(
        new ErrorHandler(
          err?.message || "Failed to open session",
          500,
        ),
      );
    }

    // ─────────────────────────────────────────────
    // Poll session until opened
    // ─────────────────────────────────────────────
    let session: any = null;

    for (let i = 0; i < 20; i++) {
      const result = await odooRequest(
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

      session = result?.[0];

      console.log(
        `[POS] Poll ${i + 1}/20 -> ${session?.state}`,
      );

      if (session?.state === "opened") {
        break;
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    // ─────────────────────────────────────────────
    // Final validation
    // ─────────────────────────────────────────────
    if (session?.state !== "opened") {
      return next(
        new ErrorHandler(
          `Session failed to open after balance confirmation. State: ${session?.state}`,
          500,
        ),
      );
    }

    // ─────────────────────────────────────────────
    // Create shift
    // ─────────────────────────────────────────────
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

    // ─────────────────────────────────────────────
    // Success response
    // ─────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: "Opening balance confirmed successfully",
      session,
      activeShift: populated,
      openingBalance: Number(openingBalance) || 0,
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
}

interface PaymentLine {
  method: "cash" | "card" | "wallet";
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
    }: {
      cart: CartItem[];
      paymentLines: PaymentLine[];
      cashierId: string;
      customerId?: number;
      note?: string;
    } = req.body;

    if (!cart?.length) return next(new ErrorHandler("Cart is empty", 400));
    if (!paymentLines?.length)
      return next(new ErrorHandler("Payment method is required", 400));
    if (!cashierId) return next(new ErrorHandler("cashierId is required", 400));

    const cashier = await resolveCashier(cashierId).catch((e) => next(e));
    if (!cashier) return;

    const { configId } = req.body;

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

    const odooRef = `SHIFT-${shift._id}`;

    const orderId = await odooRequest("pos.order", "create", [
      {
        session_id: session.id,
        partner_id: customerId ?? false,
        user_id: cashier.odooPartnerId,
        pos_reference: odooRef,
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

    await odooRequest("pos.order", "action_pos_order_paid", [[orderId]]);

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
        receiptNumber: `RCP-${Date.now()}-${orderId}`,
      });
    } catch (mongoErr) {
      console.error(
        `[POS] MongoDB order mirror failed for Odoo orderId=${orderId}, shiftId=${shift._id}:`,
        mongoErr,
      );
    }

    await CashierShiftLog.findByIdAndUpdate(shift._id, {
      $inc: { totalOrders: 1, totalSales: subtotal },
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
