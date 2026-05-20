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
// GET /api/pos/analytics/payment-methods?period=today|week|month&configId=1

export const getPaymentMethodsSplit = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId);
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];

    const { from, to } = getPeriodRange(period);

    const orders = await odooRequest("pos.order", "search_read",
      [orderDomain(from, to, sessionFilter)],
      { fields: ["payment_ids"], limit: 5000 }
    );

    const orderIds = orders.map((o: any) => o.id);
    if (!orderIds.length) {
      return res.status(200).json({ status: "success", period, methods: [] });
    }

    const payments = await odooRequest("pos.payment", "search_read",
      [[["pos_order_id", "in", orderIds]]],
      { fields: ["payment_method_id", "amount"], limit: 20000 }
    );

    const methodMap: Record<string, { name: string; amount: number }> = {};
    let total = 0;
    for (const p of payments) {
      const id   = String(p.payment_method_id?.[0]);
      const name = p.payment_method_id?.[1] ?? "Unknown";
      if (!methodMap[id]) methodMap[id] = { name, amount: 0 };
      methodMap[id].amount += p.amount ?? 0;
      total += p.amount ?? 0;
    }

    const methods = Object.values(methodMap)
      .sort((a, b) => b.amount - a.amount)
      .map((m) => ({
        name:   m.name,
        amount: Math.round(m.amount * 100) / 100,
        value:  total > 0 ? Math.round((m.amount / total) * 100) : 0,
      }));

    res.status(200).json({ status: "success", period, methods });
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
    const configId = Number(req.query.configId);

    const { from, to, prevFrom, prevTo } = getPeriodRange(period);

    // Use MongoDB POSOrder (has shiftId and cashierId)
    const [currentAgg, prevAgg] = await Promise.all([
      POSOrder.aggregate([
        {
          $match: {
            status: "paid",
            createdAt: { $gte: from, $lte: to },
          },
        },
        {
          $group: {
            _id: "$cashierId",
            totalSales:  { $sum: "$subtotal" },
            totalOrders: { $sum: 1 },
          },
        },
      ]),
      POSOrder.aggregate([
        {
          $match: {
            status: "paid",
            createdAt: { $gte: prevFrom, $lte: prevTo },
          },
        },
        {
          $group: {
            _id: "$cashierId",
            totalSales: { $sum: "$subtotal" },
          },
        },
      ]),
    ]);

    const prevMap: Record<string, number> = {};
    for (const p of prevAgg) prevMap[String(p._id)] = p.totalSales;

    // Populate cashier names from shifts
    const cashierIds = currentAgg.map((a: any) => a._id);
    const shifts = await CashierShiftLog.find({
      cashierId: { $in: cashierIds },
    })
      .populate("cashierId", "name role")
      .lean();

    const cashierInfo: Record<string, { name: string; role: string }> = {};
    for (const s of shifts) {
      const u = s.cashierId as any;
      if (u?._id) cashierInfo[String(u._id)] = { name: u.name ?? "Unknown", role: u.role ?? "Cashier" };
    }

    const COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#e11d48","#06b6d4"];
    const staff = currentAgg
      .sort((a: any, b: any) => b.totalSales - a.totalSales)
      .map((a: any, i: number) => {
        const id    = String(a._id);
        const prev  = prevMap[id] ?? 0;
        const trend = prev > 0 ? Math.round(((a.totalSales - prev) / prev) * 100) : 0;
        const info  = cashierInfo[id] ?? { name: "Cashier", role: "Cashier" };
        const initials = info.name.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase();
        return {
          cashierId: id,
          initials,
          name:  info.name,
          role:  info.role,
          txn:   a.totalOrders,
          sales: Math.round(a.totalSales * 100) / 100,
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

    // Fetch products available in POS with low quantity
    const products = await odooRequest("product.product", "search_read",
      [[
        ["available_in_pos", "=", true],
        ["active", "=", true],
        ["type", "in", ["product", "consu"]], // storable or consumable
        ["qty_available", "<=", threshold],
      ]],
      {
        fields: ["id", "name", "qty_available", "uom_id", "categ_id"],
        order: "qty_available asc",
        limit,
      }
    );

    const items = products.map((p: any) => ({
      id:        p.id,
      name:      p.name,
      stock:     p.qty_available ?? 0,
      unit:      p.uom_id?.[1] ?? "units",
      threshold,
      critical:  (p.qty_available ?? 0) <= Math.floor(threshold / 2),
      category:  p.categ_id?.[1] ?? "Other",
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