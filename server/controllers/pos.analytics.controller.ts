import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { odooRequest } from "../odoo/odoo.client.js";
import CashierShiftLog from "../models/Cashiershiftlog.js";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "today" | "week" | "month";

// ─── Period helpers ───────────────────────────────────────────────────────────

function getPeriodRange(period: Period): {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
} {
  const now = new Date();
  let from: Date, to: Date, prevFrom: Date, prevTo: Date;

  if (period === "today") {
    from = new Date(now);
    from.setHours(0, 0, 0, 0);
    to = new Date(now);
    to.setHours(23, 59, 59, 999);
    prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - 1);
    prevTo = new Date(to);
    prevTo.setDate(prevTo.getDate() - 1);
  } else if (period === "week") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    from = new Date(now);
    from.setDate(now.getDate() + diff);
    from.setHours(0, 0, 0, 0);
    to = new Date(from);
    to.setDate(from.getDate() + 6);
    to.setHours(23, 59, 59, 999);
    prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - 7);
    prevTo = new Date(to);
    prevTo.setDate(prevTo.getDate() - 7);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  }

  return { from, to, prevFrom, prevTo };
}

/** Format a Date to Odoo UTC string: "YYYY-MM-DD HH:MM:SS" */
function toOdooDate(d: Date): string {
  return d.toISOString().replace("T", " ").substring(0, 19);
}

/**
 * Build Odoo domain for pos.order date range.
 * IMPORTANT: Odoo search_read expects the domain as a flat array (not double-wrapped).
 * The odooRequest helper must pass this directly as the domain argument.
 */
function orderDomain(from: Date, to: Date, extra: any[] = []): any[] {
  return [
    ["date_order", ">=", toOdooDate(from)],
    ["date_order", "<=", toOdooDate(to)],
    ["state", "in", ["paid", "done", "invoiced"]],
    ...extra,
  ];
}

/**
 * Convert Odoo UTC date string to the store's local hour.
 * Set STORE_TIMEZONE in .env, e.g. "America/New_York".
 */
function getLocalHour(odooDateStr: string): number {
  const tz =
    process.env.STORE_TIMEZONE ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    const d = new Date(odooDateStr.replace(" ", "T") + "Z");
    const localStr = d.toLocaleString("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    });
    return parseInt(localStr, 10);
  } catch {
    return new Date(odooDateStr).getHours();
  }
}

function getLocalDayOfWeek(odooDateStr: string): number {
  const tz =
    process.env.STORE_TIMEZONE ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    const d = new Date(odooDateStr.replace(" ", "T") + "Z");
    const localStr = d.toLocaleString("en-US", { timeZone: tz });
    const rawDay = new Date(localStr).getDay();
    return (rawDay + 6) % 7; // 0=Mon … 6=Sun
  } catch {
    return (new Date(odooDateStr).getDay() + 6) % 7;
  }
}

