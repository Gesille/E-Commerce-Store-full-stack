import { CartItem, Customer, PaymentLine } from "@/types/pos";

// ─── Shop Config ───────────────────────────────────────────────────────────
const shopName = "Chef's World";
const shopTagline = "Restaurant, Bar & Kitchen Supplies";
const shopAddress = "123 Culinary Ave, Foodie City, FL 12345";
const shopPhone = "(555) 123-4567";

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toFixed(2);

function calcLineTotal(item: CartItem) {
  return item.price * item.qty * (1 - (item.discount || 0) / 100);
}
function calcOrderTotals(cart: CartItem[]) {
  const subtotal = cart.reduce((a, i) => a + calcLineTotal(i), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface PrintableReceiptProps {
  cart: CartItem[];
  customer: Customer | null;
  paymentLines: PaymentLine[];
  odooOrderId?: number;
  receiptNo: string;
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
  const paid = paymentLines.reduce((s, l) => s + l.amount, 0);
  const change = paid - total;

  const dateStr = new Date().toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // ── Line items ──────────────────────────────────────────────────────────
  const lineItems = cart
    .map((item) => {
      const lineTotal = calcLineTotal(item);
      const hasDiscount = (item.discount ?? 0) > 0;
      const discountAmt = item.price * item.qty * ((item.discount ?? 0) / 100);

      return `
      <tr>
        <td class="td-name">${item.name}</td>
        <td class="td-qty">${item.qty}</td>
        <td class="td-price">$${fmt(item.price)}</td>
        <td class="td-total">$${fmt(lineTotal)}</td>
      </tr>
      ${
        hasDiscount
          ? `
      <tr>
        <td colspan="3" class="td-disc-label">  Discount ${item.discount}%</td>
        <td class="td-disc-amt">-$${fmt(discountAmt)}</td>
      </tr>`
          : ""
      }`;
    })
    .join("");

  // ── Barcode stripes ─────────────────────────────────────────────────────
  const barcodeStripes = Array.from({ length: 30 }, (_, i) => {
    const w = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1][i % 10];
    return `<div style="width:${w}px;background:#000;height:100%;display:inline-block;margin-right:${i % 3 === 0 ? 2 : 1}px;"></div>`;
  }).join("");

  // ── Payment rows ────────────────────────────────────────────────────────
  const paymentRows = paymentLines
    .map(
      (l) => `
    <div class="pay-row">
      <span>${l.method}</span>
      <span class="pay-amt">$${fmt(l.amount)}</span>
    </div>`,
    )
    .join("");

  const changeRow =
    change > 0.005
      ? `
    <div class="pay-row">
      <span>Change</span>
      <span class="pay-amt">$${fmt(change)}</span>
    </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <style>
@page {
  size: 76mm auto;
  margin: 0;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  width: 76mm;
  background: #fff;
  color: #000;
  font-family: "Courier New", monospace;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: none;
}

.receipt {
  width: 76mm;
  padding: 8px;
}

/* HEADER */
.header {
  text-align: center;
  border-bottom: 2px solid #000;
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.logo {
  width: 160px;
  display: block;
  margin: 0 auto 6px;
}

.header-line {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
}

/* META */
.meta {
  border-bottom: 1px solid #000;
  padding-bottom: 6px;
  margin-bottom: 6px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  margin: 3px 0;
}

.meta-key {
  font-weight: bold;
}

.meta-val {
  font-weight: bold;
}

/* SECTION */
.sec-head {
  font-size: 12px;
  font-weight: 700;
  border-bottom: 1px solid #000;
  margin: 8px 0 4px;
  padding-bottom: 3px;
}

/* TABLE */
table.items {
  width: 100%;
  border-collapse: collapse;
}

table.items td {
  padding: 3px 0;
  vertical-align: top;
  font-size: 12px;
}

.td-name {
  width: 50%;
  font-weight: 700;
}

.td-qty {
  width: 12%;
  text-align: center;
}

.td-price,
.td-total {
  width: 19%;
  text-align: right;
  font-weight: bold;
}

/* TOTALS */
.totals {
  border-top: 1px solid #000;
  border-bottom: 2px solid #000;
  padding: 6px 0;
  margin-top: 8px;
}

.tot-row {
  display: flex;
  justify-content: space-between;
  margin: 3px 0;
}

.tot-row.grand {
  font-size: 15px;
  font-weight: 900;
  margin-top: 6px;
}

/* PAYMENT */
.payment {
  margin-top: 8px;
}

.pay-row {
  display: flex;
  justify-content: space-between;
  margin: 3px 0;
}

/* BARCODE */
.barcode-wrap {
  text-align: center;
  margin-top: 10px;
  border-top: 1px solid #000;
  padding-top: 8px;
}

.barcode-bars {
  display: flex;
  justify-content: center;
  height: 40px;
}

.barcode-num {
  font-size: 11px;
  margin-top: 4px;
  font-weight: bold;
}

/* FOOTER */
.footer {
  text-align: center;
  border-top: 1px solid #000;
  margin-top: 10px;
  padding-top: 8px;
}

.footer-thanks {
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 4px;
}

.footer-sub {
  font-size: 10px;
}
  </style>
</head>
<body>
<div class="receipt">


  <div class="header">
    <img
  src="/chefworldlogo1.png"
  class="logo"
  style="image-rendering: crisp-edges;"
/>
    <hr class="header-rule"/>
    <div class="header-line">${shopTagline}</div>
    <div class="header-line">${shopAddress}</div>
    <div class="header-line">${shopPhone}</div>
  </div>


  <div class="meta">
    <div class="meta-row">
      <span class="meta-key">Receipt</span>
      <span class="meta-val-lg">${receiptNo}</span>
    </div>
    <div class="meta-row">
      <span class="meta-key">Date</span>
      <span class="meta-val">${dateStr}</span>
    </div>
    ${
      odooOrderId
        ? `
    <div class="meta-row">
      <span class="meta-key">Order ID</span>
      <span class="meta-val">#${odooOrderId}</span>
    </div>`
        : ""
    }
    ${
      customer
        ? `
    <div class="meta-row">
      <span class="meta-key">Customer</span>
      <span class="meta-val">${customer.name}</span>
    </div>`
        : ""
    }
  </div>


  <div class="sec-head">Items</div>
  <div class="col-head">
    <span>Description</span>
    <span>Qty</span>
    <span>Price</span>
    <span>Total</span>
  </div>
  <table class="items">
    <tbody>${lineItems}</tbody>
  </table>
  <div class="items-rule"></div>

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


  <div class="payment">
    <div class="sec-head" style="padding:0 0 5pt;border:none;">Payment</div>
    ${paymentRows}
    ${changeRow}
  </div>

  
  <div class="barcode-wrap">
    <div class="barcode-bars">${barcodeStripes}</div>
    <div class="barcode-num">${receiptNo}</div>
  </div>


  <div class="footer">
    <hr class="footer-rule"/>
    <div class="footer-thanks">Thank you for your visit!</div>
    <div class="footer-sub">Please keep this receipt for your records.</div>
    <div class="footer-sub">${shopPhone} &middot; ${shopName}</div>
    <hr class="footer-rule"/>
  </div>

</div>
</body>
</html>`;
}

// ─── Print Hook ────────────────────────────────────────────────────────────
interface UsePrintReceiptOptions {
  cart: CartItem[];
  customer: Customer | null;
  paymentLines: PaymentLine[];
  odooOrderId?: number;
  receiptNo: string;
}

export function usePrintReceipt(options: UsePrintReceiptOptions) {
  const printReceipt = async () => {
    const { cart, customer, paymentLines, odooOrderId, receiptNo } = options;
    const html = buildReceiptHTML(
      cart,
      customer,
      paymentLines,
      odooOrderId,
      receiptNo,
    );

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
