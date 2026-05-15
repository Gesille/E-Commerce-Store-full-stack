import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { odooRequest } from "../odoo/odoo.client.js";


export const openSession = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { configId } = req.body;

    if (!configId) {
      return next(new ErrorHandler("configId is required", 400));
    }

    const existing = await odooRequest(
      "pos.session",
      "search_read",
      [[["state", "=", "opened"], ["config_id", "=", configId]]],
      { fields: ["id", "name"], limit: 1 }
    );

    if (existing?.length) {
      return next(
        new ErrorHandler(
          `A session is already open for this config: ${existing[0].name}`,
          409
        )
      );
    }

    // ── Create session ────────────────────────────────────────────────
    const sessionId = await odooRequest("pos.session", "create", [
      { config_id: configId },
    ]);

    if (!sessionId) {
      return next(new ErrorHandler("Failed to create session in Odoo", 500));
    }

    // ── Open session ──────────────────────────────────────────────────
    await odooRequest("pos.session", "action_pos_session_open", [[sessionId]]);

    // ── Fetch new session data ────────────────────────────────────────
    const sessions = await odooRequest(
      "pos.session",
      "read",
      [[sessionId]],
      { fields: ["id", "name", "state", "config_id", "user_id", "start_at"] }
    );

    res.status(201).json({
      status: "success",
      message: "Session opened successfully",
      session: sessions?.[0] ?? { id: sessionId },
    });
  }
);


export const closeSession = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { sessionId } = req.body;

    if (!sessionId) {
      return next(new ErrorHandler("sessionId is required", 400));
    }

    const sessions = await odooRequest(
      "pos.session",
      "search_read",
      [[["id", "=", sessionId], ["state", "=", "opened"]]],
      { fields: ["id", "name", "state"], limit: 1 }
    );

    if (!sessions?.length) {
      return next(
        new ErrorHandler("Session not found or already closed", 404)
      );
    }

    await odooRequest(
      "pos.session",
      "action_pos_session_closing_control",
      [[sessionId]]
    );

    res.status(200).json({
      status: "success",
      message: "Session closed successfully",
      sessionId,
    });
  }
);

// ══════════════════════════════════════════════════════════════════
//  GET ACTIVE SESSION
//  GET /api/pos/session/active
// ══════════════════════════════════════════════════════════════════
export const getActiveSession = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
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
      }
    );

    const session = sessions?.[0] ?? null;

    // ── If a session exists, fetch its stats ──────────────────────────
    let stats = null;
    if (session) {
      const orders = await odooRequest(
        "pos.order",
        "search_read",
        [[["session_id", "=", session.id], ["state", "=", "paid"]]],
        { fields: ["amount_total"], limit: 1000 }
      );

      stats = {
        orderCount: orders.length,
        totalRevenue: orders.reduce((s: number, o: any) => s + (o.amount_total ?? 0), 0),
      };
    }

    res.status(200).json({
      status: "success",
      session,
      stats,
    });
  }
);

// ══════════════════════════════════════════════════════════════════
//  SWITCH CASHIER
//  POST /api/pos/session/switch-cashier
//  Body: { newCashierId: number }
// ══════════════════════════════════════════════════════════════════
export const switchCashier = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { newCashierId } = req.body;

    if (!newCashierId) {
      return next(new ErrorHandler("newCashierId is required", 400));
    }

    // ── Fetch the open session ────────────────────────────────────────
    const sessions = await odooRequest(
      "pos.session",
      "search_read",
      [[["state", "=", "opened"]]],
      {
        fields: ["id", "name", "user_id", "state"],
        limit: 1,
      }
    );

    const session = sessions?.[0];

    if (!session) {
      return next(new ErrorHandler("No open session found", 404));
    }

    // ── Prevent switching to the same cashier ─────────────────────────
    if (session.user_id?.[0] === Number(newCashierId)) {
      return next(new ErrorHandler("This cashier is already active", 400));
    }

    // ── Update cashier in Odoo ────────────────────────────────────────
    await odooRequest("pos.session", "write", [
      [session.id],
      { user_id: Number(newCashierId) },
    ]);

    // ── Fetch session after update ────────────────────────────────────
    const updated = await odooRequest(
      "pos.session",
      "read",
      [[session.id]],
      { fields: ["id", "name", "user_id", "state"] }
    );

    res.status(200).json({
      status: "success",
      message: "Cashier switched successfully",
      session: updated?.[0],
    });
  }
);

// ══════════════════════════════════════════════════════════════════
//  CREATE ORDER
//  POST /api/pos/order
//  Body: { cart, paymentLines, customerId?, note? }
// ══════════════════════════════════════════════════════════════════

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

// Payment method IDs — update these to match the real IDs in your Odoo instance
// Fetch them via: GET /api/pos/payment-methods
const PAYMENT_METHOD_IDS: Record<string, number> = {
  cash:   1,
  card:   2,
  wallet: 3,
};