function pctDelta(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function safeNum(v: any): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// ─── KPI Summary ──────────────────────────────────────────────────────────────

export const getKpiSummary = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId) || 0;
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];

    const { from, to, prevFrom, prevTo } = getPeriodRange(period);

    // FIX: domain passed as flat array (not double-wrapped)
    const [currentOrders, prevOrders] = await Promise.all([
      odooRequest("pos.order", "search_read", [orderDomain(from, to, sessionFilter)], {
        fields: ["amount_total"],
        limit: 5000,
      }),
      odooRequest("pos.order", "search_read", [orderDomain(prevFrom, prevTo, sessionFilter)], {
        fields: ["amount_total"],
        limit: 5000,
      }),
    ]);

    // Refunds: orders with negative amount_total
    const refundOrders = currentOrders.filter((o: any) => safeNum(o.amount_total) < 0);
    const prevRefunds = prevOrders.filter((o: any) => safeNum(o.amount_total) < 0);

    const positiveOrders = currentOrders.filter((o: any) => safeNum(o.amount_total) >= 0);
    const prevPositiveOrders = prevOrders.filter((o: any) => safeNum(o.amount_total) >= 0);

    const totalRevenue = positiveOrders.reduce((s: number, o: any) => s + safeNum(o.amount_total), 0);
    const prevRevenue = prevPositiveOrders.reduce((s: number, o: any) => s + safeNum(o.amount_total), 0);
    const orderCount = positiveOrders.length;
    const prevCount = prevPositiveOrders.length;
    const avgOrder = orderCount > 0 ? totalRevenue / orderCount : 0;
    const prevAvg = prevCount > 0 ? prevRevenue / prevCount : 0;
    const totalRefunds = Math.abs(refundOrders.reduce((s: number, o: any) => s + safeNum(o.amount_total), 0));
    const prevRefundAmt = Math.abs(prevRefunds.reduce((s: number, o: any) => s + safeNum(o.amount_total), 0));

    const periodLabel =
      period === "today" ? "vs yesterday" : period === "week" ? "vs last week" : "vs last month";

    res.status(200).json({
      status: "success",
      period,
      kpis: [
        {
          label: "Total Revenue",
          value: Math.round(totalRevenue * 100) / 100,
          prev: Math.round(prevRevenue * 100) / 100,
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
          value: Math.round(avgOrder * 100) / 100,
          prev: Math.round(prevAvg * 100) / 100,
          delta: pctDelta(avgOrder, prevAvg),
          up: avgOrder >= prevAvg,
          sub: periodLabel,
        },
        {
          label: "Refunds",
          value: Math.round(totalRefunds * 100) / 100,
          prev: Math.round(prevRefundAmt * 100) / 100,
          delta: pctDelta(totalRefunds, prevRefundAmt),
          up: totalRefunds <= prevRefundAmt,
          sub: periodLabel,
        },
      ],
    });
  }
);

// ─── Revenue Over Time ────────────────────────────────────────────────────────

export const getRevenueChart = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId) || 0;
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];
    const { from, to, prevFrom, prevTo } = getPeriodRange(period);

    const [currentOrders, prevOrders] = await Promise.all([
      odooRequest("pos.order", "search_read", [orderDomain(from, to, sessionFilter)], {
        fields: ["date_order", "amount_total"],
        limit: 5000,
      }),
      odooRequest("pos.order", "search_read", [orderDomain(prevFrom, prevTo, sessionFilter)], {
        fields: ["date_order", "amount_total"],
        limit: 5000,
      }),
    ]);

    function bucket(dateStr: string): string {
      if (period === "today") return String(getLocalHour(dateStr));
      if (period === "week") {
        return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][getLocalDayOfWeek(dateStr)];
      }
      const d = new Date(dateStr.replace(" ", "T") + "Z");
      return `W${Math.ceil(d.getDate() / 7)}`;
    }

    function aggregate(orders: any[]): Record<string, number> {
      const acc: Record<string, number> = {};
      for (const o of orders) {
        if (safeNum(o.amount_total) < 0) continue; // exclude refunds from chart
        const key = bucket(o.date_order);
        acc[key] = (acc[key] ?? 0) + safeNum(o.amount_total);
      }
      return acc;
    }

    const curr = aggregate(currentOrders);
    const prev = aggregate(prevOrders);

    let labels: string[] = [];
    if (period === "today") {
      labels = Array.from({ length: 12 }, (_, i) => String(i + 8));
    } else if (period === "week") {
      labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    } else {
      labels = ["W1", "W2", "W3", "W4"];
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
      prev: Math.round((prev[l] ?? 0) * 100) / 100,
    }));

    res.status(200).json({ status: "success", period, data });
  }
);

// ─── Top Products ─────────────────────────────────────────────────────────────

