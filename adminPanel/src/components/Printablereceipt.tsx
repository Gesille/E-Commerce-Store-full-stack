import { CartItem, Customer, PaymentLine } from "@/types/pos";

// ─── Shop Config ───────────────────────────────────────────────────────────
const shopName    = "Chef's World";
const shopTagline = "Restaurant, Bar & Kitchen Supplies";
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
    month:   "short",
    day:     "2-digit",
    year:    "numeric",
    hour:    "2-digit",
    minute:  "2-digit",
  });

  // ── Line items ──────────────────────────────────────────────────────────
  const lineItems = cart.map((item) => {
    const lineTotal   = calcLineTotal(item);
    const hasDiscount = (item.discount ?? 0) > 0;
    const discountAmt = item.price * item.qty * ((item.discount ?? 0) / 100);

    return `
      <tr class="item-row">
        <td class="item-name">${item.name}</td>
        <td class="item-qty">${item.qty}</td>
        <td class="item-price">$${fmt(item.price)}</td>
        <td class="item-total">$${fmt(lineTotal)}</td>
      </tr>
      ${hasDiscount ? `
      <tr class="discount-row">
        <td colspan="3" class="discount-label">Discount ${item.discount}%</td>
        <td class="discount-amount">-$${fmt(discountAmt)}</td>
      </tr>` : ""}`;
  }).join("");

  // ── Payment rows ────────────────────────────────────────────────────────
  const paymentRows = paymentLines.map((l) => `
    <div class="pay-row">
      <span class="pay-method">${l.method}</span>
      <span class="pay-amount">$${fmt(l.amount)}</span>
    </div>`).join("");

  const changeRow = change > 0.005 ? `
    <div class="pay-row">
      <span class="pay-method">Change</span>
      <span class="pay-amount">$${fmt(change)}</span>
    </div>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap');

    @page {
      size: 80mm auto;
      /* Safe margins — keeps content away from cutter edges */
      margin: 5mm 5mm;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html, body {
      width: 70mm; /* 80mm minus 5mm side margins × 2 */
      background: #ffffff;
      font-family: 'IBM Plex Mono', 'Courier New', monospace;
      font-size: 9.5pt;
      color: #000000;
      line-height: 1.5;
    }

    .receipt {
      width: 70mm;
      background: #ffffff;
      padding: 0;
    }

    /* ── HEADER ─────────────────────────────── */
    .header {
      text-align: center;
      padding: 6pt 4pt 8pt;
      border-bottom: 2pt solid #000;
    }

    .shop-logo {
      max-width: 52mm;
      height: auto;
      display: block;
      margin: 0 auto 4pt;
    }

    .shop-divider {
      border: none;
      border-top: 1pt dashed #000;
      margin: 5pt auto;
      width: 80%;
    }

    .shop-sub {
      font-size: 7pt;
      letter-spacing: 1pt;
      line-height: 1.7;
    }

    /* ── META BAND ──────────────────────────── */
    .meta-band {
      border-top: 1pt solid #000;
      border-bottom: 1pt solid #000;
      padding: 5pt 4pt;
      background: #ffffff;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 8pt;
      line-height: 1.8;
    }

    .meta-label {
      text-transform: uppercase;
      letter-spacing: 1pt;
      font-size: 7pt;
    }

    .meta-value {
      font-weight: 700;
      font-size: 8.5pt;
    }

    .receipt-num {
      font-size: 10pt;
      font-weight: 700;
    }

    /* ── SECTION LABELS ─────────────────────── */
    .section-label {
      font-size: 6.5pt;
      font-weight: 700;
      letter-spacing: 2pt;
      text-transform: uppercase;
      padding: 5pt 4pt 3pt;
      border-bottom: 0.5pt solid #000;
    }

    /* ── ITEMS TABLE ────────────────────────── */
    .items-section {
      padding: 3pt 0 0;
    }

    .col-header {
      display: grid;
      grid-template-columns: 1fr 16pt 42pt 44pt;
      gap: 0 3pt;
      padding: 3pt 4pt;
      font-size: 6.5pt;
      font-weight: 700;
      letter-spacing: 1pt;
      text-transform: uppercase;
      border-bottom: 1pt solid #000;
    }

    .col-header span:nth-child(3),
    .col-header span:nth-child(4) { text-align: right; }
    .col-header span:nth-child(2) { text-align: center; }

    table.items {
      width: 100%;
      border-collapse: collapse;
    }

    table.items td {
      padding: 3pt 0;
      vertical-align: top;
      font-size: 9pt;
    }

    table.items td:first-child { padding-left: 4pt; }
    table.items td:last-child  { padding-right: 4pt; }

    .item-qty   { text-align: center; font-size: 8.5pt; }
    .item-price { text-align: right;  font-size: 8.5pt; }
    .item-total { text-align: right;  font-weight: 700; }

    .discount-label {
      font-size: 7.5pt;
      padding-left: 10pt !important;
      padding-top: 0 !important;
      padding-bottom: 3pt !important;
    }
    .discount-amount {
      text-align: right;
      font-size: 7.5pt;
      padding-right: 4pt !important;
      padding-top: 0 !important;
      padding-bottom: 3pt !important;
    }

    .items-border {
      border-top: 1pt dashed #000;
      margin: 3pt 4pt 0;
    }

    /* ── TOTALS ─────────────────────────────── */
    .totals-section {
      padding: 4pt 4pt;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      padding: 1.5pt 0;
    }

    .totals-row.grand {
      border-top: 1.5pt solid #000;
      border-bottom: 1.5pt solid #000;
      margin-top: 4pt;
      padding: 4pt 0;
      font-size: 13pt;
      font-weight: 700;
      letter-spacing: 0.5pt;
    }

    /* ── PAYMENTS ───────────────────────────── */
    .payments-section {
      padding: 4pt 4pt 5pt;
      border-top: 1pt dashed #000;
    }

    .pay-row {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      padding: 1.5pt 0;
      text-transform: capitalize;
    }

    .pay-amount { font-weight: 700; }

    /* ── BARCODE (text-only, no fills) ──────── */
    .barcode-section {
      padding: 8pt 4pt 4pt;
      text-align: center;
      border-top: 1pt dashed #000;
    }

    /* Pure text barcode — no filled divs */
    .barcode-text {
      font-size: 7.5pt;
      letter-spacing: 2pt;
      margin-bottom: 3pt;
      font-weight: 700;
    }

    .barcode-num {
      font-size: 7pt;
      letter-spacing: 3pt;
    }

    /* ── FOOTER ─────────────────────────────── */
    .footer {
      text-align: center;
      padding: 6pt 4pt 10pt;
      border-top: 1pt solid #000;
    }

    .footer-thanks {
      font-size: 11pt;
      font-weight: 700;
      margin-bottom: 3pt;
      letter-spacing: 0.5pt;
    }

    .footer-sub {
      font-size: 7pt;
      letter-spacing: 0.5pt;
      line-height: 1.8;
    }

    .dot-divider {
      letter-spacing: 4pt;
      font-size: 7pt;
      margin: 4pt 0;
    }
  </style>
</head>
<body>
<div class="receipt">

  <!-- HEADER -->
  <div class="header">
    <img src="/chefworldlogo1.png" alt="${shopName}" class="shop-logo" />
    <hr class="shop-divider"/>
    <div class="shop-sub">${shopTagline}</div>
    <div class="shop-sub">${shopAddress}</div>
    <div class="shop-sub">${shopPhone}</div>
  </div>

  <!-- META BAND -->
  <div class="meta-band">
    <div class="meta-row">
      <span class="meta-label">Receipt</span>
      <span class="receipt-num">${receiptNo}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Date</span>
      <span class="meta-value">${dateStr}</span>
    </div>
    ${odooOrderId ? `
    <div class="meta-row">
      <span class="meta-label">Order ID</span>
      <span class="meta-value">#${odooOrderId}</span>
    </div>` : ""}
    ${customer ? `
    <div class="meta-row">
      <span class="meta-label">Customer</span>
      <span class="meta-value">${customer.name}</span>
    </div>` : ""}
  </div>

  <!-- ITEMS -->
  <div class="items-section">
    <div class="section-label">Items</div>
    <div class="col-header">
      <span>Description</span>
      <span>Qty</span>
      <span style="text-align:right">Price</span>
      <span style="text-align:right">Total</span>
    </div>
    <table class="items">
      <tbody>
        ${lineItems}
      </tbody>
    </table>
    <div class="items-border"></div>
  </div>

  <!-- TOTALS -->
  <div class="totals-section">
    <div class="totals-row">
      <span>Subtotal</span>
      <span>$${fmt(subtotal)}</span>
    </div>
    <div class="totals-row">
      <span>Tax (10%)</span>
      <span>$${fmt(tax)}</span>
    </div>
    <div class="totals-row grand">
      <span>TOTAL</span>
      <span>$${fmt(total)}</span>
    </div>
  </div>

  <!-- PAYMENTS -->
  <div class="payments-section">
    <div class="section-label" style="padding:0 0 4pt;border:none;">Payment</div>
    ${paymentRows}
    ${changeRow}
  </div>

  <!-- BARCODE (text-only) -->
  <div class="barcode-section">
    <div class="barcode-text">| || ||| || | ||| || | || ||| ||</div>
    <div class="barcode-num">${receiptNo}</div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="dot-divider">- - - - - - - - - - - -</div>
    <div class="footer-thanks">Thank you for your visit!</div>
    <div class="footer-sub">Please keep this receipt for your records.</div>
    <div class="footer-sub">${shopPhone} · ${shopName}</div>
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
      "position:fixed;top:0;left:0;width:80mm;height:1px;border:none;opacity:0;pointer-events:none;z-index:-1;";
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