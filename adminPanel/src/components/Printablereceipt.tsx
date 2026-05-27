import { CartItem, Customer, PaymentLine } from "@/types/pos";

// ─── Config ────────────────────────────────────────────────────────────────
const FONT       = "Georgia, 'Times New Roman', serif";
const FONT_SIZE  = "17px";
const FONT_SHOP  = "26px";   // Chef's World headline
const FONT_TOTAL = "20px";   // TOTAL line

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

// ─── Shared inline styles ──────────────────────────────────────────────────
const base: React.CSSProperties = {
  fontFamily: FONT,
  fontSize:   FONT_SIZE,
  color:      "#000",
  background: "#fff",
  margin:     0,
  padding:    0,
  lineHeight: "1.6",
};

const center: React.CSSProperties = { textAlign: "center" };
const bold:   React.CSSProperties = { fontWeight: "bold" };
const muted:  React.CSSProperties = { fontSize: "13px" };
const row:    React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "baseline" };

// ─── Component ─────────────────────────────────────────────────────────────
interface PrintableReceiptProps {
  cart:         CartItem[];
  customer:     Customer | null;
  paymentLines: PaymentLine[];
  odooOrderId?: number;
  receiptNo:    string;
}

export function PrintableReceipt({
  cart,
  customer,
  paymentLines,
  odooOrderId,
  receiptNo,
}: PrintableReceiptProps) {
  const { subtotal, tax, total } = calcOrderTotals(cart);
  const paid   = paymentLines.reduce((s, l) => s + l.amount, 0);
  const change = paid - total;

  const dateStr = new Date().toLocaleString("en-US", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div id="printable-receipt" style={{ ...base, display: "none", width: "100%" }}>

      {/* ── HEADER ── */}
      <div style={{ ...center, paddingBottom: "10px", borderBottom: "2px solid #000" }}>
        <div style={{ ...bold, fontSize: FONT_SHOP, letterSpacing: "2px", fontFamily: FONT }}>
          {shopName.toUpperCase()}
        </div>
        <div style={{ ...muted, marginTop: "3px" }}>{shopTagline}</div>
        <div style={{ ...muted }}>{shopAddress}</div>
        <div style={{ ...muted }}>{shopPhone}</div>
      </div>

      {/* ── META ── */}
      <div style={{ ...center, padding: "8px 0", borderBottom: "1px dashed #000" }}>
        <div style={{ ...muted }}>{dateStr}</div>
        <div style={{ ...bold }}>Receipt: {receiptNo}</div>
        {odooOrderId && <div style={{ ...muted }}>Order ID: #{odooOrderId}</div>}
        {customer    && <div style={{ ...muted }}>Customer: {customer.name}</div>}
      </div>

      {/* ── COLUMN HEADERS ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 32px 60px 64px",
        gap: "0 4px",
        padding: "5px 0",
        borderBottom: "1px solid #000",
        ...bold, ...muted,
      }}>
        <span>Item</span>
        <span style={{ textAlign: "center" }}>Qty</span>
        <span style={{ textAlign: "right" }}>Price</span>
        <span style={{ textAlign: "right" }}>Total</span>
      </div>

      {/* ── LINE ITEMS ── */}
      <div style={{ padding: "4px 0", borderBottom: "1px dashed #000" }}>
        {cart.map((item, idx) => {
          const lineTotal = calcLineTotal(item);
          return (
            <div key={idx} style={{ marginBottom: "3px" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 32px 60px 64px",
                gap: "0 4px",
                alignItems: "baseline",
              }}>
                <span style={{ ...bold }}>{item.name}</span>
                <span style={{ textAlign: "center" }}>{item.qty}</span>
                <span style={{ textAlign: "right" }}>${fmt(item.price)}</span>
                <span style={{ textAlign: "right", ...bold }}>${fmt(lineTotal)}</span>
              </div>
              {(item.discount ?? 0) > 0 && (
                <div style={{ ...row, ...muted, paddingLeft: "10px" }}>
                  <span>Discount {item.discount}%</span>
                  <span>-${fmt(item.price * item.qty * ((item.discount ?? 0) / 100))}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── SUBTOTALS ── */}
      <div style={{ padding: "6px 0" }}>
        <div style={{ ...row }}><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
        <div style={{ ...row }}><span>Tax (10%)</span><span>${fmt(tax)}</span></div>
      </div>

      {/* ── TOTAL ── */}
      <div style={{
        ...row, ...bold,
        fontSize:     FONT_TOTAL,
        borderTop:    "2px solid #000",
        borderBottom: "2px solid #000",
        padding:      "5px 0",
        margin:       "2px 0 6px",
      }}>
        <span>TOTAL</span>
        <span>${fmt(total)}</span>
      </div>

      {/* ── PAYMENTS ── */}
      <div style={{ padding: "2px 0 6px", borderBottom: "1px dashed #000" }}>
        {paymentLines.map((l, idx) => (
          <div key={idx} style={{ ...row }}>
            <span style={{ textTransform: "capitalize" }}>{l.method}</span>
            <span>${fmt(l.amount)}</span>
          </div>
        ))}
        {change > 0.005 && (
          <div style={{ ...row, ...bold }}>
            <span>Change</span>
            <span>${fmt(change)}</span>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ ...center, padding: "10px 0 4px" }}>
        <div style={{ ...bold, fontSize: "15px" }}>Thank you for your visit!</div>
        <div style={{ ...muted, marginTop: "3px" }}>Please keep this receipt for your records.</div>
        <div style={{ ...muted, marginTop: "6px", letterSpacing: "2px" }}>{receiptNo}</div>
      </div>

    </div>
  );
}

// ─── Print hook ────────────────────────────────────────────────────────────
export function usePrintReceipt() {
  const printReceipt = () => {
    const receipt = document.getElementById("printable-receipt");
    if (!receipt) return;

    // Reveal off-screen so the browser computes layout
    receipt.style.display    = "block";
    receipt.style.visibility = "visible";
    receipt.style.position   = "fixed";
    receipt.style.top        = "-9999px";
    receipt.style.left       = "0";
    receipt.style.width      = "280px";   // ~72 mm — safe inner width inside 4 mm margins

    try {
      // Clone the fully-laid-out HTML (all inline styles are already there)
      const html = receipt.outerHTML
        .replace(/display:\s*none[^;"']*/i, "display:block");

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
</style></head>
<body>${html}</body></html>`);
      doc.close();

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => iframe.remove(), 2000);
        }, 300);
      };
    } finally {
      receipt.style.display    = "";
      receipt.style.visibility = "";
      receipt.style.position   = "";
      receipt.style.top        = "";
      receipt.style.left       = "";
      receipt.style.width      = "";
    }
  };

  return { printReceipt };
}