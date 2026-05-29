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
        <td class="td-name">${item.name}</td>
        <td class="td-qty">${item.qty}</td>
        <td class="td-price">$${fmt(item.price)}</td>
        <td class="td-total">$${fmt(lineTotal)}</td>
      </tr>
      ${hasDiscount ? `
      <tr class="disc-row">
        <td colspan="3" class="td-disc-label">Discount ${item.discount}%</td>
        <td class="td-disc-amt">-$${fmt(discountAmt)}</td>
      </tr>` : ""}`;
  }).join("");

  // ── Barcode — vertical bars (correct orientation) ───────────────────────
  // Pattern based on receipt number characters for visual variety
  const pattern = [3,1,2,1,1,3,2,1,3,1,2,2,1,3,1,2,1,1,3,2,1,3,1,2,2,1,3,1,2,1];
  const barcodeStripes = pattern.map((w, i) => {
    const isBlack = i % 2 === 0;
    return `<div style="width:${w * 1.5}px;background:${isBlack ? '#000' : '#fff'};height:40px;flex-shrink:0;"></div>`;
  }).join("");

  // ── Payment rows ────────────────────────────────────────────────────────
  const paymentRows = paymentLines.map((l) => `
    <div class="pay-row">
      <span class="pay-method">${l.method}</span>
      <span class="pay-amt">$${fmt(l.amount)}</span>
    </div>`).join("");

  const changeRow = change > 0.005 ? `
    <div class="pay-row">
      <span class="pay-method">Change Due</span>
      <span class="pay-amt">$${fmt(change)}</span>
    </div>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <style>
    /* ── Thermal-print optimised: no gradients, no shadows, pure B&W ── */
    @page {
      size: 80mm auto;
      margin: 0;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0; padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html, body {
      width: 80mm;
      background: #fff;
      /* Courier Prime is cleaner on thermal than IBM Plex Mono */
      font-family: 'Courier Prime', 'Courier New', Courier, monospace;
      font-size: 10pt;
      color: #000;
      line-height: 1.45;
    }

    .receipt {
      width: 80mm;
      padding: 0 3mm 4mm;
    }

    /* ───── HEADER ───── */
    .header {
      text-align: center;
      padding: 8pt 0 8pt;
    }

    .logo {
      display: block;
      width: 40mm;
      height: auto;
      margin: 0 auto 5pt;
      /* Force B&W on thermal — prevents color ghosting */
      filter: grayscale(100%) contrast(150%);
    }

    .shop-name {
      font-size: 14pt;
      font-weight: 700;
      letter-spacing: 2pt;
      text-transform: uppercase;
      line-height: 1.2;
      margin-bottom: 3pt;
    }

    .shop-tagline {
      font-size: 7.5pt;
      letter-spacing: 0.5pt;
      margin-bottom: 1.5pt;
    }

    .shop-address,
    .shop-phone {
      font-size: 7.5pt;
      letter-spacing: 0.25pt;
    }

    /* ───── DIVIDERS ───── */
    .div-solid {
      border: none;
      border-top: 1.5pt solid #000;
      margin: 6pt 0;
    }

    .div-dash {
      border: none;
      border-top: 1pt dashed #000;
      margin: 5pt 0;
    }

    /* ───── META ───── */
    .meta { padding: 2pt 0 4pt; }

    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 2pt 0;
    }

    .meta-key {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5pt;
    }

    .meta-val {
      font-size: 9pt;
      font-weight: 700;
    }

    .meta-val-xl {
      font-size: 11pt;
      font-weight: 700;
      letter-spacing: 1pt;
    }

    /* ───── SECTION HEADING ───── */
    .sec-head {
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 3pt;
      text-transform: uppercase;
      text-align: center;
      padding: 3pt 0;
    }

    /* ───── COLUMN HEADERS ───── */
    .col-head {
      display: grid;
      grid-template-columns: 1fr 18pt 46pt 46pt;
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 1.5pt;
      text-transform: uppercase;
      padding: 3pt 0 3pt;
    }
    .col-head span:nth-child(2) { text-align: center; }
    .col-head span:nth-child(3),
    .col-head span:nth-child(4) { text-align: right; }

    /* ───── ITEMS TABLE ───── */
    table.items {
      width: 100%;
      border-collapse: collapse;
    }

    .item-row td {
      padding: 4pt 0 2pt;
      vertical-align: top;
      font-size: 9.5pt;
    }

    .td-name  { font-weight: 600; line-height: 1.3; }
    .td-qty   { text-align: center; font-size: 9pt; }
    .td-price { text-align: right;  font-size: 9pt; }
    .td-total { text-align: right;  font-size: 9.5pt; font-weight: 700; }

    .disc-row td {
      font-size: 8pt;
      padding: 0 0 3pt;
    }
    .td-disc-label { padding-left: 8pt !important; }
    .td-disc-amt   { text-align: right; font-weight: 600; }

    /* ───── TOTALS ───── */
    .totals { padding: 2pt 0 2pt; }

    .tot-row {
      display: flex;
      justify-content: space-between;
      font-size: 9.5pt;
      padding: 2pt 0;
    }

    .tot-row.grand {
      border-top: 2pt solid #000;
      border-bottom: 2pt solid #000;
      margin: 5pt 0 3pt;
      padding: 5pt 0;
      font-size: 14pt;
      font-weight: 700;
      letter-spacing: 1pt;
    }

    /* ───── PAYMENT ───── */
    .payment { padding: 2pt 0 3pt; }

    .pay-row {
      display: flex;
      justify-content: space-between;
      font-size: 9.5pt;
      padding: 2pt 0;
    }

    .pay-method {
      text-transform: capitalize;
    }

    .pay-amt { font-weight: 700; }

    /* ───── BARCODE ───── */
    .barcode-wrap {
      text-align: center;
      padding: 6pt 0 3pt;
    }

    .barcode-bars {
      display: flex;
      justify-content: center;
      align-items: stretch;
      height: 40px;
      margin-bottom: 4pt;
      /* Ensure bars print horizontally as intended */
      flex-direction: row;
    }

    .barcode-num {
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 4pt;
      text-align: center;
    }

    /* ───── FOOTER ───── */
    .footer {
      text-align: center;
      padding: 5pt 0 4pt;
    }

    .footer-thanks {
      font-size: 11pt;
      font-weight: 700;
      letter-spacing: 0.75pt;
      margin-bottom: 4pt;
    }

    .footer-sub {
      font-size: 7.5pt;
      line-height: 1.8;
      letter-spacing: 0.25pt;
    }
  </style>
