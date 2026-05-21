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

const TAX_RATE = 0.1;

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

// ─────────────────────────────────────────────────────────────────────────────
// Stock Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Poll for stock pickings generated after action_pos_order_paid.
 * Odoo creates them asynchronously, so we retry rather than using
 * a fixed delay.
 */
async function pollForPickings(
  odooRef: string,
  maxAttempts = 12,
  intervalMs = 2000,
): Promise<number[]> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(
      `[POS] Polling for pickings (attempt ${attempt}/${maxAttempts})...`,
    );

    const ids: number[] = await odooRequest("stock.picking", "search", [
      [["origin", "ilike", odooRef]],
    ]);

    if (ids.length > 0) {
      console.log(`[POS] Found ${ids.length} picking(s):`, ids);
      return ids;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  console.warn(`[POS] No pickings found for ref "${odooRef}" after polling.`);
  return [];
}

/**
 * Fully validate a stock picking:
 *  1. Confirm → Assign → Set qty_done → Validate
 *  2. Handle backorder wizard gracefully (no backorder path)
 */
async function validatePicking(pickingId: number): Promise<void> {
  console.log(`[POS] Validating picking ${pickingId}...`);

  // 1. Confirm
  await odooRequest("stock.picking", "action_confirm", [[pickingId]]);

  // 2. Reserve stock
  await odooRequest("stock.picking", "action_assign", [[pickingId]]);

  // 3. Read move lines
  const moveLines: Array<{
    id: number;
    product_uom_qty: number;
    qty_done: number;
  }> = await odooRequest(
    "stock.move.line",
    "search_read",
    [[["picking_id", "=", pickingId]]],
    { fields: ["id", "product_uom_qty", "qty_done"] },
  );

  if (!moveLines.length) {
    console.warn(`[POS] No move lines found for picking ${pickingId}`);
  }

  // 4. Set qty_done on every move line
  for (const line of moveLines) {
    await odooRequest("stock.move.line", "write", [
      [line.id],
      { qty_done: line.product_uom_qty || 0 },
    ]);
  }

  // 5. Also update stock.move directly (belt-and-suspenders — some Odoo
  //    versions track done qty on the move, not the line)
  const stockMoves: Array<{ id: number; product_uom_qty: number }> =
    await odooRequest(
      "stock.move",
      "search_read",
      [[["picking_id", "=", pickingId]]],
      { fields: ["id", "product_uom_qty"] },
    );

  for (const move of stockMoves) {
    await odooRequest("stock.move", "write", [
      [move.id],
      { quantity_done: move.product_uom_qty || 0 },
    ]);
  }

  // 6. Validate — may return a backorder wizard instead of True
  const validateResult = await odooRequest(
    "stock.picking",
    "button_validate",
    [[pickingId]],
  );

  if (
    validateResult &&
    typeof validateResult === "object" &&
    validateResult.res_model
  ) {
    console.log(
      `[POS] Backorder wizard triggered for picking ${pickingId}, dismissing...`,
    );

    try {
      const wizardId: number = await odooRequest(
        validateResult.res_model,
        "create",
        [{}],
      );

      // process_cancel_backorder = validate immediately, no backorder created
      await odooRequest(
        validateResult.res_model,
        "process_cancel_backorder",
        [[wizardId]],
      );
    } catch (wizardErr: any) {
      console.warn(
        `[POS] Backorder wizard dismiss failed (non-fatal):`,
        wizardErr?.message,
      );

      // Fallback: stock.immediate.transfer
      try {
        const fallbackWizardId: number = await odooRequest(
          "stock.immediate.transfer",
          "create",
          [{ pick_ids: [[4, pickingId]] }],
        );

        await odooRequest("stock.immediate.transfer", "process", [
          [fallbackWizardId],
        ]);
      } catch (fbErr: any) {
        console.warn(
          `[POS] Immediate transfer fallback failed:`,
          fbErr?.message,
        );
      }
    }
  }

  // 7. Log final picking state
  const finalState: Array<{ id: number; state: string }> = await odooRequest(
    "stock.picking",
    "search_read",
    [[["id", "=", pickingId]]],
    { fields: ["id", "state"] },
  );

  console.log(
    `[POS] Picking ${pickingId} final state: ${finalState[0]?.state}`,
  );
}

