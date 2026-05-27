import { CartItem, Customer, PaymentLine } from "@/types/pos";

// ─── Config ────────────────────────────────────────────────────────────────
const COLS       = 42;   // characters per line (fits 80 mm @ 14 pt Courier)
const FONT_SIZE  = "14px";
const FONT       = "'Courier New', Courier, monospace";

const shopName    = "Chef's World";
const shopTagline = "Restaurant, Bar & Kitchen Supplies";
const shopAddress = "123 Culinary Ave, Foodie City, FL 12345";
const shopPhone   = "(555) 123-4567";

// ─── Text helpers ──────────────────────────────────────────────────────────
const repeat  = (ch: string, n: number) => ch.repeat(Math.max(0, n));
const divider = (ch = "-")             => repeat(ch, COLS);
const center  = (s: string)            => {
  const pad = Math.max(0, Math.floor((COLS - s.length) / 2));
  return repeat(" ", pad) + s;
};

/** Left-align `left`, right-align `right`, fill middle with spaces. */
const lr = (left: string, right: string) => {
  const gap = COLS - left.length - right.length;
  return left + repeat(" ", Math.max(1, gap)) + right;
};

/** 4-column item line: name | qty | price | total */
const itemLine = (name: string, qty: string, price: string, total: string) => {
  const fixed = 4 + 8 + 8;
  const nameW = COLS - fixed;
  const truncated = name.length > nameW ? name.slice(0, nameW - 1) + "..." : name.padEnd(nameW);
  return truncated + qty.padStart(4) + price.padStart(8) + total.padStart(8);
};

const fmt = (n: number) => n.toFixed(2);

function calcLineTotal(item: CartItem) {
  return item.price * item.qty * (1 - (item.discount || 0) / 100);
}

// ─── Build receipt as plain-text lines ─────────────────────────────────────
export function buildReceiptLines(
  cart:         CartItem[],
  customer:     Customer | null,
  paymentLines: PaymentLine[],
  receiptNo:    string,
  odooOrderId?: number,
): string[] {
  const subtotal = cart.reduce((a, i) => a + calcLineTotal(i), 0);
  const tax      = subtotal * 0.1;
  const total    = subtotal + tax;
  const paid     = paymentLines.reduce((s, l) => s + l.amount, 0);
  const change   = paid - total;

  const dateStr = new Date().toLocaleString("en-US", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const lines: string[] = [];
  const add = (...rows: string[]) => lines.push(...rows);

  // Header
  add(
    divider("="),
    center(shopName.toUpperCase()),
    center(shopTagline),
    center(shopAddress),
    center(shopPhone),
    divider("="),
  );

  // Meta
  add(
    lr("Date:",    dateStr),
    lr("Receipt:", receiptNo),
  );
  if (odooOrderId) add(lr("Order ID:", `#${odooOrderId}`));
  if (customer)    add(lr("Customer:", customer.name));

  add(divider("-"));

  // Column headers
  add(itemLine("ITEM", "QTY", "PRICE", "TOTAL"));
  add(divider("-"));

  // Line items
  for (const item of cart) {
    const lineTotal = calcLineTotal(item);
    add(itemLine(item.name, String(item.qty), `$${fmt(item.price)}`, `$${fmt(lineTotal)}`));
    if ((item.discount ?? 0) > 0) {
      const discAmt = item.price * item.qty * ((item.discount ?? 0) / 100);
      add(lr(`  Discount ${item.discount}%`, `-$${fmt(discAmt)}`));
    }
  }

  add(divider("-"));

  // Totals
  add(
    lr("Subtotal",  `$${fmt(subtotal)}`),
    lr("Tax (10%)", `$${fmt(tax)}`),
    divider("="),
    lr("TOTAL",     `$${fmt(total)}`),
    divider("="),
  );

  // Payments
  add("");
  for (const l of paymentLines) {
    const label = l.method.charAt(0).toUpperCase() + l.method.slice(1);
    add(lr(label, `$${fmt(l.amount)}`));
  }
  if (change > 0.005) add(lr("Change", `$${fmt(change)}`));

  // Footer
  add(
    divider("-"),
    center("Thank you for your visit!"),
    center("Please keep this receipt for your records."),
    center(receiptNo),
    divider("-"),
  );

  return lines;
}

// ─── Invisible DOM node ────────────────────────────────────────────────────
interface PrintableReceiptProps {
  cart:         CartItem[];
  customer:     Customer | null;
  paymentLines: PaymentLine[];
  odooOrderId?: number;
  receiptNo:    string;
}

/**
 * Renders nothing visible — keeps an off-screen <pre> in the DOM
 * so usePrintReceipt() can find and print it.
 */
export function PrintableReceipt(props: PrintableReceiptProps) {
  const lines = buildReceiptLines(
    props.cart,
    props.customer,
    props.paymentLines,
    props.receiptNo,
    props.odooOrderId,
  );

  return (
    <pre
      id="printable-receipt"
      style={{
        display:    "none",
        fontFamily: FONT,
        fontSize:   FONT_SIZE,
        lineHeight: "1.4",
        whiteSpace: "pre",
        margin:     0,
        padding:    0,
        color:      "#000",
        background: "#fff",
      }}
    >
      {lines.join("\n")}
    </pre>
  );
}

// ─── Print hook ────────────────────────────────────────────────────────────
export function usePrintReceipt() {
  const printReceipt = () => {
    const el = document.getElementById("printable-receipt");
    if (!el) return;

    const text = el.textContent ?? "";

    document.getElementById("__print_frame__")?.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "__print_frame__";
    iframe.style.cssText =
      "position:fixed;top:0;left:0;width:80mm;height:1px;border:none;opacity:0;pointer-events:none;z-index:-1;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) return;

    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  @page { size: 80mm auto; margin: 4mm 3mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 80mm;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  pre {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${FONT_SIZE};
    line-height: 1.4;
    white-space: pre;
    color: #000;
  }
</style></head>
<body><pre>${escaped}</pre></body></html>`);
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