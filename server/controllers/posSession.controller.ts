import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { odooRequest } from "../odoo/odoo.client.js";

// ══════════════════════════════════════════════════════════════════
//  OPEN SESSION
//  POST /api/pos/session/open
//  Body: { configId: number }
// ══════════════════════════════════════════════════════════════════
export const openSession = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { configId } = req.body;

    if (!configId) {
      return next(new ErrorHandler("configId مطلوب", 400));
    }

    // ── تحقق ما في جلسة مفتوحة بالفعل لنفس الـ config ──────────────
    const existing = await odooRequest<any[]>(
      "pos.session",
      "search_read",
      [[["state", "=", "opened"], ["config_id", "=", configId]]],
      { fields: ["id", "name"], limit: 1 }
    );

    if (existing?.length) {
      return next(
        new ErrorHandler(
          `جلسة مفتوحة بالفعل لهذا الـ config: ${existing[0].name}`,
          409
        )
      );
    }

    // ── إنشاء الجلسة ─────────────────────────────────────────────────
    const sessionId = await odooRequest<number>("pos.session", "create", [
      { config_id: configId },
    ]);

    if (!sessionId) {
      return next(new ErrorHandler("فشل إنشاء الجلسة في Odoo", 500));
    }

    // ── فتح الجلسة ───────────────────────────────────────────────────
    await odooRequest("pos.session", "action_pos_session_open", [[sessionId]]);

    // ── جلب بيانات الجلسة الجديدة ────────────────────────────────────
    const sessions = await odooRequest<any[]>(
      "pos.session",
      "read",
      [[sessionId]],
      { fields: ["id", "name", "state", "config_id", "user_id", "start_at"] }
    );

    res.status(201).json({
      status: "success",
      message: "تم فتح الجلسة بنجاح",
      session: sessions?.[0] ?? { id: sessionId },
    });
  }
);

// ══════════════════════════════════════════════════════════════════
//  CLOSE SESSION
//  POST /api/pos/session/close
//  Body: { sessionId: number }
// ══════════════════════════════════════════════════════════════════
export const closeSession = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { sessionId } = req.body;

    if (!sessionId) {
      return next(new ErrorHandler("sessionId مطلوب", 400));
    }

    // ── تحقق الجلسة موجودة ومفتوحة ──────────────────────────────────
    const sessions = await odooRequest<any[]>(
      "pos.session",
      "search_read",
      [[["id", "=", sessionId], ["state", "=", "opened"]]],
      { fields: ["id", "name", "state"], limit: 1 }
    );

    if (!sessions?.length) {
      return next(
        new ErrorHandler("الجلسة غير موجودة أو مغلقة بالفعل", 404)
      );
    }

    // ── إغلاق الجلسة ─────────────────────────────────────────────────
    await odooRequest(
      "pos.session",
      "action_pos_session_closing_control",
      [[sessionId]]
    );

    res.status(200).json({
      status: "success",
      message: "تم إغلاق الجلسة بنجاح",
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
    const sessions = await odooRequest<any[]>(
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

    // ── إذا في جلسة، جلب إحصائياتها ─────────────────────────────────
    let stats = null;
    if (session) {
      const orders = await odooRequest<any[]>(
        "pos.order",
        "search_read",
        [[["session_id", "=", session.id], ["state", "=", "paid"]]],
        { fields: ["amount_total"], limit: 1000 }
      );

      stats = {
        orderCount: orders.length,
        totalRevenue: orders.reduce((s, o) => s + (o.amount_total ?? 0), 0),
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
      return next(new ErrorHandler("newCashierId مطلوب", 400));
    }

    // ── جلب الجلسة المفتوحة ───────────────────────────────────────────
    const sessions = await odooRequest<any[]>(
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
      return next(new ErrorHandler("لا توجد جلسة مفتوحة", 404));
    }

    // ── منع التبديل لنفس الكاشير ──────────────────────────────────────
    if (session.user_id?.[0] === Number(newCashierId)) {
      return next(new ErrorHandler("هذا الكاشير نشط بالفعل", 400));
    }

    // ── تحديث الكاشير في Odoo ─────────────────────────────────────────
    await odooRequest("pos.session", "write", [
      [session.id],
      { user_id: Number(newCashierId) },
    ]);

    // ── جلب الجلسة بعد التحديث ───────────────────────────────────────
    const updated = await odooRequest<any[]>(
      "pos.session",
      "read",
      [[session.id]],
      { fields: ["id", "name", "user_id", "state"] }
    );

    res.status(200).json({
      status: "success",
      message: "تم تغيير الكاشير بنجاح",
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

// payment method IDs — عدّلها حسب الـ IDs الحقيقية في Odoo عندك
// جلبها عبر: GET /api/pos/payment-methods
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
      return next(new ErrorHandler("السلة فارغة", 400));
    }

    if (!paymentLines?.length) {
      return next(new ErrorHandler("طريقة الدفع مطلوبة", 400));
    }

    // ── جلب الجلسة المفتوحة ───────────────────────────────────────────
    const sessions = await odooRequest<any[]>(
      "pos.session",
      "search_read",
      [[["state", "=", "opened"]]],
      { fields: ["id", "name"], limit: 1 }
    );

    const session = sessions?.[0];

    if (!session) {
      return next(new ErrorHandler("لا توجد جلسة POS مفتوحة", 409));
    }

    // ── حساب المبالغ ──────────────────────────────────────────────────
    const amountPaid = paymentLines.reduce((s, p) => s + p.amount, 0);

    const subtotal = cart.reduce(
      (s, item) => s + item.price * item.qty * (1 - (item.discount ?? 0) / 100),
      0
    );

    const amountReturn = Math.max(0, amountPaid - subtotal);

    // ── إنشاء الطلب مع الـ lines مباشرة (أفضل من loop منفصل) ─────────
    const orderLines = cart.map((item) => [
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

    const orderId = await odooRequest<number>("pos.order", "create", [
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
      return next(new ErrorHandler("فشل إنشاء الطلب في Odoo", 500));
    }

    // ── تسجيل المدفوعات ───────────────────────────────────────────────
    for (const p of paymentLines) {
      const methodId = PAYMENT_METHOD_IDS[p.method];

      if (!methodId) {
        return next(
          new ErrorHandler(`طريقة الدفع غير معروفة: ${p.method}`, 400)
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

    // ── تأكيد الدفع ───────────────────────────────────────────────────
    await odooRequest("pos.order", "action_pos_order_paid", [[orderId]]);

    res.status(201).json({
      status: "success",
      message: "تم إنشاء الطلب بنجاح",
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
      return next(new ErrorHandler("sessionId مطلوب", 400));
    }

    const orders = await odooRequest<any[]>(
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
    const products = await odooRequest<any[]>(
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

    const customers = await odooRequest<any[]>(
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
      return next(new ErrorHandler("اسم الزبون مطلوب", 400));
    }

    const customerId = await odooRequest<number>("res.partner", "create", [
      {
        name,
        phone: phone ?? false,
        email: email ?? false,
        customer_rank: 1,
      },
    ]);

    res.status(201).json({
      status: "success",
      message: "تم إنشاء الزبون بنجاح",
      customerId,
    });
  }
);

// ══════════════════════════════════════════════════════════════════
//  GET PAYMENT METHODS  ← مهم لمعرفة الـ IDs الحقيقية
//  GET /api/pos/payment-methods
// ══════════════════════════════════════════════════════════════════
export const getPaymentMethods = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const methods = await odooRequest<any[]>(
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
    const configs = await odooRequest<any[]>(
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