/**
 * Fallback when POS config has no picking_type_id and never creates
 * stock.picking records — try triggering Odoo's internal method directly.
 */
async function forceStockMovesFromOrder(orderId: number): Promise<void> {
  console.log(`[POS] Attempting direct stock move force for order ${orderId}`);

  try {
    await odooRequest("pos.order", "_create_order_picking", [[orderId]]);
    console.log(`[POS] _create_order_picking succeeded for order ${orderId}`);
  } catch (err: any) {
    console.warn(
      `[POS] _create_order_picking not available or failed:`,
      err?.message,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Controllers
// ─────────────────────────────────────────────────────────────────────────────

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
        new ErrorHandler(
          "Session was created but could not be retrieved",
          500,
        ),
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
          stateHistory: { toState: "closed", at: now, reason: "Session closed" },
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

// ─────────────────────────────────────────────────────────────────────────────
// Order Controller
// ─────────────────────────────────────────────────────────────────────────────

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

 
    const cashier = await resolveCashier(cashierId).catch((e) =>
      next(e),
    );

    if (!cashier) return;

   
    const session = await fetchOpenOdooSession(configId);

    if (!session) {
      return next(
        new ErrorHandler("No open POS session found", 409),
      );
    }

    const shift = await CashierShiftLog.findOne({
      odooSessionId: session.id,
      cashierId: cashier._id,
      state: "active",
    });

    if (!shift) {
      return next(
        new ErrorHandler(
          "Cashier does not have an active shift.",
          409,
        ),
      );
    }

    const resolvedCart: any[] = [];

    for (const item of cart) {
      let realProductId: number | null = null;

      const directProduct = await odooRequest(
        "product.product",
        "search_read",
        [[["id", "=", item.productId]]],
        {
          fields: [
            "id",
            "name",
            "qty_available",
          ],
          limit: 1,
        },
      );

      if (directProduct.length) {
        realProductId = directProduct[0].id;

        resolvedCart.push({
          ...item,
          realProductId,
          productName: directProduct[0].name,
          qtyAvailable:
            directProduct[0].qty_available || 0,
        });

        continue;
      }

      const variants = await odooRequest(
        "product.product",
        "search_read",
        [[["product_tmpl_id", "=", item.productId]]],
        {
          fields: [
            "id",
            "name",
            "qty_available",
          ],
          limit: 1,
        },
      );

      if (!variants.length) {
        return next(
          new ErrorHandler(
            `Product ${item.productId} not found`,
            400,
          ),
        );
      }

      realProductId = variants[0].id;

      resolvedCart.push({
        ...item,
        realProductId,
        productName: variants[0].name,
        qtyAvailable:
          variants[0].qty_available || 0,
      });
    }

    let subtotal = 0;
    let totalTaxAmount = 0;

    const orderLines = resolvedCart.map((item) => {
      const lineSubtotal =
        item.price *
        item.qty *
        (1 - (item.discount || 0) / 100);

      const lineTax =
        Math.round(lineSubtotal * TAX_RATE * 100) / 100;

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

          price_subtotal:
            Math.round(lineSubtotal * 100) / 100,

          price_subtotal_incl:
            Math.round(
              (lineSubtotal + lineTax) * 100,
            ) / 100,
        },
      ];
    });

    const amountTotal =
      Math.round(
        (subtotal + totalTaxAmount) * 100,
      ) / 100;

    const amountPaid = paymentLines.reduce(
      (sum, p) => sum + p.amount,
      0,
    );

    const amountReturn = Math.max(
      0,
      Math.round((amountPaid - amountTotal) * 100) /
        100,
    );

    if (amountPaid < amountTotal) {
      return next(
        new ErrorHandler(
          `Order not fully paid. Need ${amountTotal}, received ${amountPaid}`,
          400,
        ),
      );
    }

    
    const payment_ids = paymentLines.map((p) => {
      const methodId =
        PAYMENT_METHOD_IDS[p.method];

      if (!methodId) {
        throw new Error(
          `Unknown payment method ${p.method}`,
        );
      }

      return [
        0,
        0,
        {
          amount: p.amount,
          payment_method_id: methodId,
        },
      ];
    });

    const odooRef = `POS-${Date.now()}`;

    let orderId: number;

    try {
      orderId = await odooRequest(
        "pos.order",
        "create",
        [
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

            internal_note: note || "",
          },
        ],
      );
    } catch (err: any) {
      console.error(err);

      return next(
        new ErrorHandler(
          err?.message ||
            "Failed to create POS order",
          500,
        ),
      );
    }

   
    try {
      await odooRequest(
        "pos.order",
        "action_pos_order_paid",
        [[orderId]],
      );
    } catch (err: any) {
      console.error(err);

      return next(
        new ErrorHandler(
          "Failed to validate payment",
          500,
        ),
      );
    }

   
    await new Promise((resolve) =>
      setTimeout(resolve, 5000),
    );

    
    const pickingIds = await odooRequest(
      "stock.picking",
      "search",
      [[["origin", "=", odooRef]]],
    );

    console.log(
      "[POS] PICKINGS FOUND:",
      pickingIds,
    );

 
    for (const pickingId of pickingIds) {
      try {
        // confirm

        await odooRequest(
          "stock.picking",
          "action_confirm",
          [[pickingId]],
        );

        // assign

        await odooRequest(
          "stock.picking",
          "action_assign",
          [[pickingId]],
        );

        // move lines

        const moveLines = await odooRequest(
          "stock.move.line",
          "search_read",
          [[["picking_id", "=", pickingId]]],
          {
            fields: [
              "id",
              "product_uom_qty",
            ],
          },
        );

        // qty_done

        for (const line of moveLines) {
          await odooRequest(
            "stock.move.line",
            "write",
            [
              [line.id],
              {
                qty_done:
                  line.product_uom_qty,
              },
            ],
          );
        }

     

        await odooRequest(
          "stock.picking",
          "button_validate",
          [[pickingId]],
        );

        console.log(
          `[POS] Picking ${pickingId} validated`,
        );
      } catch (err) {
        console.error(
          `[POS] Failed validating picking ${pickingId}`,
          err,
        );
      }
    }

  
 

 
    await CashierShiftLog.findByIdAndUpdate(
      shift._id,
      {
        $inc: {
          totalOrders: 1,
          totalSales: amountTotal,
        },
      },
    );

   
    res.status(201).json({
      success: true,
      message:
        "Order created successfully and stock updated",

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

    const totalOrders = cashierSummaries.reduce(
      (s, l) => s + l.totalOrders,
      0,
    );
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
      { fields: ["id", "name", "phone", "email", "street"], limit: 100 },
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

export const getOrderReceiptPdf = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const orderId = Number(req.params.orderId);
    if (!orderId) return next(new ErrorHandler("orderId is required", 400));

    const pdfResponse = await fetch(
      `${process.env.ODOO_URL}/report/pdf/point_of_sale.report_receipt/${orderId}`,
      {
        headers: {
          "X-Openerp-Session-Id": process.env.ODOO_SESSION_ID ?? "",
          Cookie: `session_id=${process.env.ODOO_SESSION_ID ?? ""}`,
        },
      },
    );

    if (!pdfResponse.ok) {
      return next(new ErrorHandler("Failed to fetch receipt from Odoo", 502));
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="receipt-${orderId}.pdf"`,
    );
    res.send(Buffer.from(pdfBuffer));
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