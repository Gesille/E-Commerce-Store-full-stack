import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import POSOrder from "../models/POSOrder.js";
import POSSession from "../models/POSSession.js";
import ErrorHandler from "../utils/ErrorHandler.js";

// ─── Helper ────────────────────────────────────────────────────────────────────

function generateSessionName(): string {
  const date = new Date().toISOString().slice(0, 10); // "2026-05-14"
  return `Session — ${date}`;
}

function generateReceiptNumber(): string {
  return `RCP-${Date.now().toString(36).toUpperCase()}`;
}

// ─── OPEN SESSION ──────────────────────────────────────────────────────────────
// POST /api/pos/session/open
// Body: { cashierId, type?, openingBalance?, name? }
// Auth: any logged-in user (admin or staff)

export const openSession = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    // Check no session is already open
    const existing = await POSSession.findOne({ status: "open" });
    if (existing) {
      return next(
        new ErrorHandler(
          `A session is already open (${existing.name}). Close it first or switch the cashier.`,
          409
        )
      );
    }

    const {
      cashierId,
      type = "daily",
      openingBalance = 0,
      name,
    } = req.body;

    if (!cashierId) {
      return next(new ErrorHandler("cashierId is required to open a session.", 400));
    }

    const session = await POSSession.create({
      openedBy: req.user!._id,          // the logged-in user
      cashierId,                         // may differ from openedBy
      type,
      openingBalance,
      name: name || generateSessionName(),
      cashierHistory: [
        {
          cashierId,
          switchedAt: new Date(),
          switchedBy: req.user!._id,
        },
      ],
    });

    res.status(201).json({
      status: "success",
      message: "POS session opened.",
      session,
    });
  }
);

// ─── CLOSE SESSION ─────────────────────────────────────────────────────────────
// POST /api/pos/session/close
// Body: { closingBalance?, closingNote? }

export const closeSession = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await POSSession.findOne({ status: "open" });
    if (!session) {
      return next(new ErrorHandler("No open session found.", 404));
    }

    const { closingBalance, closingNote } = req.body;

    // Build summary before closing
    const orders = await POSOrder.find({
      sessionId: session._id,
      status: "paid",
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = orders.length;

    session.status = "closed";
    session.closedAt = new Date();
    session.closingBalance = closingBalance ?? session.openingBalance + totalRevenue;
    session.closingNote = closingNote;
    await session.save();

    res.status(200).json({
      status: "success",
      message: "POS session closed.",
      summary: {
        session,
        orderCount,
        totalRevenue,
      },
    });
  }
);

// ─── GET ACTIVE SESSION ────────────────────────────────────────────────────────
// GET /api/pos/session/active

export const getActiveSession = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await POSSession.findOne({ status: "open" })
      .populate("openedBy", "name email")
      .populate("cashierId", "name email");

    if (!session) {
      return res.status(200).json({
        status: "success",
        session: null,
        message: "No active session.",
      });
    }

    // Also return today's order count + revenue
    const orders = await POSOrder.find({
      sessionId: session._id,
      status: "paid",
    });

    res.status(200).json({
      status: "success",
      session,
      stats: {
        orderCount: orders.length,
        totalRevenue: orders.reduce((s, o) => s + o.total, 0),
      },
    });
  }
);

// ─── SWITCH CASHIER ────────────────────────────────────────────────────────────
// POST /api/pos/session/switch-cashier
// Body: { newCashierId }

export const switchCashier = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { newCashierId } = req.body;
    if (!newCashierId) {
      return next(new ErrorHandler("newCashierId is required.", 400));
    }

    const session = await POSSession.findOne({ status: "open" });
    if (!session) {
      return next(new ErrorHandler("No open session to switch cashier on.", 404));
    }

    if (session.cashierId.toString() === newCashierId) {
      return next(new ErrorHandler("The selected cashier is already active.", 400));
    }

    // Record in audit trail
    session.cashierHistory.push({
      cashierId: newCashierId,
      switchedAt: new Date(),
      switchedBy: req.user!._id,
    });

    session.cashierId = newCashierId;
    await session.save();

    await session.populate("cashierId", "name email");

    res.status(200).json({
      status: "success",
      message: "Cashier switched successfully.",
      session,
    });
  }
);

// ─── CREATE ORDER ──────────────────────────────────────────────────────────────
// POST /api/pos/order
// Body: { cart, paymentLines, customerId?, note?, discountAmount? }

const TAX_RATE = 0.1;

export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await POSSession.findOne({ status: "open" });
    if (!session) {
      return next(
        new ErrorHandler("Cannot create an order — no open session.", 409)
      );
    }

    const { cart, paymentLines, customerId, customerName, note, discountAmount = 0 } =
      req.body;

    if (!cart || cart.length === 0) {
      return next(new ErrorHandler("Cart cannot be empty.", 400));
    }

    // Compute totals server-side (never trust the client for money)
    const subtotal: number = cart.reduce(
      (acc: number, item: { price: number; qty: number; discount: number }) =>
        acc + item.price * item.qty * (1 - (item.discount || 0) / 100),
      0
    );

    const taxAmount = (subtotal - discountAmount) * TAX_RATE;
    const total = subtotal - discountAmount + taxAmount;
    const amountPaid: number = paymentLines.reduce(
      (s: number, l: { amount: number }) => s + l.amount,
      0
    );
    const change = Math.max(0, amountPaid - total);

    const order = await POSOrder.create({
      sessionId: session._id,
      cashierId: session.cashierId,   // current cashier at time of order
      openedBy: session.openedBy,
      customerId,
      customerName,
      cart,
      paymentLines,
      subtotal,
      taxAmount,
      discountAmount,
      total,
      amountPaid,
      change,
      note,
      receiptNumber: generateReceiptNumber(),
    });

    res.status(201).json({
      status: "success",
      order,
    });
  }
);