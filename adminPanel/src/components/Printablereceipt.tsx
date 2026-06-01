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

  // صيغة تاريخ خام ومبسطة جداً بدون أي فواصل أو رموز
  const dateStr = new Date().toLocaleString("en-US", {
    year:    "numeric",
    month:   "short",
    day:     "2-digit",
    hour:    "2-digit",
    minute:  "2-digit",
    hour12:  true
  }).replace(/,/g, "");

  // ── Line items ────────────────────────────────────────────────────────────
  const lineItems = cart.map((item) => {
    const lineTotal  = calcLineTotal(item);
    const hasDiscount = (item.discount ?? 0) > 0;
    const discountAmt = item.price * item.qty * ((item.discount ?? 0) / 100);

    return `
      <tr>
        <td style="text-align: left; width: 45%;">${item.name}</td>
        <td style="text-align: center; width: 15%;">${item.qty}</td>
        <td style="text-align: right; width: 20%;">${fmt(item.price)}</td>
        <td style="text-align: right; width: 20%;">${fmt(lineTotal)}</td>
      </tr>
      ${hasDiscount ? `
      <tr>
        <td colspan="3" style="text-align: left; padding-left: 5px; font-size: 8pt; color: #444;">
          * Disc ${item.discount}%
        </td>
        <td style="text-align: right; font-size: 8pt; color: #444;">-${fmt(discountAmt)}</td>
      </tr>` : ""}`;
  }).join("");

  const paymentRows = paymentLines.map((l) => `
    <tr>
      <td style="text-align: left;">${l.method}</td>
      <td style="text-align: right;">${fmt(l.amount)}</td>
    </tr>`).join("");

  const changeRow = change > 0.005 ? `
    <tr>
      <td style="text-align: left;">Change</td>
      <td style="text-align: right;">${fmt(change)}</td>
    </tr>` : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="ascii"/> <title>Receipt</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-weight: normal !important;
      font-family: "Courier New", Courier, monospace !important;
    }
    body {
      width: 64mm; /* تصغير العرض لمنع الطابعة من توليد رموز حماية هوامش */
      margin: 0 auto;
      padding: 6mm 0mm;
      font-size: 10pt;
      line-height: 1.4;
      color: #000000;
      background: #ffffff;
    }
    
    /* استبدال التوسط بـ الإزاحة الآمنة لمنع إرباك معالج الطابعة القديم */
    .header-block {
      padding-left: 4mm;
      margin-bottom: 6px;
    }
    .shop-name { font-size: 14pt; text-transform: uppercase; margin-bottom: 2px; }
    .shop-sub { font-size: 8.5pt; margin-bottom: 1px; }
    
    .divider {
      border-top: 1px dashed #000000;
      margin: 6px 0;
      width: 100%;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    th, td {
      padding: 3px 0;
      font-size: 9.5pt;
    }
    th {
      border-bottom: 1px solid #000000;
      text-transform: uppercase;
      font-size: 8.5pt;
    }
    
    .grand-total td {
      font-size: 12pt;
      padding-top: 5px;
    }
    .footer-block {
      padding-left: 4mm;
      font-size: 9pt;
      margin-top: 8px;
    }
  </style>
</head>
<body>

  <div class="header-block">
    <div class="shop-name">${shopName}</div>
    <div class="shop-sub">${shopTagline}</div>
    <div class="shop-sub">${shopAddress}</div>
    <div class="shop-sub">${shopPhone}</div>
  </div>

  <div class="divider"></div>

  <table style="width: 100%;">
    <tr>
      <td style="text-align: left;">RECEIPT:</td>
      <td style="text-align: right;">${receiptNo}</td>
    </tr>
    <tr>
      <td style="text-align: left;">DATE:</td>
      <td style="text-align: right;">${dateStr}</td>
    </tr>
    ${odooOrderId ? `<tr><td style="text-align: left;">ORDER ID:</td><td style="text-align: right;">#${odooOrderId}</td></tr>` : ""}
    ${customer ? `<tr><td style="text-align: left;">CUSTOMER:</td><td style="text-align: right;">${customer.name}</td></tr>` : ""}
  </table>

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th style="text-align: left;">Description</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Price</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${lineItems}
    </tbody>
  </table>

  <div class="divider"></div>

  <table>
    <tr>
      <td style="text-align: left;">Subtotal</td>
      <td style="text-align: right;">$${fmt(subtotal)}</td>
    </tr>
    <tr>
      <td style="text-align: left;">Tax (10%)</td>
      <td style="text-align: right;">$${fmt(tax)}</td>
    </tr>
    <tr class="grand-total">
      <td style="text-align: left; border-top: 1px dashed #000;">TOTAL:</td>
      <td style="text-align: right; border-top: 1px dashed #000;">$${fmt(total)}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <table>
    <tbody>
      ${paymentRows}
      ${changeRow}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="footer-block">
    <div style="margin-bottom: 3px;">Thank you for your visit!</div>
    <div style="font-size: 8pt;">* ${receiptNo} *</div>
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
      "position:fixed;top:0;left:0;width:76mm;height:0;border:none;opacity:0;pointer-events:none;z-index:-1;";
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