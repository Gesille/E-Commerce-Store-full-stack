import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { odooRequest } from "../odoo/odoo.client.js";
import CashierShiftLog, { ShiftState } from "../models/Cashiershiftlog.js";
import POSOrder from "../models/POSOrder.js";
import mongoose from "mongoose";


function toOdooDateTime(date: string, endOfDay = false) {
  return endOfDay ? `${date} 23:59:59` : `${date} 00:00:00`;
}

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}


export const getDailyClosingReport = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const date = (req.query.date as string) || isoDate(new Date());
    const configId = Number(req.query.configId) || undefined;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return next(new ErrorHandler("date must be YYYY-MM-DD", 400));
    }

    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];

    // ── 1. Fetch paid POS orders for the day ────────────────────────────────
    const [orders, refundOrders] = await Promise.all([
      odooRequest(
        "pos.order",
        "search_read",
        [
          [
            ["date_order", ">=", toOdooDateTime(date)],
            ["date_order", "<=", toOdooDateTime(date, true)],
            ["state", "in", ["paid", "done", "invoiced"]],
            ...sessionFilter,
          ],
        ],
        {
          fields: [
            "id",
            "name",
            "date_order",
            "amount_total",
            "amount_tax",
            "lines",
            "payment_ids",
            "session_id",
            "user_id",
          ],
          limit: 5000,
        }
      ),
      // Refunds/returns: amount < 0
      odooRequest(
        "pos.order",
        "search_read",
        [
          [
            ["date_order", ">=", toOdooDateTime(date)],
            ["date_order", "<=", toOdooDateTime(date, true)],
            ["amount_total", "<", 0],
            ...sessionFilter,
          ],
        ],
        { fields: ["amount_total"], limit: 5000 }
      ),
    ]);

    if (!orders.length && !refundOrders.length) {
      return res.status(200).json({
        success: true,
        date,
        empty: true,
        message: "No orders found for this date",
      });
    }

    // ── 2. Fetch payment lines for all orders ────────────────────────────────
    const allPaymentIds = orders.flatMap((o: any) => o.payment_ids ?? []);
    const payments: any[] = allPaymentIds.length
      ? await odooRequest(
          "pos.payment",
          "search_read",
          [[["id", "in", allPaymentIds]]],
          {
            fields: ["id", "payment_method_id", "amount", "pos_order_id"],
          }
        )
      : [];

    // ── 3. Aggregate payment totals ──────────────────────────────────────────
    const paymentTotals: Record<string, number> = {};
    for (const p of payments) {
      const method: string = p.payment_method_id?.[1] ?? "Unknown";
      paymentTotals[method] = (paymentTotals[method] ?? 0) + (p.amount ?? 0);
    }

    // Normalise known method names to standard keys
    const normaliseMethod = (name: string): string => {
      const l = name.toLowerCase();
      if (l.includes("cash")) return "cash";
      if (l.includes("card") || l.includes("credit") || l.includes("debit") || l.includes("visa") || l.includes("master")) return "card";
      if (l.includes("bank") || l.includes("transfer") || l.includes("wire")) return "bank";
      if (l.includes("check") || l.includes("cheque")) return "check";
      return name; // preserve original for "other" methods
    };

    const normalisedPayments: Record<string, number> = {};
    for (const [method, amount] of Object.entries(paymentTotals)) {
      const key = normaliseMethod(method);
      normalisedPayments[key] = (normalisedPayments[key] ?? 0) + amount;
    }

    // ── 4. Fetch order lines for top-product calculation ─────────────────────
    const allLineIds = orders.flatMap((o: any) => o.lines ?? []);
    const orderLines: any[] = allLineIds.length
      ? await odooRequest(
          "pos.order.line",
          "search_read",
          [[["id", "in", allLineIds]]],
          {
            fields: [
              "product_id",
              "qty",
              "price_unit",
              "price_subtotal_incl",
              "discount",
            ],
            limit: 50000,
          }
        )
      : [];

    // Aggregate per product
    const productMap: Record<
      number,
      { name: string; qty: number; revenue: number }
    > = {};
    let totalDiscountAmount = 0;

    for (const l of orderLines) {
      const pid = l.product_id?.[0];
      const pname = l.product_id?.[1] ?? "Unknown";
      if (!productMap[pid]) {
        productMap[pid] = { name: pname, qty: 0, revenue: 0 };
      }
      productMap[pid].qty += l.qty ?? 0;
      productMap[pid].revenue += l.price_subtotal_incl ?? 0;

      // Discount saved = unit_price * qty * discount%/100
      totalDiscountAmount +=
        ((l.price_unit ?? 0) * (l.qty ?? 0) * (l.discount ?? 0)) / 100;
    }

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((p) => ({ ...p, revenue: Math.round(p.revenue * 100) / 100 }));

    // ── 5. Hourly buckets for the revenue chart ──────────────────────────────
    const hourlyBuckets: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourlyBuckets[h] = 0;
    for (const o of orders) {
      const h = new Date(o.date_order).getHours();
      hourlyBuckets[h] += o.amount_total ?? 0;
    }

    // ── 6. Session & cashier info ────────────────────────────────────────────
    // Get from the first order's session_id
    const firstOrder: any = orders[0];
    const sessionName = firstOrder?.session_id?.[1] ?? `POS/${date.replace(/-/g, "")}`;
    const cashierName = firstOrder?.user_id?.[1] ?? "—";

    // Opening balance from Odoo session record
    let openingBalance = 0;
    if (firstOrder?.session_id?.[0]) {
      const sessionData = await odooRequest(
        "pos.session",
        "read",
        [[firstOrder.session_id[0]]],
        { fields: ["cash_register_balance_start", "cash_register_balance_end_real"] }
      );
      if (sessionData?.[0]) {
        openingBalance = sessionData[0].cash_register_balance_start ?? 0;
      }
    }

    // Also check MongoDB shift logs for our own data
    const shiftLog = await CashierShiftLog.findOne({
      createdAt: {
        $gte: new Date(`${date}T00:00:00`),
        $lte: new Date(`${date}T23:59:59`),
      },
    })
      .populate("cashierId", "name email")
      .lean();

    // ── 7. Compute totals ────────────────────────────────────────────────────
    const grossSales = orders.reduce(
      (s: number, o: any) => s + (o.amount_total ?? 0),
      0
    );
    const totalTax = orders.reduce(
      (s: number, o: any) => s + (o.amount_tax ?? 0),
      0
    );
    const totalRefunds = Math.abs(
      refundOrders.reduce((s: number, o: any) => s + (o.amount_total ?? 0), 0)
    );
    const netSales = grossSales - totalDiscountAmount - totalRefunds;
    const cashCollected = normalisedPayments["cash"] ?? 0;
    const expectedClosingBalance = openingBalance + cashCollected - (totalRefunds * 0.45); // rough cash refund portion

    const ordersCount = orders.length;

    // ── 8. Build response ────────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      date,
      odooSessionId: firstOrder?.session_id?.[0] ?? null,
      sessionName,
      cashierName: (shiftLog as any)?.cashierId?.name ?? cashierName,
      ordersCount,
      grossSales: Math.round(grossSales * 100) / 100,
      discounts: Math.round(totalDiscountAmount * 100) / 100,
      refunds: Math.round(totalRefunds * 100) / 100,
      netSales: Math.round(netSales * 100) / 100,
      tax: Math.round(totalTax * 100) / 100,
      avgOrderValue: ordersCount > 0 ? Math.round((netSales / ordersCount) * 100) / 100 : 0,
      payments: {
        cash:  Math.round((normalisedPayments["cash"]  ?? 0) * 100) / 100,
        card:  Math.round((normalisedPayments["card"]  ?? 0) * 100) / 100,
        bank:  Math.round((normalisedPayments["bank"]  ?? 0) * 100) / 100,
        check: Math.round((normalisedPayments["check"] ?? 0) * 100) / 100,
        other: Math.round(
          Object.entries(normalisedPayments)
            .filter(([k]) => !["cash","card","bank","check"].includes(k))
            .reduce((s, [, v]) => s + v, 0) * 100
        ) / 100,
        // Full detail for unknown/other methods
        breakdown: Object.entries(normalisedPayments)
          .filter(([k]) => !["cash","card","bank","check"].includes(k))
          .map(([method, amount]) => ({ method, amount: Math.round(amount * 100) / 100 })),
        total: Math.round(grossSales * 100) / 100,
      },
      openingBalance: Math.round(openingBalance * 100) / 100,
      expectedClosingBalance: Math.round(expectedClosingBalance * 100) / 100,
      topProducts,
      hourlyChart: Object.entries(hourlyBuckets).map(([hour, amount]) => ({
        hour: Number(hour),
        label: `${Number(hour).toString().padStart(2, "0")}:00`,
        amount: Math.round(amount * 100) / 100,
      })),
    });
  }
);


