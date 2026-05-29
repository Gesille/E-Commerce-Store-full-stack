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
      <tr>
        <td class="td-name">${item.name}</td>
        <td class="td-qty">${item.qty}</td>
        <td class="td-price">$${fmt(item.price)}</td>
        <td class="td-total">$${fmt(lineTotal)}</td>
      </tr>
      ${hasDiscount ? `
      <tr>
        <td colspan="3" class="td-disc-label">  Discount ${item.discount}%</td>
        <td class="td-disc-amt">-$${fmt(discountAmt)}</td>
      </tr>` : ""}`;
  }).join("");

  // ── Barcode stripes ─────────────────────────────────────────────────────
  const barcodeStripes = Array.from({ length: 30 }, (_, i) => {
    const w = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1][i % 10];
    return `<div style="width:${w}px;background:#000;height:100%;display:inline-block;margin-right:${i % 3 === 0 ? 2 : 1}px;"></div>`;
  }).join("");

  // ── Payment rows ────────────────────────────────────────────────────────
  const paymentRows = paymentLines.map((l) => `
    <div class="pay-row">
      <span>${l.method}</span>
      <span class="pay-amt">$${fmt(l.amount)}</span>
    </div>`).join("");

  const changeRow = change > 0.005 ? `
    <div class="pay-row">
      <span>Change</span>
      <span class="pay-amt">$${fmt(change)}</span>
    </div>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');

    @page {
      size: 76mm auto;
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
      width: 76mm;
      background: #ffffff;
      font-family: 'IBM Plex Mono', 'Courier New', monospace;
      font-size: 9pt;
      color: #000000;
      line-height: 1.5;
    }

    .receipt {
      width: 76mm;
      padding: 0 4mm;
      background: #ffffff;
      box-sizing: border-box;
    }

    /* ── HEADER ───────────────────────── */
    .header {
      text-align: center;
      padding: 6pt 0 10pt;
      border-bottom: 1.5pt solid #000;
    }

    .logo {
      display: block;
      max-width: 44mm;
      height: auto;
      margin: 0 auto 4pt;
    }

    .header-rule {
      border: none;
      border-top: 0.75pt dashed #000;
      width: 70%;
      margin: 5pt auto 6pt;
    }

    .header-line {
      font-size: 7pt;
      letter-spacing: 1.5pt;
      text-transform: uppercase;
      line-height: 1.9;
      color: #000;
    }

    /* ── META ─────────────────────────── */
    .meta {
      padding: 6pt 4pt;
      border-bottom: 1pt solid #000;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 1pt 0;
    }

    .meta-key {
      font-size: 6.5pt;
      letter-spacing: 1.5pt;
      text-transform: uppercase;
      font-weight: 600;
    }

    .meta-val {
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.25pt;
    }

    .meta-val-lg {
      font-size: 9.5pt;
      font-weight: 700;
      letter-spacing: 0.5pt;
    }

    /* ── SECTION HEADING ──────────────── */
    .sec-head {
      font-size: 6pt;
      font-weight: 700;
      letter-spacing: 3pt;
      text-transform: uppercase;
      padding: 5pt 4pt 4pt;
      border-bottom: 0.75pt solid #000;
    }

    /* ── ITEMS TABLE ──────────────────── */
    .col-head {
      display: grid;
      grid-template-columns: 1fr 16pt 40pt 42pt;
      padding: 3pt 4pt;
      font-size: 6.5pt;
      font-weight: 700;
      letter-spacing: 1pt;
      text-transform: uppercase;
      border-bottom: 0.75pt solid #000;
    }
    .col-head span:nth-child(2) { text-align: center; }
    .col-head span:nth-child(3),
    .col-head span:nth-child(4) { text-align: right; }

    table.items {
      width: 100%;
      border-collapse: collapse;
    }

    table.items td {
      padding: 3.5pt 0;
      vertical-align: top;
    }

    table.items td:first-child { padding-left: 4pt; }
    table.items td:last-child  { padding-right: 4pt; }

    .td-name  { font-size: 9pt; }
    .td-qty   { text-align: center; font-size: 8.5pt; }
    .td-price { text-align: right;  font-size: 8.5pt; }
    .td-total { text-align: right;  font-size: 9pt; font-weight: 700; }

    .td-disc-label {
      font-size: 7.5pt;
      padding-left: 12pt !important;
      padding-top: 0 !important;
      padding-bottom: 3.5pt !important;
    }
    .td-disc-amt {
      text-align: right;
      font-size: 7.5pt;
      padding-right: 4pt !important;
      padding-top: 0 !important;
      padding-bottom: 3.5pt !important;
    }

    .items-rule {
      border-top: 0.75pt dashed #000;
      margin: 3pt 4pt 0;
    }

    /* ── TOTALS ───────────────────────── */
    .totals {
      padding: 5pt 4pt 4pt;
    }

    .tot-row {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      padding: 1.5pt 0;
    }

    .tot-row.grand {
      border-top: 1.5pt solid #000;
      border-bottom: 1.5pt solid #000;
      margin-top: 5pt;
      padding: 5pt 0;
      font-size: 13.5pt;
      font-weight: 700;
      letter-spacing: 0.5pt;
    }

    /* ── PAYMENT ──────────────────────── */
    .payment {
      padding: 5pt 4pt 6pt;
      border-top: 0.75pt dashed #000;
    }

    .pay-row {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      padding: 1.5pt 0;
      text-transform: capitalize;
    }

    .pay-amt { font-weight: 700; }

    /* ── BARCODE ──────────────────────── */
    .barcode-wrap {
      padding: 7pt 4pt 4pt;
      text-align: center;
      border-top: 0.75pt dashed #000;
    }

    .barcode-bars {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      height: 28pt;
      margin-bottom: 4pt;
    }

    .barcode-num {
      font-size: 7pt;
      letter-spacing: 3pt;
    }

    /* ── FOOTER ───────────────────────── */
    .footer {
      text-align: center;
      padding: 7pt 4pt 6pt;
      border-top: 1pt solid #000;
    }

    .footer-thanks {
      font-size: 10.5pt;
      font-weight: 700;
      letter-spacing: 0.5pt;
      margin-bottom: 4pt;
    }

    .footer-sub {
      font-size: 7pt;
      line-height: 2;
      letter-spacing: 0.25pt;
    }

    .footer-rule {
      border: none;
      border-top: 0.75pt dashed #000;
      width: 50%;
      margin: 5pt auto;
    }
  </style>
