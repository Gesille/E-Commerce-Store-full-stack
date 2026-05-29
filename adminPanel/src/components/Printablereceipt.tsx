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

  const dateStr = new Date().toLocaleString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "2-digit",
    year:    "numeric",
    hour:    "2-digit",
    minute:  "2-digit",
  });

  // ── Line items ────────────────────────────────────────────────────────────
  const lineItems = cart.map((item) => {
    const lineTotal  = calcLineTotal(item);
    const hasDiscount = (item.discount ?? 0) > 0;
    const discountAmt = item.price * item.qty * ((item.discount ?? 0) / 100);

    return `
      <tr class="item-row">
        <td class="item-name">${item.name}</td>
        <td class="item-qty">${item.qty}</td>
        <td class="item-price">$${fmt(item.price)}</td>
        <td class="item-total">$${fmt(lineTotal)}</td>
      </tr>
      ${hasDiscount ? `
      <tr class="discount-row">
        <td colspan="3" class="discount-label">↳ Discount ${item.discount}%</td>
        <td class="discount-amount">−$${fmt(discountAmt)}</td>
      </tr>` : ""}`;
  }).join("");

  // ── Payment rows ──────────────────────────────────────────────────────────
  const paymentRows = paymentLines.map((l) => `
    <div class="pay-row">
      <span class="pay-method">${l.method}</span>
      <span class="pay-amount">$${fmt(l.amount)}</span>
    </div>`).join("");

  const changeRow = change > 0.005 ? `
    <div class="pay-row change-row">
      <span class="pay-method">Change</span>
      <span class="pay-amount">$${fmt(change)}</span>
    </div>` : "";

  // ── Barcode-style receipt number (CSS stripes) ─────────────────────────
  const barcodeStripes = Array.from({ length: 30 }, (_, i) => {
    const w = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1][i % 10];
    return `<div style="width:${w}px;background:#000;height:100%;display:inline-block;margin-right:${i % 3 === 0 ? 2 : 1}px;"></div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <style>
    body { margin: 0; background: #fafaf8; }
  </style>
</head>
<body>

  <img
    src="/chefworldlogo1.png"
    alt="Chef's World"
    id="logo"
    onload="document.getElementById('status').textContent='✅ Logo loaded OK'; document.getElementById('status').style.color='green';"
    onerror="document.getElementById('status').textContent='❌ Not found: /chefworldlogo1.png'; document.getElementById('status').style.color='red';"
  />

  <p id="status">⏳ Loading...</p>

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