import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import { odooRequest } from "../odoo/odoo.client.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import puppeteer from "puppeteer";
import ExcelJS from "exceljs";

// ─── helpers ────────────────────────────────────────────────────────────────

function buildDomain(dateFrom: string, dateTo: string) {
  return [
    ["state", "in", ["sale", "done"]],        // confirmed + done orders only
    ["date_order", ">=", `${dateFrom} 00:00:00`],
    ["date_order", "<=", `${dateTo} 23:59:59`],
  ];
}

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

// ─── Monthly report  (one row per month for a given year) ───────────────────

export const getMonthlySalesReport = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    // Pull every confirmed order for the whole year in one request
    const orders = await odooRequest("sale.order", "search_read", [
      buildDomain(`${year}-01-01`, `${year}-12-31`),
    ], {
      fields: ["name", "date_order", "amount_total", "amount_untaxed", "state"],
    });

    // Aggregate per month
    const months: Record<number, {
      month: number;
      label: string;
      orders: number;
      revenue: number;
      revenue_untaxed: number;
    }> = {};

    for (let m = 1; m <= 12; m++) {
      months[m] = {
        month: m,
        label: new Date(year, m - 1, 1).toLocaleString("en-US", { month: "long" }),
        orders: 0,
        revenue: 0,
        revenue_untaxed: 0,
      };
    }

    for (const order of orders as any[]) {
      const m = new Date(order.date_order).getMonth() + 1;
      months[m].orders += 1;
      months[m].revenue += order.amount_total;
      months[m].revenue_untaxed += order.amount_untaxed;
    }

    res.json({
      success: true,
      year,
      total_orders: orders.length,
      total_revenue: Object.values(months).reduce((s, m) => s + m.revenue, 0),
      months: Object.values(months),
    });
  }
);

// ─── Daily report  (one row per day for a given month) ──────────────────────

export const getDailySalesReport = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const year  = parseInt(req.query.year  as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

    const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay  = new Date(year, month, 0).getDate(); // last day of month
    const dateTo   = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const orders = await odooRequest("sale.order", "search_read", [
      buildDomain(dateFrom, dateTo),
    ], {
      fields: ["name", "date_order", "amount_total", "amount_untaxed", "state"],
    });

    // Aggregate per day
    const days: Record<string, {
      date: string;
      orders: number;
      revenue: number;
      revenue_untaxed: number;
    }> = {};

    for (let d = 1; d <= lastDay; d++) {
      const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days[key] = { date: key, orders: 0, revenue: 0, revenue_untaxed: 0 };
    }

    for (const order of orders as any[]) {
      const key = isoDate(new Date(order.date_order));
      if (days[key]) {
        days[key].orders  += 1;
        days[key].revenue += order.amount_total;
        days[key].revenue_untaxed += order.amount_untaxed;
      }
    }

    res.json({
      success: true,
      year,
      month,
      date_range: { from: dateFrom, to: dateTo },
      total_orders: orders.length,
      total_revenue: Object.values(days).reduce((s, d) => s + d.revenue, 0),
      days: Object.values(days),
    });
  }
);

// ─── Per-product breakdown for a date range ─────────────────────────────────
// Useful for "which products sold most this month"

export const getProductSalesReport = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { date_from, date_to } = req.query as Record<string, string>;

    if (!date_from || !date_to) {
      return next(new ErrorHandler("date_from and date_to are required (YYYY-MM-DD)", 400));
    }

    // sale.order.line gives product-level detail
    const lines = await odooRequest("sale.order.line", "search_read", [
      [
        ["order_id.state", "in", ["sale", "done"]],
        ["order_id.date_order", ">=", `${date_from} 00:00:00`],
        ["order_id.date_order", "<=", `${date_to} 23:59:59`],
      ],
    ], {
      fields: [
        "product_id",
        "product_uom_qty",
        "price_subtotal",
        "price_total",
        "order_id",
      ],
    });

    // Aggregate per product
    const products: Record<number, {
      product_id: number;
      product_name: string;
      qty_sold: number;
      revenue: number;
      orders: Set<number>;
    }> = {};

    for (const line of lines as any[]) {
      const pid   = line.product_id[0];
      const pname = line.product_id[1];
      if (!products[pid]) {
        products[pid] = {
          product_id: pid,
          product_name: pname,
          qty_sold: 0,
          revenue: 0,
          orders: new Set(),
        };
      }
      products[pid].qty_sold += line.product_uom_qty;
      products[pid].revenue  += line.price_subtotal;
      products[pid].orders.add(line.order_id[0]);
    }

    const result = Object.values(products)
      .map(({ orders, ...p }) => ({ ...p, order_count: orders.size }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json({
      success: true,
      date_from,
      date_to,
      total_products_sold: result.length,
      total_revenue: result.reduce((s, p) => s + p.revenue, 0),
      products: result,
    });
  }
);

