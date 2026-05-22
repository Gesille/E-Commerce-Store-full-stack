import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { odooRequest } from "../odoo/odoo.client.js";
import CashierShiftLog from "../models/Cashiershiftlog.js";
import POSOrder from "../models/POSOrder.js";

// ─── Period helpers ───────────────────────────────────────────────────────────

type Period = "today" | "week" | "month";

function getPeriodRange(period: Period): { from: Date; to: Date; prevFrom: Date; prevTo: Date } {
  const now = new Date();
  let from: Date, to: Date, prevFrom: Date, prevTo: Date;

  if (period === "today") {
    from = new Date(now); from.setHours(0, 0, 0, 0);
    to   = new Date(now); to.setHours(23, 59, 59, 999);
    prevFrom = new Date(from); prevFrom.setDate(prevFrom.getDate() - 1);
    prevTo   = new Date(to);   prevTo.setDate(prevTo.getDate() - 1);
  } else if (period === "week") {
    const day = now.getDay(); // 0=Sun
    const diff = (day === 0 ? -6 : 1 - day);
    from = new Date(now); from.setDate(now.getDate() + diff); from.setHours(0, 0, 0, 0);
    to   = new Date(from); to.setDate(from.getDate() + 6);   to.setHours(23, 59, 59, 999);
    prevFrom = new Date(from); prevFrom.setDate(prevFrom.getDate() - 7);
    prevTo   = new Date(to);   prevTo.setDate(prevTo.getDate() - 7);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevTo   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  }

  return { from, to, prevFrom, prevTo };
}

/** Format a Date to Odoo-style string: "YYYY-MM-DD HH:MM:SS" */
function toOdooDate(d: Date): string {
  return d.toISOString().replace("T", " ").substring(0, 19);
}

/** Build the Odoo domain filter for a date range on pos.order */
function orderDomain(from: Date, to: Date, extra: any[] = []): any[] {
  return [
    ["date_order", ">=", toOdooDate(from)],
    ["date_order", "<=", toOdooDate(to)],
    ["state", "in", ["paid", "done", "invoiced"]],
    ...extra,
  ];
}

// ─── KPI Summary 

export const getKpiSummary = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId);

    const { from, to, prevFrom, prevTo } = getPeriodRange(period);

    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];

    // Fetch current and previous period orders from Odoo
    const [currentOrders, prevOrders, refundOrders, prevRefunds] = await Promise.all([
      odooRequest("pos.order", "search_read",
        [orderDomain(from, to, sessionFilter)],
        { fields: ["amount_total", "lines"], limit: 5000 }
      ),
      odooRequest("pos.order", "search_read",
        [orderDomain(prevFrom, prevTo, sessionFilter)],
        { fields: ["amount_total"], limit: 5000 }
      ),
      // Refunds: state = "cancel" or amount < 0
      odooRequest("pos.order", "search_read",
        [[
          ["date_order", ">=", toOdooDate(from)],
          ["date_order", "<=", toOdooDate(to)],
          ["amount_total", "<", 0],
          ...sessionFilter,
        ]],
        { fields: ["amount_total"], limit: 5000 }
      ),
      odooRequest("pos.order", "search_read",
        [[
          ["date_order", ">=", toOdooDate(prevFrom)],
          ["date_order", "<=", toOdooDate(prevTo)],
          ["amount_total", "<", 0],
          ...sessionFilter,
        ]],
        { fields: ["amount_total"], limit: 5000 }
      ),
    ]);

    const totalRevenue = currentOrders.reduce((s: number, o: any) => s + (o.amount_total ?? 0), 0);
    const prevRevenue  = prevOrders.reduce((s: number, o: any) => s + (o.amount_total ?? 0), 0);
    const orderCount   = currentOrders.length;
    const prevCount    = prevOrders.length;
    const avgOrder     = orderCount > 0 ? totalRevenue / orderCount : 0;
    const prevAvg      = prevCount  > 0 ? prevRevenue  / prevCount  : 0;
    const totalRefunds = Math.abs(refundOrders.reduce((s: number, o: any) => s + (o.amount_total ?? 0), 0));
    const prevRefundAmt= Math.abs(prevRefunds.reduce((s: number, o: any) => s + (o.amount_total ?? 0), 0));

    const pctDelta = (curr: number, prev: number) =>
      prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 1000) / 10;

    const periodLabel = period === "today" ? "vs yesterday" : period === "week" ? "vs last week" : "vs last month";

    res.status(200).json({
      status: "success",
      period,
      kpis: [
        {
          label: "Total Revenue",
          value: totalRevenue,
          prev: prevRevenue,
          delta: pctDelta(totalRevenue, prevRevenue),
          up: totalRevenue >= prevRevenue,
          sub: periodLabel,
        },
        {
          label: "Orders",
          value: orderCount,
          prev: prevCount,
          delta: pctDelta(orderCount, prevCount),
          up: orderCount >= prevCount,
          sub: periodLabel,
        },
        {
          label: "Avg Order Value",
          value: avgOrder,
          prev: prevAvg,
          delta: pctDelta(avgOrder, prevAvg),
          up: avgOrder >= prevAvg,
          sub: periodLabel,
        },
        {
          label: "Refunds",
          value: totalRefunds,
          prev: prevRefundAmt,
          delta: pctDelta(totalRefunds, prevRefundAmt),
          up: totalRefunds <= prevRefundAmt, // fewer refunds = good
          sub: periodLabel,
        },
      ],
    });
  }
);

