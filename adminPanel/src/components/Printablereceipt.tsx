import { CartItem, Customer, PaymentLine } from "@/types/pos";

// ─── Shop Config ───────────────────────────────────────────────────────────

const shopLogoUrl = "/chefworldlogo1.png"; 
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
  });

  const lineItems = cart.map((item) => {
    const lineTotal  = calcLineTotal(item);
    return `
      <tr class="item-row">
        <td class="text-left font-medium">${item.name}<br><small class="text-gray">${item.qty} x $${fmt(item.price)}</small></td>
        <td class="text-right valign-bottom font-medium">$${fmt(lineTotal)}</td>
      </tr>`;
  }).join("");

  const paymentRows = paymentLines.map((l) => `
    <div class="flex-row text-sm">
      <span class="text-gray capitalize">${l.method}</span>
      <span class="font-medium">$${fmt(l.amount)}</span>
    </div>`).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 76mm; 
      background: #ffffff;
      font-family: 'Inter', sans-serif;
      color: #111111;
      padding: 15px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-medium { font-weight: 500; }
    .font-bold { font-weight: 700; }
    .text-gray { color: #666666; }
    .text-sm { font-size: 12px; }
    .valign-bottom { vertical-align: bottom; }

    /* ════════ LOGO & HEADER ════════ */
    .logo-container {
      margin: 5px auto 12px;
      text-align: center;
    }
    .logo {
      max-width: 180px;
      height: auto;
      object-fit: contain;
      filter: grayscale(100%) brightness(0.9) contrast(200%);
    }
    .shop-tagline { font-size: 11px; color: #555; margin-top: 4px; }
    .shop-details { font-size: 11px; color: #777; margin-top: 2px; line-height: 1.4; }

    .divider {
      border-top: 1px dashed #dddddd;
      margin: 12px 0;
    }
    .thick-divider {
      border-top: 2px solid #111111;
      margin: 12px 0;
    }

    /* ════════ META INFO ════════ */
    .meta-grid {
      font-size: 12px;
      line-height: 1.6;
      margin-bottom: 10px;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3px;
    }

    /* ════════ ITEMS TABLE ════════ */
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5px;
    }
    table.items-table th {
      font-size: 11px;
      text-transform: uppercase;
      color: #666666;
      padding-bottom: 8px;
      border-bottom: 1px solid #111111;
      font-weight: 600;
    }
    table.items-table td {
      padding: 10px 0;
      font-size: 13px;
      border-bottom: 1px solid #f0f0f0;
      line-height: 1.4;
    }

    /* ════════ TOTALS SECTION ════════ */
    .totals-container {
      margin-top: 10px;
      width: 100%;
    }
    .grand-total-row {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #111111;
      font-size: 16px;
    }

    .footer {
      font-size: 11px;
      color: #777777;
      margin-top: 20px;
      line-height: 1.5;
    }
  </style>
</head>
<body>

  <div class="logo-container">
    <img src="${shopLogoUrl}" class="logo" alt="Shop Logo" />
    <div class="shop-tagline font-medium">${shopTagline}</div>
    <div class="shop-details">${shopAddress}<br>${shopPhone}</div>
  </div>

  <div class="divider"></div>

  <div class="meta-grid">
    <div class="flex-row">
      <span class="text-gray">Receipt No:</span>
      <span class="font-bold">#${receiptNo}</span>
    </div>
    <div class="flex-row">
      <span class="text-gray">Date:</span>
      <span>${dateStr}</span>
    </div>
    ${odooOrderId ? `<div class="flex-row"><span class="text-gray">Order ID:</span><span class="font-medium">#${odooOrderId}</span></div>` : ""}
    ${customer ? `<div class="flex-row"><span class="text-gray">Customer:</span><span class="font-medium">${customer.name}</span></div>` : ""}
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th class="text-left">Description</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${lineItems}
    </tbody>
  </table>

  <div class="totals-container">
    <div class="flex-row text-sm">
      <span class="text-gray">Subtotal</span>
      <span class="font-medium">$${fmt(subtotal)}</span>
    </div>
    <div class="flex-row text-sm" style="margin-top: 4px;">
      <span class="text-gray">Tax (10%)</span>
      <span class="font-medium">$${fmt(tax)}</span>
    </div>
    <div class="flex-row grand-total-row font-bold">
      <span>TOTAL</span>
      <span>$${fmt(total)}</span>
    </div>
  </div>

  <div class="divider"></div>

  <div style="margin-top: 5px;">
    ${paymentRows}
    ${change > 0.005 ? `
    <div class="flex-row text-sm" style="margin-top: 4px;">
      <span class="text-gray">Change</span>
      <span class="font-bold" style="color: #10b981;">$${fmt(change)}</span>
    </div>` : ""}
  </div>

  <div class="thick-divider"></div>

  <div class="text-center footer">
    <div class="font-medium" style="color: #111111; font-size: 12px; margin-bottom: 4px;">Thank you for your visit!</div>
    <div>Please keep this receipt for your records.</div>
    <div style="margin-top: 8px; font-size: 10px; letter-spacing: 1px; color: #999;">* ${receiptNo} *</div>
  </div>

</body>
</html>`;
}

// الهوك الذكي المحدث الذي ينتظر تحميل الصور والخطوط بالكامل قبل إطلاق أمر الطباعة المباشر
export function usePrintReceipt(options: PrintableReceiptProps) {
  const printReceipt = async () => {
    const { cart, customer, paymentLines, odooOrderId, receiptNo } = options;
    const html = buildReceiptHTML(cart, customer, paymentLines, odooOrderId, receiptNo);

    document.getElementById("__print_frame__")?.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "__print_frame__";
    // جعل العرض الخارجي متطابقاً وثابتاً تماماً لمنع أي تلاعب بالهوامش
    iframe.style.cssText =
      "position:fixed;top:0;left:0;width:76mm;height:0;border:none;opacity:0;pointer-events:none;z-index:-1;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    // ننتظر حتى يقوم المتصفح بتحميل صورة اللوجو والخطوط بنسبة 100% ليظهر الإيصال فخماً كاملاً
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => iframe.remove(), 3000);
      }, 600); // مهلة زمنية آمنة لضمان اكتمال الرندر الداخلي
    };
  };

  return { printReceipt };
}