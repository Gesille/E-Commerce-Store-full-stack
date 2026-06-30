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

import PDFDocument from "pdfkit";

// ─────────────────────────────────────────────────────────────────────────────
// GET /reports/taxes/export
// Query params: dateFrom, dateTo (or date for single day, or year+month)
// Downloads a styled PDF for the accountant
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  primary:   "#2D3748",
  accent:    "#6366F1",
  green:     "#059669",
  amber:     "#D97706",
  textMuted: "#94A3B8",
  textBody:  "#334155",
  border:    "#E2E8F0",
  rowAlt:    "#F8FAFC",
};

export const exportTaxReportPDF = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    // ── Resolve date range ────────────────────────────────────────────────
    let dateFrom: string;
    let dateTo:   string;

    if (req.query.date) {
      dateFrom = dateTo = req.query.date as string;
    } else if (req.query.year && req.query.month) {
      const year  = Number(req.query.year);
      const month = Number(req.query.month);
      const last  = new Date(year, month, 0).getDate();
      dateFrom    = `${year}-${String(month).padStart(2, "0")}-01`;
      dateTo      = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    } else if (req.query.dateFrom && req.query.dateTo) {
      dateFrom = req.query.dateFrom as string;
      dateTo   = req.query.dateTo   as string;
    } else {
      const today = toDateStr(new Date());
      dateFrom = dateTo = today;
    }

    const rawOrders = await fetchPosOrders(dateFrom, dateTo);
    const orders    = rawOrders.map(mapOrder);
    const summary   = buildSummary(orders);

    const filename = `ABCT_Tax_${dateFrom}_${dateTo}.pdf`.replace(/\s/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
    doc.pipe(res);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left      = doc.page.margins.left;

    // ── Header band ────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 90).fill(COLORS.primary);
    doc
      .fillColor("#FFFFFF")
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("ABCT Tax Report", left, 28);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#CBD5E1")
      .text(
        dateFrom === dateTo ? dateFrom : `${dateFrom}  →  ${dateTo}`,
        left,
        56,
      );
    doc
      .fontSize(8)
      .fillColor("#94A3B8")
      .text(`Generated ${new Date().toLocaleString()}`, left, 72);

    doc.y = 110;

    // ── Summary cards ──────────────────────────────────────────────────────
    const cardData = [
      { label: "Total Revenue",   value: `XCD ${summary.totalRevenue.toFixed(2)}`, color: COLORS.accent },
      { label: "ABCT Tax (17%)",  value: `XCD ${summary.totalTax.toFixed(2)}`,      color: COLORS.green },
      { label: "Total Orders",    value: `${summary.totalOrders}`,                  color: COLORS.primary },
      { label: "Exempt Orders",   value: `${summary.exemptOrders}`,                 color: COLORS.amber },
    ];

    const cardW = (pageWidth - 3 * 10) / 4;
    const cardY = doc.y;

    cardData.forEach((c, i) => {
      const x = left + i * (cardW + 10);
      doc.roundedRect(x, cardY, cardW, 56, 6).fillAndStroke("#FFFFFF", COLORS.border);
      doc.rect(x, cardY, 4, 56).fill(c.color);
      doc
        .fillColor(COLORS.textMuted)
        .fontSize(8)
        .font("Helvetica")
        .text(c.label, x + 12, cardY + 10, { width: cardW - 20 });
      doc
        .fillColor(COLORS.textBody)
        .fontSize(13)
        .font("Helvetica-Bold")
        .text(c.value, x + 12, cardY + 26, { width: cardW - 20 });
    });

    doc.y = cardY + 56 + 24;

    // ── Table ──────────────────────────────────────────────────────────────
    const cols = [
      { key: "ref",       label: "Order",    width: 70,  align: "left"  as const },
      { key: "date",      label: "Date",     width: 95,  align: "left"  as const },
      { key: "customer",  label: "Customer", width: 95,  align: "left"  as const },
      { key: "subtotal",  label: "Subtotal", width: 65,  align: "right" as const },
      { key: "taxAmount", label: "Tax",      width: 60,  align: "right" as const },
      { key: "total",     label: "Total",    width: 65,  align: "right" as const },
      { key: "status",    label: "Status",   width: pageWidth - (70+95+95+65+60+65), align: "center" as const },
    ];

    const rowHeight = 20;

    function drawTableHeader(y: number) {
      doc.rect(left, y, pageWidth, rowHeight).fill(COLORS.primary);
      let x = left;
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#FFFFFF");
      for (const c of cols) {
        doc.text(c.label, x + 6, y + 6, { width: c.width - 12, align: c.align });
        x += c.width;
      }
      return y + rowHeight;
    }

    let y = drawTableHeader(doc.y);

    orders.forEach((o:any, i:any) => {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 30) {
        doc.addPage();
        y = drawTableHeader(doc.page.margins.top);
      }

      if (i % 2 === 0) {
        doc.rect(left, y, pageWidth, rowHeight).fill(COLORS.rowAlt);
      }

      let x = left;
      doc.fontSize(8).font("Helvetica").fillColor(COLORS.textBody);

      const rowVals: Record<string, string> = {
        ref:       o.ref,
        date:      new Date(o.date).toLocaleString("en-AG", {
          timeZone: "America/Antigua",
          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        }),
        customer:  o.customer,
        subtotal:  o.subtotal.toFixed(2),
        taxAmount: o.taxAmount.toFixed(2),
        total:     o.total.toFixed(2),
      };

      for (const c of cols) {
        if (c.key === "status") continue;
        doc.fillColor(COLORS.textBody).text(rowVals[c.key] ?? "", x + 6, y + 6, {
          width: c.width - 12,
          align: c.align,
        });
        x += c.width;
      }

      // Status badge
      const statusCol = cols[cols.length - 1];
      const badgeText = o.isExempt ? `Exempt` : "ABCT 17%";
      doc
        .fontSize(7.5)
        .font("Helvetica-Bold")
        .fillColor(o.isExempt ? COLORS.amber : COLORS.green)
        .text(badgeText, x + 6, y + 6, { width: statusCol.width - 12, align: "center" });

      y += rowHeight;
    });

    // Totals row
    doc.rect(left, y, pageWidth, rowHeight + 2).fill("#EDF2F7");
    let xt = left;
    const totalsVals = ["", "", "TOTAL", summary.totalSubtotal.toFixed(2), summary.totalTax.toFixed(2), summary.totalRevenue.toFixed(2), ""];
    cols.forEach((c, idx) => {
      doc
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .fillColor(COLORS.primary)
        .text(totalsVals[idx], xt + 6, y + 7, { width: c.width - 12, align: c.align });
      xt += c.width;
    });

    // ── Footer page numbers ───────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(7)
        .fillColor(COLORS.textMuted)
        .text(
          `Page ${i + 1} of ${range.count}`,
          left,
          doc.page.height - 25,
          { width: pageWidth, align: "center" },
        );
    }

    doc.end();
  },
);