export const getTopProducts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId) || 0;
    const limit = Number(req.query.limit) || 6;
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];
    const { from, to } = getPeriodRange(period);

    const orders = await odooRequest(
      "pos.order",
      "search_read",
      [orderDomain(from, to, sessionFilter)],
      { fields: ["id"], limit: 5000 }
    );

    const orderIds = orders.map((o: any) => o.id);
    if (!orderIds.length) {
      return res.status(200).json({ status: "success", period, products: [] });
    }

    // FIX: pos.order.line uses "order_id" (not pos_order_id)
    const lines = await odooRequest(
      "pos.order.line",
      "search_read",
      [[["order_id", "in", orderIds]]],
      { fields: ["product_id", "qty", "price_subtotal_incl"], limit: 20000 }
    );

    const productMap: Record<string, { name: string; revenue: number; qty: number }> = {};
    for (const line of lines) {
      if (!line.product_id) continue;
      const id = String(line.product_id[0]);
      const name = line.product_id[1] ?? "Unknown";
      if (!productMap[id]) productMap[id] = { name, revenue: 0, qty: 0 };
      productMap[id].revenue += safeNum(line.price_subtotal_incl);
      productMap[id].qty += safeNum(line.qty);
    }

    const sorted = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    const maxRevenue = sorted[0]?.revenue ?? 1;
    const products = sorted.map((p, i) => ({
      name: p.name,
      revenue: Math.round(p.revenue * 100) / 100,
      qty: Math.round(p.qty),
      pct: Math.round((p.revenue / maxRevenue) * 100),
      rank: i + 1,
    }));

    res.status(200).json({ status: "success", period, products });
  }
);

// ─── Recent Orders ────────────────────────────────────────────────────────────

export const getRecentOrders = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const configId = Number(req.query.configId) || 0;
    const limit = Number(req.query.limit) || 10;
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];

    const orders = await odooRequest(
      "pos.order",
      "search_read",
      [[["state", "in", ["paid", "done", "invoiced", "cancel"]], ...sessionFilter]],
      {
        fields: ["name", "date_order", "partner_id", "amount_total", "state", "lines", "config_id", "employee_id"],
        order: "date_order desc",
        limit,
      }
    );

    const now = Date.now();
    const result = orders.map((o: any) => {
      const diffMs = now - new Date(o.date_order.replace(" ", "T") + "Z").getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const timeAgo =
        diffMin < 1 ? "just now" : diffMin < 60 ? `${diffMin}m ago` : `${Math.floor(diffMin / 60)}h ago`;

      const amt = safeNum(o.amount_total);
      let status: "paid" | "refund" | "pending" = "paid";
      if (o.state === "cancel" || amt < 0) status = "refund";
      else if (o.state === "draft") status = "pending";

      // FIX: Odoo 16/17 uses employee_id for cashier, fallback to config name
      const cashier = o.employee_id?.[1] ?? "—";

      return {
        id: o.name ?? "—",
        time: timeAgo,
        channel: o.config_id?.[1] ?? "POS",
        amount: Math.round(amt * 100) / 100,
        status,
        items: Array.isArray(o.lines) ? o.lines.length : 0,
        cashier,
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
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];
    const { from, to } = getPeriodRange(period);

    const orders = await odooRequest(
      "pos.order",
      "search_read",
      [orderDomain(from, to, sessionFilter)],
      { fields: ["id"], limit: 5000 }
    );

    const orderIds = orders.map((o: any) => o.id);
    if (!orderIds.length) {
      return res.status(200).json({ status: "success", period, methods: [] });
    }

    // FIX: Try pos.payment with pos_order_id (Odoo 15+), fallback to order_id (Odoo 14)
    let payments: any[] = [];
    try {
      payments = await odooRequest(
        "pos.payment",
        "search_read",
        [[["pos_order_id", "in", orderIds]]],
        { fields: ["payment_method_id", "amount"], limit: 20000 }
      );
    } catch {
      try {
        payments = await odooRequest(
          "pos.payment",
          "search_read",
          [[["order_id", "in", orderIds]]],
          { fields: ["payment_method_id", "amount"], limit: 20000 }
        );
      } catch (e2) {
        // If pos.payment doesn't exist, fall back to account_move lines via payment_ids on order
        const ordersWithPayments = await odooRequest(
          "pos.order",
          "search_read",
          [orderDomain(from, to, sessionFilter)],
          { fields: ["payment_ids", "amount_total"], limit: 5000 }
        );
        // Return a single "Cash/Card" combined entry
        const total = ordersWithPayments.reduce((s: number, o: any) => s + safeNum(o.amount_total), 0);
        return res.status(200).json({
          status: "success",
          period,
          methods: [{ name: "Total", amount: Math.round(total * 100) / 100, value: 100 }],
        });
      }
    }

    const methodMap: Record<string, { name: string; amount: number }> = {};
    let total = 0;
    for (const p of payments) {
      if (!p.payment_method_id) continue;
      const id = String(p.payment_method_id[0]);
      const name = p.payment_method_id[1] ?? "Unknown";
      if (!methodMap[id]) methodMap[id] = { name, amount: 0 };
      methodMap[id].amount += safeNum(p.amount);
      total += safeNum(p.amount);
    }

    const methods = Object.values(methodMap)
      .sort((a, b) => b.amount - a.amount)
      .map((m) => ({
        name: m.name,
        amount: Math.round(m.amount * 100) / 100,
        value: total > 0 ? Math.round((m.amount / total) * 100) : 0,
      }));

    res.status(200).json({ status: "success", period, methods });
  }
);

