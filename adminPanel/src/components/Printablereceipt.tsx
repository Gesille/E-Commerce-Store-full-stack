import { CartItem, Customer, PaymentLine } from "@/types/pos";
import html2canvas from "html2canvas-pro";

// ─── Config ────────────────────────────────────────────────────────────────
const FONT       = "Georgia, 'Times New Roman', serif";
const FONT_SIZE  = "17px";
const FONT_SHOP  = "26px";
const FONT_TOTAL = "20px";
const RECEIPT_W  = 302;      // px — 80 mm at 96 dpi

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

// ─── Shared style atoms ────────────────────────────────────────────────────
const S = {
  base: {
    fontFamily: FONT,
    fontSize:   FONT_SIZE,
    color:      "#000000",
    background: "#ffffff",
    margin:     0,
    padding:    0,
    lineHeight: "1.6",
  } as React.CSSProperties,
  center:  { textAlign: "center"  } as React.CSSProperties,
  bold:    { fontWeight: "bold"   } as React.CSSProperties,
  small:   { fontSize: "13px"     } as React.CSSProperties,
  row:     { display: "flex", justifyContent: "space-between", alignItems: "baseline" } as React.CSSProperties,
  grid:    { display: "grid", gridTemplateColumns: "1fr 32px 60px 64px", gap: "0 4px", alignItems: "baseline" } as React.CSSProperties,
};

// ─── Component ─────────────────────────────────────────────────────────────
interface PrintableReceiptProps {
  cart:         CartItem[];
  customer:     Customer | null;
  paymentLines: PaymentLine[];
  odooOrderId?: number;
  receiptNo:    string;
}