// ─── Revenue Over Time ────────────────────────────────────────────────────────
// GET /api/pos/analytics/revenue-chart?period=today|week|month&configId=1

export const getRevenueChart = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId);
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];

    const { from, to, prevFrom, prevTo } = getPeriodRange(period);

    const [currentOrders, prevOrders] = await Promise.all([
      odooRequest("pos.order", "search_read",
        [orderDomain(from, to, sessionFilter)],
        { fields: ["date_order", "amount_total"], limit: 5000 }
      ),
      odooRequest("pos.order", "search_read",
        [orderDomain(prevFrom, prevTo, sessionFilter)],
        { fields: ["date_order", "amount_total"], limit: 5000 }
      ),
    ]);

    // Bucket function returns a bucket key and label for each order
    function bucket(dateStr: string): string {
      const d = new Date(dateStr);
      if (period === "today") {
        return String(d.getHours()); // "8", "9", …
      } else if (period === "week") {
        return ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][(d.getDay() + 6) % 7];
      } else {
        // Week of month: W1–W4
        const weekNo = Math.ceil(d.getDate() / 7);
        return `W${weekNo}`;
      }
    }

    function aggregateByBucket(orders: any[]): Record<string, number> {
      const acc: Record<string, number> = {};
      for (const o of orders) {
        const key = bucket(o.date_order);
        acc[key] = (acc[key] ?? 0) + (o.amount_total ?? 0);
      }
      return acc;
    }

    const curr = aggregateByBucket(currentOrders);
    const prev = aggregateByBucket(prevOrders);

    // Build ordered labels for each period
    let labels: string[] = [];
    if (period === "today") {
      labels = Array.from({ length: 14 }, (_, i) => String(i + 7)); // 7am–8pm
    } else if (period === "week") {
      labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    } else {
      labels = ["W1","W2","W3","W4"];
    }

    const formatLabel = (l: string) => {
      if (period === "today") {
        const h = Number(l);
        return h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`;
      }
      return l;
    };

    const data = labels.map((l) => ({
      label: formatLabel(l),
      revenue: Math.round((curr[l] ?? 0) * 100) / 100,
      prev:    Math.round((prev[l] ?? 0) * 100) / 100,
    }));

    res.status(200).json({ status: "success", period, data });
  }
);

// ─── Top Products ─────────────────────────────────────────────────────────────
// GET /api/pos/analytics/top-products?period=today|week|month&configId=1&limit=6

export const getTopProducts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId);
    const limit = Number(req.query.limit) || 6;
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];

    const { from, to } = getPeriodRange(period);

    // Get order lines within the period
    const orders = await odooRequest("pos.order", "search_read",
      [orderDomain(from, to, sessionFilter)],
      { fields: ["lines"], limit: 5000 }
    );

    const orderIds = orders.map((o: any) => o.id);
    if (!orderIds.length) {
      return res.status(200).json({ status: "success", period, products: [] });
    }

    const lines = await odooRequest("pos.order.line", "search_read",
      [[["order_id", "in", orderIds]]],
      { fields: ["product_id", "qty", "price_subtotal_incl"], limit: 20000 }
    );

    // Aggregate by product
    const productMap: Record<string, { name: string; revenue: number; orders: number }> = {};
    for (const line of lines) {
      const id   = String(line.product_id?.[0] ?? "unknown");
      const name = line.product_id?.[1] ?? "Unknown Product";
      if (!productMap[id]) productMap[id] = { name, revenue: 0, orders: 0 };
      productMap[id].revenue += line.price_subtotal_incl ?? 0;
      productMap[id].orders  += line.qty ?? 0;
    }

    const sorted = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    const maxRevenue = sorted[0]?.revenue ?? 1;
    const products = sorted.map((p, i) => ({
      ...p,
      revenue: Math.round(p.revenue * 100) / 100,
      orders:  Math.round(p.orders),
      pct:     Math.round((p.revenue / maxRevenue) * 100),
      rank:    i + 1,
    }));

    res.status(200).json({ status: "success", period, products });
  }
);

// ─── Recent Orders ────────────────────────────────────────────────────────────
// GET /api/pos/analytics/recent-orders?configId=1&limit=6

export const getRecentOrders = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const configId = Number(req.query.configId);
    const limit = Number(req.query.limit) || 10;
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];

    const orders = await odooRequest("pos.order", "search_read",
      [[
        ["state", "in", ["paid", "done", "invoiced", "cancel"]],
        ...sessionFilter,
      ]],
      {
        fields: [
          "name", "date_order", "partner_id", "amount_total",
          "state", "lines", "config_id", "user_id",
        ],
        order: "date_order desc",
        limit,
      }
    );

    const now = Date.now();
    const result = orders.map((o: any) => {
      const diffMs  = now - new Date(o.date_order).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const timeAgo = diffMin < 1 ? "just now"
        : diffMin < 60 ? `${diffMin} min ago`
        : `${Math.floor(diffMin / 60)}h ago`;

      let status: "paid" | "refund" | "pending" = "paid";
      if (o.state === "cancel" || o.amount_total < 0) status = "refund";
      else if (o.state === "draft") status = "pending";

      return {
        id: o.name,
        time: timeAgo,
        channel: o.config_id?.[1] ?? "POS",
        amount: o.amount_total,
        status,
        items: o.lines?.length ?? 0,
        cashier: o.user_id?.[1] ?? "",
        customer: o.partner_id?.[1] ?? null,
      };
    });

    res.status(200).json({ status: "success", orders: result });
  }
);

// ─── Payment Methods ──────────────────────────────────────────────────────────


export const getPaymentMethodsSplit = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId) || 0;
    const sessionFilter: any[] = configId
      ? [["config_id", "=", configId]]
      : [];

    const { from, to } = getPeriodRange(period);

    // ─── 1. Fetch orders ───────────────────────────────────────────────────
    const orders = await odooRequest(
      "pos.order",
      "search_read",
      [orderDomain(from, to, sessionFilter)],
      { fields: ["id"], limit: 5000 }
    );

    const orderIds: number[] = orders.map((o: any) => o.id);

    if (!orderIds.length) {
      return res.status(200).json({
        status: "success",
        period,
        total: 0,
        methods: [],
      });
    }

    // ─── 2. Fetch payments (handle Odoo v14/v15 field name difference) ─────
    let payments: any[] = [];
    try {
      // Odoo 16+ uses "pos_order_id"
      payments = await odooRequest(
        "pos.payment",
        "search_read",
        [[["pos_order_id", "in", orderIds]]],
        { fields: ["payment_method_id", "amount"], limit: 20000 }
      );
    } catch {
      // Odoo 14/15 uses "order_id"
      payments = await odooRequest(
        "pos.payment",
        "search_read",
        [[["order_id", "in", orderIds]]],
        { fields: ["payment_method_id", "amount"], limit: 20000 }
      );
    }

    if (!payments.length) {
      return res.status(200).json({
        status: "success",
        period,
        total: 0,
        methods: [],
      });
    }

    // ─── 3. Aggregate amounts per payment method ───────────────────────────
    const methodMap: Record<string, { name: string; amount: number }> = {};
    let total = 0;

    for (const p of payments) {
      const id = String(p.payment_method_id?.[0] ?? "unknown");
      const name = (p.payment_method_id?.[1] as string) ?? "Unknown";
      const amount = typeof p.amount === "number" ? p.amount : 0;

      if (!methodMap[id]) {
        methodMap[id] = { name, amount: 0 };
      }
      methodMap[id].amount += amount;
      total += amount;
    }

    // ─── 4. Format & sort ──────────────────────────────────────────────────
    const methods = Object.entries(methodMap)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .map(([id, m]) => ({
        id: id === "unknown" ? null : Number(id),
        name: m.name,
        amount: Math.round(m.amount * 100) / 100,
        percentage:
          total > 0 ? Math.round((m.amount / total) * 10000) / 100 : 0,
      }));

    // ─── 5. Respond ────────────────────────────────────────────────────────
    return res.status(200).json({
      status: "success",
      period,
      total: Math.round(total * 100) / 100,
      methods,
    });
  }
);


// ─── Category Breakdown ───────────────────────────────────────────────────────
// GET /api/pos/analytics/categories?period=today|week|month&configId=1

export const getCategoryBreakdown = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId);
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];

    const { from, to } = getPeriodRange(period);

    const orders = await odooRequest("pos.order", "search_read",
      [orderDomain(from, to, sessionFilter)],
      { fields: ["lines"], limit: 5000 }
    );

    const orderIds = orders.map((o: any) => o.id);
    if (!orderIds.length) {
      return res.status(200).json({ status: "success", period, categories: [] });
    }

    const lines = await odooRequest("pos.order.line", "search_read",
      [[["order_id", "in", orderIds]]],
      { fields: ["product_id", "price_subtotal_incl", "qty"], limit: 20000 }
    );

    const productIds = [...new Set(lines.map((l: any) => l.product_id?.[0]).filter(Boolean))];

    // Fetch product categories
    const products = await odooRequest("product.product", "search_read",
      [[["id", "in", productIds]]],
      { fields: ["id", "categ_id"], limit: 1000 }
    );

    const productCategoryMap: Record<number, string> = {};
    for (const p of products) {
      productCategoryMap[p.id] = p.categ_id?.[1] ?? "Other";
    }

    const categoryMap: Record<string, { value: number; orders: number }> = {};
    let total = 0;
    for (const line of lines) {
      const pid  = line.product_id?.[0];
      const cat  = pid ? (productCategoryMap[pid] ?? "Other") : "Other";
      const rev  = line.price_subtotal_incl ?? 0;
      if (!categoryMap[cat]) categoryMap[cat] = { value: 0, orders: 0 };
      categoryMap[cat].value  += rev;
      categoryMap[cat].orders += 1;
      total += rev;
    }

    const COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#e11d48","#06b6d4","#84cc16"];
    const categories = Object.entries(categoryMap)
      .sort((a, b) => b[1].value - a[1].value)
      .map(([name, data], i) => ({
        name,
        value:  Math.round(data.value * 100) / 100,
        orders: data.orders,
        color:  COLORS[i % COLORS.length],
        pct:    total > 0 ? Math.round((data.value / total) * 100) : 0,
      }));

    res.status(200).json({ status: "success", period, categories });
  }
);

// ─── Staff / Cashier Performance ──────────────────────────────────────────────
// GET /api/pos/analytics/staff?period=today|week|month&configId=1

export const getStaffPerformance = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId) || 0;
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];

    const { from, to, prevFrom, prevTo } = getPeriodRange(period);

    // Pull from Odoo — reliable source with cashier (user_id) on every order
    const [currentOrders, prevOrders] = await Promise.all([
      odooRequest(
        "pos.order",
        "search_read",
        [orderDomain(from, to, sessionFilter)],
        { fields: ["user_id", "amount_total"], limit: 5000 }
      ),
      odooRequest(
        "pos.order",
        "search_read",
        [orderDomain(prevFrom, prevTo, sessionFilter)],
        { fields: ["user_id", "amount_total"], limit: 5000 }
      ),
    ]);

    // Aggregate current period by cashier
    const currMap: Record<
      string,
      { name: string; sales: number; txn: number }
    > = {};
    for (const o of currentOrders) {
      const uid = String(o.user_id?.[0] ?? "unknown");
      const name = o.user_id?.[1] ?? "Unknown Cashier";
      if (!currMap[uid]) currMap[uid] = { name, sales: 0, txn: 0 };
      currMap[uid].sales += o.amount_total ?? 0;
      currMap[uid].txn += 1;
    }

    // Aggregate previous period for trend
    const prevMap: Record<string, number> = {};
    for (const o of prevOrders) {
      const uid = String(o.user_id?.[0] ?? "unknown");
      prevMap[uid] = (prevMap[uid] ?? 0) + (o.amount_total ?? 0);
    }

    const COLORS = [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#e11d48",
      "#06b6d4",
    ];

    const staff = Object.entries(currMap)
      .sort((a, b) => b[1].sales - a[1].sales)
      .map(([uid, data], i) => {
        const prev = prevMap[uid] ?? 0;
        const trend =
          prev > 0 ? Math.round(((data.sales - prev) / prev) * 100) : 0;
        const initials = data.name
          .split(" ")
          .map((w: string) => w[0])
          .join("")
          .substring(0, 2)
          .toUpperCase();
        return {
          cashierId: uid,
          initials,
          name: data.name,
          role: "Cashier",
          txn: data.txn,
          sales: Math.round(data.sales * 100) / 100,
          color: COLORS[i % COLORS.length],
          trend,
        };
      });

    res.status(200).json({ status: "success", period, staff });
  }
);


// ─── Revenue Target ───────────────────────────────────────────────────────────
// GET /api/pos/analytics/target?period=today|week|month&configId=1
// Targets are static defaults here; replace TARGET_* constants with your DB/config values.

const TARGETS: Record<Period, number> = {
  today: 10000,
  week:  60000,
  month: 240000,
};

export const getRevenueTarget = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId);
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];

    const { from, to } = getPeriodRange(period);

    const orders = await odooRequest("pos.order", "search_read",
      [orderDomain(from, to, sessionFilter)],
      { fields: ["amount_total"], limit: 5000 }
    );

    const current = orders.reduce((s: number, o: any) => s + (o.amount_total ?? 0), 0);
    const target  = TARGETS[period];
    const pct     = Math.min(100, Math.round((current / target) * 100));

    const label = period === "today" ? "Daily revenue target"
      : period === "week"  ? "Weekly revenue target"
      :                      "Monthly revenue target";

    res.status(200).json({
      status: "success",
      period,
      target: { target, current: Math.round(current * 100) / 100, pct, label },
    });
  }
);

// ─── Active Session Info ──────────────────────────────────────────────────────
// GET /api/pos/analytics/session-info?configId=1

export const getSessionInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const configId = Number(req.query.configId);
    if (!configId) return next(new ErrorHandler("configId is required", 400));

    const sessions = await odooRequest("pos.session", "search_read",
      [[["state", "=", "opened"], ["config_id", "=", configId]]],
      {
        fields: [
          "id", "name", "state", "start_at",
          "cash_register_balance_start", "user_id",
        ],
        limit: 1,
      }
    );

    const session = sessions?.[0] ?? null;
    if (!session) {
      return res.status(200).json({ status: "success", session: null, shift: null });
    }

    // Find the most recent active shift in this session
    const activeShift = await CashierShiftLog.findOne({
      odooSessionId: session.id,
      state: { $in: ["active", "paused"] },
    })
      .sort({ startTime: 1 })
      .populate("cashierId", "name role")
      .lean();

    // Duration of the session
    const startAt = new Date(session.start_at);
    const diffMs  = Date.now() - startAt.getTime();
    const hours   = Math.floor(diffMs / 3_600_000);
    const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
    const duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    // Cash variance (actual drawer vs expected opening float)
    const expectedFloat   = session.cash_register_balance_start ?? 0;

    // Get cash payments made in this session to calculate drawer total
    const cashPayments = await odooRequest("pos.payment", "search_read",
      [[
        ["session_id", "=", session.id],
        ["payment_method_id.is_cash_count", "=", true],
      ]],
      { fields: ["amount"], limit: 5000 }
    );
    const cashTotal    = cashPayments.reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
    const drawerTotal  = expectedFloat + cashTotal;
    const variance     = drawerTotal - expectedFloat;

    const cashier = activeShift ? (activeShift.cashierId as any) : null;

    res.status(200).json({
      status: "success",
      session: {
        id:          session.id,
        name:        session.name,
        state:       session.state,
        startedAt:   session.start_at,
        duration,
        cashier:     cashier?.name ?? session.user_id?.[1] ?? "—",
        cashInDrawer:    Math.round(drawerTotal  * 100) / 100,
        expectedFloat:   Math.round(expectedFloat * 100) / 100,
        variance:        Math.round(variance      * 100) / 100,
      },
    });
  }
);

// ─── Low Stock Items ──────────────────────────────────────────────────────────
// GET /api/pos/analytics/low-stock?threshold=10&limit=8

export const getLowStock = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const threshold = Number(req.query.threshold) || 10;
    const limit     = Number(req.query.limit) || 8;

    // Step 1: Fetch eligible products WITHOUT qty_available in the domain
    const products = await odooRequest("product.product", "search_read",
      [[
        ["available_in_pos", "=", true],
        ["active", "=", true],
        ["type", "in", ["product", "consu"]],
      ]],
      {
        fields: ["id", "name", "qty_available", "uom_id", "categ_id"],
        order: "name asc",   // qty_available can't be used in order either
      }
    );

    // Step 2: Filter and sort in JavaScript
    const items = products
      .filter((p: any) => (p.qty_available ?? 0) <= threshold)
      .sort((a: any, b: any) => (a.qty_available ?? 0) - (b.qty_available ?? 0))
      .slice(0, limit)
      .map((p: any) => ({
        id:       p.id,
        name:     p.name,
        stock:    p.qty_available ?? 0,
        unit:     p.uom_id?.[1]   ?? "units",
        threshold,
        critical: (p.qty_available ?? 0) <= Math.floor(threshold / 2),
        category: p.categ_id?.[1] ?? "Other",
      }));

    res.status(200).json({ status: "success", items });
  }
);

// ─── Peak Hours Heatmap ───────────────────────────────────────────────────────
// GET /api/pos/analytics/heatmap?configId=1
// Returns a 7×12 grid (Mon–Sun × 8am–7pm) of order counts

export const getPeakHoursHeatmap = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const configId = Number(req.query.configId);
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];

    // Look back 4 weeks for heatmap data
    const to   = new Date();
    const from = new Date(); from.setDate(from.getDate() - 28);

    const orders = await odooRequest("pos.order", "search_read",
      [[
        ["date_order", ">=", toOdooDate(from)],
        ["date_order", "<=", toOdooDate(to)],
        ["state", "in", ["paid", "done", "invoiced"]],
        ...sessionFilter,
      ]],
      { fields: ["date_order"], limit: 10000 }
    );

    // grid[dayIndex][hourIndex] = count  (day: 0=Mon, hour: 0=8am)
    const grid: number[][] = Array.from({ length: 7 }, () => Array(12).fill(0));

    for (const o of orders) {
      const d   = new Date(o.date_order);
      const dow = (d.getDay() + 6) % 7; // 0=Mon … 6=Sun
      const h   = d.getHours();         // 0–23
      if (h >= 8 && h <= 19) {
        grid[dow][h - 8]++;
      }
    }

    // Normalise over 4 weeks → average per hour per day-of-week
    const normalised = grid.map((row) => row.map((v) => Math.round(v / 4)));

    res.status(200).json({ status: "success", heatmap: normalised });
  }
);


// ─── Table Status ─────────────────────────────────────────────────────────────
// GET /api/pos/analytics/tables?configId=1

export const getTableStatus = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const configId = Number(req.query.configId);
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];

    // Fetch all tables (restaurant.table) for this config
    const tables = await odooRequest("restaurant.table", "search_read",
      [configId ? [["pos_config_id", "=", configId]] : []],
      { fields: ["id", "name", "seats", "state", "current_order_id"], limit: 100 }
    );

    // Get open orders on those tables to compute duration
    const tableOrderIds = tables
      .map((t: any) => t.current_order_id?.[0])
      .filter(Boolean);

    let orderMap: Record<number, any> = {};
    if (tableOrderIds.length) {
      const openOrders = await odooRequest("pos.order", "search_read",
        [[["id", "in", tableOrderIds]]],
        { fields: ["id", "date_order", "partner_id", "amount_total", "lines"], limit: 200 }
      );
      for (const o of openOrders) orderMap[o.id] = o;
    }

    const now = Date.now();
    const result = tables.map((t: any) => {
      const order = t.current_order_id ? orderMap[t.current_order_id[0]] : null;
      let duration = "—";
      if (order?.date_order) {
        const diffMin = Math.floor((now - new Date(order.date_order).getTime()) / 60000);
        duration = diffMin < 60 ? `${diffMin}m` : `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
      }

      // Odoo table states: "available" | "occupied"
      // Map reserved via a future_order check if you track reservations separately
      const status: "occupied" | "available" | "reserved" =
        t.state === "occupied" ? "occupied" : "available";

      return {
        id:       t.name,
        status,
        duration,
        guests:   order ? (t.seats ?? 0) : 0,
        seats:    t.seats ?? 0,
        orderId:  order?.id ?? null,
        amount:   order ? Math.round((order.amount_total ?? 0) * 100) / 100 : 0,
      };
    });

    res.status(200).json({ status: "success", tables: result });
  }
);