// ─── Category Breakdown ───────────────────────────────────────────────────────

export const getCategoryBreakdown = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId) || 0;
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];
    const { from, to } = getPeriodRange(period);

    const orders = await odooRequest(
      "pos.order",
      "search_read",
      [orderDomain(from, to, sessionFilter)],
      { fields: ["id"], limit: 5000 }
    );

    const orderIds = orders.map((o: any) => o.id);
    if (!orderIds.length) {
      return res.status(200).json({ status: "success", period, categories: [] });
    }

    const lines = await odooRequest(
      "pos.order.line",
      "search_read",
      [[["order_id", "in", orderIds]]],
      { fields: ["product_id", "price_subtotal_incl", "qty"], limit: 20000 }
    );

    const productIds = [...new Set(lines.map((l: any) => l.product_id?.[0]).filter(Boolean))];

    // FIX: use product.template categ_id via product.product → product_tmpl_id
    const products = await odooRequest(
      "product.product",
      "search_read",
      [[["id", "in", productIds]]],
      { fields: ["id", "categ_id", "pos_category_id"], limit: productIds.length + 100 }
    );

    const productCategoryMap: Record<number, string> = {};
    for (const p of products) {
      // Prefer POS category if set, fall back to internal category
      productCategoryMap[p.id] = p.pos_category_id?.[1] ?? p.categ_id?.[1] ?? "Other";
    }

    const categoryMap: Record<string, { value: number; orders: number }> = {};
    let total = 0;
    for (const line of lines) {
      const pid = line.product_id?.[0];
      const cat = pid ? (productCategoryMap[pid] ?? "Other") : "Other";
      const rev = safeNum(line.price_subtotal_incl);
      if (!categoryMap[cat]) categoryMap[cat] = { value: 0, orders: 0 };
      categoryMap[cat].value += rev;
      categoryMap[cat].orders += 1;
      total += rev;
    }

    const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#e11d48", "#06b6d4", "#84cc16"];
    const categories = Object.entries(categoryMap)
      .sort((a, b) => b[1].value - a[1].value)
      .map(([name, data], i) => ({
        name,
        value: Math.round(data.value * 100) / 100,
        orders: data.orders,
        color: COLORS[i % COLORS.length],
        pct: total > 0 ? Math.round((data.value / total) * 100) : 0,
      }));

    res.status(200).json({ status: "success", period, categories });
  }
);

// ─── Staff / Cashier Performance ──────────────────────────────────────────────

