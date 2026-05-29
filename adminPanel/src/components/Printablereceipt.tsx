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
// OPTIMISED FOR EPSON TM-U220II DOT MATRIX IMPACT PRINTER
// Key constraints:
//   - ~160 DPI, 76mm paper width, ~42 chars per line at 10pt
//   - No images (too blurry at low DPI) — use ASCII art header instead
//   - No thin lines (<2pt) — they vanish or blur
//   - No letter-spacing > 1pt — dot matrix spacing is uneven
//   - Minimum font size 11pt — anything smaller is unreadable
//   - Use bold heavily — normal weight is very faint on impact printers
//   - Avoid dashed borders — use solid or ASCII chars instead
//   - Stick to Courier New — it's the native dot-matrix font
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

  // ── Line items ─────────────────────────────────────────────────────────
  // Dot matrix: use a simple 2-line layout per item for readability
  // Line 1: item name (full width, bold)
  // Line 2: qty x price = total (right-aligned)
  const lineItems = cart.map((item) => {
    const lineTotal   = calcLineTotal(item);
    const hasDiscount = (item.discount ?? 0) > 0;
    const discountAmt = item.price * item.qty * ((item.discount ?? 0) / 100);

    return `
      <tr>
        <td colspan="4" class="item-name">${item.name}</td>
      </tr>
      <tr class="item-detail">
        <td class="td-qty-detail">${item.qty} x $${fmt(item.price)}</td>
        <td colspan="2"></td>
        <td class="td-total">$${fmt(lineTotal)}</td>
      </tr>
      ${hasDiscount ? `
      <tr class="disc-row">
        <td colspan="3" class="td-disc-label">  Discount (${item.discount}%)</td>
        <td class="td-disc-amt">-$${fmt(discountAmt)}</td>
      </tr>` : ""}
      <tr><td colspan="4" class="item-gap"></td></tr>`;
  }).join("");

  // ── ASCII barcode (dot matrix can't render graphic barcodes well) ───────
  // Use a text-based barcode representation with the receipt number
  const barcodeAscii = `
    <div class="barcode-ascii">
      ||||| |||| ||||| ||| ||||| |||| |||||
    </div>
    <div class="barcode-num">${receiptNo}</div>`;

  // ── Payment rows ────────────────────────────────────────────────────────
  const paymentRows = paymentLines.map((l) => `
    <div class="pay-row">
      <span class="pay-method">${l.method.toUpperCase()}</span>
      <span class="pay-amt">$${fmt(l.amount)}</span>
    </div>`).join("");

  const changeRow = change > 0.005 ? `
    <div class="pay-row">
      <span class="pay-method">CHANGE DUE</span>
      <span class="pay-amt">$${fmt(change)}</span>
    </div>` : "";

  // ── 42-char wide separator lines (fits 76mm at 10cpi dot matrix) ────────
  const SEP_SOLID = "==========================================";
  const SEP_DASH  = "------------------------------------------";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <style>
    /*
     * EPSON TM-U220II DOT MATRIX RECEIPT
     * Rules:
     *   - Courier New ONLY (native dot-matrix font)
     *   - Minimum 11pt (12pt preferred)
     *   - Bold everything important
     *   - No images, no thin lines, no letter-spacing
     *   - Solid borders only, minimum 2pt
     *   - Page width 76mm
     */

    @page {
      size: 76mm auto;
      margin: 2mm 0 0 0;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0; padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html, body {
      width: 76mm;
      background: #fff;
      font-family: 'Courier New', Courier, monospace;
      font-size: 12pt;
      color: #000;
      line-height: 1.5;
    }

    .receipt {
      width: 76mm;
      padding: 0 2mm 4mm;
    }

    /* ── HEADER: text only, NO image ── */
    .header {
      text-align: center;
      padding: 6pt 0 4pt;
    }

    .shop-name {
      font-size: 18pt;
      font-weight: 900;
      line-height: 1.2;
      /* Double-strike effect using text-shadow for impact printers */
      text-shadow: 0.5px 0 0 #000;
    }

    .shop-tagline {
      font-size: 10pt;
      font-weight: 700;
      margin: 3pt 0 2pt;
    }

    .shop-info {
      font-size: 10pt;
      font-weight: 600;
      line-height: 1.6;
    }

    /* ── SEPARATORS ── */
    .sep {
      font-size: 11pt;
      font-weight: 700;
      white-space: pre;
      display: block;
      overflow: hidden;
      text-align: center;
      margin: 4pt 0;
    }

    /* ── META ── */
    .meta { padding: 3pt 0; }

    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 2pt 0;
    }

    .meta-key {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
    }

    .meta-val {
      font-size: 11pt;
      font-weight: 700;
    }

    .meta-val-lg {
      font-size: 13pt;
      font-weight: 900;
      text-shadow: 0.4px 0 0 #000;
    }

    /* ── SECTION LABEL ── */
    .sec-label {
      font-size: 12pt;
      font-weight: 900;
      text-transform: uppercase;
      text-align: center;
      padding: 3pt 0;
      text-shadow: 0.4px 0 0 #000;
    }

    /* ── COLUMN HEADERS ── */
    .col-head {
      display: flex;
      font-size: 10pt;
      font-weight: 900;
      text-transform: uppercase;
      padding: 2pt 0;
    }
    .col-item  { flex: 1; }
    .col-total { width: 52pt; text-align: right; }

    /* ── ITEMS TABLE ── */
    table.items {
      width: 100%;
      border-collapse: collapse;
    }

    .item-name {
      font-size: 12pt;
      font-weight: 900;
      padding: 3pt 0 0;
      text-shadow: 0.4px 0 0 #000;
    }

    .item-detail td {
      font-size: 11pt;
      font-weight: 600;
      padding: 0 0 2pt;
    }

    .td-qty-detail { }

    .td-total {
      text-align: right;
      font-size: 12pt;
      font-weight: 900;
    }

    .disc-row td {
      font-size: 10pt;
      font-weight: 700;
      padding: 0 0 2pt;
    }
    .td-disc-amt {
      text-align: right;
    }

    .item-gap { height: 2pt; }

    /* ── TOTALS ── */
    .totals { padding: 2pt 0; }

    .tot-row {
      display: flex;
      justify-content: space-between;
      font-size: 12pt;
      font-weight: 700;
      padding: 2pt 0;
    }

    .tot-row.grand {
      font-size: 16pt;
      font-weight: 900;
      padding: 5pt 0;
      text-shadow: 0.6px 0 0 #000;
    }

    /* ── PAYMENT ── */
    .payment { padding: 3pt 0; }

    .pay-row {
      display: flex;
      justify-content: space-between;
      font-size: 12pt;
      font-weight: 700;
      padding: 2pt 0;
    }

    .pay-amt {
      font-weight: 900;
      text-shadow: 0.4px 0 0 #000;
    }

    /* ── BARCODE ── */
    .barcode-ascii {
      font-size: 10pt;
      font-weight: 900;
      text-align: center;
      letter-spacing: 1pt;
      margin: 4pt 0 2pt;
      text-shadow: 0.4px 0 0 #000;
    }

    .barcode-num {
      font-size: 11pt;
      font-weight: 700;
      text-align: center;
      letter-spacing: 2pt;
    }

    /* ── FOOTER ── */
    .footer {
      text-align: center;
      padding: 5pt 0 3pt;
    }

    .footer-thanks {
      font-size: 14pt;
      font-weight: 900;
      text-shadow: 0.5px 0 0 #000;
      margin-bottom: 4pt;
    }

    .footer-sub {
      font-size: 10pt;
      font-weight: 700;
      line-height: 1.8;
    }
  </style>