interface DenominationEntry {
  value: number;
  label: string;
  count: number;
}

// submitCashCount controller
export const submitCashCount = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { date, odooSessionId, denominations, sessionName, notes, submittedBy, role } = req.body as {
      date: string;
      odooSessionId: number;       // from report.odooSessionId
      denominations: DenominationEntry[];
      sessionName?: string;
      notes?: string;
      submittedBy?: string;
      role?: "cashier" | "manager";
    };

    if (!date || !odooSessionId || !denominations?.length) {
      return next(new ErrorHandler("date, odooSessionId and denominations are required", 400));
    }

    const countedTotal = denominations.reduce((s, d) => s + d.value * d.count, 0);

    // Find shift log by odooSessionId — this field IS on the schema and required
    const shiftLog = await CashierShiftLog.findOneAndUpdate(
      { odooSessionId },
      {
        $set: {
          cashCount: {
            denominations,
            countedTotal: Math.round(countedTotal * 100) / 100,
            submittedAt: new Date(),
            submittedBy: submittedBy ?? "unknown",
            role: role ?? "cashier",
            notes: notes ?? "",
          },
        },
      },
      { new: true, upsert: false }
    );

    if (!shiftLog) {
      // No local shift log (Odoo-only session) — still accept and return success
      // Store in a lightweight standalone MongoDB doc
      await CashierShiftLog.create({
        odooSessionId,
        odooPartnerId: 0,                        
        cashierId: new mongoose.Types.ObjectId(),  
        startTime: new Date(`${date}T00:00:00`),
        state: "closed" as ShiftState,
        cashCount: {
          denominations,
          countedTotal: Math.round(countedTotal * 100) / 100,
          submittedAt: new Date(),
          submittedBy: submittedBy ?? "unknown",
          role: role ?? "cashier",
          notes: notes ?? "",
        },
      });

      return res.status(200).json({
        success: true,
        warning: "No existing shift log — new record created from Odoo session",
        countedTotal: Math.round(countedTotal * 100) / 100,
        odooSessionId,
      });
    }

    res.status(200).json({
      success: true,
      message: "Cash count submitted successfully",
      countedTotal: Math.round(countedTotal * 100) / 100,
      shiftId: (shiftLog as any)._id.toString(),
      role: role ?? "cashier",
    });
  }
);


