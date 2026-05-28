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
  customer: Customer | null,
  paymentLines: PaymentLine[],
  odooOrderId: number | undefined,
  receiptNo: string,
): string {
  const { subtotal, tax, total } = calcOrderTotals(cart);
  const paid   = paymentLines.reduce((s, l) => s + l.amount, 0);
  const change = paid - total;

  const dateStr = new Date().toLocaleString("en-US", {
    weekday: "short",
    day:     "2-digit",
    month:   "short",
    year:    "numeric",
  });
  const timeStr = new Date().toLocaleString("en-US", {
    hour:   "2-digit",
    minute: "2-digit",
  });

  // ── Barcode stripes ──────────────────────────────────────────────────────
  const barcodeStripes = Array.from({ length: 30 }, (_, i) => {
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
      <div class="item-row">
        <div class="item-grid">
          <span class="item-name">${item.name}</span>
          <span class="item-qty">${item.qty}</span>
          <span class="item-each">$${fmt(item.price)}</span>
          <span class="item-total">$${fmt(lineTotal)}</span>
        </div>
        ${hasDiscount ? `
        <div class="item-disc">
          <span>&#8627; ${item.discount}% discount applied</span>
          <span>&minus;$${fmt(discountAmt)}</span>
        </div>` : ""}
      </div>`;
  }).join("");

  // ── Payment rows ─────────────────────────────────────────────────────────
  const paymentMethods = paymentLines.map((l) => `
    <div class="pay-method">${l.method}</div>
    <div class="pay-amount">$${fmt(l.amount)} tendered</div>`).join("");

  const changeHtml = change > 0.005
    ? `<div class="pay-change">$${fmt(change)} change</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700;900&display=swap');

    @page {
      size: 80mm auto;
      margin: 6mm 5mm;
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
      line-height: 1.4;
    }

    .receipt { width: 70mm; background: #ffffff; }

    /* ── HEADER ───────────────────────────── */
    .header {
      padding: 14pt 8pt 12pt;
      text-align: center;
      border-bottom: 2pt solid #0a0a0a;
    }

    .logo {
      display: block;
      max-width: 52mm;
      height: auto;
      margin: 0 auto 10pt;
    }

    .ornament-row {
      display: flex;
      align-items: center;
      gap: 5pt;
      margin-bottom: 8pt;
    }

    .ornament-line {
      flex: 1;
      border: none;
      border-top: 0.75pt dashed #0a0a0a;
    }

    .ornament-star {
      font-size: 10pt;
      font-weight: 900;
      line-height: 1;
    }

    .header-tagline {
      font-size: 7pt;
      letter-spacing: 3pt;
      text-transform: uppercase;
      line-height: 2.2;
    }

    .header-info {
      font-size: 6pt;
      letter-spacing: 1pt;
      line-height: 2;
      opacity: 0.5;
    }

    /* ── STRIPE DIVIDER ───────────────────── */
    .stripe-divider {
      height: 3pt;
      background: repeating-linear-gradient(
        90deg,
        #0a0a0a 0pt, #0a0a0a 4pt,
        #ffffff 4pt, #ffffff 6pt
      );
    }

    /* ── META GRID ────────────────────────── */
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1.4fr;
      border-bottom: 0.75pt solid #0a0a0a;
    }

    .meta-cell {
      padding: 7pt 8pt;
    }

    .meta-cell.border-right {
      border-right: 0.75pt solid #0a0a0a;
    }

    .meta-cell.border-top {
      border-top: 0.75pt solid #0a0a0a;
    }

    .meta-label {
      font-size: 5.5pt;
      letter-spacing: 2.5pt;
      text-transform: uppercase;
      opacity: 0.4;
      margin-bottom: 2pt;
    }

    .meta-value {
      font-size: 8pt;
      font-weight: 700;
    }

    .meta-value-lg {
      font-size: 11pt;
      font-weight: 900;
      letter-spacing: -0.5pt;
    }

    .meta-value-sm {
      font-size: 7pt;
      opacity: 0.5;
    }

    /* ── ITEMS ────────────────────────────── */
    .col-head {
      display: grid;
      grid-template-columns: 1fr 16pt 42pt 42pt;
      padding: 6pt 8pt 5pt;
      font-size: 5.5pt;
      font-weight: 700;
      letter-spacing: 2.5pt;
      text-transform: uppercase;
      opacity: 0.4;
      border-bottom: 0.75pt solid #0a0a0a;
    }

    .col-head span:nth-child(2) { text-align: center; }
    .col-head span:nth-child(3),
    .col-head span:nth-child(4) { text-align: right; }

    .items-wrap { padding: 0 8pt; }

    .item-row {
      padding: 6pt 0;
      border-bottom: 0.5pt dashed rgba(10,10,10,0.2);
    }

    .item-row:last-child { border-bottom: none; }

    .item-grid {
      display: grid;
      grid-template-columns: 1fr 16pt 42pt 42pt;
      align-items: baseline;
    }

    .item-name  { font-size: 9pt; font-weight: 700; }
    .item-qty   { text-align: center; font-size: 8.5pt; }
    .item-each  { text-align: right; font-size: 8pt; opacity: 0.5; }
    .item-total { text-align: right; font-size: 9pt; font-weight: 700; }

    .item-disc {
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      opacity: 0.45;
      padding-top: 2pt;
      padding-left: 8pt;
    }

    /* ── TOTALS ───────────────────────────── */
    .totals-wrap {
      padding: 7pt 8pt 0;
      border-top: 0.75pt solid #0a0a0a;
    }

    .tot-row {
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      padding: 2pt 0;
      opacity: 0.55;
    }

    /* ── GRAND TOTAL ──────────────────────── */
    .grand-total {
      margin: 6pt 8pt 0;
      padding: 8pt 0;
      border-top: 2.5pt solid #0a0a0a;
      border-bottom: 2.5pt solid #0a0a0a;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .grand-left {}

    .grand-label {
      font-size: 5.5pt;
      letter-spacing: 2.5pt;
      text-transform: uppercase;
      opacity: 0.4;
      margin-bottom: 2pt;
    }

    .grand-amount {
      font-size: 20pt;
      font-weight: 900;
      letter-spacing: -1pt;
      line-height: 1;
    }

    .grand-right { text-align: right; }

    .grand-pay-label {
      font-size: 5.5pt;
      letter-spacing: 2pt;
      text-transform: uppercase;
      opacity: 0.4;
      margin-bottom: 2pt;
    }

    .pay-method {
      font-size: 9pt;
      font-weight: 700;
      text-transform: capitalize;
    }

    .pay-amount {
      font-size: 7.5pt;
      opacity: 0.5;
    }

    .pay-change {
      font-size: 7.5pt;
      opacity: 0.5;
    }

    /* ── BARCODE ──────────────────────────── */
    .barcode-wrap {
      margin: 0 8pt;
      padding: 9pt 0 5pt;
      text-align: center;
      border-top: 0.75pt solid #0a0a0a;
    }

    .barcode-bars {
      height: 28pt;
      display: flex;
      justify-content: center;
      align-items: flex-end;
      margin-bottom: 4pt;
    }

    .barcode-num {
      font-size: 6pt;
      letter-spacing: 3.5pt;
      opacity: 0.45;
    }

    /* ── FOOTER ───────────────────────────── */
    .footer {
      padding: 12pt 8pt 14pt;
      text-align: center;
      border-top: 0.75pt solid #0a0a0a;
    }

    .footer-ornament {
      display: flex;
      align-items: center;
      gap: 5pt;
      margin-bottom: 9pt;
    }

    .footer-thanks {
      font-size: 11pt;
      font-weight: 900;
      letter-spacing: 0.5pt;
      margin-bottom: 5pt;
    }

    .footer-sub {
      font-size: 6.5pt;
      letter-spacing: 1.5pt;
      text-transform: uppercase;
      opacity: 0.4;
      line-height: 2.2;
    }
  </style>
</head>
<body>
<div class="receipt">

  <!-- HEADER -->
  <div class="header">
    <img src="/chefworldlogo.png" alt="${shopName}" class="logo" />
    <div class="ornament-row">
      <hr class="ornament-line"/>
      <span class="ornament-star">&#10022;</span>
      <hr class="ornament-line"/>
    </div>
    <div class="header-tagline">${shopTagline}</div>
    <div class="header-info">${shopAddress} &middot; ${shopPhone}</div>
  </div>

  <!-- STRIPE -->
  <div class="stripe-divider"></div>

  <!-- META -->
  <div class="meta-grid">
    <div class="meta-cell border-right">
      <div class="meta-label">Receipt</div>
      <div class="meta-value-lg">${receiptNo}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Issued</div>
      <div class="meta-value">${dateStr}</div>
      <div class="meta-value-sm">${timeStr}</div>
    </div>
    ${customer ? `
    <div class="meta-cell border-right border-top">
      <div class="meta-label">Customer</div>
      <div class="meta-value">${customer.name}</div>
    </div>` : ""}
    ${odooOrderId ? `
    <div class="meta-cell border-top">
      <div class="meta-label">Order</div>
      <div class="meta-value">#${odooOrderId}</div>
    </div>` : ""}
  </div>

  <!-- ITEMS -->
  <div class="col-head">
    <span>Description</span>
    <span>Q</span>
    <span>Each</span>
    <span>Line</span>
  </div>
  <div class="items-wrap">
    ${lineItems}
  </div>

  <!-- TOTALS -->
  <div class="totals-wrap">
    <div class="tot-row"><span>Subtotal</span><span>$${fmt(subtotal)}</span></div>
    <div class="tot-row"><span>Tax (10%)</span><span>$${fmt(tax)}</span></div>
  </div>

  <!-- GRAND TOTAL -->
  <div class="grand-total">
    <div class="grand-left">
      <div class="grand-label">Amount due</div>
      <div class="grand-amount">$${fmt(total)}</div>
    </div>
    <div class="grand-right">
      <div class="grand-pay-label">Paid by</div>
      ${paymentMethods}
      ${changeHtml}
    </div>
  </div>

  <!-- BARCODE -->
  <div class="barcode-wrap">
    <div class="barcode-bars">${barcodeStripes}</div>
    <div class="barcode-num">${receiptNo}</div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-ornament">
      <hr class="ornament-line"/>
      <span class="ornament-star">&#10022;</span>
      <hr class="ornament-line"/>
    </div>
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