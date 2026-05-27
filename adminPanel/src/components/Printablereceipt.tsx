import { CartItem, Customer, PaymentLine } from "@/types/pos";

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

interface PrintableReceiptProps {
  cart: CartItem[];
  customer: Customer | null;
  paymentLines: PaymentLine[];
  odooOrderId?: number;
  receiptNo: string;
  onPrint?: () => void;
}

// ─── Shared style tokens ───────────────────────────────────────────────────
const FONT   = "'Courier New', Courier, monospace";
const WIDTH  = "302px";   // 80 mm @ 96 dpi
const COLOR_BG_HEADER  = "#1a1a1a";
const COLOR_BG_FOOTER  = "#f5f5f5";
const COLOR_BG_BODY    = "#ffffff";
const COLOR_TEXT        = "#111111";
const COLOR_MUTED       = "#666666";
const COLOR_BORDER      = "#cccccc";

const s = {
  // Root wrapper
  root: {
    fontFamily: FONT,
    width: WIDTH,
    margin: "0 auto",
    color: COLOR_TEXT,
    backgroundColor: COLOR_BG_BODY,
    fontSize: "12px",
    lineHeight: "1.5",
  } as React.CSSProperties,

  // Dark header block
  header: {
    backgroundColor: COLOR_BG_HEADER,
    color: "#ffffff",
    padding: "12px 14px 10px",
    textAlign: "center" as const,
  } as React.CSSProperties,

  headerLarge: {
    fontSize: "16px",
    fontWeight: "bold",
    letterSpacing: "1px",
    textTransform: "uppercase" as const,
  } as React.CSSProperties,

  headerSmall: {
    fontSize: "11px",
    marginTop: "4px",
  } as React.CSSProperties,

  headerXs: {
    fontSize: "10px",
    color: "#cccccc",
  } as React.CSSProperties,

  // Body
  body: {
    padding: "10px 14px",
    backgroundColor: COLOR_BG_BODY,
  } as React.CSSProperties,

  // Meta rows (Date / Receipt / Customer)
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    marginBottom: "2px",
  } as React.CSSProperties,

  muted: {
    color: COLOR_MUTED,
  } as React.CSSProperties,

  bold: {
    fontWeight: "bold",
  } as React.CSSProperties,

  // Column header bar
  colHeader: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "10px",
    fontWeight: "bold",
    textTransform: "uppercase" as const,
    color: COLOR_MUTED,
    marginTop: "6px",
    marginBottom: "2px",
  } as React.CSSProperties,

  // Line item row
  lineRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    marginBottom: "2px",
  } as React.CSSProperties,

  discountRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "10px",
    color: COLOR_MUTED,
    marginBottom: "2px",
  } as React.CSSProperties,

  // Column widths
  colName:  { flex: "1 1 auto",  textAlign: "left"  as const } as React.CSSProperties,
  colQty:   { width: "28px",     textAlign: "center" as const } as React.CSSProperties,
  colPrice: { width: "52px",     textAlign: "right"  as const } as React.CSSProperties,
  colTotal: { width: "52px",     textAlign: "right"  as const } as React.CSSProperties,

  // Totals rows
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    marginBottom: "2px",
  } as React.CSSProperties,

  grandRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    fontWeight: "bold",
    padding: "4px 0",
  } as React.CSSProperties,

  // Dividers
  hrSolid: {
    border: "none",
    borderTop: `1px solid ${COLOR_BORDER}`,
    margin: "6px 0",
  } as React.CSSProperties,

  hrDash: {
    border: "none",
    borderTop: `1px dashed ${COLOR_BORDER}`,
    margin: "6px 0",
  } as React.CSSProperties,

  hrDouble: {
    border: "none",
    borderTop: `3px double ${COLOR_BORDER}`,
    margin: "6px 0",
  } as React.CSSProperties,

  mt1: { marginTop: "4px"  } as React.CSSProperties,
  mt2: { marginTop: "8px"  } as React.CSSProperties,

  // Light footer
  footer: {
    backgroundColor: COLOR_BG_FOOTER,
    padding: "10px 14px",
    textAlign: "center" as const,
    borderTop: `1px solid ${COLOR_BORDER}`,
  } as React.CSSProperties,

  footerMain: {
    fontSize: "12px",
    fontWeight: "bold",
  } as React.CSSProperties,

  footerSub: {
    fontSize: "10px",
    color: COLOR_MUTED,
    marginTop: "4px",
  } as React.CSSProperties,

  footerReceipt: {
    fontSize: "10px",
    color: COLOR_MUTED,
    marginTop: "2px",
    letterSpacing: "1px",
  } as React.CSSProperties,
};

