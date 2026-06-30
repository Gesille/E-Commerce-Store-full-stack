import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { odooRequest } from "../odoo/odoo.client.js";
import ExcelJS from "exceljs";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────


const toDateStr = (d: Date) => d.toISOString().slice(0, 10);


const r2 = (n: number) => Math.round(n * 100) / 100;
async function fetchPosOrders(dateFrom: string, dateTo: string) {
  return odooRequest(
    "pos.order",
    "search_read",
    [[
      ["date_order", ">=", `${dateFrom} 00:00:00`],
      ["date_order", "<=", `${dateTo} 23:59:59`],
      ["state", "in", ["paid", "invoiced", "done"]],
    ]],
    {
      fields: [
        "id",
        "name",
        "date_order",
        "amount_total",
        "amount_tax",
        "partner_id",
        "internal_note",
        "session_id",
      ],
      order: "date_order asc",
      limit: 5000,
    },
  );
}

function mapOrder(o: any) {
  const note: string = o.internal_note || "";
  const isExempt     = note.startsWith("TAX_EXEMPT:");
  const taxReason    = isExempt
    ? note.replace("TAX_EXEMPT:", "")
    : "normal";

  const subtotal = r2(o.amount_total - o.amount_tax);

  return {
    id:         o.id,
    ref:        o.name,
    date:       o.date_order,
    customer:   o.partner_id ? o.partner_id[1] : "Walk-in",
    session:    o.session_id ? o.session_id[1] : "—",
    subtotal,
    taxAmount:  r2(o.amount_tax),
    total:      r2(o.amount_total),
    isExempt,
    taxReason,
  };
}



