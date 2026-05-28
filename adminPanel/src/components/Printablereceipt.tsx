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

// Not rendered on screen — receipt is built in the hook
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

  // ── Line items ────────────────────────────────────────────────────────────
  const lineItems = cart.map((item) => {
    const lineTotal  = calcLineTotal(item);
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
        <td colspan="3" class="discount-label">↳ Discount ${item.discount}%</td>
        <td class="discount-amount">−$${fmt(discountAmt)}</td>
      </tr>` : ""}`;
  }).join("");

  // ── Payment rows ──────────────────────────────────────────────────────────
  const paymentRows = paymentLines.map((l) => `
    <div class="pay-row">
      <span class="pay-method">${l.method}</span>
      <span class="pay-amount">$${fmt(l.amount)}</span>
    </div>`).join("");

  const changeRow = change > 0.005 ? `
    <div class="pay-row change-row">
      <span class="pay-method">Change</span>
      <span class="pay-amount">$${fmt(change)}</span>
    </div>` : "";

  // ── Barcode-style receipt number (CSS stripes) ─────────────────────────
  const barcodeStripes = Array.from({ length: 30 }, (_, i) => {
    const w = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1][i % 10];
    return `<div style="width:${w}px;background:#000;height:100%;display:inline-block;margin-right:${i % 3 === 0 ? 2 : 1}px;"></div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap');

   @page {
  size: 80mm auto;
  margin: 5mm 5mm;
}

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    :root {
      --black:  #0a0a0a;
      --white:  #fafaf8;
      --gray:   #6b6b6b;
      --light:  #e8e5df;
      --accent: #1a1a1a;
      --mono:   'IBM Plex Mono', 'Courier New', monospace;
      --serif:  'DM Serif Display', Georgia, serif;
    }

   
     html, body {
      width: 70mm;
      
      background: var(--white);
      font-family: var(--mono);
      font-size: 10.5pt;
      color: var(--black);
      line-height: 1.5;
    }

    .receipt {
    width: 76mm;
  max-width: 76mm;
  overflow: hidden;
      background: var(--white);
    }

    /* ══════════════════════════════════════════
       HEADER
    ══════════════════════════════════════════ */
    .header {
      background: #ffffff;
      color: var(--white);
      padding: 14pt 6pt 12pt;
      text-align: center;
      position: relative;
    }

    .shop-name {
      
       margin-left: auto;
  margin-right: auto;
  margin-bottom: 6pt;
     object-fit: contain;
      width: 52mm;
  max-width: 100%;
      margin-bottom: 4pt;
    }

    .shop-divider {
      border: none;
      border-top: 1pt solid rgba(255,255,255,0.25);
      margin: 7pt auto;
      width: 60%;
    }

    .shop-sub {
    color: #000000;
      font-size: 7.5pt;
      letter-spacing: 2.5pt;
      text-transform: uppercase;
      opacity: 0.65;
      line-height: 1.7;
    }

    /* ══════════════════════════════════════════
       RECEIPT META
    ══════════════════════════════════════════ */
    .meta-band {
      background: var(--light);
      border-bottom: 1.5pt solid var(--black);
      padding: 7pt 6pt;
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
      letter-spacing: 1.5pt;
      font-size: 7pt;
      color: var(--gray);
    }

    .meta-value {
      font-weight: 700;
      font-size: 8.5pt;
    }

    .receipt-num {
      font-size: 11pt;
      font-weight: 700;
      letter-spacing: 0.5pt;
    }

    /* ══════════════════════════════════════════
       SECTION LABELS
    ══════════════════════════════════════════ */
    .section-label {
      font-size: 6.5pt;
      font-weight: 700;
      letter-spacing: 3pt;
      text-transform: uppercase;
      color: var(--gray);
      padding: 6pt 10pt 3pt;
      border-bottom: 0.5pt solid var(--light);
    }

    /* ══════════════════════════════════════════
       ITEMS TABLE
    ══════════════════════════════════════════ */
    .items-section {
      padding: 4pt 0 0;
    }

    .col-header {
      display: grid;
      grid-template-columns: 1fr 18pt 44pt 46pt;
      gap: 0 3pt;
      padding: 4pt 6pt;
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 1.5pt;
      text-transform: uppercase;
      color: var(--gray);
      border-bottom: 0.75pt solid var(--black);
    }

    .col-header span:nth-child(3),
    .col-header span:nth-child(4) { text-align: right; }

    table.items {
      width: 100%;
      border-collapse: collapse;
      padding: 0 6pt;
    }

    table.items td {
      padding: 3.5pt 0;
      vertical-align: top;
      font-size: 9.5pt;
    }

    /* first/last cells get side padding */
    table.items td:first-child { padding-left: 2pt; }
    table.items td:last-child  { padding-right: 2pt; }

    .item-name  { }
    .item-qty   { text-align: center; color: var(--gray); font-size: 9pt; }
    .item-price { text-align: right;  color: var(--gray); font-size: 9pt; }
    .item-total { text-align: right;  font-weight: 700; }

    .discount-label  {
      font-size: 8pt;
      color: var(--gray);
      padding-left: 2pt !important;
      padding-top: 0 !important;
      padding-bottom: 4pt !important;
    }
    .discount-amount {
      text-align: right;
      font-size: 8pt;
      color: #c0392b;
      padding-right: 2pt !important;
      padding-top: 0 !important;
      padding-bottom: 4pt !important;
    }

    .items-border {
      border-top: 0.75pt solid var(--black);
      margin: 4pt 6pt 0;
    }

    /* ══════════════════════════════════════════
       TOTALS
    ══════════════════════════════════════════ */
    .totals-section {
      padding: 5pt 6pt;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      padding: 1.5pt 0;
      color: var(--gray);
    }

    .totals-row.grand {
      border-top: 1.5pt solid var(--black);
      border-bottom: 1.5pt solid var(--black);
      margin-top: 5pt;
      padding: 5pt 0;
      font-size: 14pt;
      font-weight: 700;
      color: var(--black);
      letter-spacing: 0.5pt;
    }

    /* ══════════════════════════════════════════
       PAYMENTS
    ══════════════════════════════════════════ */
    .payments-section {
      padding: 5pt 6pt 6pt;
      border-top: 0.75pt solid var(--black);
    }

    .pay-row {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      padding: 1.5pt 0;
      text-transform: capitalize;
    }

    .pay-amount { font-weight: 700; }

    .change-row {
      color: var(--gray);
      font-size: 8.5pt;
    }

    /* ══════════════════════════════════════════
       BARCODE + FOOTER
    ══════════════════════════════════════════ */
    .barcode-section {
      padding: 10pt 6pt 4pt;
      text-align: center;
      border-top: 1pt solid var(--black);
    }

    .barcode {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      height: 28pt;
      gap: 0;
      margin-bottom: 4pt;
    }

    .barcode-num {
      font-size: 7.5pt;
      letter-spacing: 3pt;
      color: var(--gray);
      margin-bottom: 2pt;
    }

  .footer {
  text-align: center;
  padding: 6pt 6pt 2pt;
  border-top: 0.75pt solid var(--light);
}

    .footer-thanks {
      font-family: var(--serif);
      font-size: 12pt;
      margin-bottom: 4pt;
    }

    .footer-sub {
      font-size: 7.5pt;
      color: var(--gray);
      letter-spacing: 0.5pt;
      line-height: 1.8;
    }

    .dot-divider {
      letter-spacing: 4pt;
      color: var(--light);
      font-size: 8pt;
      margin: 5pt 0;
    }
  </style>
</head>
<body>
<div class="receipt">

  <!-- ══ HEADER ══ -->
 <div class="header">
    <img src="/chefworldlogo1.png" alt="${shopName}" class="shop-name" />
    <hr class="shop-divider"/>
    <div class="shop-sub">${shopTagline}</div>
    <div class="shop-sub">${shopAddress}</div>
    <div class="shop-sub">${shopPhone}</div>
  </div>

  <!-- ══ META BAND ══ -->
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

  <!-- ══ ITEMS ══ -->
  <div class="items-section">
    <div class="section-label">Items</div>
    <div class="col-header">
      <span>Description</span>
      <span style="text-align:center">Qty</span>
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

  <!-- ══ TOTALS ══ -->
  <div class="totals-section">
    <div class="section-label" style="padding:0 0 4pt;border:none;">Summary</div>
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

  <!-- ══ PAYMENTS ══ -->
  <div class="payments-section">
    <div class="section-label" style="padding:0 0 5pt;border:none;">Payment</div>
    ${paymentRows}
    ${changeRow}
  </div>

  <!-- ══ BARCODE ══ -->
  <div class="barcode-section">
    <div class="barcode">${barcodeStripes}</div>
    <div class="barcode-num">${receiptNo}</div>
  </div>

  <!-- ══ FOOTER ══ -->
  <div class="footer">
    <div class="dot-divider">· · · · · · · · · ·</div>
    <div class="footer-thanks">Thank you for your visit!</div>
    <div class="footer-sub">Please keep this receipt for your records.</div>
    <div class="footer-sub" style="margin-top:4pt;">${shopPhone} · ${shopName}</div>
  </div>
<div style="height:1px;"></div>
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