export const getMonthlyCalendarReport = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const year  = parseInt(req.query.year  as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const configId = Number(req.query.configId) || undefined;

    const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay  = new Date(year, month, 0).getDate();
    const dateTo   = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const sessionFilter: any[] = configId ? [["config_id", "=", configId]] : [];

    // Fetch all paid orders for the month
    const [orders, refundOrders] = await Promise.all([
      odooRequest(
        "pos.order",
        "search_read",
        [
          [
            ["date_order", ">=", `${dateFrom} 00:00:00`],
            ["date_order", "<=", `${dateTo} 23:59:59`],
            ["state", "in", ["paid", "done", "invoiced"]],
            ...sessionFilter,
          ],
        ],
        {
          fields: ["id", "date_order", "amount_total", "amount_tax", "payment_ids"],
          limit: 50000,
        }
      ),
      odooRequest(
        "pos.order",
        "search_read",
        [
          [
            ["date_order", ">=", `${dateFrom} 00:00:00`],
            ["date_order", "<=", `${dateTo} 23:59:59`],
            ["amount_total", "<", 0],
            ...sessionFilter,
          ],
        ],
        { fields: ["date_order", "amount_total"] }
      ),
    ]);

    // Fetch payments for cash/card split
    const allPaymentIds = orders.flatMap((o: any) => o.payment_ids ?? []);
    const payments: any[] = allPaymentIds.length
      ? await odooRequest(
          "pos.payment",
          "search_read",
          [[["id", "in", allPaymentIds]]],
          { fields: ["payment_method_id", "amount", "pos_order_id"] }
        )
      : [];

    // Map payment to order
    const paymentsByOrder: Record<number, { cash: number; card: number; bank: number; check: number }> = {};
    for (const p of payments) {
      const oid = p.pos_order_id?.[0];
      if (!oid) continue;
      if (!paymentsByOrder[oid]) paymentsByOrder[oid] = { cash: 0, card: 0, bank: 0, check: 0 };
      const method = (p.payment_method_id?.[1] ?? "").toLowerCase();
      if (method.includes("cash")) paymentsByOrder[oid].cash += p.amount;
      else if (method.includes("card") || method.includes("credit") || method.includes("debit")) paymentsByOrder[oid].card += p.amount;
      else if (method.includes("bank") || method.includes("transfer")) paymentsByOrder[oid].bank += p.amount;
      else if (method.includes("check") || method.includes("cheque")) paymentsByOrder[oid].check += p.amount;
    }

    // Aggregate by day
    const dayMap: Record<
      string,
      { ordersCount: number; grossSales: number; refunds: number; tax: number; cash: number; card: number; bank: number; check: number }
    > = {};

    for (let d = 1; d <= lastDay; d++) {
      const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      dayMap[key] = { ordersCount: 0, grossSales: 0, refunds: 0, tax: 0, cash: 0, card: 0, bank: 0, check: 0 };
    }

    for (const o of orders as any[]) {
      const key = isoDate(new Date(o.date_order));
      if (!dayMap[key]) continue;
      dayMap[key].ordersCount += 1;
      dayMap[key].grossSales  += o.amount_total ?? 0;
      dayMap[key].tax         += o.amount_tax ?? 0;
      const pm = paymentsByOrder[o.id] ?? {};
      dayMap[key].cash  += pm.cash  ?? 0;
      dayMap[key].card  += pm.card  ?? 0;
      dayMap[key].bank  += pm.bank  ?? 0;
      dayMap[key].check += pm.check ?? 0;
    }

    for (const o of refundOrders as any[]) {
      const key = isoDate(new Date(o.date_order));
      if (dayMap[key]) dayMap[key].refunds += Math.abs(o.amount_total ?? 0);
    }

    // Build result
    const days = Object.entries(dayMap).map(([date, d]) => ({
      date,
      ordersCount:   d.ordersCount,
      grossSales:    Math.round(d.grossSales  * 100) / 100,
      refunds:       Math.round(d.refunds     * 100) / 100,
      netSales:      Math.round((d.grossSales - d.refunds) * 100) / 100,
      tax:           Math.round(d.tax         * 100) / 100,
      cash:          Math.round(d.cash        * 100) / 100,
      card:          Math.round(d.card        * 100) / 100,
      bank:          Math.round(d.bank        * 100) / 100,
      check:         Math.round(d.check       * 100) / 100,
    }));

    const monthTotals = days.reduce(
      (acc, d) => ({
        ordersCount: acc.ordersCount + d.ordersCount,
        grossSales:  acc.grossSales  + d.grossSales,
        netSales:    acc.netSales    + d.netSales,
        refunds:     acc.refunds     + d.refunds,
        tax:         acc.tax         + d.tax,
        cash:        acc.cash        + d.cash,
        card:        acc.card        + d.card,
        bank:        acc.bank        + d.bank,
        check:       acc.check       + d.check,
      }),
      { ordersCount: 0, grossSales: 0, netSales: 0, refunds: 0, tax: 0, cash: 0, card: 0, bank: 0, check: 0 }
    );

    res.status(200).json({
      success: true,
      year,
      month,
      dateRange: { from: dateFrom, to: dateTo },
      days,
      totals: {
        ordersCount:  monthTotals.ordersCount,
        grossSales:   Math.round(monthTotals.grossSales  * 100) / 100,
        netSales:     Math.round(monthTotals.netSales    * 100) / 100,
        refunds:      Math.round(monthTotals.refunds     * 100) / 100,
        tax:          Math.round(monthTotals.tax         * 100) / 100,
        cash:         Math.round(monthTotals.cash        * 100) / 100,
        card:         Math.round(monthTotals.card        * 100) / 100,
        bank:         Math.round(monthTotals.bank        * 100) / 100,
        check:        Math.round(monthTotals.check       * 100) / 100,
        activeDays:   days.filter((d) => d.ordersCount > 0).length,
        avgPerDay:
          days.filter((d) => d.ordersCount > 0).length > 0
            ? Math.round(
                (monthTotals.netSales /
                  days.filter((d) => d.ordersCount > 0).length) *
                  100
              ) / 100
            : 0,
      },
    });
  }
);