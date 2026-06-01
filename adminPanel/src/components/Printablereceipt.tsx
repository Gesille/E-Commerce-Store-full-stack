import { CartItem, Customer, PaymentLine } from "@/types/pos";

const shopName    = "CHEF'S WORLD";
const shopTagline = "RESTAURANT &middot; BAR &middot; KITCHEN";
const shopAddress = "123 Culinary Ave, Foodie City FL";
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

  // ── Line items (table rows only, no flex/grid) ──────────────────────────
  const lineItems = cart.map((item) => {
    const lineTotal   = calcLineTotal(item);
    const discountAmt = item.price * item.qty * ((item.discount ?? 0) / 100);
    const discRow     = (item.discount ?? 0) > 0 ? `
      <tr>
        <td colspan="3" style="font-size:7.5pt;color:#888;padding-bottom:4px;padding-left:4px;">Discount ${item.discount}%</td>
        <td align="right" style="font-size:7.5pt;color:#888;padding-bottom:4px;">-$${fmt(discountAmt)}</td>
      </tr>` : "";

    return `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px dashed #ccc;">
        <tr>
          <td width="52%" style="font-size:9.5pt;font-weight:700;padding:5px 0 2px;">${item.name}</td>
          <td width="13%" align="center" style="font-size:9pt;padding:5px 0 2px;">${item.qty}</td>
          <td width="17%" align="right" style="font-size:8.5pt;color:#555;padding:5px 0 2px;">$${fmt(item.price)}</td>
          <td width="18%" align="right" style="font-size:9.5pt;font-weight:700;padding:5px 0 2px;">$${fmt(lineTotal)}</td>
        </tr>
        ${discRow}
      </table>`;
  }).join("");

  // ── Payment rows ────────────────────────────────────────────────────────
  const paymentRows = paymentLines.map((l) => `
    <tr>
      <td style="font-size:9pt;color:#555;padding:2px 0;text-transform:capitalize;">${l.method}</td>
      <td align="right" style="font-size:9pt;font-weight:700;padding:2px 0;">$${fmt(l.amount)}</td>
    </tr>`).join("");

  const changeRow = change > 0.005 ? `
    <tr>
      <td style="font-size:9pt;color:#555;padding:2px 0;">Change</td>
      <td align="right" style="font-size:9pt;font-weight:700;padding:2px 0;">$${fmt(change)}</td>
    </tr>` : "";

  const odooRow = odooOrderId ? `
    <tr>
      <td width="45%" style="font-size:8.5pt;color:#555;padding:1.5px 0;">Order ID</td>
      <td width="55%" align="right" style="font-size:8.5pt;font-weight:700;padding:1.5px 0;">#${odooOrderId}</td>
    </tr>` : "";

  const customerRow = customer ? `
    <tr>
      <td style="font-size:8.5pt;color:#555;padding:1.5px 0;">Customer</td>
      <td align="right" style="font-size:8.5pt;font-weight:700;padding:1.5px 0;">${customer.name}</td>
    </tr>` : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
    @page { size: 72mm auto; margin: 0; }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0; padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    html, body {
      width: 72mm;
      background: #ffffff;
      font-family: 'Courier Prime', 'Courier New', monospace;
      font-size: 10pt;
      color: #000000;
    }
    .wrap { width: 72mm; padding: 10px 8px 16px; }
    .divider-solid { border-top: 2px solid #000; font-size: 1pt; }
    .divider-dash  { border-top: 1px dashed #000; font-size: 1pt; }
  </style>
</head>
<body>
<div class="wrap">

  <!-- HEADER -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="font-size:20pt;font-weight:700;letter-spacing:4px;padding-bottom:3px;">CHEF'S</td></tr>
    <tr><td align="center" style="font-size:20pt;font-weight:700;letter-spacing:4px;padding-bottom:6px;">WORLD</td></tr>
    <tr><td align="center" style="font-size:7pt;letter-spacing:2px;border-top:1px solid #000;border-bottom:1px solid #000;padding:3px 0;">${shopTagline}</td></tr>
    <tr><td align="center" style="font-size:8pt;padding-top:4px;line-height:1.6;">${shopAddress}</td></tr>
    <tr><td align="center" style="font-size:8pt;padding-bottom:6px;">${shopPhone}</td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0"><tr><td class="divider-solid">&nbsp;</td></tr></table>

  <!-- META -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;">
    <tr>
      <td width="45%" style="font-size:8.5pt;color:#555;padding:1.5px 0;">Receipt</td>
      <td width="55%" align="right" style="font-size:8.5pt;font-weight:700;padding:1.5px 0;">#${receiptNo}</td>
    </tr>
    <tr>
      <td style="font-size:8.5pt;color:#555;padding:1.5px 0;">Date</td>
      <td align="right" style="font-size:8.5pt;font-weight:700;padding:1.5px 0;">${dateStr}</td>
    </tr>
    ${odooRow}
    ${customerRow}
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;"><tr><td class="divider-dash">&nbsp;</td></tr></table>

  <!-- ITEMS LABEL -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="font-size:7pt;font-weight:700;letter-spacing:3px;padding-bottom:5px;">--- ITEMS ---</td></tr>
  </table>

  <!-- COLUMN HEADERS -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #000;border-bottom:1px solid #000;">
    <tr>
      <td width="52%" style="font-size:7pt;font-weight:700;letter-spacing:1px;padding:3px 0;">DESCRIPTION</td>
      <td width="13%" align="center" style="font-size:7pt;font-weight:700;letter-spacing:1px;padding:3px 0;">QTY</td>
      <td width="17%" align="right" style="font-size:7pt;font-weight:700;letter-spacing:1px;padding:3px 0;">PRICE</td>
      <td width="18%" align="right" style="font-size:7pt;font-weight:700;letter-spacing:1px;padding:3px 0;">TOTAL</td>
    </tr>
  </table>

  <!-- ITEMS -->
  ${lineItems}

  <table width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0;"><tr><td class="divider-dash">&nbsp;</td></tr></table>

  <!-- TOTALS -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="font-size:9pt;color:#555;padding:2px 0;">Subtotal</td>
      <td align="right" style="font-size:9pt;padding:2px 0;">$${fmt(subtotal)}</td>
    </tr>
    <tr>
      <td style="font-size:9pt;color:#555;padding:2px 0;">Tax (10%)</td>
      <td align="right" style="font-size:9pt;padding:2px 0;">$${fmt(tax)}</td>
    </tr>
  </table>

  <!-- GRAND TOTAL -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #000;border-bottom:2px solid #000;margin:6px 0;">
    <tr>
      <td style="font-size:15pt;font-weight:700;letter-spacing:1px;padding:5px 0;">TOTAL</td>
      <td align="right" style="font-size:15pt;font-weight:700;letter-spacing:1px;padding:5px 0;">$${fmt(total)}</td>
    </tr>
  </table>

  <!-- PAYMENT LABEL -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="font-size:7pt;font-weight:700;letter-spacing:3px;padding:4px 0;">--- PAYMENT ---</td></tr>
  </table>

  <!-- PAYMENT ROWS -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    ${paymentRows}
    ${changeRow}
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;"><tr><td class="divider-solid">&nbsp;</td></tr></table>

  <!-- FOOTER -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="font-size:8pt;letter-spacing:3px;color:#aaa;padding:2px 0;">* * * * * * * * * *</td></tr>
    <tr><td align="center" style="font-size:11pt;font-weight:700;letter-spacing:1px;padding:4px 0;">Thank You!</td></tr>
    <tr><td align="center" style="font-size:8pt;color:#555;padding:1px 0;">Please keep this for your records.</td></tr>
    <tr><td align="center" style="font-size:8pt;color:#555;padding:1px 0;">${shopPhone}</td></tr>
    <tr><td align="center" style="font-size:8pt;letter-spacing:4px;color:#aaa;padding:6px 0;">* ${receiptNo} *</td></tr>
    <tr><td align="center" style="font-size:8pt;letter-spacing:3px;color:#aaa;padding:2px 0;">* * * * * * * * * *</td></tr>
  </table>

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
    iframe.style.cssText =
      "position:fixed;top:0;left:0;width:72mm;height:0;border:none;opacity:0;pointer-events:none;z-index:-1;";
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