export function PrintableReceipt({
  cart, customer, paymentLines, odooOrderId, receiptNo,
}: PrintableReceiptProps) {
  const { subtotal, tax, total } = calcOrderTotals(cart);
  const paid   = paymentLines.reduce((s, l) => s + l.amount, 0);
  const change = paid - total;

  const dateStr = new Date().toLocaleString("en-US", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    // Outer wrapper — hidden by default, shown during capture
    <div id="printable-receipt" style={{ display: "none" }}>
      {/* Inner receipt — this is what gets captured */}
      <div
        id="printable-receipt-inner"
        style={{
          ...S.base,
          width:      `${RECEIPT_W}px`,
          background: "#ffffff",
          boxSizing:  "border-box",
        }}
      >
        {/* ── HEADER ── */}
        <div style={{
          ...S.center,
          padding:      "14px 24px 10px",
          borderBottom: "2px solid #000000",
          background:   "#ffffff",
          boxSizing:    "border-box",
        }}>
          <div style={{ ...S.bold, fontFamily: FONT, fontSize: FONT_SHOP, letterSpacing: "2px", color: "#000000" }}>
            {shopName.toUpperCase()}
          </div>
          <div style={{ ...S.small, marginTop: "4px", color: "#000000" }}>{shopTagline}</div>
          <div style={{ ...S.small, color: "#000000" }}>{shopAddress}</div>
          <div style={{ ...S.small, color: "#000000" }}>{shopPhone}</div>
        </div>

        {/* ── META ── */}
        <div style={{ ...S.center, padding: "8px 24px", borderBottom: "1px dashed #000000", background: "#ffffff", boxSizing: "border-box" }}>
          <div style={{ ...S.small, color: "#000000" }}>{dateStr}</div>
          <div style={{ ...S.bold, color: "#000000" }}>Receipt: {receiptNo}</div>
          {odooOrderId && <div style={{ ...S.small, color: "#000000" }}>Order ID: #{odooOrderId}</div>}
          {customer    && <div style={{ ...S.small, color: "#000000" }}>Customer: {customer.name}</div>}
        </div>

        {/* ── COLUMN HEADERS ── */}
        <div style={{ ...S.grid, ...S.bold, ...S.small, padding: "5px 24px", borderBottom: "1px solid #000000", background: "#ffffff", boxSizing: "border-box" }}>
          <span style={{ color: "#000000" }}>Item</span>
          <span style={{ textAlign: "center", color: "#000000" }}>Qty</span>
          <span style={{ textAlign: "right",  color: "#000000" }}>Price</span>
          <span style={{ textAlign: "right",  color: "#000000" }}>Total</span>
        </div>

        {/* ── LINE ITEMS ── */}
        <div style={{ padding: "6px 24px", borderBottom: "1px dashed #000000", background: "#ffffff", boxSizing: "border-box" }}>
          {cart.map((item, idx) => {
            const lineTotal = calcLineTotal(item);
            return (
              <div key={idx} style={{ marginBottom: "4px" }}>
                <div style={{ ...S.grid }}>
                  <span style={{ ...S.bold, color: "#000000" }}>{item.name}</span>
                  <span style={{ textAlign: "center", color: "#000000" }}>{item.qty}</span>
                  <span style={{ textAlign: "right",  color: "#000000" }}>${fmt(item.price)}</span>
                  <span style={{ ...S.bold, textAlign: "right", color: "#000000" }}>${fmt(lineTotal)}</span>
                </div>
                {(item.discount ?? 0) > 0 && (
                  <div style={{ ...S.row, ...S.small, paddingLeft: "10px", color: "#555555" }}>
                    <span>Discount {item.discount}%</span>
                    <span>-${fmt(item.price * item.qty * ((item.discount ?? 0) / 100))}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── SUBTOTALS ── */}
        <div style={{ padding: "6px 24px", background: "#ffffff", boxSizing: "border-box" }}>
          <div style={{ ...S.row, color: "#000000" }}><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
          <div style={{ ...S.row, color: "#000000" }}><span>Tax (10%)</span><span>${fmt(tax)}</span></div>
        </div>

        {/* ── TOTAL ── */}
        <div style={{
          ...S.row, ...S.bold,
          fontSize:     FONT_TOTAL,
          borderTop:    "2px solid #000000",
          borderBottom: "2px solid #000000",
          padding:      "5px 24px",
          margin:       "2px 0 6px",
          color:        "#000000",
          background:   "#ffffff",
          boxSizing:    "border-box",
        }}>
          <span>TOTAL</span>
          <span>${fmt(total)}</span>
        </div>

        {/* ── PAYMENTS ── */}
        <div style={{ padding: "4px 24px 8px", borderBottom: "1px dashed #000000", background: "#ffffff", boxSizing: "border-box" }}>
          {paymentLines.map((l, idx) => (
            <div key={idx} style={{ ...S.row, color: "#000000" }}>
              <span style={{ textTransform: "capitalize" }}>{l.method}</span>
              <span>${fmt(l.amount)}</span>
            </div>
          ))}
          {change > 0.005 && (
            <div style={{ ...S.row, ...S.bold, color: "#000000" }}>
              <span>Change</span>
              <span>${fmt(change)}</span>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{ ...S.center, padding: "10px 24px 14px", background: "#ffffff", boxSizing: "border-box" }}>
          <div style={{ ...S.bold, fontSize: "15px", color: "#000000" }}>Thank you for your visit!</div>
          <div style={{ ...S.small, marginTop: "3px", color: "#000000" }}>Please keep this receipt for your records.</div>
          <div style={{ ...S.small, marginTop: "6px", letterSpacing: "2px", color: "#000000" }}>{receiptNo}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Print hook ────────────────────────────────────────────────────────────
export function usePrintReceipt() {
  const printReceipt = async () => {
    const wrapper = document.getElementById("printable-receipt");
    const inner   = document.getElementById("printable-receipt-inner");
    if (!wrapper || !inner) return;

    // Show wrapper so inner becomes part of the layout
    wrapper.style.cssText = `
      display: block !important;
      position: fixed !important;
      top: -9999px !important;
      left: 0 !important;
      width: 100vw !important;
      background: transparent !important;
      z-index: 9999 !important;
      padding: 0 !important;
      margin: 0 !important;
    `;

    // Inner sits at natural position inside wrapper — no left offset issues
    inner.style.cssText = `
      display: block !important;
      width: ${RECEIPT_W}px !important;
      background: #ffffff !important;
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 0 !important;
    `;

    // Wait for paint
    await new Promise(r => setTimeout(r, 300));

    try {
      // Capture the INNER element directly — not the wrapper
      const canvas = await html2canvas(inner, {
        scale:           3,
        useCORS:         true,
        backgroundColor: "#ffffff",
        logging:         false,
        removeContainer: false,
      });

      const imgDataUrl = canvas.toDataURL("image/png");

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
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 80mm; background: #fff; }
  img { width: 80mm; display: block; }
</style></head>
<body><img src="${imgDataUrl}" /></body></html>`);
      doc.close();

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => iframe.remove(), 2000);
        }, 300);
      };

    } finally {
      // Hide everything again
      wrapper.style.cssText = "display: none;";
      inner.style.cssText   = "";
    }
  };

  return { printReceipt };
}