export const getStaffPerformance = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId) || 0;
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];
    const { from, to, prevFrom, prevTo } = getPeriodRange(period);

    // FIX: Odoo 16/17 uses employee_id on pos.order for cashier
    // Odoo 14/15 uses user_id — we try both
    const [currentOrders, prevOrders] = await Promise.all([
      odooRequest("pos.order", "search_read", [orderDomain(from, to, sessionFilter)], {
        fields: ["employee_id", "user_id", "amount_total"],
        limit: 5000,
      }),
      odooRequest("pos.order", "search_read", [orderDomain(prevFrom, prevTo, sessionFilter)], {
        fields: ["employee_id", "user_id", "amount_total"],
        limit: 5000,
      }),
    ]);

    function getCashier(o: any): { id: string; name: string } {
      if (o.employee_id && o.employee_id[0]) {
        return { id: String(o.employee_id[0]), name: o.employee_id[1] ?? "Unknown" };
      }
      if (o.user_id && o.user_id[0]) {
        return { id: String(o.user_id[0]), name: o.user_id[1] ?? "Unknown" };
      }
      return { id: "unknown", name: "Unknown Cashier" };
    }

    const currMap: Record<string, { name: string; sales: number; txn: number }> = {};
    for (const o of currentOrders) {
      if (safeNum(o.amount_total) < 0) continue;
      const { id, name } = getCashier(o);
      if (!currMap[id]) currMap[id] = { name, sales: 0, txn: 0 };
      currMap[id].sales += safeNum(o.amount_total);
      currMap[id].txn += 1;
    }

    const prevMap: Record<string, number> = {};
    for (const o of prevOrders) {
      if (safeNum(o.amount_total) < 0) continue;
      const { id } = getCashier(o);
      prevMap[id] = (prevMap[id] ?? 0) + safeNum(o.amount_total);
    }

    const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#e11d48", "#06b6d4"];
    const staff = Object.entries(currMap)
      .sort((a, b) => b[1].sales - a[1].sales)
      .map(([uid, data], i) => {
        const prev = prevMap[uid] ?? 0;
        const trend = prev > 0 ? Math.round(((data.sales - prev) / prev) * 100) : 0;
        const initials = data.name
          .split(" ")
          .map((w: string) => w[0] ?? "")
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

const DEFAULT_TARGETS: Record<Period, number> = {
  today: 10000,
  week: 60000,
  month: 240000,
};

function getTarget(period: Period): number {
  const envMap: Record<Period, string | undefined> = {
    today: process.env.TARGET_TODAY,
    week: process.env.TARGET_WEEK,
    month: process.env.TARGET_MONTH,
  };
  const envVal = envMap[period];
  if (envVal && !isNaN(Number(envVal))) return Number(envVal);
  return DEFAULT_TARGETS[period];
}

export const getRevenueTarget = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId) || 0;
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];
    const { from, to } = getPeriodRange(period);

    const orders = await odooRequest(
      "pos.order",
      "search_read",
      [orderDomain(from, to, sessionFilter)],
      { fields: ["amount_total"], limit: 5000 }
    );

    // Only count positive (non-refund) orders toward target
    const current = orders
      .filter((o: any) => safeNum(o.amount_total) > 0)
      .reduce((s: number, o: any) => s + safeNum(o.amount_total), 0);

    const target = getTarget(period);
    const pct = Math.min(100, Math.round((current / target) * 100));

    const label =
      period === "today"
        ? "Daily revenue target"
        : period === "week"
        ? "Weekly revenue target"
        : "Monthly revenue target";

    res.status(200).json({
      status: "success",
      period,
      target: {
        target,
        current: Math.round(current * 100) / 100,
        pct,
        label,
        remaining: Math.max(0, Math.round((target - current) * 100) / 100),
      },
    });
  }
);

// ─── Active Session Info ──────────────────────────────────────────────────────