</head>
<body>
<div class="receipt">

  <!-- HEADER -->
  <div class="header">
    <img src="/chefworldlogo1.png" alt="${shopName}" class="logo" />
    <hr class="header-rule"/>
    <div class="header-line">${shopTagline}</div>
    <div class="header-line">${shopAddress}</div>
    <div class="header-line">${shopPhone}</div>
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
    ${odooOrderId ? `
    <div class="meta-row">
      <span class="meta-key">Order ID</span>
      <span class="meta-val">#${odooOrderId}</span>
    </div>` : ""}
    ${customer ? `
    <div class="meta-row">
      <span class="meta-key">Customer</span>
      <span class="meta-val">${customer.name}</span>
    </div>` : ""}
  </div>

  <!-- ITEMS -->
  <div class="sec-head">Items</div>
  <div class="col-head">
    <span>Description</span>
    <span>Qty</span>
    <span>Price</span>
    <span>Total</span>
  </div>
  <table class="items">
    <tbody>${lineItems}</tbody>
  </table>
  <div class="items-rule"></div>

  <!-- TOTALS -->
  <div class="totals">
    <div class="tot-row">
      <span>Subtotal</span>
      <span>$${fmt(subtotal)}</span>
    </div>
    <div class="tot-row">
      <span>Tax (10%)</span>
      <span>$${fmt(tax)}</span>
    </div>
    <div class="tot-row grand">
      <span>TOTAL</span>
      <span>$${fmt(total)}</span>
    </div>
  </div>

  <!-- PAYMENT -->
  <div class="payment">
    <div class="sec-head" style="padding:0 0 5pt;border:none;">Payment</div>
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
    <hr class="footer-rule"/>
    <div class="footer-thanks">Thank you for your visit!</div>
    <div class="footer-sub">Please keep this receipt for your records.</div>
    <div class="footer-sub">${shopPhone} &middot; ${shopName}</div>
    <hr class="footer-rule"/>
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