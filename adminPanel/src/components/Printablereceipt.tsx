import { CartItem, Customer, PaymentLine } from "@/types/pos";
import html2canvas from "html2canvas-pro";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toFixed(2);
}

function calcLineTotal(item: CartItem) {
  return item.price * item.qty * (1 - (item.discount || 0) / 100);
}

function calcOrderTotals(cart: CartItem[]) {
  const subtotal = cart.reduce((acc, i) => acc + calcLineTotal(i), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

// ─── inline style objects ───────────────────────────────────────────────────

const S = {
  root: {
    display: "none",
    width: "302px",
    boxSizing: "border-box" as const,
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "12px",
    color: "#111",
    backgroundColor: "#fff",
    margin: 0,
    padding: 0,
  },
  header: {
    backgroundColor: "#111",
    color: "#fff",
    textAlign: "center" as const,
    padding: "10px 8px 12px",
    boxSizing: "border-box" as const,
    width: "100%",
  },
  headerTitle: {
    fontSize: "18px",
    fontWeight: "bold" as const,
    letterSpacing: "2px",
    textTransform: "uppercase" as const,
  },
  headerSub: {
    fontSize: "10px",
    marginTop: "3px",
    color: "#ccc",
  },
  headerXs: {
    fontSize: "9px",
    color: "#aaa",
    marginTop: "1px",
  },
  body: {
    padding: "8px 8px 0",
    boxSizing: "border-box" as const,
    width: "100%",
  },
  row: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "baseline" as const,
    fontSize: "11px",
    marginBottom: "1px",
  },
  muted: {
    color: "#666",
  },
  bold: {
    fontWeight: "bold" as const,
  },
  hr: {
    border: "none",
    borderTop: "1px solid #ccc",
    margin: "6px 0",
  },
  hrDash: {
    border: "none",
    borderTop: "1px dashed #bbb",
    margin: "4px 0",
  },
  hrDouble: {
    borderTop: "3px double #333",
    margin: "6px 0",
  },
  colHeader: {
    display: "flex" as const,
    fontSize: "10px",
    fontWeight: "bold" as const,
    color: "#555",
    textTransform: "uppercase" as const,
    marginBottom: "2px",
  },
  // column widths — must sum to 286px (302 - 8 - 8 padding)
  colName:  { flex: "1 1 auto", overflow: "hidden" as const, whiteSpace: "nowrap" as const },
  colQty:   { width: "24px", textAlign: "center" as const, flexShrink: 0 },
  colPrice: { width: "52px", textAlign: "right" as const, flexShrink: 0 },
  colTotal: { width: "52px", textAlign: "right" as const, flexShrink: 0 },
  grandRow: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    fontSize: "15px",
    fontWeight: "bold" as const,
    letterSpacing: "0.5px",
    marginBottom: "2px",
  },
  footer: {
    backgroundColor: "#f5f5f5",
    borderTop: "1px solid #ddd",
    textAlign: "center" as const,
    padding: "10px 8px 12px",
    boxSizing: "border-box" as const,
    width: "100%",
    marginTop: "8px",
  },
  barcode: {
    fontFamily: "monospace",
    fontSize: "14px",
    letterSpacing: "3px",
    marginTop: "8px",
    color: "#333",
  },
};

// ─── component ───────────────────────────────────────────────────────────────

interface PrintableReceiptProps {
  cart: CartItem[];
  customer: Customer | null;
  paymentLines: PaymentLine[];
  odooOrderId?: number;
  receiptNo: string;
  onPrint?: () => void;
}