function buildSummary(rows: ReturnType<typeof mapOrder>[]) {
  const totalOrders   = rows.length;
  const totalSubtotal = r2(rows.reduce((s, r) => s + r.subtotal,  0));
  const totalTax      = r2(rows.reduce((s, r) => s + r.taxAmount, 0));
  const totalRevenue  = r2(rows.reduce((s, r) => s + r.total,     0));
  const exemptOrders  = rows.filter((r) => r.isExempt).length;
  const normalOrders  = totalOrders - exemptOrders;

  return {
    totalOrders,
    normalOrders,
    exemptOrders,
    totalSubtotal,
    totalTax,
    totalRevenue,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /reports/taxes/daily
// Query param: date=YYYY-MM-DD  (default: today)
// ─────────────────────────────────────────────────────────────────────────────

export const getDailyTaxReport = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const date = (req.query.date as string) || toDateStr(new Date());

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return next(new ErrorHandler("Invalid date format. Use YYYY-MM-DD", 400));
    }

    const rawOrders = await fetchPosOrders(date, date);
    const orders    = rawOrders.map(mapOrder);
    const summary   = buildSummary(orders);

    // Group by hour for a timeline breakdown
    const byHour: Record<number, { orders: number; tax: number; total: number }> = {};
    for (const o of orders) {
      const hour = new Date(o.date).getUTCHours();
      if (!byHour[hour]) byHour[hour] = { orders: 0, tax: 0, total: 0 };
      byHour[hour].orders++;
      byHour[hour].tax   = r2(byHour[hour].tax   + o.taxAmount);
      byHour[hour].total = r2(byHour[hour].total  + o.total);
    }

    const timeline = Array.from({ length: 24 }, (_, h) => ({
      hour:   h,
      label:  `${String(h).padStart(2, "0")}:00`,
      orders: byHour[h]?.orders ?? 0,
      tax:    byHour[h]?.tax    ?? 0,
      total:  byHour[h]?.total  ?? 0,
    }));

    res.json({
      success: true,
      date,
      summary,
      timeline,
      orders,
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /reports/taxes/monthly
// Query params: year=2026&month=6  (default: current month)
// ─────────────────────────────────────────────────────────────────────────────

export const getMonthlyTaxReport = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const now   = new Date();
    const year  = Number(req.query.year)  || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;

    if (month < 1 || month > 12) {
      return next(new ErrorHandler("month must be between 1 and 12", 400));
    }

    const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay  = new Date(year, month, 0).getDate();
    const dateTo   = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const rawOrders = await fetchPosOrders(dateFrom, dateTo);
    const orders    = rawOrders.map(mapOrder);
    const summary   = buildSummary(orders);

    // Group by day for a daily breakdown inside the month
    const byDay: Record<string, { orders: number; tax: number; total: number }> = {};
    for (const o of orders) {
      const day = o.date.slice(0, 10);
      if (!byDay[day]) byDay[day] = { orders: 0, tax: 0, total: 0 };
      byDay[day].orders++;
      byDay[day].tax   = r2(byDay[day].tax   + o.taxAmount);
      byDay[day].total = r2(byDay[day].total  + o.total);
    }

    // Build a full calendar breakdown (all days, even with 0 orders)
    const breakdown = Array.from({ length: lastDay }, (_, i) => {
      const d   = `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
      return {
        date:   d,
        orders: byDay[d]?.orders ?? 0,
        tax:    byDay[d]?.tax    ?? 0,
        total:  byDay[d]?.total  ?? 0,
      };
    });

    res.json({
      success: true,
      year,
      month,
      dateFrom,
      dateTo,
      summary,
      breakdown,
      orders,
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /reports/taxes/range
// Query params: dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
// ─────────────────────────────────────────────────────────────────────────────

export const getTaxReportByRange = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { dateFrom, dateTo } = req.query as { dateFrom: string; dateTo: string };

    if (!dateFrom || !dateTo) {
      return next(new ErrorHandler("dateFrom and dateTo are required", 400));
    }

    if (new Date(dateFrom) > new Date(dateTo)) {
      return next(new ErrorHandler("dateFrom must be before dateTo", 400));
    }

    const rawOrders = await fetchPosOrders(dateFrom, dateTo);
    const orders    = rawOrders.map(mapOrder);
    const summary   = buildSummary(orders);

    res.json({
      success: true,
      dateFrom,
      dateTo,
      summary,
      orders,
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /reports/taxes/export
// Query params: dateFrom, dateTo (or date for single day, or year+month)
// Downloads an Excel file for the accountant
// ─────────────────────────────────────────────────────────────────────────────

export const exportTaxReportExcel = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    // ── Resolve date range ────────────────────────────────────────────────────
    let dateFrom: string;
    let dateTo:   string;

    if (req.query.date) {
      // Single day
      dateFrom = dateTo = req.query.date as string;
    } else if (req.query.year && req.query.month) {
      // Full month
      const year  = Number(req.query.year);
      const month = Number(req.query.month);
      const last  = new Date(year, month, 0).getDate();
      dateFrom    = `${year}-${String(month).padStart(2, "0")}-01`;
      dateTo      = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    } else if (req.query.dateFrom && req.query.dateTo) {
      dateFrom = req.query.dateFrom as string;
      dateTo   = req.query.dateTo   as string;
    } else {
      // Default: today
      const today = toDateStr(new Date());
      dateFrom = dateTo = today;
    }

    // ── Fetch data ────────────────────────────────────────────────────────────
    const rawOrders = await fetchPosOrders(dateFrom, dateTo);
    const orders    = rawOrders.map(mapOrder);
    const summary   = buildSummary(orders);

    // ── Build Excel ───────────────────────────────────────────────────────────
    const wb   = new ExcelJS.Workbook();
    wb.creator  = "POS System";
    wb.created  = new Date();

    // ── SHEET 1: Transaction Detail ───────────────────────────────────────────
    const ws = wb.addWorksheet("ABCT Tax Report");

    // Title
    ws.mergeCells("A1:H1");
    const titleCell   = ws.getCell("A1");
    titleCell.value   = `ABCT Tax Report — ${dateFrom === dateTo ? dateFrom : `${dateFrom} to ${dateTo}`}`;
    titleCell.font    = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: "center" };

    ws.addRow([]);

    // Summary block
    ws.addRow(["Summary"]).font = { bold: true };
    ws.addRow(["Total Orders",    summary.totalOrders]);
    ws.addRow(["Normal Orders",   summary.normalOrders]);
    ws.addRow(["Exempt Orders",   summary.exemptOrders]);
    ws.addRow(["Total Subtotal",  summary.totalSubtotal]);
    ws.addRow(["Total ABCT Tax",  summary.totalTax]);
    ws.addRow(["Total Revenue",   summary.totalRevenue]);

    ws.addRow([]);

    // Column headers
    const headerRow = ws.addRow([
      "#",
      "Order Ref",
      "Date & Time",
      "Customer",
      "Subtotal (XCD)",
      "ABCT 17% (XCD)",
      "Total (XCD)",
      "Tax Status",
    ]);

    headerRow.eachCell((cell) => {
      cell.font      = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D3748" } };
      cell.alignment = { horizontal: "center" };
      cell.border    = {
        top:    { style: "thin" },
        bottom: { style: "thin" },
        left:   { style: "thin" },
        right:  { style: "thin" },
      };
    });

    // Data rows
    orders.forEach((o:any, i:any) => {
      const row = ws.addRow([
        i + 1,
        o.ref,
        new Date(o.date).toLocaleString("en-AG", { timeZone: "America/Antigua" }),
        o.customer,
        o.subtotal,
        o.taxAmount,
        o.total,
        o.isExempt ? `Exempt (${o.taxReason})` : "ABCT 17%",
      ]);

      // Alternate row color
      if (i % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7FAFC" } };
        });
      }

      // Highlight exempt rows
      if (o.isExempt) {
        row.getCell(8).font = { color: { argb: "FFE53E3E" }, bold: true };
      }

      // Number format for currency columns
      [5, 6, 7].forEach((col) => {
        row.getCell(col).numFmt = "#,##0.00";
      });

      row.eachCell((cell) => {
        cell.border = {
          top:    { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left:   { style: "thin", color: { argb: "FFE2E8F0" } },
          right:  { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    });

    // Totals footer row
    ws.addRow([]);
    const footerRow = ws.addRow([
      "",
      "",
      "",
      "TOTAL",
      summary.totalSubtotal,
      summary.totalTax,
      summary.totalRevenue,
      "",
    ]);
    footerRow.eachCell((cell, col) => {
      cell.font = { bold: true };
      if ([5, 6, 7].includes(col)) {
        cell.numFmt = "#,##0.00";
        cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDF2F7" } };
      }
    });

    // Column widths
    ws.getColumn(1).width  = 5;
    ws.getColumn(2).width  = 18;
    ws.getColumn(3).width  = 22;
    ws.getColumn(4).width  = 20;
    ws.getColumn(5).width  = 16;
    ws.getColumn(6).width  = 16;
    ws.getColumn(7).width  = 16;
    ws.getColumn(8).width  = 22;

    // ── SHEET 2: Daily Breakdown (if date range > 1 day) ─────────────────────
    if (dateFrom !== dateTo) {
      const ws2 = wb.addWorksheet("Daily Breakdown");

      ws2.mergeCells("A1:E1");
      const t2 = ws2.getCell("A1");
      t2.value = `Daily Breakdown — ${dateFrom} to ${dateTo}`;
      t2.font  = { bold: true, size: 13 };
      t2.alignment = { horizontal: "center" };

      ws2.addRow([]);

      const h2 = ws2.addRow(["Date", "Orders", "Subtotal (XCD)", "ABCT Tax (XCD)", "Total (XCD)"]);
      h2.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D3748" } };
        cell.alignment = { horizontal: "center" };
      });

      // Group orders by day
      const byDay: Record<string, { orders: number; tax: number; subtotal: number; total: number }> = {};
      for (const o of orders) {
        const d = o.date.slice(0, 10);
        if (!byDay[d]) byDay[d] = { orders: 0, tax: 0, subtotal: 0, total: 0 };
        byDay[d].orders++;
        byDay[d].subtotal = r2(byDay[d].subtotal + o.subtotal);
        byDay[d].tax      = r2(byDay[d].tax      + o.taxAmount);
        byDay[d].total    = r2(byDay[d].total     + o.total);
      }

      Object.entries(byDay).sort().forEach(([date, data], i) => {
        const row = ws2.addRow([date, data.orders, data.subtotal, data.tax, data.total]);
        if (i % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7FAFC" } };
          });
        }
        [3, 4, 5].forEach((col) => { row.getCell(col).numFmt = "#,##0.00"; });
      });

      // Footer
      ws2.addRow([]);
      const f2 = ws2.addRow([
        "TOTAL", summary.totalOrders, summary.totalSubtotal, summary.totalTax, summary.totalRevenue,
      ]);
      f2.eachCell((cell) => { cell.font = { bold: true }; });
      [3, 4, 5].forEach((col) => { f2.getCell(col).numFmt = "#,##0.00"; });

      ws2.getColumn(1).width = 14;
      ws2.getColumn(2).width = 10;
      ws2.getColumn(3).width = 18;
      ws2.getColumn(4).width = 18;
      ws2.getColumn(5).width = 18;
    }

    // ── Send file ─────────────────────────────────────────────────────────────
    const filename = `ABCT_Tax_${dateFrom}_${dateTo}.xlsx`.replace(/\s/g, "_");

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();
  },
);