export const getSessionInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const configId = Number(req.query.configId) || 0;
    if (!configId) {
      return next(new ErrorHandler("configId is required", 400));
    }

    const sessions = await odooRequest(
      "pos.session",
      "search_read",
      [[["state", "=", "opened"], ["config_id", "=", configId]]],
      {
        fields: [
          "id",
          "name",
          "state",
          "start_at",
          "cash_register_balance_start",
          "cash_register_balance_end_real",
          "user_id",
        ],
        limit: 1,
      }
    );

    const session = sessions?.[0] ?? null;
    if (!session) {
      return res.status(200).json({ status: "success", session: null });
    }

    const startAt = new Date(session.start_at.replace(" ", "T") + "Z");
    const diffMs = Date.now() - startAt.getTime();
    const hours = Math.floor(diffMs / 3_600_000);
    const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
    const duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    // FIX: get cash payments for this specific session
    let cashPayments: any[] = [];
    let cashTotal = 0;
    try {
      // Try with session_id filter on pos.payment
      cashPayments = await odooRequest(
        "pos.payment",
        "search_read",
        [[["session_id", "=", session.id]]],
        { fields: ["amount", "payment_method_id"], limit: 5000 }
      );
      // Filter to cash methods only
      cashPayments = cashPayments.filter((p: any) => {
        const name: string = (p.payment_method_id?.[1] ?? "").toLowerCase();
        return name.includes("cash") || name.includes("espèce") || name.includes("efectivo");
      });
      cashTotal = cashPayments.reduce((s: number, p: any) => s + safeNum(p.amount), 0);
    } catch {
      cashTotal = 0;
    }

    const expectedFloat = safeNum(session.cash_register_balance_start);
    const expectedDrawer = expectedFloat + cashTotal;

    const countedCash: number | null =
      session.cash_register_balance_end_real != null &&
      session.cash_register_balance_end_real !== false
        ? safeNum(session.cash_register_balance_end_real)
        : null;

    const variance =
      countedCash !== null
        ? Math.round((countedCash - expectedDrawer) * 100) / 100
        : null;

    // Optional: active shift from your MongoDB model
    let cashierName = session.user_id?.[1] ?? "—";
    try {
      const activeShift = await CashierShiftLog.findOne({
        odooSessionId: session.id,
        state: { $in: ["active", "paused"] },
      })
        .sort({ startTime: -1 })
        .populate("cashierId", "name role")
        .lean();
      if (activeShift) {
        cashierName = (activeShift.cashierId as any)?.name ?? cashierName;
      }
    } catch {
      // MongoDB shift tracking not available — use Odoo user_id
    }

    res.status(200).json({
      status: "success",
      session: {
        id: session.id,
        name: session.name,
        state: session.state,
        startedAt: session.start_at,
        duration,
        cashier: cashierName,
        cashInDrawer: Math.round(expectedDrawer * 100) / 100,
        expectedFloat: Math.round(expectedFloat * 100) / 100,
        variance,
      },
    });
  }
);

// ─── Low Stock Items ──────────────────────────────────────────────────────────

export const getLowStock = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const threshold = Number(req.query.threshold) || 10;
    const limit = Number(req.query.limit) || 8;

    // FIX: "consu" type is "Consumable" in Odoo — storable is "product"
    // Both are tracked, but only "product" (storable) has reliable qty_available
    const products = await odooRequest(
      "product.product",
      "search_read",
      [
        [
          ["available_in_pos", "=", true],
          ["active", "=", true],
          ["type", "=", "product"], // Only storable products track stock
          ["qty_available", "<=", threshold],
        ],
      ],
      {
        fields: ["id", "name", "qty_available", "uom_id", "categ_id", "write_date"],
        order: "qty_available asc",
        limit,
      }
    );

    const items = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      stock: safeNum(p.qty_available),
      unit: p.uom_id?.[1] ?? "units",
      threshold,
      critical: safeNum(p.qty_available) <= Math.floor(threshold / 2),
      category: p.categ_id?.[1] ?? "Other",
      updatedAt: p.write_date ?? null,
    }));

    res.status(200).json({ status: "success", items });
  }
);

// ─── Peak Hours Heatmap ───────────────────────────────────────────────────────

