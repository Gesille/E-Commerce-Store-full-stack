import { CartItem, Customer, PaymentLine } from "@/types/pos";

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

export interface PrintableReceiptProps {
  cart:         CartItem[];
  customer:     Customer | null;
  paymentLines: PaymentLine[];
  odooOrderId?: number;
  receiptNo:    string;
}

export function PrintableReceipt(_props: PrintableReceiptProps) {
  return null;
}

// Pad a string on the right to a fixed column width (ASCII safe)
function col(text: string, width: number): string {
  const s = String(text);
  return s.length >= width ? s.slice(0, width) : s + " ".repeat(width - s.length);
}

// Pad a string on the left (right-align)
function colR(text: string, width: number): string {
  const s = String(text);
  return s.length >= width ? s.slice(0, width) : " ".repeat(width - s.length) + s;
}

// Repeat a character n times
function repeat(char: string, n: number): string {
  return char.repeat(Math.max(0, n));
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

  const logoUrl = window.location.origin + "/chefworldlogo1.png";

  const dateStr = new Date().toLocaleString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "2-digit",
    year:    "numeric",
    hour:    "2-digit",
    minute:  "2-digit",
  });

  // 48 chars wide — standard for 80mm paper at 12pt monospace
  // Adjust COLS to 42 if using 76mm paper
  const COLS = 48;
  const DIVIDER_SOLID = repeat("-", COLS);
  const DIVIDER_DASH  = repeat("- ", Math.floor(COLS / 2));

  // Build item rows as plain text lines
  const itemLines: string[] = [];
  for (const item of cart) {
    const lineTotal   = calcLineTotal(item);
    const hasDiscount = (item.discount ?? 0) > 0;
    const discountAmt = item.price * item.qty * ((item.discount ?? 0) / 100);

    // Name line: truncate name to leave room for qty x price = total
    // Layout: "Item Name       qty x $pp.pp   $tt.tt"
    const rightPart = `${item.qty} x $${fmt(item.price)}`;
    const totalPart = `$${fmt(lineTotal)}`;
    const rightWidth = rightPart.length + 1 + totalPart.length;
    const nameWidth  = COLS - rightWidth - 1;
    const nameTrunc  = item.name.length > nameWidth
      ? item.name.slice(0, nameWidth - 1) + "."
      : item.name;

    itemLines.push(
      col(nameTrunc, nameWidth) +
      " " +
      col(rightPart, rightPart.length) +
      " " +
      colR(totalPart, totalPart.length),
    );

    if (hasDiscount) {
      const discLabel = `  Discount ${item.discount}%`;
      const discAmt   = `-$${fmt(discountAmt)}`;
      itemLines.push(col(discLabel, COLS - discAmt.length) + discAmt);
    }
  }

  // Payment rows
  const paymentLines_str: string[] = paymentLines.map((l) => {
    const method = l.method.charAt(0).toUpperCase() + l.method.slice(1);
    const amount = `$${fmt(l.amount)}`;
    return col(method, COLS - amount.length) + amount;
  });

  if (change > 0.005) {
    const changeAmt = `$${fmt(change)}`;
    paymentLines_str.push(col("Change", COLS - changeAmt.length) + changeAmt);
  }

  // Encode plain text lines to escaped HTML spans (one per line)
  function lines(...groups: string[][]): string {
    return groups.flat().map(l =>
      `<div class="line">${l
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
      }</div>`
    ).join("");
  }

  const metaLines: string[] = [
    `Receipt : ${receiptNo}`,
    `Date    : ${dateStr}`,
    ...(odooOrderId ? [`Order   : #${odooOrderId}`] : []),
    ...(customer    ? [`Customer: ${customer.name}`] : []),
  ];

  const subtotalLine = col("Subtotal", COLS - fmt(subtotal).length - 1) + `$${fmt(subtotal)}`;
  const taxLine      = col("Tax (10%)", COLS - fmt(tax).length - 1)     + `$${fmt(tax)}`;
  const totalLine    = col("TOTAL", COLS - fmt(total).length - 1)       + `$${fmt(total)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
@page {
  size: 80mm auto;
  margin: 4mm 2mm;
}
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
html, body {
  width: 80mm;
  background: #ffffff;
  color: #000000;
  /* Courier New is universally available and maps well to thermal printer fonts */
  font-family: "Courier New", Courier, monospace;
  font-size: 10pt;
  line-height: 1.4;
}
.receipt {
  width: 100%;
  padding: 0;
}
.center {
  text-align: center;
}
.bold {
  font-weight: bold;
}
.large {
  font-size: 13pt;
  font-weight: bold;
}
.small {
  font-size: 8pt;
}
.logo {
  display: block;
  max-width: 38mm;
  height: auto;
  margin: 0 auto 3pt auto;
}
.line {
  display: block;
  white-space: pre;
  overflow: hidden;
}
.section {
  margin: 4pt 0;
}
.divider-solid {
  border: none;
  border-top: 1pt solid #000000;
  margin: 4pt 0;
}
.divider-dash {
  border: none;
  border-top: 1pt dashed #000000;
  margin: 4pt 0;
}
.total-block {
  border-top: 2pt solid #000000;
  border-bottom: 2pt solid #000000;
  padding: 4pt 0;
  margin: 3pt 0;
}
.barcode-area {
  margin: 6pt 0 3pt 0;
  font-size: 7pt;
  letter-spacing: 4pt;
}
</style>
</head>
<body>
<div class="receipt">

  <div class="section center">
    <img src="${logoUrl}" alt="${shopName}" class="logo"/>
    <hr class="divider-dash"/>
    <div class="small">${shopTagline}</div>
    <div class="small">${shopAddress}</div>
    <div class="small">${shopPhone}</div>
  </div>

  <hr class="divider-solid"/>

  <div class="section">
    ${lines(metaLines)}
  </div>

  <hr class="divider-solid"/>

  <div class="section bold small">
    <div class="line">${col("ITEM", COLS - 20)} $UNIT   TOTAL</div>
  </div>

  <hr class="divider-dash"/>

  <div class="section">
    ${lines(itemLines)}
  </div>

  <hr class="divider-dash"/>

  <div class="section">
    <div class="line">${subtotalLine}</div>
    <div class="line">${taxLine}</div>
  </div>

  <div class="total-block">
    <div class="line large">${totalLine}</div>
  </div>

  <hr class="divider-dash"/>

  <div class="section bold small">
    <div class="line">PAYMENT</div>
  </div>

  <div class="section">
    ${lines(paymentLines_str)}
  </div>

  <hr class="divider-dash"/>

  <div class="section barcode-area center">
    <div>|||  ||| || ||| || |||  || ||| |  ||</div>
    <div class="small" style="letter-spacing:2pt">${receiptNo}</div>
  </div>

  <hr class="divider-solid"/>

  <div class="section center">
    <div class="bold">Thank you for your visit!</div>
    <div class="small">Please keep this receipt for your records.</div>
    <div class="small">${shopPhone}</div>
  </div>

</div>
</body>
</html>`;
}

export interface UsePrintReceiptOptions {
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

    const blob  = new Blob([html], { type: "text/html;charset=utf-8" });
    const url   = URL.createObjectURL(blob);

    const iframe = document.createElement("iframe");
    iframe.id = "__print_frame__";
    iframe.style.cssText =
      "position:absolute;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          iframe.remove();
          URL.revokeObjectURL(url);
        }, 3000);
      }, 500);
    };

    iframe.src = url;
  };

  return { printReceipt };
}