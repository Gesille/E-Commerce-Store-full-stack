
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
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // ── ITEMS ────────────────────────────────────────────────────────────────
  const lineItems = cart
    .map((item) => {
      const lineTotal = calcLineTotal(item);

      return `
        <tr>
          <td class="item-name">${item.name}</td>
          <td class="item-qty">${item.qty}</td>
          <td class="item-price">$${fmt(item.price)}</td>
          <td class="item-total">$${fmt(lineTotal)}</td>
        </tr>
      `;
    })
    .join("");

  // ── PAYMENTS ─────────────────────────────────────────────────────────────
  const paymentRows = paymentLines
    .map(
      (l) => `
        <div class="pay-row">
          <span>${l.method}</span>
          <span>$${fmt(l.amount)}</span>
        </div>
      `,
    )
    .join("");

  const changeRow =
    change > 0.005
      ? `
        <div class="pay-row">
          <span>Change</span>
          <span>$${fmt(change)}</span>
        </div>
      `
      : "";

  // ── BARCODE ──────────────────────────────────────────────────────────────
  const barcodeStripes = Array.from({ length: 30 }, (_, i) => {
    const w = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1][i % 10];

    return `
      <div
        style="
          width:${w}px;
          background:#000;
          height:100%;
          display:inline-block;
          margin-right:${i % 3 === 0 ? 2 : 1}px;
        ">
      </div>
    `;
  }).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>

<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=DM+Serif+Display&display=swap');

