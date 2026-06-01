import { CartItem, Customer, PaymentLine } from "@/types/pos";

// ─── إعدادات المتجر النصية ──────────────────────────────────────────────────
const shopName    = "CHEF'S WORLD";
const shopTagline = "RESTAURANT, BAR & KITCHEN SUPPLIES";
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

// بناء التصميم العصري المحمي هيدروليكياً عبر الجداول المستقرة
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
    month:   "short",
    day:     "2-digit",
    year:    "numeric",
    hour:    "2-digit",
    minute:  "2-digit",
  }).replace(/,/g, "");

  // سطر المنتجات العصري: اسم المادة بارز وبجانبه الإجمالي، وتحته التفاصيل متباعدة
  const lineItems = cart.map((item) => {
    const lineTotal = calcLineTotal(item);
    return `
      <table class="item-table">
        <tr>
          <td class="text-left font-bold" style="font-size: 11pt; letter-spacing: 0.3px;">${item.name}</td>
          <td class="text-right font-bold" style="font-size: 11pt;">$${fmt(lineTotal)}</td>
        </tr>
        <tr>
          <td class="text-left text-light" style="font-size: 8.5pt; padding-top: 1px; letter-spacing: 0.5px;">
            ${item.qty} Qty  x  $${fmt(item.price)} ${item.discount ? ` [Disc ${item.discount}%]` : ""}
          </td>
          <td></td>
        </tr>
      </table>`;
  }).join("");

  const paymentRows = paymentLines.map((l) => `
    <tr>
      <td class="text-left text-light" style="text-transform: uppercase; font-size: 9pt; padding: 2px 0;">${l.method}</td>
      <td class="text-right font-medium" style="font-size: 10pt;">$${fmt(l.amount)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="ascii"/>
  <title>Receipt</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 66mm; /* العرض الذهبي لمنع خروج الأحرف وحقن الرموز */
      margin: 0 auto;
      padding: 5mm 1mm;
      font-family: "Courier New", Courier, monospace !important;
      color: #000000;
      background: #ffffff;
      font-size: 9.5pt;
      line-height: 1.35;
    }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-medium { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .text-light { color: #000000; font-weight: normal; }

    /* ════════ HEADER STYLE ════════ */
    .header-block {
      margin-bottom: 12px;
      padding-bottom: 2px;
    }
    .shop-name { 
      font-size: 16pt; 
      font-weight: 700; 
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .shop-sub { 
      font-size: 8.5pt; 
      letter-spacing: 0.2px;
      margin-bottom: 2px;
    }
    
    /* فواصل خطية مستمرة وأنيقة بدلاً من النقاط العشوائية */
    .line-divider {
      border-top: 1px solid #000000;
      margin: 8px 0;
      width: 100%;
    }
    .double-divider {
      border-top: 1px dashed #000000;
      margin: 8px 0;
      width: 100%;
    }

    /* ════════ TABLES ════════ */
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td {
      padding: 3px 0;
      font-size: 9.5pt;
      vertical-align: middle;
    }
    
    .item-table {
      margin-bottom: 8px;
    }
    
    .total-label {
      font-size: 13pt;
      font-weight: 700;
      padding-top: 8px;
    }
    .total-value {
      font-size: 14pt;
      font-weight: 700;
      padding-top: 8px;
    }

    .footer {
      font-size: 9pt;
      margin-top: 16px;
      line-height: 1.4;
    }
  </style>
</head>
<body>

  <div class="header-block text-left">
    <div class="shop-name">${shopName}</div>
    <div class="shop-sub font-bold">${shopTagline}</div>
    <div class="shop-sub">${shopAddress}</div>
    <div class="shop-sub">TEL: ${shopPhone}</div>
  </div>

  <div class="line-divider"></div>

  <table style="margin-bottom: 2px;">
    <tr>
      <td class="text-left text-light">RECEIPT NO:</td>
      <td class="text-right font-bold">#${receiptNo}</td>
    </tr>
    <tr>
      <td class="text-left text-light">DATE:</td>
      <td class="text-right">${dateStr}</td>
    </tr>
    ${odooOrderId ? `<tr><td class="text-left text-light">ORDER ID:</td><td class="text-right font-bold">#${odooOrderId}</td></tr>` : ""}
    ${customer ? `<tr><td class="text-left text-light">CUSTOMER:</td><td class="text-right font-bold">${customer.name}</td></tr>` : ""}
  </table>

  <div class="line-divider"></div>

  <table>
    <tr>
      <td class="text-left font-bold" style="font-size: 9pt; letter-spacing: 0.8px;">ITEMS / DESCRIPTION</td>
      <td class="text-right font-bold" style="font-size: 9pt; letter-spacing: 0.8px;">TOTAL</td>
    </tr>
  </table>

  <div class="line-divider"></div>

  <div style="padding: 2px 0;">
    ${lineItems}
  </div>

  <div class="double-divider"></div>

  <table>
    <tr>
      <td class="text-left text-light" style="padding: 2px 0; font-size: 9.5pt;">Subtotal</td>
      <td class="text-right" style="padding: 2px 0; font-size: 9.5pt;">$${fmt(subtotal)}</td>
    </tr>
    <tr>
      <td class="text-left text-light" style="padding: 2px 0; font-size: 9.5pt;">Tax (10%)</td>
      <td class="text-right" style="padding: 2px 0; font-size: 9.5pt;">$${fmt(tax)}</td>
    </tr>
    <tr>
      <td class="text-left total-label" style="border-top: 1px solid #000000;">TOTAL</td>
      <td class="text-right total-value" style="border-top: 1px solid #000000;">$${fmt(total)}</td>
    </tr>
  </table>

  <div class="double-divider"></div>

  <table style="margin-top: 2px;">
    <tbody>
      ${paymentRows}
      ${change > 0.005 ? `
      <tr>
        <td class="text-left font-bold" style="font-size: 10pt; padding-top: 4px;">CHANGE DUE</td>
        <td class="text-right font-bold" style="font-size: 11pt; padding-top: 4px;">$${fmt(change)}</td>
      </tr>` : ""}
    </tbody>
  </table>

  <div class="line-divider" style="margin-top: 12px;"></div>

  <div class="text-left footer">
    <div class="font-bold" style="font-size: 10pt; margin-bottom: 3px; letter-spacing: 0.3px;">THANK YOU FOR YOUR VISIT!</div>
    <div class="text-light" style="font-size: 8.5pt; color: #111;">Please keep this receipt for your records.</div>
    <div style="margin-top: 10px; font-size: 8pt; text-align: center; letter-spacing: 1px;">* ${receiptNo} *</div>
  </div>

</body>
</html>`;
}

export function usePrintReceipt(options: PrintableReceiptProps) {
  const printReceipt = async () => {
    const { cart, customer, paymentLines, odooOrderId, receiptNo } = options;
    const html = buildReceiptHTML(cart, customer, paymentLines, odooOrderId, receiptNo);

    document.getElementById("__print_frame__")?.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "__print_frame__";
    iframe.style.cssText = "position:fixed;top:0;left:0;width:76mm;height:0;border:none;opacity:0;pointer-events:none;z-index:-1;";
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
        setTimeout(() => iframe.remove(), 2000);
      }, 300);
    };
  };

  return { printReceipt };
}