export const getPeakHoursHeatmap = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const configId = Number(req.query.configId) || 0;
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];

    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 28);

    const orders = await odooRequest(
      "pos.order",
      "search_read",
      [
        [
          ["date_order", ">=", toOdooDate(from)],
          ["date_order", "<=", toOdooDate(to)],
          ["state", "in", ["paid", "done", "invoiced"]],
          ...sessionFilter,
        ],
      ],
      { fields: ["date_order"], limit: 10000 }
    );

    // grid[dayIndex][hourIndex] — day: 0=Mon…6=Sun, hour: 0=8am…11=7pm
    const grid: number[][] = Array.from({ length: 7 }, () => Array(12).fill(0));

    for (const o of orders) {
      const dow = getLocalDayOfWeek(o.date_order);
      const h = getLocalHour(o.date_order);
      if (h >= 8 && h <= 19) {
        grid[dow][h - 8]++;
      }
    }

    // Normalise over 4 weeks
    const normalised = grid.map((row) => row.map((v) => Math.round(v / 4)));

    res.status(200).json({ status: "success", heatmap: normalised });
  }
);

// ─── Table Status ─────────────────────────────────────────────────────────────

export const getTableStatus = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const configId = Number(req.query.configId) || 0;

    let tables: any[] = [];
    try {
      // FIX: restaurant.table field is "floor_id.pos_config_ids" in Odoo 16+
      // Use a broader domain and filter client-side if needed
      const domain = configId ? [["pos_config_id", "in", [configId]]] : [];
      tables = await odooRequest(
        "restaurant.table",
        "search_read",
        [domain],
        {
          fields: ["id", "name", "seats", "state", "current_order_id"],
          limit: 100,
        }
      );
    } catch {
      // restaurant module not installed
      return res.status(200).json({ status: "success", tables: [] });
    }

    const tableOrderIds = tables
      .map((t: any) => t.current_order_id?.[0])
      .filter(Boolean);

    let orderMap: Record<number, any> = {};
    if (tableOrderIds.length) {
      const openOrders = await odooRequest(
        "pos.order",
        "search_read",
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
        const diffMin = Math.floor(
          (now - new Date(order.date_order.replace(" ", "T") + "Z").getTime()) / 60000
        );
        duration = diffMin < 60 ? `${diffMin}m` : `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
      }

      const status: "occupied" | "available" | "reserved" =
        t.state === "occupied" ? "occupied" : t.state === "reserved" ? "reserved" : "available";

      return {
        id: t.name,
        status,
        duration,
        guests: order ? safeNum(t.seats) : 0,
        seats: safeNum(t.seats),
        orderId: order?.id ?? null,
        amount: order ? Math.round(safeNum(order.amount_total) * 100) / 100 : 0,
      };
    });

    res.status(200).json({ status: "success", tables: result });
  }
);

// ─── Discounts / Promotions ───────────────────────────────────────────────────

export const getDiscounts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId) || 0;
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];
    const { from, to } = getPeriodRange(period);

    const orders = await odooRequest(
      "pos.order",
      "search_read",
      [orderDomain(from, to, sessionFilter)],
      { fields: ["id"], limit: 5000 }
    );

    const orderIds = orders.map((o: any) => o.id);
    if (!orderIds.length) {
      return res.status(200).json({ status: "success", discounts: [], total: 0 });
    }

    // Lines with a discount percentage > 0
    const lines = await odooRequest(
      "pos.order.line",
      "search_read",
      [[["order_id", "in", orderIds], ["discount", ">", 0]]],
      {
        fields: ["product_id", "discount", "price_unit", "qty", "price_subtotal_incl"],
        limit: 20000,
      }
    );

    // Lines linked to a coupon/promotion program
    let couponLines: any[] = [];
    try {
      couponLines = await odooRequest(
        "pos.order.line",
        "search_read",
        [[["order_id", "in", orderIds], ["coupon_program_id", "!=", false]]],
        { fields: ["coupon_program_id", "price_subtotal_incl", "qty", "order_id"], limit: 20000 }
      );
    } catch {
      // pos_coupon not installed — skip
    }

    const discountMap: Record<string, { uses: number; saved: number; type: string }> = {};
    let totalSaved = 0;

    for (const l of lines) {
      const key = l.product_id?.[1] ?? "Discount";
      // Amount saved = price_unit * qty * discount% / 100
      const lineDiscount =
        (safeNum(l.price_unit) * safeNum(l.qty) * safeNum(l.discount)) / 100;
      if (!discountMap[key]) discountMap[key] = { uses: 0, saved: 0, type: "Discount" };
      discountMap[key].uses += 1;
      discountMap[key].saved += lineDiscount;
      totalSaved += lineDiscount;
    }

    for (const l of couponLines) {
      const key = l.coupon_program_id?.[1] ?? "Promotion";
      const saved = Math.abs(safeNum(l.price_subtotal_incl));
      if (!discountMap[key]) discountMap[key] = { uses: 0, saved: 0, type: "Promotion" };
      discountMap[key].uses += 1;
      discountMap[key].saved += saved;
      totalSaved += saved;
    }

    const discounts = Object.entries(discountMap)
      .sort((a, b) => b[1].uses - a[1].uses)
      .map(([code, d]) => ({
        code,
        uses: d.uses,
        saved: Math.round(d.saved * 100) / 100,
        type: d.type,
      }));

    res.status(200).json({
      status: "success",
      discounts,
      total: Math.round(totalSaved * 100) / 100,
    });
  }
);

// ─── Customer Insights ────────────────────────────────────────────────────────

export const getCustomerInsights = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const period = (req.query.period as Period) || "today";
    const configId = Number(req.query.configId) || 0;
    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];
    const { from, to } = getPeriodRange(period);

    const orders = await odooRequest(
      "pos.order",
      "search_read",
      [orderDomain(from, to, sessionFilter)],
      { fields: ["partner_id", "amount_total"], limit: 5000 }
    );

    const positiveOrders = orders.filter((o: any) => safeNum(o.amount_total) >= 0);
    const withPartner = positiveOrders.filter((o: any) => o.partner_id && o.partner_id[0]);
    const withoutPartner = positiveOrders.filter((o: any) => !o.partner_id || !o.partner_id[0]);

    const partnerIds = [...new Set(withPartner.map((o: any) => o.partner_id[0]))] as number[];

    let returningIds = new Set<number>();
    if (partnerIds.length) {
      // Check if any of these partners had orders BEFORE the current period
      const prevOrders = await odooRequest(
        "pos.order",
        "search_read",
        [
          [
            ["partner_id", "in", partnerIds],
            ["date_order", "<", toOdooDate(from)],
            ["state", "in", ["paid", "done", "invoiced"]],
            ...sessionFilter,
          ],
        ],
        { fields: ["partner_id"], limit: 5000 }
      );
      for (const o of prevOrders) returningIds.add(o.partner_id[0]);
    }

    const newCustomers = withPartner.filter((o: any) => !returningIds.has(o.partner_id[0])).length;
    const returningCustomers = withPartner.filter((o: any) => returningIds.has(o.partner_id[0])).length;

    // Top spender
    const spendMap: Record<number, { name: string; total: number }> = {};
    for (const o of withPartner) {
      const id = o.partner_id[0];
      if (!spendMap[id]) spendMap[id] = { name: o.partner_id[1], total: 0 };
      spendMap[id].total += safeNum(o.amount_total);
    }
    const topSpenderEntry = Object.values(spendMap).sort((a, b) => b.total - a.total)[0] ?? null;

    const avgVisits =
      partnerIds.length > 0
        ? Math.round((withPartner.length / partnerIds.length) * 10) / 10
        : 0;

    res.status(200).json({
      status: "success",
      customers: {
        newToday: newCustomers,
        returning: returningCustomers,
        anonymous: withoutPartner.length,
        topSpender: topSpenderEntry?.name ?? null,
        topAmount: topSpenderEntry ? Math.round(topSpenderEntry.total * 100) / 100 : 0,
        avgVisits,
        satisfaction: null,
      },
    });
  }
);