@page {
  size: 80mm auto;
  margin: 0;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

html,
body {
  width: 72mm;
  margin: 0 auto;
  background: #fff;
  color: #000;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10pt;
  line-height: 1.45;
}

.receipt {
  width: 72mm;
  padding: 0 2mm;
  background: #fff;
  color: #000;
}

/* HEADER */

.header {
  text-align: center;
  padding: 10pt 0 8pt;
}

.shop-name {
  font-family: 'DM Serif Display', serif;
  font-size: 24pt;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 6pt;
}

.shop-sub {
  font-size: 8pt;
  line-height: 1.5;
}

.shop-divider {
  border: none;
  border-top: 1px dashed #000;
  margin: 6pt 0;
}

/* META */

.meta-band {
  padding: 8pt 0;
  border-top: 1px dashed #000;
  border-bottom: 1px dashed #000;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2pt;
  font-size: 9pt;
}

.meta-label {
  font-weight: 700;
}

.meta-value,
.receipt-num {
  font-weight: 700;
}

/* SECTION LABEL */

.section-label {
  font-size: 9pt;
  font-weight: 700;
  padding: 7pt 0 4pt;
}

/* HEADERS */

.col-header {
  display: grid;
  grid-template-columns: 1fr 30px 55px 55px;
  padding: 4pt 0;
  border-top: 1px dashed #000;
  border-bottom: 1px dashed #000;
  font-size: 8pt;
  font-weight: 700;
}

.col-header span:nth-child(2) {
  text-align: center;
}

.col-header span:nth-child(3),
.col-header span:nth-child(4) {
  text-align: right;
}

/* TABLE */

table.items {
  width: 100%;
  border-collapse: collapse;
}

table.items td {
  padding: 5pt 0;
  font-size: 10pt;
}

.item-name {
  font-weight: 700;
}

.item-qty {
  text-align: center;
}

.item-price,
.item-total {
  text-align: right;
}

.item-total {
  font-weight: 700;
}

.items-border {
  border-top: 1px dashed #000;
  margin: 5pt 0;
}

/* TOTALS */

.totals-section {
  padding: 4pt 0;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  padding: 2pt 0;
  font-size: 10pt;
}

.totals-row.grand {
  border-top: 2px solid #000;
  border-bottom: 2px solid #000;
  margin-top: 5pt;
  padding: 6pt 0;
  font-size: 18pt;
  font-weight: 700;
}

/* PAYMENTS */

.payments-section {
  padding: 5pt 0;
}

.pay-row {
  display: flex;
  justify-content: space-between;
  padding: 2pt 0;
  font-size: 10pt;
}

/* BARCODE */

.barcode-section {
  text-align: center;
  padding: 8pt 0;
  border-top: 1px dashed #000;
}

.barcode {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  height: 26pt;
  margin-bottom: 4pt;
}

.barcode-num {
  font-size: 8pt;
  letter-spacing: 2px;
}

/* FOOTER */

.footer {
  text-align: center;
  padding: 10pt 0 12pt;
}

.footer-thanks {
  font-size: 16pt;
  font-weight: 700;
  margin-bottom: 4pt;
}

.footer-sub {
  font-size: 8pt;
  line-height: 1.5;
}
</style>
</head>

<body>
<div class="receipt">

  <!-- HEADER -->
  <div class="header">
    <div class="shop-name">${shopName}</div>

    <div class="shop-sub">${shopTagline}</div>
    <div class="shop-sub">${shopAddress}</div>
    <div class="shop-sub">${shopPhone}</div>

    <hr class="shop-divider"/>
  </div>

  <!-- META -->
  <div class="meta-band">

    <div class="meta-row">
      <span class="meta-label">Receipt:</span>
      <span class="receipt-num">${receiptNo}</span>
    </div>

    <div class="meta-row">
      <span class="meta-label">Date:</span>
      <span class="meta-value">${dateStr}</span>
    </div>

    ${
      odooOrderId
        ? `
      <div class="meta-row">
        <span class="meta-label">Order ID:</span>
        <span class="meta-value">#${odooOrderId}</span>
      </div>
    `
        : ""
    }

    ${
      customer
        ? `
      <div class="meta-row">
        <span class="meta-label">Customer:</span>
        <span class="meta-value">${customer.name}</span>
      </div>
    `
        : ""
    }

  </div>

  <!-- ITEMS -->
  <div class="items-section">

    <div class="section-label">ITEMS</div>

    <div class="col-header">
      <span>Item</span>
      <span>Qty</span>
      <span>Price</span>
      <span>Total</span>
    </div>

    <table class="items">
      <tbody>
        ${lineItems}
      </tbody>
    </table>

    <div class="items-border"></div>

  </div>

  <!-- TOTALS -->
  <div class="totals-section">

    <div class="totals-row">
      <span>Subtotal</span>
      <span>$${fmt(subtotal)}</span>
    </div>

    <div class="totals-row">
      <span>Tax (10%)</span>
      <span>$${fmt(tax)}</span>
    </div>

    <div class="totals-row grand">
      <span>TOTAL</span>
      <span>$${fmt(total)}</span>
    </div>

  </div>

  <!-- PAYMENTS -->
  <div class="payments-section">

    ${paymentRows}

    ${changeRow}

  </div>

  <!-- BARCODE -->
  <div class="barcode-section">

    <div class="barcode">
      ${barcodeStripes}
    </div>

    <div class="barcode-num">
      ${receiptNo}
    </div>

  </div>

  <!-- FOOTER -->
  <div class="footer">

    <div class="footer-thanks">
      Thank you for your visit!
    </div>

    <div class="footer-sub">
      Please keep this receipt for your records.
    </div>

  </div>

</div>
</body>
</html>
`;
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
    const {
      cart,
      customer,
      paymentLines,
      odooOrderId,
      receiptNo,
    } = options;

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

    iframe.style.cssText = `
      position:fixed;
      top:0;
      left:0;
      width:72mm;
      height:1px;
      border:none;
      opacity:0;
      pointer-events:none;
      z-index:-1;
    `;

    document.body.appendChild(iframe);

    const doc =
      iframe.contentDocument ??
      iframe.contentWindow?.document;

    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();

        setTimeout(() => {
          iframe.remove();
        }, 3000);
      }, 400);
    };
  };

  return { printReceipt };
}