export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      cart,
      paymentLines,
      customerId,
      note,
    }: {
      cart: CartItem[];
      paymentLines: PaymentLine[];
      customerId?: number;
      note?: string;
    } = req.body;

    // ── Validation ────────────────────────────────────────────────────
    if (!cart?.length) {
      return next(new ErrorHandler("Cart is empty", 400));
    }

    if (!paymentLines?.length) {
      return next(new ErrorHandler("Payment method is required", 400));
    }

    // ── Fetch the open session ────────────────────────────────────────
    const sessions = await odooRequest(
      "pos.session",
      "search_read",
      [[["state", "=", "opened"]]],
      { fields: ["id", "name"], limit: 1 }
    );

    const session = sessions?.[0];

    if (!session) {
      return next(new ErrorHandler("No open POS session found", 409));
    }

    // ── Calculate amounts ─────────────────────────────────────────────
    const amountPaid = paymentLines.reduce((s: number, p: PaymentLine) => s + p.amount, 0);

    const subtotal = cart.reduce(
      (s: number, item: CartItem) => s + item.price * item.qty * (1 - (item.discount ?? 0) / 100),
      0
    );

    const amountReturn = Math.max(0, amountPaid - subtotal);

    // ── Build order lines ─────────────────────────────────────────────
    const orderLines = cart.map((item: CartItem) => [
      0, 0,
      {
        product_id: item.productId,
        qty: item.qty,
        price_unit: item.price,
        discount: item.discount ?? 0,
        price_subtotal: item.price * item.qty * (1 - (item.discount ?? 0) / 100),
        price_subtotal_incl: item.price * item.qty * (1 - (item.discount ?? 0) / 100),
      },
    ]);

    const orderId = await odooRequest("pos.order", "create", [
      {
        session_id: session.id,
        partner_id: customerId ?? false,
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
          new ErrorHandler(`Unknown payment method: ${p.method}`, 400)
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

    // ── Confirm payment ───────────────────────────────────────────────
    await odooRequest("pos.order", "action_pos_order_paid", [[orderId]]);

    res.status(201).json({
      status: "success",
      message: "Order created successfully",
      orderId,
    });
  }
);

// ══════════════════════════════════════════════════════════════════
//  GET SESSION ORDERS
//  GET /api/pos/orders/:sessionId
// ══════════════════════════════════════════════════════════════════
export const getSessionOrders = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const sessionId = Number(req.params.sessionId);

    if (!sessionId) {
      return next(new ErrorHandler("sessionId is required", 400));
    }

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
          "amount_total",
          "amount_paid",
          "amount_return",
          "state",
          "lines",
          "payment_ids",
        ],
        order: "date_order desc",
      }
    );

    res.status(200).json({
      status: "success",
      count: orders.length,
      orders,
    });
  }
);

// ══════════════════════════════════════════════════════════════════
//  GET PRODUCTS
//  GET /api/pos/products
// ══════════════════════════════════════════════════════════════════
export const getProducts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const products = await odooRequest(
      "product.product",
      "search_read",
      [[["available_in_pos", "=", true], ["active", "=", true]]],
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
      }
    );

    res.status(200).json({
      status: "success",
      count: products.length,
      products,
    });
  }
);

// ══════════════════════════════════════════════════════════════════
//  GET CUSTOMERS
//  GET /api/pos/customers?search=...
// ══════════════════════════════════════════════════════════════════
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
      }
    );

    res.status(200).json({
      status: "success",
      count: customers.length,
      customers,
    });
  }
);

// ══════════════════════════════════════════════════════════════════
//  CREATE CUSTOMER
//  POST /api/pos/customers
//  Body: { name, phone?, email? }
// ══════════════════════════════════════════════════════════════════
export const createCustomer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, phone, email } = req.body;

    if (!name) {
      return next(new ErrorHandler("Customer name is required", 400));
    }

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
  }
);

// ══════════════════════════════════════════════════════════════════
//  GET PAYMENT METHODS  ← useful for finding real IDs
//  GET /api/pos/payment-methods
// ══════════════════════════════════════════════════════════════════
export const getPaymentMethods = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const methods = await odooRequest(
      "pos.payment.method",
      "search_read",
      [[["active", "=", true]]],
      { fields: ["id", "name", "is_cash_count"] }
    );

    res.status(200).json({
      status: "success",
      methods,
    });
  }
);

// ══════════════════════════════════════════════════════════════════
//  GET POS CONFIGS
//  GET /api/pos/configs
// ══════════════════════════════════════════════════════════════════
export const getPOSConfigs = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const configs = await odooRequest(
      "pos.config",
      "search_read",
      [[["active", "=", true]]],
      { fields: ["id", "name", "currency_id"] }
    );

    res.status(200).json({
      status: "success",
      configs,
    });
  }
);