// ─── Inventory movement report ───────────────────────────────────────────────
// Uses stock.move to show what moved in/out in a period

export const getInventoryMovementReport = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { date_from, date_to } = req.query as Record<string, string>;

    if (!date_from || !date_to) {
      return next(new ErrorHandler("date_from and date_to are required (YYYY-MM-DD)", 400));
    }

    const moves = await odooRequest("stock.move", "search_read", [
      [
        ["state", "=", "done"],
        ["date", ">=", `${date_from} 00:00:00`],
        ["date", "<=", `${date_to} 23:59:59`],
      ],
    ], {
      fields: [
        "product_id",
        "product_uom_qty",
        "location_id",
        "location_dest_id",
        "date",
        "origin",
      ],
    });

    // Classify as IN (coming into main stock) or OUT (leaving stock)
    const summary: Record<number, {
      product_id: number;
      product_name: string;
      qty_in: number;
      qty_out: number;
    }> = {};

    for (const move of moves as any[]) {
      const pid   = move.product_id[0];
      const pname = move.product_id[1];
      const destName: string = move.location_dest_id[1] ?? "";
      const srcName:  string = move.location_id[1] ?? "";

      if (!summary[pid]) {
        summary[pid] = { product_id: pid, product_name: pname, qty_in: 0, qty_out: 0 };
      }

      // Heuristic: destinations containing "Customers" or "Virtual" are outbound
      const isOut = destName.toLowerCase().includes("customer") ||
                    destName.toLowerCase().includes("virtual");
      const isIn  = srcName.toLowerCase().includes("vendor") ||
                    srcName.toLowerCase().includes("supplier");

      if (isOut) summary[pid].qty_out += move.product_uom_qty;
      if (isIn)  summary[pid].qty_in  += move.product_uom_qty;
    }

    res.json({
      success: true,
      date_from,
      date_to,
      movements: Object.values(summary).sort((a, b) => b.qty_out - a.qty_out),
    });
  }
);



// export
// ─── Monthly Export ──────────────────────────────────────────────────────────

