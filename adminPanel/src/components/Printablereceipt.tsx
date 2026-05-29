import { CartItem, Customer, PaymentLine } from "@/types/pos";

// ─── Shop Config ───────────────────────────────────────────────────────────
const shopName    = "Chef's World";
const shopTagline = "Restaurant & Kitchen Supplies";
const shopAddress = "123 Culinary Ave, Foodie City, FL 12345";
const shopPhone   = "(555) 123-4567";

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toFixed(2);

function calcLineTotal(item: CartItem) {
  return item.price * item.qty * (1 - (item.discount || 0) / 100);
}
function calcOrderTotals(cart: CartItem[]) {
  const subtotal = cart.reduce((a, i) => a + calcLineTotal(i), 0);
  const tax      = subtotal * 0.1;
  const total    = subtotal + tax;
  return { subtotal, tax, total };
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface PrintableReceiptProps {
  cart:         CartItem[];
  customer:     Customer | null;
  paymentLines: PaymentLine[];
  odooOrderId?: number;
  receiptNo:    string;
}

export function PrintableReceipt(_props: PrintableReceiptProps) {
  return null;
}

// ─── HTML Builder ──────────────────────────────────────────────────────────
function buildReceiptHTML(
  cart: CartItem[],
  _customer: Customer | null,
  paymentLines: PaymentLine[],
  odooOrderId: number | undefined,
  receiptNo: string,
): string {
  const { subtotal, tax, total } = calcOrderTotals(cart);
  const paid   = paymentLines.reduce((s, l) => s + l.amount, 0);
  const change = paid - total;

  const dateStr = new Date().toLocaleString("en-US", {
    day:   "2-digit",
    month: "short",
    year:  "numeric",
  });
  const timeStr = new Date().toLocaleString("en-US", {
    hour:   "2-digit",
    minute: "2-digit",
  });

  // ── Barcode stripes ──────────────────────────────────────────────────────
  const barcodeStripes = Array.from({ length: 32 }, (_, i) => {
    const w = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1][i % 10];
    const h = [100, 75, 100, 85, 65, 100, 80, 100, 70, 90][i % 10];
    return `<div style="width:${w}px;background:#0a0a0a;height:${h}%;display:inline-block;margin-right:${i % 3 === 0 ? 2 : 1}px;vertical-align:bottom;"></div>`;
  }).join("");

  // ── Line items ───────────────────────────────────────────────────────────
  const lineItems = cart.map((item) => {
    const lineTotal   = calcLineTotal(item);
    const hasDiscount = (item.discount ?? 0) > 0;
    const discountAmt = item.price * item.qty * ((item.discount ?? 0) / 100);

    return `
      <tr class="item-row">
        <td class="td-name">${item.name}</td>
        <td class="td-qty">${item.qty}</td>
        <td class="td-each">$${fmt(item.price)}</td>
        <td class="td-line">$${fmt(lineTotal)}</td>
      </tr>
      ${hasDiscount ? `
      <tr class="disc-row">
        <td colspan="3" class="td-disc-label">&#8627; ${item.discount}% discount</td>
        <td class="td-disc-amt">&minus;$${fmt(discountAmt)}</td>
      </tr>` : ""}`;
  }).join("");

  // ── Payment rows ─────────────────────────────────────────────────────────
  const paymentRows = paymentLines.map((l) => `
    <div class="pay-row">
      <span style="text-transform:capitalize;">${l.method}</span>
      <span>$${fmt(l.amount)}</span>
    </div>`).join("");

  const changeRow = change > 0.005 ? `
    <div class="pay-row">
      <span>Change</span>
      <span>$${fmt(change)}</span>
    </div>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700;900&display=swap');

    @page {
      size: 80mm auto;
      margin: 0;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html, body {
      width: 70mm;
      background: #ffffff;
      font-family: 'IBM Plex Mono', 'Courier New', monospace;
      font-size: 9pt;
      color: #0a0a0a;
      line-height: 1.45;
    }

    .receipt { width: 70mm; background: #ffffff; }

    /* ── HEADER ───────────────────────────── */
    .header {
      padding: 14pt 8pt 12pt;
      text-align: center;
    }

    .logo {
      display: block;
      max-width: 50mm;
      height: auto;
      margin: 0 auto 10pt;
    }

    .header-rule {
      border: none;
      border-top: 1pt solid #0a0a0a;
      margin: 0 auto 7pt;
      width: 100%;
    }

    .header-tagline {
      font-size: 6.5pt;
      letter-spacing: 2pt;
      text-transform: uppercase;
      line-height: 1.9;
      margin-bottom: 2pt;
    }

    .header-info {
      font-size: 6pt;
      opacity: 0.4;
      letter-spacing: 0.5pt;
      line-height: 1.9;
    }

    /* ── META ─────────────────────────────── */
    .meta {
      border-top: 2pt solid #0a0a0a;
      border-bottom: 1pt solid #0a0a0a;
      padding: 7pt 8pt;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 1.5pt 0;
    }

    .meta-key {
      font-size: 5.5pt;
      letter-spacing: 2pt;
      text-transform: uppercase;
      opacity: 0.4;
    }

    .meta-val {
      font-size: 7.5pt;
      font-weight: 700;
    }

    .meta-val-lg {
      font-size: 10pt;
      font-weight: 900;
      letter-spacing: -0.25pt;
    }

    /* ── ITEMS TABLE ──────────────────────── */
    .col-head {
      display: grid;
      grid-template-columns: 1fr 16pt 38pt 38pt;
      padding: 5pt 8pt 4pt;
      font-size: 5.5pt;
      letter-spacing: 1.5pt;
      text-transform: uppercase;
      opacity: 0.35;
      border-bottom: 1pt solid #0a0a0a;
    }

    .col-head span:nth-child(2) { text-align: center; }
    .col-head span:nth-child(3),
    .col-head span:nth-child(4) { text-align: right; }

    table.items {
      width: 100%;
      border-collapse: collapse;
      padding: 0 8pt;
    }

    table.items td {
      padding: 5pt 0;
      vertical-align: baseline;
    }

    table.items td:first-child { padding-left: 8pt; }
    table.items td:last-child  { padding-right: 8pt; }

    .item-row + .item-row td { border-top: 0.5pt dashed rgba(10,10,10,0.15); }

    .td-name  { font-size: 9pt; font-weight: 700; }
    .td-qty   { text-align: center; font-size: 8.5pt; }
    .td-each  { text-align: right; font-size: 7.5pt; opacity: 0.45; }
    .td-line  { text-align: right; font-size: 9pt; font-weight: 700; }

    .td-disc-label {
      font-size: 7pt;
      opacity: 0.4;
      padding-top: 0 !important;
      padding-bottom: 4pt !important;
      padding-left: 16pt !important;
    }
    .td-disc-amt {
      text-align: right;
      font-size: 7pt;
      opacity: 0.4;
      padding-top: 0 !important;
      padding-bottom: 4pt !important;
      padding-right: 8pt !important;
    }

    /* ── TOTALS ───────────────────────────── */
    .totals {
      padding: 5pt 8pt 0;
      border-top: 1pt solid #0a0a0a;
    }

    .tot-row {
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      padding: 1.5pt 0;
      opacity: 0.5;
    }

    /* ── GRAND TOTAL ──────────────────────── */
    .grand {
      margin: 5pt 8pt 0;
      padding: 6pt 0;
      border-top: 2pt solid #0a0a0a;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .grand-label {
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 2pt;
      text-transform: uppercase;
    }

    .grand-amount {
      font-size: 18pt;
      font-weight: 900;
      letter-spacing: -1pt;
      line-height: 1;
    }

    /* ── PAYMENT ──────────────────────────── */
    .payment {
      padding: 5pt 8pt 6pt;
      border-top: 1pt dashed #0a0a0a;
    }

    .pay-row {
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      padding: 1pt 0;
      opacity: 0.5;
    }

    /* ── BARCODE ──────────────────────────── */
    .barcode-wrap {
      padding: 9pt 8pt 5pt;
      text-align: center;
      border-top: 1pt solid #0a0a0a;
    }

    .barcode-bars {
      height: 26pt;
      display: flex;
      justify-content: center;
      align-items: flex-end;
      margin-bottom: 4pt;
    }

    .barcode-num {
      font-size: 6pt;
      letter-spacing: 3pt;
      opacity: 0.4;
    }

    /* ── FOOTER ───────────────────────────── */
    .footer {
      padding: 10pt 8pt 12pt;
      text-align: center;
      border-top: 2pt solid #0a0a0a;
    }

    .footer-thanks {
      font-size: 10.5pt;
      font-weight: 900;
      letter-spacing: 0.5pt;
      margin-bottom: 5pt;
    }

    .footer-sub {
      font-size: 6pt;
      letter-spacing: 2pt;
      text-transform: uppercase;
      opacity: 0.35;
      line-height: 2.2;
    }
  </style>
</head>
<body>
<div class="receipt">

  <!-- HEADER -->
  <div class="header">
    <img src="/chefworldlogo.png" alt="${shopName}" class="logo" />
    <hr class="header-rule"/>
    <div class="header-tagline">${shopTagline}</div>
    <div class="header-info">${shopAddress} &middot; ${shopPhone}</div>
  </div>

  <!-- META -->
  <div class="meta">
    <div class="meta-row">
      <span class="meta-key">Receipt</span>
      <span class="meta-val-lg">${receiptNo}</span>
    </div>
    <div class="meta-row">
      <span class="meta-key">Date</span>
      <span class="meta-val">${dateStr}</span>
    </div>
    <div class="meta-row">
      <span class="meta-key">Time</span>
      <span class="meta-val">${timeStr}</span>
    </div>
    ${odooOrderId ? `
    <div class="meta-row">
      <span class="meta-key">Order</span>
      <span class="meta-val">#${odooOrderId}</span>
    </div>` : ""}
  </div>

  <!-- ITEMS -->
  <div class="col-head">
    <span>Item</span>
    <span>Q</span>
    <span>Each</span>
    <span>Line</span>
  </div>
  <table class="items">
    <tbody>${lineItems}</tbody>
  </table>

  <!-- TOTALS -->
  <div class="totals">
    <div class="tot-row"><span>Subtotal</span><span>$${fmt(subtotal)}</span></div>
    <div class="tot-row"><span>Tax (10%)</span><span>$${fmt(tax)}</span></div>
  </div>

  <!-- GRAND TOTAL -->
  <div class="grand">
    <span class="grand-label">Total</span>
    <span class="grand-amount">$${fmt(total)}</span>
  </div>

  <!-- PAYMENT -->
  <div class="payment">
    ${paymentRows}
    ${changeRow}
  </div>

  <!-- BARCODE -->
  <div class="barcode-wrap">
    <div class="barcode-bars">${barcodeStripes}</div>
    <div class="barcode-num">${receiptNo}</div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-thanks">Thank you!</div>
    <div class="footer-sub">We appreciate your business</div>
    <div class="footer-sub">Please retain this receipt</div>
  </div>

</div>
</body>
</html>`;
}

// ─── Print Hook ────────────────────────────────────────────────────────────
interface UsePrintReceiptOptions {
  cart:         CartItem[];
  customer:     Customer | null;
  paymentLines: PaymentLine[];
  odooOrderId?: number;
  receiptNo:    string;
}

export function usePrintReceipt(options: UsePrintReceiptOptions) {
  const printReceipt = async () => {
    const { cart, customer, paymentLines, odooOrderId, receiptNo } = options;
    const html = buildReceiptHTML(cart, customer, paymentLines, odooOrderId, receiptNo);

    document.getElementById("__print_frame__")?.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "__print_frame__";
    iframe.style.cssText =
      "position:absolute;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => iframe.remove(), 3000);
      }, 400);
    };
  };

  return { printReceipt };
}