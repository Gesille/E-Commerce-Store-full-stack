import { CartItem, Customer, PaymentLine } from "@/types/pos";

// ─── Config ────────────────────────────────────────────────────────────────
const COLS      = 42;
const FONT_SIZE = "14px";
const FONT      = "'Courier New', Courier, monospace";

const shopName    = "Chef's World";
const shopTagline = "Restaurant, Bar & Kitchen Supplies";
const shopAddress = "123 Culinary Ave, Foodie City, FL 12345";
const shopPhone   = "(555) 123-4567";

// ─── Text helpers ──────────────────────────────────────────────────────────
const repeat   = (ch: string, n: number) => ch.repeat(Math.max(0, n));
const divider  = (ch = "-")             => repeat(ch, COLS);
const center   = (s: string)            => {
  const pad = Math.max(0, Math.floor((COLS - s.length) / 2));
  return repeat(" ", pad) + s;
};
const lr = (left: string, right: string) => {
  const gap = COLS - left.length - right.length;
  return left + repeat(" ", Math.max(1, gap)) + right;
};

/** 4-column line: name | qty | price | total — all centered in their column */
const itemLine = (name: string, qty: string, price: string, total: string) => {
  const fixed = 4 + 8 + 8;
  const nameW = COLS - fixed;
  const n = name.length > nameW ? name.slice(0, nameW - 1) + "~" : name.padEnd(nameW);
  return n + qty.padStart(4) + price.padStart(8) + total.padStart(8);
};

const fmt = (n: number) => n.toFixed(2);

function calcLineTotal(item: CartItem) {
  return item.price * item.qty * (1 - (item.discount || 0) / 100);
}

// ─── Build receipt lines ────────────────────────────────────────────────────
export function buildReceiptLines(
  cart:         CartItem[],
  customer:     Customer | null,
  paymentLines: PaymentLine[],
  receiptNo:    string,
  odooOrderId?: number,
): Array<{ text: string; bold?: boolean; center?: boolean }> {
  const subtotal = cart.reduce((a, i) => a + calcLineTotal(i), 0);
  const tax      = subtotal * 0.1;
  const total    = subtotal + tax;
  const paid     = paymentLines.reduce((s, l) => s + l.amount, 0);
  const change   = paid - total;

  const dateStr = new Date().toLocaleString("en-US", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  type Line = { text: string; bold?: boolean; center?: boolean };
  const lines: Line[] = [];

  const add    = (text: string)   => lines.push({ text, center: true });
  const addB   = (text: string)   => lines.push({ text, bold: true, center: true });
  const addLR  = (l: string, r: string) => lines.push({ text: lr(l, r) });
  const addLRB = (l: string, r: string) => lines.push({ text: lr(l, r), bold: true });
  const addDiv = (ch = "-")       => lines.push({ text: divider(ch), center: true });
  const addC   = (text: string)   => lines.push({ text: center(text), center: true });
  const addCB  = (text: string)   => lines.push({ text: center(text), bold: true, center: true });

  // ── Header ──
  addDiv("=");
  addCB(shopName.toUpperCase());
  addC(shopTagline);
  addC(shopAddress);
  addC(shopPhone);
  addDiv("=");

  // ── Meta (centered block) ──
  addC(dateStr);
  addCB(`Receipt: ${receiptNo}`);
  if (odooOrderId) addC(`Order ID: #${odooOrderId}`);
  if (customer)    addC(`Customer: ${customer.name}`);

  addDiv("-");

  // ── Column headers (bold) ──
  lines.push({ text: itemLine("ITEM", "QTY", "PRICE", "TOTAL"), bold: true });
  addDiv("-");

  // ── Line items ──
  for (const item of cart) {
    const lineTotal = calcLineTotal(item);
    lines.push({
      text: itemLine(item.name, String(item.qty), `$${fmt(item.price)}`, `$${fmt(lineTotal)}`),
      bold: true,
    });
    if ((item.discount ?? 0) > 0) {
      const discAmt = item.price * item.qty * ((item.discount ?? 0) / 100);
      lines.push({ text: lr(`  Discount ${item.discount}%`, `-$${fmt(discAmt)}`) });
    }
  }

  addDiv("-");

  // ── Subtotals ──
  addLR("Subtotal",  `$${fmt(subtotal)}`);
  addLR("Tax (10%)", `$${fmt(tax)}`);

  addDiv("=");
  addLRB("TOTAL", `$${fmt(total)}`);
  addDiv("=");

  lines.push({ text: "" });

  // ── Payments ──
  for (const l of paymentLines) {
    const label = l.method.charAt(0).toUpperCase() + l.method.slice(1);
    addLR(label, `$${fmt(l.amount)}`);
  }
  if (change > 0.005) addLRB("Change", `$${fmt(change)}`);

  // ── Footer ──
  addDiv("-");
  addCB("THANK YOU FOR YOUR VISIT!");
  addC("Please keep this receipt for your records.");
  addDiv("- -");           // decorative spaced dashes
  addC(receiptNo);
  addDiv("-");

  return lines;
}

// ─── Component ─────────────────────────────────────────────────────────────
interface PrintableReceiptProps {
  cart:         CartItem[];
  customer:     Customer | null;
  paymentLines: PaymentLine[];
  odooOrderId?: number;
  receiptNo:    string;
}

export function PrintableReceipt(props: PrintableReceiptProps) {
  const lines = buildReceiptLines(
    props.cart,
    props.customer,
    props.paymentLines,
    props.receiptNo,
    props.odooOrderId,
  );

  return (
    <div
      id="printable-receipt"
      style={{ display: "none" }}
      aria-hidden="true"
    >
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: FONT,
            fontSize:   FONT_SIZE,
            lineHeight: "1.5",
            whiteSpace: "pre",
            fontWeight: line.bold ? "bold" : "normal",
            margin:     0,
            padding:    0,
            color:      "#000",
            background: "#fff",
          }}
        >
          {line.text || "\u00A0"}
        </div>
      ))}
    </div>
  );
}

// ─── Print hook ────────────────────────────────────────────────────────────
export function usePrintReceipt() {
  const printReceipt = () => {
    const el = document.getElementById("printable-receipt");
    if (!el) return;

    // Build HTML lines preserving bold
    const rows = Array.from(el.children) as HTMLElement[];
    const htmlLines = rows.map((row) => {
      const text    = row.textContent ?? "";
      const isBold  = row.style.fontWeight === "bold";
      const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return isBold
        ? `<div class="b">${escaped}</div>`
        : `<div>${escaped}</div>`;
    }).join("\n");

    document.getElementById("__print_frame__")?.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "__print_frame__";
    iframe.style.cssText =
      "position:fixed;top:0;left:0;width:80mm;height:1px;border:none;opacity:0;pointer-events:none;z-index:-1;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  @page { size: 80mm auto; margin: 4mm 4mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 80mm;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  div {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${FONT_SIZE};
    line-height: 1.5;
    white-space: pre;
    color: #000;
  }
  div.b { font-weight: bold; }
</style></head>
<body>${htmlLines}</body></html>`);
    doc.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => iframe.remove(), 2000);
      }, 200);
    };
  };

  return { printReceipt };
}