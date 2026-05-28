import { CartItem, Customer, PaymentLine } from "@/types/pos";

// ─── Config ────────────────────────────────────────────────────────────────
const FONT       = "Georgia, 'Times New Roman', serif";
const FONT_SIZE  = "14px";
const FONT_SHOP  = "22px";
const FONT_TOTAL = "17px";
const RECEIPT_W  = "72mm";   // slightly inside 80mm to give natural margins

const shopName    = "Chef's World";
const shopTagline = "Restaurant, Bar & Kitchen Supplies";
const shopAddress = "123 Culinary Ave, Foodie City, FL 12345";
const shopPhone   = "(555) 123-4567";

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

// ─── Component ─────────────────────────────────────────────────────────────
interface PrintableReceiptProps {
  cart:         CartItem[];
  customer:     Customer | null;
  paymentLines: PaymentLine[];
  odooOrderId?: number;
  receiptNo:    string;
}

export function PrintableReceipt({
  cart, customer, paymentLines, odooOrderId, receiptNo,
}: PrintableReceiptProps) {
  const { subtotal, tax, total } = calcOrderTotals(cart);
  const paid   = paymentLines.reduce((s, l) => s + l.amount, 0);
  const change = paid - total;

  const dateStr = new Date().toLocaleString("en-US", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  // Not rendered on screen at all — built dynamically in the hook
  return null;
}

// ─── Build receipt HTML string ─────────────────────────────────────────────
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
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const lineItems = cart.map(item => {
    const lineTotal = calcLineTotal(item);
    const discount  = (item.discount ?? 0) > 0
      ? `<div class="row small gray">
           <span>Discount ${item.discount}%</span>
           <span>-$${fmt(item.price * item.qty * ((item.discount ?? 0) / 100))}</span>
         </div>`
      : "";
    return `
      <div class="line-item">
        <div class="grid">
          <span class="bold">${item.name}</span>
          <span class="center">${item.qty}</span>
          <span class="right">$${fmt(item.price)}</span>
          <span class="bold right">$${fmt(lineTotal)}</span>
        </div>
        ${discount}
      </div>`;
  }).join("");

  const paymentRows = paymentLines.map(l =>
    `<div class="row"><span class="capitalize">${l.method}</span><span>$${fmt(l.amount)}</span></div>`
  ).join("");

  const changeRow = change > 0.005
    ? `<div class="row bold"><span>Change</span><span>$${fmt(change)}</span></div>`
    : "";

  const orderIdRow  = odooOrderId ? `<div class="small">Order ID: #${odooOrderId}</div>` : "";
  const customerRow = customer    ? `<div class="small">Customer: ${customer.name}</div>` : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html, body {
      width: 80mm;
      background: #fff;
      font-family: 'Courier New', Courier, monospace;
      font-size: 12pt;
      color: #000;
      line-height: 1.5;
    }

    .receipt {
      width: 80mm;
      padding: 0 5mm;
      box-sizing: border-box;
    }

    /* ── typography helpers ── */
    .bold      { font-weight: bold; }
    .small     { font-size: 9pt; }
    .center    { text-align: center; }
    .right     { text-align: right; }
    .gray      { color: #555; }
    .capitalize{ text-transform: capitalize; }

    /* ── layout helpers ── */
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    /* 4-col grid: name | qty | price | total */
    .grid {
      display: grid;
      grid-template-columns: 1fr 22pt 46pt 50pt;
      gap: 0 3pt;
      align-items: baseline;
    }

    /* ── sections ── */
    .header {
      text-align: center;
      padding: 10pt 0 8pt;
      border-bottom: 1.5pt solid #000;
    }
    .shop-name {
      font-size: 18pt;
      font-weight: bold;
      letter-spacing: 2pt;
    }

    .meta {
      text-align: center;
      padding: 6pt 0;
      border-bottom: 1pt dashed #000;
    }

    .col-headers {
      display: grid;
      grid-template-columns: 1fr 22pt 46pt 50pt;
      gap: 0 3pt;
      font-weight: bold;
      font-size: 9pt;
      padding: 4pt 0;
      border-bottom: 1pt solid #000;
    }

    .line-items {
      padding: 5pt 0;
      border-bottom: 1pt dashed #000;
    }
    .line-item { margin-bottom: 3pt; }

    .subtotals {
      padding: 5pt 0;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-weight: bold;
      font-size: 14pt;
      border-top: 1.5pt solid #000;
      border-bottom: 1.5pt solid #000;
      padding: 4pt 0;
      margin: 3pt 0 5pt;
    }

    .payments {
      padding: 3pt 0 6pt;
      border-bottom: 1pt dashed #000;
    }

    .footer {
      text-align: center;
      padding: 8pt 0 10pt;
    }
    .footer .thank-you {
      font-weight: bold;
      font-size: 11pt;
    }
  </style>
</head>
<body>
  <div class="receipt">

    <div class="header">
      <div class="shop-name">${shopName.toUpperCase()}</div>
      <div class="small" style="margin-top:3pt">${shopTagline}</div>
      <div class="small">${shopAddress}</div>
      <div class="small">${shopPhone}</div>
    </div>

    <div class="meta">
      <div class="small">${dateStr}</div>
      <div class="bold">Receipt: ${receiptNo}</div>
      ${orderIdRow}
      ${customerRow}
    </div>

    <div class="col-headers">
      <span>Item</span>
      <span class="center">Qty</span>
      <span class="right">Price</span>
      <span class="right">Total</span>
    </div>

    <div class="line-items">
      ${lineItems}
    </div>

    <div class="subtotals">
      <div class="row"><span>Subtotal</span><span>$${fmt(subtotal)}</span></div>
      <div class="row"><span>Tax (10%)</span><span>$${fmt(tax)}</span></div>
    </div>

    <div class="total-row">
      <span>TOTAL</span>
      <span>$${fmt(total)}</span>
    </div>

    <div class="payments">
      ${paymentRows}
      ${changeRow}
    </div>

    <div class="footer">
      <div class="thank-you">Thank you for your visit!</div>
      <div class="small" style="margin-top:2pt">Please keep this receipt for your records.</div>
      <div class="small" style="margin-top:5pt;letter-spacing:2pt">${receiptNo}</div>
    </div>

  </div>
</body>
</html>`;
}

// ─── Print hook ────────────────────────────────────────────────────────────
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