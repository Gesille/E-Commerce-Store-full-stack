import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import POSOrder from "../models/POSOrder.js";
import POSSession from "../models/POSSession.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { odooRequest } from "../odoo/odoo.client.js";

// ─── Helper ────────────────────────────────────────────────────────────────────

function generateSessionName(): string {
  const date = new Date().toISOString().slice(0, 10); 
  return `Session — ${date}`;
}

function generateReceiptNumber(): string {
  return `RCP-${Date.now().toString(36).toUpperCase()}`;
}

// OPEN SESSION
export const openSession = async (req:Request, res:Response, next:NextFunction) => {
  const { configId, userId } = req.body;

  const sessionId = await odooRequest("pos.session", "create", [
    {
      config_id: configId,
      user_id: userId,
    },
  ]);

  await odooRequest("pos.session", "action_pos_session_open", [
    [sessionId],
  ]);

  res.json({ status: "success", sessionId });
};

//  CLOSE SESSION 


export const closeSession = async (req:Request, res:Response, next:NextFunction) => {
  const { sessionId } = req.body;

  await odooRequest("pos.session", "action_pos_session_closing_control", [
    [sessionId],
  ]);

  res.json({ status: "success" });
};

//  GET ACTIVE SESSION 

export const getActiveSession = async (req:Request, res:Response, next:NextFunction) => {
  const session = await odooRequest("pos.session", "search_read", [
    [["state", "=", "opened"]],
  ]);

  res.json({
    status: "success",
    session: session[0] || null,
  });
};

// ─── SWITCH CASHIER ────────────────────────────────────────────────────────────

export const switchCashier = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { newCashierId } = req.body;

    if (!newCashierId) {
      return next(new ErrorHandler("newCashierId is required.", 400));
    }

    //  Find active Odoo session
    const sessions = await odooRequest(
      "pos.session",
      "search_read",
      [[["state", "=", "opened"]]],
      {
        limit: 1,
      }
    );

    const session = sessions?.[0];

    if (!session) {
      return next(new ErrorHandler("No open session found.", 404));
    }

    //  Prevent switching to same cashier
    if (session.user_id?.[0] === Number(newCashierId)) {
      return next(
        new ErrorHandler("The selected cashier is already active.", 400)
      );
    }

    //  Update cashier in Odoo
    await odooRequest("pos.session", "write", [
      [session.id],
      {
        user_id: Number(newCashierId),
      },
    ]);

    //  Return updated session
    const updatedSession = await odooRequest(
      "pos.session",
      "read",
      [[session.id]],
      {
        fields: ["id", "name", "user_id", "state"],
      }
    );

    res.status(200).json({
      status: "success",
      message: "Cashier switched successfully.",
      session: updatedSession?.[0],
    });
  }
);

//  CREATE ORDER 
export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      cart,
      paymentLines,
      customerId,
      note,
    } = req.body;

    if (!cart?.length) {
      return next(new ErrorHandler("Cart cannot be empty", 400));
    }

    // Get active session
    const sessions = await odooRequest(
      "pos.session",
      "search_read",
      [[["state", "=", "opened"]]],
      { limit: 1 }
    );

    const session = sessions?.[0];

    if (!session) {
      return next(new ErrorHandler("No open POS session", 400));
    }

    //  Calculate paid amount
    const amountPaid = paymentLines.reduce(
      (sum: number, p: any) => sum + p.amount,
      0
    );

    // Create order
    const orderId = await odooRequest("pos.order", "create", [
      {
        session_id: session.id,
        partner_id: customerId || false,
        note: note || "",
        amount_paid: amountPaid,
        amount_return: 0,
      },
    ]);

    //Create lines
    for (const item of cart) {
      await odooRequest("pos.order.line", "create", [
        {
          order_id: orderId,
          product_id: item.productId,
          qty: item.qty,
          price_unit: item.price,
          discount: item.discount || 0,
        },
      ]);
    }

    // Payment method mapping
    const PAYMENT_METHODS: Record<string, number> = {
      cash: 1,
      card: 2,
      wallet: 3,
    };

    // Register payments
    for (const p of paymentLines) {
      await odooRequest("pos.payment", "create", [
        {
          pos_order_id: orderId,
          amount: p.amount,
          payment_method_id: PAYMENT_METHODS[p.method],
        },
      ]);
    }

    //Mark as paid
    await odooRequest(
      "pos.order",
      "action_pos_order_paid",
      [[orderId]]
    );

    res.status(201).json({
      status: "success",
      orderId,
    });
  }
);