// ─── Discounts / Promotions ───────────────────────────────────────────────────
// GET /api/pos/analytics/discounts?period=today|week|month&configId=1

export const getDiscounts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId);
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];
    const { from, to } = getPeriodRange(period);

    // Get order lines that have a discount applied
    const orders = await odooRequest("pos.order", "search_read",
      [orderDomain(from, to, sessionFilter)],
      { fields: ["lines"], limit: 5000 }
    );

    const orderIds = orders.map((o: any) => o.id);
    if (!orderIds.length) {
      return res.status(200).json({ status: "success", discounts: [], total: 0 });
    }

    // Lines with discount > 0
    const lines = await odooRequest("pos.order.line", "search_read",
      [[
        ["order_id", "in", orderIds],
        ["discount", ">", 0],
      ]],
      { fields: ["product_id", "discount", "price_unit", "qty", "price_subtotal_incl"], limit: 20000 }
    );

    // Also fetch coupon/promotion programs if you use pos_coupon
    // If you don't use pos_coupon, this block can be skipped
    let couponLines: any[] = [];
    try {
      couponLines = await odooRequest("pos.order.line", "search_read",
        [[
          ["order_id", "in", orderIds],
          ["coupon_program_id", "!=", false],
        ]],
        { fields: ["coupon_program_id", "price_subtotal_incl", "qty", "order_id"], limit: 20000 }
      );
    } catch (_) {
      // pos_coupon module not installed — skip
    }

    // Aggregate discount lines by product name as a proxy for discount type
    const discountMap: Record<string, { uses: number; saved: number; type: string }> = {};
    let totalSaved = 0;

    for (const l of lines) {
      const key = l.product_id?.[1] ?? "Discount";
      const lineDiscount =
        (l.price_unit * l.qty * l.discount) / 100;
      if (!discountMap[key]) discountMap[key] = { uses: 0, saved: 0, type: "Discount" };
      discountMap[key].uses  += 1;
      discountMap[key].saved += lineDiscount;
      totalSaved             += lineDiscount;
    }

    // Merge coupon lines
    for (const l of couponLines) {
      const key  = l.coupon_program_id?.[1] ?? "Promo";
      const saved = Math.abs(l.price_subtotal_incl ?? 0);
      if (!discountMap[key]) discountMap[key] = { uses: 0, saved: 0, type: "Promotion" };
      discountMap[key].uses  += 1;
      discountMap[key].saved += saved;
      totalSaved             += saved;
    }

    const discounts = Object.entries(discountMap)
      .sort((a, b) => b[1].uses - a[1].uses)
      .map(([code, d]) => ({
        code,
        uses:  d.uses,
        saved: Math.round(d.saved * 100) / 100,
        type:  d.type,
      }));

    res.status(200).json({
      status: "success",
      discounts,
      total: Math.round(totalSaved * 100) / 100,
    });
  }
);

