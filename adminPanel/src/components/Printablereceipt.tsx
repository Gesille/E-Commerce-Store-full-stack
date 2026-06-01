import { CartItem, Customer, PaymentLine } from "@/types/pos";

const shopName    = "CHEF'S WORLD";
const shopTagline = "Restaurant · Bar · Kitchen";
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
    month:  "short",
    day:    "2-digit",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  }).replace(/,/g, "");

  const lineItems = cart.map((item) => {
    const lineTotal    = calcLineTotal(item);
    const discountAmt  = item.price * item.qty * ((item.discount ?? 0) / 100);
    const discStr      = item.discount
      ? ` &nbsp;(-${item.discount}% disc → -$${fmt(discountAmt)})`
      : "";
    return `
      <div class="item">
        <div class="item-top">
          <span>${item.name}</span>
          <span>$${fmt(lineTotal)}</span>
        </div>
        <div class="item-sub">${item.qty} x $${fmt(item.price)}${discStr}</div>
      </div>`;
  }).join("");

  const paymentRows = paymentLines.map((l) => `
    <div class="pay-row">
      <span style="text-transform:capitalize;">${l.method}</span>
      <b>$${fmt(l.amount)}</b>
    </div>`).join("");

  const changeRow = change > 0.005 ? `
    <div class="chg-row">
      <span>Change</span>
      <span>$${fmt(change)}</span>
    </div>` : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
    @page { size: 72mm auto; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { width: 72mm; background: #fff; font-family: 'Courier Prime', monospace; font-size: 10pt; color: #000; }
    .rcpt { width: 72mm; padding: 14px 12px 18px; }
    .hdr { text-align: center; margin-bottom: 12px; }
    .hdr-name { font-size: 22pt; font-weight: 700; letter-spacing: 4px; line-height: 1; margin-bottom: 5px; }
    .hdr-tag { font-size: 7.5pt; letter-spacing: 2px; text-transform: uppercase; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 0; margin: 5px 0; }
    .hdr-info { font-size: 8pt; line-height: 1.7; }
    .div  { border: none; border-top: 1px dashed #000; margin: 10px 0; }
    .divd { border: none; border-top: 2px solid #000; margin: 10px 0; }
    .meta { font-size: 9pt; line-height: 1.8; }
    .meta-row { display: flex; justify-content: space-between; }
    .meta-key { color: #555; }
    .meta-val { font-weight: 700; }
    .sec-lbl { font-size: 7pt; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; text-align: center; margin: 8px 0 6px; }
    .item { margin-bottom: 8px; }
    .item-top { display: flex; justify-content: space-between; font-size: 10.5pt; font-weight: 700; }
    .item-sub { font-size: 8.5pt; color: #444; margin-top: 1px; }
    .tot-row { display: flex; justify-content: space-between; font-size: 9.5pt; line-height: 1.9; }
    .tot-row .k { color: #444; }
    .grand { display: flex; justify-content: space-between; font-size: 16pt; font-weight: 700; letter-spacing: 1px; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 6px 0; margin: 6px 0; }
    .pay-row { display: flex; justify-content: space-between; font-size: 9.5pt; line-height: 1.9; color: #333; }
    .pay-row b { color: #000; }
    .chg-row { display: flex; justify-content: space-between; font-size: 9.5pt; font-weight: 700; margin-top: 2px; }
    .footer { text-align: center; margin-top: 10px; }
    .footer-thanks { font-size: 12pt; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px; }
    .footer-sub { font-size: 8pt; color: #444; line-height: 1.8; }
    .footer-rcpt { font-size: 8pt; letter-spacing: 4px; margin-top: 8px; color: #888; }
    .stars { text-align: center; font-size: 8pt; letter-spacing: 4px; margin: 4px 0; color: #aaa; }
  </style>
</head>
<body>
<div class="rcpt">

  <div class="hdr">
    <div class="hdr-name">CHEF'S<br>WORLD</div>
    <div class="hdr-tag">${shopTagline}</div>
    <div class="hdr-info">${shopAddress}<br>${shopPhone}</div>
  </div>

  <hr class="divd"/>

  <div class="meta">
    <div class="meta-row"><span class="meta-key">Receipt</span><span class="meta-val">#${receiptNo}</span></div>
    <div class="meta-row"><span class="meta-key">Date</span><span class="meta-val">${dateStr}</span></div>
    ${odooOrderId ? `<div class="meta-row"><span class="meta-key">Order ID</span><span class="meta-val">#${odooOrderId}</span></div>` : ""}
    ${customer    ? `<div class="meta-row"><span class="meta-key">Customer</span><span class="meta-val">${customer.name}</span></div>` : ""}
  </div>

  <hr class="div"/>

  <div class="sec-lbl">— Items —</div>
  ${lineItems}

  <hr class="div"/>

  <div class="tot-row"><span class="k">Subtotal</span><span>$${fmt(subtotal)}</span></div>
  <div class="tot-row"><span class="k">Tax (10%)</span><span>$${fmt(tax)}</span></div>
  <div class="grand"><span>TOTAL</span><span>$${fmt(total)}</span></div>

  <div class="sec-lbl">— Payment —</div>
  ${paymentRows}
  ${changeRow}

  <hr class="divd"/>

  <div class="stars">* * * * * * * * * *</div>
  <div class="footer">
    <div class="footer-thanks">Thank You!</div>
    <div class="footer-sub">Please keep this receipt for your records.<br>${shopPhone}</div>
    <div class="footer-rcpt">* ${receiptNo} *</div>
  </div>
  <div class="stars">* * * * * * * * * *</div>

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