import { calcOrderTotals, CartItem, Customer, PaymentLine } from "@/types/pos";

// ─── Shop Text Configuration ───────────────────────────────────────────────
const shopName    = "CHEF'S WORLD";
const shopTagline = "Restaurant, Bar & Kitchen Supplies";
const shopAddress = "Epicurean Drive ,Saint John ";
const shopPhone   = "560-2433";
const shopABST = "0161466";

const fmt = (n: number) => n.toFixed(2);

function calcLineTotal(item: CartItem) {
  return item.price * item.qty * (1 - (item.discount || 0) / 100);
}


interface PrintableReceiptProps {
  cart:         CartItem[];
  customer:     Customer | null;
  paymentLines: PaymentLine[];
  odooOrderId?: number;
  receiptNo:    string;
   taxRate:      number;  
  taxReason?:   string;
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
  taxRate: number,
  taxReason?: string,
): string {
   const { subtotal, tax, total } = calcOrderTotals(cart, taxRate);
  const paid   = paymentLines.reduce((s, l) => s + l.amount, 0);
  const change = paid - total;
  const isExempt = taxRate === 0;
  const taxLabel = isExempt
    ? `Tax (Exempt${taxReason ? `: ${taxReason}` : ""})`
    : `Tax (${(taxRate * 100).toFixed(0)}%)`;
  const dateStr = new Date().toLocaleString("en-US", {
    month:   "short",
    day:     "2-digit",
    year:    "numeric",
    hour:    "2-digit",
    minute:  "2-digit",
  }).replace(/,/g, "");

  const lineItems = cart.map((item) => {
    const lineTotal = calcLineTotal(item);
    return `
      <div class="item-block">
        <div class="flex-row">
          <span class="font-bold text-lg">${item.name}</span>
          <span class="font-bold text-lg">$${fmt(lineTotal)}</span>
        </div>
        <div class="flex-row text-gray" style="margin-top: 2px;">
          <span>${item.qty} x $${fmt(item.price)} ${item.discount ? `(-${item.discount}%)` : ""}</span>
          <span></span>
        </div>
      </div>`;
  }).join("");

  const paymentRows = paymentLines.map((l) => `
    <div class="flex-row text-gray" style="margin-bottom: 4px;">
      <span style="text-transform: capitalize;">${l.method}</span>
      <span class="font-medium">$${fmt(l.amount)}</span>
    </div>`).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
   
    @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 72mm; 
      margin: 0 auto;
      padding: 10px;
      font-family: 'Courier Prime', monospace !important;
      color: #000000;
      background: #ffffff;
      font-size: 11pt;
    }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-medium { font-weight: 400; }
    .font-bold { font-weight: 700; }
    .text-gray { color: #111111; }
    .text-lg { font-size: 12pt; }

    .shop-name { 
      font-size: 24pt; 
      font-weight: 700; 
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .shop-sub { 
      font-size: 10pt; 
      margin-bottom: 2px;
    }
    
    .divider {
      border-top: 1px dashed #000000;
      margin: 10px 0;
    }
    .thick-divider {
      border-top: 2px solid #000000;
      margin: 12px 0;
    }

    .flex-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    
    .item-block {
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    
    .total-row {
      font-size: 14pt;
      font-weight: 700;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid #000000;
    }
.policy-text {
  text-align: justify;
  text-justify: inter-word;
  line-height: 1.5;
  font-size: 10pt;
}
    .footer {
      font-size: 11pt;
      margin-top: 15px;
      line-height: 1.4;
    }
  </style>
</head>
<body>

  <div class="text-left" style="margin-bottom: 12px;">
    <div class="shop-name">${shopName}</div>
    <div class="shop-sub font-bold">${shopTagline}</div>
    <div class="shop-sub">${shopAddress}</div>
    <div class="shop-sub">Phone: ${shopPhone}</div>
    <div class=""shop-sub>ABST #${shopABST}</div>
  </div>

  <div class="thick-divider"></div>

  <div style="line-height: 1.5; margin-bottom: 8px;">
    <div class="flex-row"><span>Receipt No:</span><span class="font-bold">#${receiptNo}</span></div>
    <div class="flex-row"><span>Date:</span><span>${dateStr}</span></div>
    ${odooOrderId ? `<div class="flex-row"><span>Order ID:</span><span class="font-bold">#${odooOrderId}</span></div>` : ""}
    ${customer ? `<div class="flex-row"><span>Customer:</span><span class="font-bold">${customer.name}</span></div>` : ""}
  </div>

  <div class="thick-divider"></div>

  <div class="flex-row font-bold" style="font-size: 10pt; margin-bottom: 5px;">
    <span>DESCRIPTION</span>
    <span>TOTAL</span>
  </div>

  <div class="divider"></div>

  <div style="margin-top: 5px;">
    ${lineItems}
  </div>

  <div class="divider"></div>

  <div style="line-height: 1.5;">
    <div class="flex-row">
      <span>Subtotal</span>
      <span>$${fmt(subtotal)}</span>
    </div>
   <div class="flex-row" style="margin-top: 2px;">
      <span>${taxLabel}</span>
      <span>$${fmt(tax)}</span>
    </div>
    <div class="flex-row total-row">
      <span>TOTAL</span>
      <span>$${fmt(total)}</span>
    </div>
  </div>

  <div class="divider"></div>

  <div style="margin-top: 5px;">
    ${paymentRows}
    ${change > 0.005 ? `
    <div class="flex-row font-bold" style="margin-top: 4px;">
      <span>Change</span>
      <span>$${fmt(change)}</span>
    </div>` : ""}
  </div>

  <div class="thick-divider"></div>

  <div class="text-left footer">
    <div class="font-bold" style="margin-bottom: 2px;">Thank you for your visit!</div>
    <div style="color: #222;">Please keep this receipt for your records.</div>

<div class="font-bold" style="text-align: justify; text-align-last: left;">Returns accepted within 7 days with proof of purchase. Items must be unused &amp; in original packaging. Refunds issued in original payment form.</div>
<div style="margin-top: 6px; font-size: 10pt;">
  <a href="https://e-commerce-store-full-stack-oear.vercel.app/policy" style="color: #000; text-decoration: underline; font-weight: 700;">&#x1F4C4; View our full return policy</a>
</div>
    <div style="margin-top: 10px; font-size: 9pt; color: #555;">* ${receiptNo} *</div>
  </div>

</body>
</html>`;
}


export function usePrintReceipt(options: PrintableReceiptProps) {
  const printReceipt = async () => {
  const { cart, customer, paymentLines, odooOrderId, receiptNo, taxRate, taxReason } = options;
    const html = buildReceiptHTML(cart, customer, paymentLines, odooOrderId, receiptNo, taxRate, taxReason);


    document.getElementById("__print_frame__")?.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "__print_frame__";
    
   
    iframe.style.cssText = "position:fixed;top:0;left:0;width:72mm;height:0;border:none;opacity:0;pointer-events:none;z-index:-1;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
      setTimeout(() => {
        if (!iframe.contentWindow) return;

       
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
       
        setTimeout(() => iframe.remove(), 2000);
      }, 500);
    };
  };

  return { printReceipt };
}