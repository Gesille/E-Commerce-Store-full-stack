import { CartItem, Customer, PaymentLine } from "@/types/pos";

// ─── إعدادات المتجر النصية ──────────────────────────────────────────────────
const shopName    = "CHEF'S WORLD";
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
  }).replace(/,/g, ""); // إزالة الفواصل لمنع أخطاء الترميز

  // بناء سطور المنتجات (كل مادة في جدول مستقل لضمان عدم تداخل السعر مع الاسم)
  const lineItems = cart.map((item) => {
    const lineTotal = calcLineTotal(item);
    return `
      <table class="item-table">
        <tr>
          <td class="text-left font-bold" style="font-size: 11pt;">${item.name}</td>
          <td class="text-right font-bold" style="font-size: 11pt;">$${fmt(lineTotal)}</td>
        </tr>
        <tr>
          <td class="text-left text-gray" style="font-size: 9pt; padding-top: 2px;">
            ${item.qty} x $${fmt(item.price)} ${item.discount ? `(-${item.discount}%)` : ""}
          </td>
          <td></td>
        </tr>
      </table>`;
  }).join("");

  const paymentRows = paymentLines.map((l) => `
    <tr>
      <td class="text-left text-gray" style="text-transform: capitalize;">${l.method}</td>
      <td class="text-right font-medium">$${fmt(l.amount)}</td>
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
      width: 68mm; /* عرض آمن يمنع خروج النصوص للهوامش الحرجة */
      margin: 0 auto;
      padding: 4mm 2mm;
      font-family: "Courier New", Courier, monospace !important;
      color: #000000;
      background: #ffffff;
      font-size: 10pt;
      line-height: 1.3;
    }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-medium { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .text-gray { color: #333333; }

    /* ════════ HEADER ════════ */
    .header-block {
      margin-bottom: 8px;
    }
    .shop-name { 
      font-size: 15pt; 
      font-weight: 700; 
      margin-bottom: 4px;
    }
    .shop-sub { 
      font-size: 9pt; 
      margin-bottom: 2px;
    }
    
    .divider {
      border-top: 1px dashed #000000;
      margin: 8px 0;
      width: 100%;
    }
    .thick-divider {
      border-top: 2px solid #000000;
      margin: 10px 0;
      width: 100%;
    }

    /* ════════ TABLES ════════ */
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td {
      padding: 2px 0;
      font-size: 10pt;
      vertical-align: top;
    }
    
    .item-table {
      margin-bottom: 6px;
    }
    
    .total-title {
      font-size: 13pt;
      font-weight: 700;
      padding-top: 4px;
    }
    .total-amount {
      font-size: 14pt;
      font-weight: 700;
      padding-top: 4px;
    }

    .footer {
      font-size: 9.5pt;
      margin-top: 12px;
      line-height: 1.4;
    }
  </style>
</head>
<body>

  <!-- ══ HEADER SECTION ══ -->
  <div class="header-block text-left">
    <div class="shop-name">${shopName}</div>
    <div class="shop-sub">${shopTagline}</div>
    <div class="shop-sub">${shopAddress}</div>
    <div class="shop-sub">${shopPhone}</div>
  </div>

  <div class="divider"></div>

  <!-- ══ META INFO ══ -->
  <table>
    <tr>
      <td class="text-left text-gray">Receipt No:</td>
      <td class="text-right font-medium">#${receiptNo}</td>
    </tr>
    <tr>
      <td class="text-left text-gray">Date:</td>
      <td class="text-right">${dateStr}</td>
    </tr>
    ${odooOrderId ? `<tr><td class="text-left text-gray">Order ID:</td><td class="text-right font-medium">#${odooOrderId}</td></tr>` : ""}
    ${customer ? `<tr><td class="text-left text-gray">Customer:</td><td class="text-right font-medium">${customer.name}</td></tr>` : ""}
  </table>

  <div class="divider"></div>

  <!-- ══ LABELS ══ -->
  <table>
    <tr>
      <td class="text-left font-bold" style="font-size: 9.5pt; letter-spacing: 0.5px;">DESCRIPTION</td>
      <td class="text-right font-bold" style="font-size: 9.5pt; letter-spacing: 0.5px;">TOTAL</td>
    </tr>
  </table>

  <div class="divider"></div>

  <!-- ══ ITEMS LIST ══ -->
  ${lineItems}

  <div class="divider"></div>

  <!-- ══ TOTALS ══ -->
  <table>
    <tr>
      <td class="text-left text-gray">Subtotal</td>
      <td class="text-right">$${fmt(subtotal)}</td>
    </tr>
    <tr>
      <td class="text-left text-gray">Tax (10%)</td>
      <td class="text-right">$${fmt(tax)}</td>
    </tr>
    <tr>
      <td class="text-left total-title" style="border-top: 1px solid #000;">TOTAL</td>
      <td class="text-right total-amount" style="border-top: 1px solid #000;">$${fmt(total)}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <!-- ══ PAYMENTS ══ -->
  <table>
    <tbody>
      ${paymentRows}
      ${change > 0.005 ? `
      <tr>
        <td class="text-left font-bold">Change</td>
        <td class="text-right font-bold">$${fmt(change)}</td>
      </tr>` : ""}
    </tbody>
  </table>

  <div class="thick-divider"></div>

  <!-- ══ FOOTER ══ -->
  <div class="text-left footer">
    <div class="font-bold" style="margin-bottom: 2px;">Thank you for your visit!</div>
    <div class="text-gray">Please keep this receipt for your records.</div>
    <div style="margin-top: 6px; font-size: 8pt; color: #444;">* ${receiptNo} *</div>
  </div>

</body>
</html>`;
}

// الـ Hook المسؤول عن الطباعة المستقرة ونظيفة
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