export function PrintableReceipt({
  cart,
  customer,
  paymentLines,
  odooOrderId,
  receiptNo,
}: PrintableReceiptProps) {
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

  const shopName    = "Chef's World";
  const shopTagline = "Restaurant, Bar & Kitchen Supplies";
  const shopAddress = "123 Culinary Ave, Foodie City, FL 12345";
  const shopPhone   = "(555) 123-4567";

  return (
    <div id="printable-receipt" style={S.root}>

      {/* ── HEADER ── */}
      <div style={S.header}>
        <div style={S.headerTitle}>{shopName}</div>
        {shopTagline && <div style={S.headerSub}>{shopTagline}</div>}
        {shopAddress && <div style={S.headerXs}>{shopAddress}</div>}
        {shopPhone   && <div style={S.headerXs}>{shopPhone}</div>}
      </div>

      {/* ── BODY ── */}
      <div style={S.body}>

        {/* Order meta */}
        <div style={{ marginTop: "6px" }}>
          <div style={S.row}>
            <span style={S.muted}>Date:</span>
            <span>{dateStr}</span>
          </div>
          <div style={S.row}>
            <span style={S.muted}>Receipt:</span>
            <span style={S.bold}>{receiptNo}</span>
          </div>
          {odooOrderId && (
            <div style={S.row}>
              <span style={S.muted}>Order ID:</span>
              <span>#{odooOrderId}</span>
            </div>
          )}
          {customer && (
            <div style={S.row}>
              <span style={S.muted}>Customer:</span>
              <span>{customer.name}</span>
            </div>
          )}
        </div>

        <hr style={S.hr} />

        {/* Column headers */}
        <div style={S.colHeader}>
          <span style={S.colName}>Item</span>
          <span style={S.colQty}>Qty</span>
          <span style={S.colPrice}>Price</span>
          <span style={S.colTotal}>Total</span>
        </div>

        <hr style={S.hrDash} />

        {/* Line items */}
        {cart.map((item, idx) => {
          const lineTotal = calcLineTotal(item);
          return (
            <div key={idx} style={{ marginBottom: "3px" }}>
              <div style={{ display: "flex", alignItems: "baseline", fontSize: "11px" }}>
                <span style={{ ...S.colName, fontWeight: "bold" }}>{item.name}</span>
                <span style={S.colQty}>{item.qty}</span>
                <span style={S.colPrice}>${fmt(item.price)}</span>
                <span style={{ ...S.colTotal, fontWeight: "bold" }}>${fmt(lineTotal)}</span>
              </div>
              {(item.discount ?? 0) > 0 && (
                <div style={{ display: "flex", fontSize: "10px", color: "#666" }}>
                  <span style={{ ...S.colName, paddingLeft: "8px" }}>
                    Discount {item.discount}%
                  </span>
                  <span style={{ ...S.colTotal }}>
                    -${fmt(item.price * item.qty * ((item.discount ?? 0) / 100))}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        <hr style={S.hrDash} />

        {/* Subtotals */}
        <div style={{ fontSize: "11px" }}>
          <div style={S.row}>
            <span style={S.muted}>Subtotal</span>
            <span>${fmt(subtotal)}</span>
          </div>
          <div style={S.row}>
            <span style={S.muted}>Tax (10%)</span>
            <span>${fmt(tax)}</span>
          </div>
        </div>

        <hr style={S.hrDouble} />

        {/* Grand total */}
        <div style={S.grandRow}>
          <span>TOTAL</span>
          <span>${fmt(total)}</span>
        </div>

        <hr style={{ ...S.hrDash, marginTop: "4px" }} />

        {/* Payments */}
        <div style={{ fontSize: "11px", marginTop: "4px" }}>
          {paymentLines.map((l, idx) => (
            <div key={idx} style={S.row}>
              <span style={{ ...S.muted, textTransform: "capitalize" }}>{l.method}</span>
              <span>${fmt(l.amount)}</span>
            </div>
          ))}
          {change > 0.005 && (
            <div style={{ ...S.row, fontWeight: "bold" }}>
              <span>Change</span>
              <span>${fmt(change)}</span>
            </div>
          )}
        </div>

      </div>{/* end body */}

      {/* ── FOOTER ── */}
      <div style={S.footer}>
        <div style={{ fontSize: "11px", fontWeight: "bold" }}>Thank you for your visit!</div>
        <div style={{ fontSize: "9px", color: "#888", marginTop: "3px" }}>
          Please keep this receipt for your records.
        </div>
        <div style={S.barcode}>{"| ||| || | ||| | || ||| ||"}</div>
        <div style={{ fontSize: "9px", color: "#888", marginTop: "2px" }}>{receiptNo}</div>
      </div>

    </div>
  );
}

// ─── print hook ──────────────────────────────────────────────────────────────

export function usePrintReceipt() {
  const printReceipt = async () => {
    const receipt = document.getElementById("printable-receipt");
    if (!receipt) return;

    // 1. Reveal offscreen — exact 302px, no overflow
    receipt.style.display = "block";
    receipt.style.visibility = "visible";
    receipt.style.position = "fixed";
    receipt.style.top = "-9999px";
    receipt.style.left = "0";
    receipt.style.width = "302px";
    receipt.style.overflow = "visible";

    try {
      // 2. Capture at 3× — match windowWidth to element width exactly
      const canvas = await html2canvas(receipt, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: 302,
        windowWidth: 302,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        logging: false,
      });

      const imgDataUrl = canvas.toDataURL("image/png");

      // 3. Build print iframe
      const existing = document.getElementById("__print_frame__");
      if (existing) existing.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "__print_frame__";
      iframe.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 80mm;
        height: 1px;
        border: none;
        opacity: 0;
        pointer-events: none;
        z-index: -1;
      `;
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8"/>
            <style>
              @page {
                size: 80mm auto;
                margin: 0;
              }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body {
                width: 80mm;
                background: #fff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              img {
                width: 80mm;
                display: block;
              }
            </style>
          </head>
          <body>
            <img src="${imgDataUrl}" />
          </body>
        </html>
      `);
      doc.close();

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => iframe.remove(), 2000);
        }, 300);
      };
    } finally {
      // 4. Hide again
      receipt.style.display = "";
      receipt.style.visibility = "";
      receipt.style.position = "";
      receipt.style.top = "";
      receipt.style.left = "";
      receipt.style.width = "";
      receipt.style.overflow = "";
    }
  };

  return { printReceipt };
}