// ─── Component ─────────────────────────────────────────────────────────────
export function PrintableReceipt({
  cart,
  customer,
  paymentLines,
  odooOrderId,
  receiptNo,
}: PrintableReceiptProps) {
  const { subtotal, tax, total } = calcOrderTotals(cart);
  const paid   = paymentLines.reduce((sum, l) => sum + l.amount, 0);
  const change = paid - total;

  const dateStr = new Date().toLocaleString("en-US", {
    month:  "short",
    day:    "2-digit",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });

  const shopName    = "Chef's World";
  const shopTagline = "Restaurant, Bar & Kitchen Supplies";
  const shopAddress = "123 Culinary Ave, Foodie City, FL 12345";
  const shopPhone   = "(555) 123-4567";

  return (
    <div id="printable-receipt" style={{ ...s.root, display: "none" }}>

      {/* ═══ DARK HEADER ═══ */}
      <div style={s.header}>
        <div style={s.headerLarge}>{shopName}</div>
        {shopTagline && <div style={{ ...s.headerSmall, ...s.mt1 }}>{shopTagline}</div>}
        {shopAddress && <div style={s.headerXs}>{shopAddress}</div>}
        {shopPhone   && <div style={s.headerXs}>{shopPhone}</div>}
      </div>

      {/* ═══ BODY ═══ */}
      <div style={s.body}>

        {/* Order meta */}
        <div style={s.mt1}>
          <div style={s.metaRow}>
            <span style={s.muted}>Date:</span>
            <span>{dateStr}</span>
          </div>
          <div style={s.metaRow}>
            <span style={s.muted}>Receipt:</span>
            <span style={s.bold}>{receiptNo}</span>
          </div>
          {odooOrderId && (
            <div style={s.metaRow}>
              <span style={s.muted}>Order ID:</span>
              <span>#{odooOrderId}</span>
            </div>
          )}
          {customer && (
            <div style={s.metaRow}>
              <span style={s.muted}>Customer:</span>
              <span>{customer.name}</span>
            </div>
          )}
        </div>

        <hr style={{ ...s.hrSolid, ...s.mt2 }} />

        {/* Column headers */}
        <div style={s.colHeader}>
          <span style={s.colName}>Item</span>
          <span style={s.colQty}>Qty</span>
          <span style={s.colPrice}>Price</span>
          <span style={s.colTotal}>Total</span>
        </div>

        <hr style={s.hrDash} />

        {/* Line items */}
        {cart.map((item, idx) => {
          const lineTotal = calcLineTotal(item);
          return (
            <div key={idx}>
              <div style={s.lineRow}>
                <span style={{ ...s.colName, ...s.bold }}>{item.name}</span>
                <span style={s.colQty}>{item.qty}</span>
                <span style={s.colPrice}>${fmt(item.price)}</span>
                <span style={{ ...s.colTotal, ...s.bold }}>${fmt(lineTotal)}</span>
              </div>
              {(item.discount ?? 0) > 0 && (
                <div style={s.discountRow}>
                  <span style={s.colName}>&nbsp;&nbsp;Discount {item.discount}%</span>
                  <span style={s.colTotal}>
                    -${fmt(item.price * item.qty * ((item.discount ?? 0) / 100))}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        <hr style={s.hrDash} />

        {/* Subtotals */}
        <div>
          <div style={s.totalRow}>
            <span style={s.muted}>Subtotal</span>
            <span>${fmt(subtotal)}</span>
          </div>
          <div style={s.totalRow}>
            <span style={s.muted}>Tax (10%)</span>
            <span>${fmt(tax)}</span>
          </div>
        </div>

        <hr style={s.hrDouble} />

        {/* Grand total */}
        <div style={s.grandRow}>
          <span>TOTAL</span>
          <span>${fmt(total)}</span>
        </div>

        <hr style={{ ...s.hrDash, ...s.mt1 }} />

        {/* Payments */}
        <div style={s.mt1}>
          {paymentLines.map((l, idx) => (
            <div key={idx} style={s.totalRow}>
              <span style={{ ...s.muted, textTransform: "capitalize" }}>{l.method}</span>
              <span>${fmt(l.amount)}</span>
            </div>
          ))}
          {change > 0.005 && (
            <div style={{ ...s.totalRow, ...s.bold }}>
              <span>Change</span>
              <span>${fmt(change)}</span>
            </div>
          )}
        </div>

      </div>{/* end body */}

      {/* ═══ LIGHT FOOTER ═══ */}
      <div style={s.footer}>
        <div style={s.footerMain}>Thank you for your visit!</div>
        <div style={s.footerSub}>Please keep this receipt for your records.</div>
        <div style={s.footerReceipt}>{receiptNo}</div>
      </div>

    </div>
  );
}


// ─── usePrintReceipt hook (unchanged) ──────────────────────────────────────
import html2canvas from "html2canvas-pro";

export function usePrintReceipt() {
  const printReceipt = async () => {
    const receipt = document.getElementById("printable-receipt");
    if (!receipt) return;

    // 1. Temporarily reveal the receipt so html2canvas can read it
    receipt.style.display  = "block";
    receipt.style.visibility = "visible";
    receipt.style.position = "fixed";
    receipt.style.top      = "-9999px";
    receipt.style.left     = "0";
    receipt.style.width    = "302px";

    try {
      // 2. Capture at 3× for sharp print output
      const canvas = await html2canvas(receipt, {
        scale:       3,
        useCORS:     true,
        backgroundColor: "#ffffff",
        width:       302,
        windowWidth: 302,
        logging:     false,
      });

      const imgDataUrl = canvas.toDataURL("image/png");

      // 3. Build a minimal iframe that prints just the image
      document.getElementById("__print_frame__")?.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "__print_frame__";
      iframe.style.cssText = `
        position: fixed; top: 0; left: 0;
        width: 80mm; height: 1px;
        border: none; opacity: 0;
        pointer-events: none; z-index: -1;
      `;
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      doc.open();
      doc.write(`
        <!DOCTYPE html><html><head><meta charset="utf-8"/>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 80mm; background: #fff;
            -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          img { width: 80mm; display: block; }
        </style></head>
        <body><img src="${imgDataUrl}" /></body></html>
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
      // 4. Hide receipt again
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