// ─── Customer Insights ────────────────────────────────────────────────────────
// GET /api/pos/analytics/customers?period=today|week|month&configId=1

export const getCustomerInsights = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId);
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];
    const { from, to } = getPeriodRange(period);

    const orders = await odooRequest("pos.order", "search_read",
      [orderDomain(from, to, sessionFilter)],
      { fields: ["partner_id", "amount_total"], limit: 5000 }
    );

    // Segment: orders with a linked partner = known customer
    const withPartner    = orders.filter((o: any) => o.partner_id);
    const withoutPartner = orders.filter((o: any) => !o.partner_id);

    // Identify "new" vs "returning" by checking if partner had any order BEFORE this period
    const partnerIds = [...new Set(withPartner.map((o: any) => o.partner_id[0]))];

    let returningIds = new Set<number>();
    if (partnerIds.length) {
      const prevOrders = await odooRequest("pos.order", "search_read",
        [[
          ["partner_id", "in", partnerIds],
          ["date_order", "<", toOdooDate(from)],
          ["state", "in", ["paid", "done", "invoiced"]],
          ...sessionFilter,
        ]],
        { fields: ["partner_id"], limit: 5000 }
      );
      for (const o of prevOrders) returningIds.add(o.partner_id[0]);
    }

    const newCustomers       = withPartner.filter((o: any) => !returningIds.has(o.partner_id[0])).length;
    const returningCustomers = withPartner.filter((o: any) =>  returningIds.has(o.partner_id[0])).length;

    // Top spender
    const spendMap: Record<number, { name: string; total: number }> = {};
    for (const o of withPartner) {
      const id = o.partner_id[0];
      if (!spendMap[id]) spendMap[id] = { name: o.partner_id[1], total: 0 };
      spendMap[id].total += o.amount_total ?? 0;
    }
    const topSpenderEntry = Object.values(spendMap).sort((a, b) => b.total - a.total)[0] ?? null;

    // Avg visits per known customer during period
    const avgVisits = partnerIds.length > 0
      ? Math.round((withPartner.length / partnerIds.length) * 10) / 10
      : 0;

    // Satisfaction — from pos.order rating field (if you use it), else null
    // Odoo doesn't have a built-in rating on pos.order; return null and hide in UI
    const satisfaction: number | null = null;

    res.status(200).json({
      status: "success",
      customers: {
        newToday:     newCustomers,
        returning:    returningCustomers,
        anonymous:    withoutPartner.length,
        topSpender:   topSpenderEntry?.name    ?? null,
        topAmount:    topSpenderEntry ? Math.round(topSpenderEntry.total * 100) / 100 : 0,
        avgVisits,
        satisfaction,
      },
    });
  }
);