export const exportMonthlySalesReport = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const year   = parseInt(req.query.year as string) || new Date().getFullYear();
    const format = (req.query.format as string) || "excel";

    // Reuse the same aggregation logic
    const orders = await odooRequest("sale.order", "search_read", [
      buildDomain(`${year}-01-01`, `${year}-12-31`),
    ], { fields: ["date_order", "amount_total", "amount_untaxed"] });

    const months: Record<number, any> = {};
    for (let m = 1; m <= 12; m++) {
      months[m] = {
        month: m,
        label: new Date(year, m - 1, 1).toLocaleString("en-US", { month: "long" }),
        orders: 0, revenue: 0, revenue_untaxed: 0,
      };
    }
    for (const o of orders as any[]) {
      const m = new Date(o.date_order).getMonth() + 1;
      months[m].orders++;
      months[m].revenue        += o.amount_total;
      months[m].revenue_untaxed += o.amount_untaxed;
    }
    const rows = Object.values(months);

    if (format === "excel") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(`Sales ${year}`);

      ws.columns = [
        { header: "Month",           key: "label",            width: 14 },
        { header: "Orders",          key: "orders",           width: 10 },
        { header: "Revenue",         key: "revenue",          width: 16 },
        { header: "Revenue Untaxed", key: "revenue_untaxed",  width: 18 },
      ];
      ws.getRow(1).font = { bold: true };
      ws.addRows(rows);

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="monthly-sales-${year}.xlsx"`);
      await wb.xlsx.write(res);
      res.end();

    } else {
      // PDF via Puppeteer
      const tableRows = rows.map(r => `
        <tr>
          <td>${r.label}</td>
          <td>${r.orders}</td>
          <td>$${r.revenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
          <td>$${r.revenue_untaxed.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
        </tr>`).join("");

      const html = buildHtmlTable(
        `Monthly Sales Report — ${year}`,
        ["Month", "Orders", "Revenue", "Revenue Untaxed"],
        tableRows
      );
      await streamPdf(res, html, `monthly-sales-${year}.pdf`);
    }
  }
);

// ─── Daily Export ────────────────────────────────────────────────────────────

export const exportDailySalesReport = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const year   = parseInt(req.query.year  as string) || new Date().getFullYear();
    const month  = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const format = (req.query.format as string) || "excel";

    const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay  = new Date(year, month, 0).getDate();
    const dateTo   = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const orders = await odooRequest("sale.order", "search_read", [
      buildDomain(dateFrom, dateTo),
    ], { fields: ["date_order", "amount_total"] });

    const days: Record<string, any> = {};
    for (let d = 1; d <= lastDay; d++) {
      const key = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      days[key] = { date: key, orders: 0, revenue: 0 };
    }
    for (const o of orders as any[]) {
      const key = isoDate(new Date(o.date_order));
      if (days[key]) { days[key].orders++; days[key].revenue += o.amount_total; }
    }
    const rows = Object.values(days).filter(d => d.orders > 0);

    if (format === "excel") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Daily Sales");
      ws.columns = [
        { header: "Date",    key: "date",    width: 14 },
        { header: "Orders",  key: "orders",  width: 10 },
        { header: "Revenue", key: "revenue", width: 16 },
      ];
      ws.getRow(1).font = { bold: true };
      ws.addRows(rows);

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="daily-sales-${year}-${month}.xlsx"`);
      await wb.xlsx.write(res);
      res.end();

    } else {
      const tableRows = rows.map(r => `
        <tr>
          <td>${r.date}</td><td>${r.orders}</td>
          <td>$${r.revenue.toLocaleString("en-US",{maximumFractionDigits:0})}</td>
        </tr>`).join("");
      const html = buildHtmlTable(
        `Daily Sales — ${year}/${String(month).padStart(2,"0")}`,
        ["Date","Orders","Revenue"],
        tableRows
      );
      await streamPdf(res, html, `daily-sales-${year}-${month}.pdf`);
    }
  }
);

// ─── Product Export ──────────────────────────────────────────────────────────