</head>
<body>
<div class="receipt">

  <!-- HEADER -->
  <div class="header">
    <img src="/chefworldlogo1.png" alt="${shopName}" class="logo" onerror="this.style.display='none'"/>
    <div class="shop-name">${shopName}</div>
    <div class="shop-tagline">${shopTagline}</div>
    <div class="shop-address">${shopAddress}</div>
    <div class="shop-phone">${shopPhone}</div>
  </div>

  <hr class="div-solid"/>

  <!-- META -->
  <div class="meta">
    <div class="meta-row">
      <span class="meta-key">Receipt #</span>
      <span class="meta-val-xl">${receiptNo}</span>
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

  <hr class="div-solid"/>

  <!-- ITEMS -->
  <div class="sec-head">— Order Items —</div>
  <hr class="div-dash"/>
  <div class="col-head">
    <span>Item</span>
    <span>Qty</span>
    <span>Price</span>
    <span>Total</span>
  </div>
  <hr class="div-dash"/>
  <table class="items">
    <tbody>${lineItems}</tbody>
  </table>
  <hr class="div-dash"/>

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
  <div class="sec-head">— Payment —</div>
  <div class="payment">
    ${paymentRows}
    ${changeRow}
  </div>

  <hr class="div-dash"/>

  <!-- BARCODE -->
  <div class="barcode-wrap">
    <div class="barcode-bars">${barcodeStripes}</div>
    <div class="barcode-num">${receiptNo}</div>
  </div>

  <hr class="div-solid"/>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-thanks">Thank You For Your Visit!</div>
    <div class="footer-sub">Please keep this receipt for your records.</div>
    <div class="footer-sub">${shopPhone} &bull; ${shopName}</div>
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