</head>
<body>
<div class="receipt">

  <!-- HEADER — text only, no image (images are blurry on TM-U220II) -->
  <div class="header">
    <div class="shop-name">CHEF'S WORLD</div>
    <div class="shop-tagline">${shopTagline}</div>
    <div class="shop-info">${shopAddress}</div>
    <div class="shop-info">${shopPhone}</div>
  </div>

  <span class="sep">${SEP_SOLID}</span>

  <!-- META -->
  <div class="meta">
    <div class="meta-row">
      <span class="meta-key">RECEIPT</span>
      <span class="meta-val-lg">${receiptNo}</span>
    </div>
    <div class="meta-row">
      <span class="meta-key">DATE</span>
      <span class="meta-val">${dateStr}</span>
    </div>
    ${odooOrderId ? `
    <div class="meta-row">
      <span class="meta-key">ORDER ID</span>
      <span class="meta-val">#${odooOrderId}</span>
    </div>` : ""}
    ${customer ? `
    <div class="meta-row">
      <span class="meta-key">CUSTOMER</span>
      <span class="meta-val">${customer.name}</span>
    </div>` : ""}
  </div>

  <span class="sep">${SEP_SOLID}</span>

  <!-- ITEMS -->
  <div class="sec-label">ORDER ITEMS</div>
  <span class="sep">${SEP_DASH}</span>
  <div class="col-head">
    <span class="col-item">ITEM</span>
    <span class="col-total">TOTAL</span>
  </div>
  <span class="sep">${SEP_DASH}</span>
  <table class="items">
    <tbody>${lineItems}</tbody>
  </table>

  <span class="sep">${SEP_SOLID}</span>

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
  </div>

  <span class="sep">${SEP_SOLID}</span>

  <div class="totals">
    <div class="tot-row grand">
      <span>TOTAL</span>
      <span>$${fmt(total)}</span>
    </div>
  </div>

  <span class="sep">${SEP_SOLID}</span>

  <!-- PAYMENT -->
  <div class="sec-label">PAYMENT</div>
  <div class="payment">
    ${paymentRows}
    ${changeRow}
  </div>

  <span class="sep">${SEP_DASH}</span>

  <!-- BARCODE (ASCII representation) -->
  ${barcodeAscii}

  <span class="sep">${SEP_SOLID}</span>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-thanks">THANK YOU!</div>
    <div class="footer-sub">Please keep this receipt</div>
    <div class="footer-sub">for your records.</div>
    <div class="footer-sub">${shopPhone}</div>
    <div class="footer-sub">${shopName}</div>
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

    // TM-U220II needs a longer delay to spool the job correctly
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => iframe.remove(), 5000);
      }, 800);
    };
  };

  return { printReceipt };
}