export const exportProductSalesReport = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { date_from, date_to, format = "excel" } = req.query as Record<string, string>;
    if (!date_from || !date_to) return next(new ErrorHandler("date_from and date_to required", 400));

    const lines = await odooRequest("sale.order.line", "search_read", [[
      ["order_id.state","in",["sale","done"]],
      ["order_id.date_order",">=",`${date_from} 00:00:00`],
      ["order_id.date_order","<=",`${date_to} 23:59:59`],
    ]], { fields: ["product_id","product_uom_qty","price_subtotal","order_id"] });

    const products: Record<number, any> = {};
    for (const l of lines as any[]) {
      const pid = l.product_id[0];
      if (!products[pid]) products[pid] = { product_id: pid, product_name: l.product_id[1], qty_sold: 0, revenue: 0, orders: new Set() };
      products[pid].qty_sold += l.product_uom_qty;
      products[pid].revenue  += l.price_subtotal;
      products[pid].orders.add(l.order_id[0]);
    }
    const rows = Object.values(products)
      .map(({ orders, ...p }) => ({ ...p, order_count: orders.size }))
      .sort((a, b) => b.revenue - a.revenue);

    if (format === "excel") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Product Sales");
      ws.columns = [
        { header: "#",           key: "product_id",   width: 8  },
        { header: "Product",     key: "product_name", width: 30 },
        { header: "Units Sold",  key: "qty_sold",     width: 12 },
        { header: "Orders",      key: "order_count",  width: 10 },
        { header: "Revenue",     key: "revenue",      width: 16 },
      ];
      ws.getRow(1).font = { bold: true };
      ws.addRows(rows);

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="product-sales.xlsx"`);
      await wb.xlsx.write(res);
      res.end();

    } else {
      const tableRows = rows.map((p, i) => `
        <tr>
          <td>${i+1}</td><td>${p.product_name}</td>
          <td>${p.qty_sold}</td><td>${p.order_count}</td>
          <td>$${p.revenue.toLocaleString("en-US",{maximumFractionDigits:0})}</td>
        </tr>`).join("");
      const html = buildHtmlTable(
        `Product Sales — ${date_from} to ${date_to}`,
        ["#","Product","Units","Orders","Revenue"],
        tableRows
      );
      await streamPdf(res, html, `product-sales.pdf`);
    }
  }
);

// ─── Inventory Export ────────────────────────────────────────────────────────

export const exportInventoryReport = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { date_from, date_to, format = "excel" } = req.query as Record<string, string>;
    if (!date_from || !date_to) return next(new ErrorHandler("date_from and date_to required", 400));

    const moves = await odooRequest("stock.move", "search_read", [[
      ["state","=","done"],
      ["date",">=",`${date_from} 00:00:00`],
      ["date","<=",`${date_to} 23:59:59`],
    ]], { fields: ["product_id","product_uom_qty","location_id","location_dest_id"] });

    const summary: Record<number, any> = {};
    for (const m of moves as any[]) {
      const pid = m.product_id[0];
      if (!summary[pid]) summary[pid] = { product_id: pid, product_name: m.product_id[1], qty_in: 0, qty_out: 0 };
      const dest = (m.location_dest_id[1] ?? "").toLowerCase();
      const src  = (m.location_id[1]      ?? "").toLowerCase();
      if (dest.includes("customer") || dest.includes("virtual")) summary[pid].qty_out += m.product_uom_qty;
      if (src.includes("vendor")    || src.includes("supplier"))  summary[pid].qty_in  += m.product_uom_qty;
    }
    const rows = Object.values(summary).sort((a, b) => b.qty_out - a.qty_out)
      .map(r => ({ ...r, net: r.qty_in - r.qty_out }));

    if (format === "excel") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Inventory");
      ws.columns = [
        { header: "Product", key: "product_name", width: 30 },
        { header: "In",      key: "qty_in",       width: 10 },
        { header: "Out",     key: "qty_out",      width: 10 },
        { header: "Net",     key: "net",           width: 10 },
      ];
      ws.getRow(1).font = { bold: true };
      ws.addRows(rows);

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="inventory.xlsx"`);
      await wb.xlsx.write(res);
      res.end();

    } else {
      const tableRows = rows.map(r => `
        <tr>
          <td>${r.product_name}</td>
          <td style="color:#3B6D11">+${r.qty_in}</td>
          <td style="color:#993C1D">-${r.qty_out}</td>
          <td style="color:${r.net>=0?"#3B6D11":"#993C1D"}">${r.net>=0?"+":""}${r.net}</td>
        </tr>`).join("");
      const html = buildHtmlTable(
        `Inventory Movements — ${date_from} to ${date_to}`,
        ["Product","In","Out","Net"],
        tableRows
      );
      await streamPdf(res, html, `inventory.pdf`);
    }
  }
);

// ─── Shared PDF helpers ──────────────────────────────────────────────────────

function buildHtmlTable(title: string, headers: string[], rows: string) {
  return `
    <!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: -apple-system, sans-serif; font-size: 12px; padding: 32px; color: #1a1a1a; }
      h1   { font-size: 16px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f7f7f5; font-size: 11px; text-transform: uppercase;
           letter-spacing: .04em; padding: 8px 12px; text-align: left;
           border-bottom: 2px solid #e5e5e5; }
      td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
    </style>
    </head><body>
      <h1>${title}</h1>
      <table>
        <thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;
}

async function streamPdf(res: Response, html: string, filename: string) {
  const browser = await puppeteer.launch({ args: ["--no-sandbox","--disable-setuid-sandbox"] });
  const page    = await browser.newPage();
 await page.setContent(html);
await page.evaluate(() => document.fonts.ready); 
  const pdf = await page.pdf({ format: "A4", margin: { top:"20mm", bottom:"20mm", left:"15mm", right:"15mm" } });
  await browser.close();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.end(pdf);
}

