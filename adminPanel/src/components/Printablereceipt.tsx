import { CartItem, Customer, PaymentLine } from "@/types/pos";
import "../app/(dashboard)/Printable.css";

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

  const shopName ="Chef's World";
  const shopTagline =
  "Restaurant, Bar & Kitchen Supplies";
    const shopAddress = "123 Culinary Ave, Foodie City, FL 12345";
    const shopPhone = "(555) 123-4567";

  return (
    /*
     * This div is ONLY visible during printing.
     * On screen it stays hidden so it doesn't break the modal layout.
     */
    <div id="printable-receipt" className="hidden print:block">
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