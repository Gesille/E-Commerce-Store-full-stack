import { CartItem, Customer, PaymentLine } from "@/types/pos";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrintableReceiptProps {
  cart: CartItem[];
  customer: Customer | null;
  paymentLines: PaymentLine[];
  odooOrderId?: number;
  receiptNo: string;
  /** Call this to open the browser print dialog */
  onPrint?: () => void;
}

// ─── The hidden receipt that gets printed ─────────────────────────────────────

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

  const shopName = "Chef's World";
  const shopTagline =
  "Restaurant, Bar & Kitchen Supplies";
    const shopAddress = "123 Main St, Anytown, USA";
    const shopPhone = "(555) 123-4567";

  return (
    /*
     * This div is ONLY visible during printing.
     * On screen it stays hidden so it doesn't break the modal layout.
     */
    <div id="printable-receipt" className="hidden print:block">
      <style>{`
        /* ── injected print styles ── */
        @media print {
          /* hide everything on the page */
          body * { visibility: hidden !important; }

          /* then show only the receipt and its children */
          #printable-receipt,
          #printable-receipt * { visibility: visible !important; }

          /* position it at the top-left so nothing is cut off */
          #printable-receipt {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
          }

          @page {
            size: 80mm auto;   /* thermal paper width */
            margin: 0;
          }

          body {
            margin: 0;
            background: #fff;
          }

          #printable-receipt {
            display: block !important;
            visibility: visible !important;
            width: 80mm;
            max-width: 80mm;
            margin: 0 auto;
            padding: 6mm 5mm 10mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 11pt;
            color: #000;
            background: #fff;
          }

          .pr-center   { text-align: center; }
          .pr-right    { text-align: right; }
          .pr-bold     { font-weight: 700; }
          .pr-large    { font-size: 14pt; font-weight: 700; }
          .pr-small    { font-size: 9pt; }
          .pr-xs       { font-size: 8pt; }
          .pr-muted    { color: #555; }
          .pr-mt1      { margin-top: 3mm; }
          .pr-mt2      { margin-top: 5mm; }
          .pr-mt3      { margin-top: 8mm; }
          .pr-mb1      { margin-bottom: 3mm; }

          .pr-dash {
            border: none;
            border-top: 1px dashed #000;
            margin: 3mm 0;
          }

          .pr-solid {
            border: none;
            border-top: 1.5px solid #000;
            margin: 3mm 0;
          }

          .pr-double {
            border: none;
            border-top: 3px double #000;
            margin: 3mm 0;
          }

          /* row: two cells left + right */
          .pr-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            line-height: 1.6;
          }

          .pr-row .pr-name {
            flex: 1;
            padding-right: 4mm;
            word-break: break-word;
          }

          .pr-row .pr-qty {
            width: 10mm;
            text-align: center;
            flex-shrink: 0;
          }

          .pr-row .pr-price {
            width: 16mm;
            text-align: right;
            flex-shrink: 0;
          }

          .pr-row .pr-total {
            width: 18mm;
            text-align: right;
            flex-shrink: 0;
          }

          .pr-total-row {
            display: flex;
            justify-content: space-between;
            line-height: 1.7;
          }

          .pr-grand {
            font-size: 13pt;
            font-weight: 700;
          }

          .pr-barcode {
            font-family: 'Courier New', monospace;
            font-size: 8pt;
            letter-spacing: 0.1em;
            text-align: center;
            margin-top: 2mm;
          }

          /* suppress everything else */
          .pr-screen-only { display: none !important; }
        }
      `}</style>

      {/* ═══ SHOP HEADER ═══ */}
      <div className="pr-center pr-bold pr-large">{shopName}</div>
      {shopTagline && (
        <div className="pr-center pr-small pr-muted pr-mt1">{shopTagline}</div>
      )}
      {shopAddress && (
        <div className="pr-center pr-xs pr-muted">{shopAddress}</div>
      )}
      {shopPhone && (
        <div className="pr-center pr-xs pr-muted">{shopPhone}</div>
      )}

      <hr className="pr-solid pr-mt2" />

      {/* ═══ ORDER INFO ═══ */}
      <div className="pr-small">
        <div className="pr-row">
          <span className="pr-muted">Date:</span>
          <span>{dateStr}</span>
        </div>
        <div className="pr-row">
          <span className="pr-muted">Receipt:</span>
          <span className="pr-bold">{receiptNo}</span>
        </div>
        {odooOrderId && (
          <div className="pr-row">
            <span className="pr-muted">Order ID:</span>
            <span>#{odooOrderId}</span>
          </div>
        )}
        {customer && (
          <div className="pr-row">
            <span className="pr-muted">Customer:</span>
            <span>{customer.name}</span>
          </div>
        )}
      </div>

      <hr className="pr-dash" />

      {/* ═══ COLUMN HEADERS ═══ */}
      <div className="pr-row pr-xs pr-muted pr-bold">
        <span className="pr-name">ITEM</span>
        <span className="pr-qty">QTY</span>
        <span className="pr-price">PRICE</span>
        <span className="pr-total">TOTAL</span>
      </div>

      <hr className="pr-dash" />

      {/* ═══ LINE ITEMS ═══ */}
      {cart.map((item, idx) => {
        const lineTotal = calcLineTotal(item);
        return (
          <div key={idx} className="pr-small">
            <div className="pr-row">
              <span className="pr-name pr-bold">{item.name}</span>
              <span className="pr-qty">{item.qty}</span>
              <span className="pr-price">${fmt(item.price)}</span>
              <span className="pr-total pr-bold">${fmt(lineTotal)}</span>
            </div>
            {(item.discount ?? 0) > 0 && (
              <div className="pr-row pr-xs pr-muted">
                <span className="pr-name">  Discount {item.discount}%</span>
                <span className="pr-total">
                  -${fmt(item.price * item.qty * ((item.discount ?? 0) / 100))}
                </span>
              </div>
            )}
          </div>
        );
      })}

      <hr className="pr-dash" />

      {/* ═══ TOTALS ═══ */}
      <div className="pr-small">
        <div className="pr-total-row">
          <span className="pr-muted">Subtotal</span>
          <span>${fmt(subtotal)}</span>
        </div>
        <div className="pr-total-row">
          <span className="pr-muted">Tax (10%)</span>
          <span>${fmt(tax)}</span>
        </div>
      </div>

      <hr className="pr-double" />

      <div className="pr-total-row pr-grand">
        <span>TOTAL</span>
        <span>${fmt(total)}</span>
      </div>

      <hr className="pr-dash pr-mt1" />

      {/* ═══ PAYMENTS ═══ */}
      <div className="pr-small pr-mt1">
        {paymentLines.map((l, idx) => (
          <div key={idx} className="pr-total-row">
            <span className="pr-muted" style={{ textTransform: "capitalize" }}>
              {l.method}
            </span>
            <span>${fmt(l.amount)}</span>
          </div>
        ))}
        {change > 0.005 && (
          <div className="pr-total-row pr-bold">
            <span>Change</span>
            <span>${fmt(change)}</span>
          </div>
        )}
      </div>

      <hr className="pr-solid pr-mt2" />

      {/* ═══ FOOTER ═══ */}
      <div className="pr-center pr-small pr-mt2">
        Thank you for your visit!
      </div>
      <div className="pr-center pr-xs pr-muted pr-mt1">
        Please keep this receipt for your records.
      </div>

      {/* Barcode-style receipt number */}
      <div className="pr-barcode pr-mt2">
        {"| ||| || | ||| | || ||| ||".split("").join("")}
        <br />
        {receiptNo}
      </div>
    </div>
  );
}

// ─── Hook: trigger print ──────────────────────────────────────────────────────

export function usePrintReceipt() {
  const printReceipt = () => {
    window.print();
  };
  return { printReceipt };
}