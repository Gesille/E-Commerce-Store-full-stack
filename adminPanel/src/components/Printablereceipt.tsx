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
    <div id="printable-receipt" className="hidden print:block">
      <div className="pr-header">
        <div className="pr-shop-name">{shopName}</div>
        <div className="pr-divider-thick" />
        {shopTagline && <div className="pr-tagline">{shopTagline}</div>}
        {shopAddress && <div className="pr-address">{shopAddress}</div>}
        {shopPhone   && <div className="pr-address">{shopPhone}</div>}
      </div>

      <div className="pr-body">
        <div className="pr-meta">
          <div className="pr-meta-row">
            <span>Date</span>
            <span>{dateStr}</span>
          </div>
          <div className="pr-meta-row">
            <span>Receipt</span>
            <span className="pr-bold">{receiptNo}</span>
          </div>
          {odooOrderId && (
            <div className="pr-meta-row">
              <span>Order ID</span>
              <span>#{odooOrderId}</span>
            </div>
          )}
          {customer && (
            <div className="pr-meta-row">
              <span>Customer</span>
              <span>{customer.name}</span>
            </div>
          )}
        </div>

        <div className="pr-divider-dash" />

        <div className="pr-col-header">
          <span className="pr-col-item">ITEM</span>
          <span className="pr-col-qty">QTY</span>
          <span className="pr-col-price">PRICE</span>
          <span className="pr-col-total">TOTAL</span>
        </div>

        <div className="pr-divider-solid" />

        {cart.map((item, idx) => {
          const lineTotal = calcLineTotal(item);
          return (
            <div key={idx} className="pr-line-item">
              <div className="pr-line-row">
                <span className="pr-col-item pr-bold">{item.name}</span>
                <span className="pr-col-qty">{item.qty}</span>
                <span className="pr-col-price">${fmt(item.price)}</span>
                <span className="pr-col-total pr-bold">${fmt(lineTotal)}</span>
              </div>
              {(item.discount ?? 0) > 0 && (
                <div className="pr-discount-row">
                  <span>Discount {item.discount}%</span>
                  <span>-${fmt(item.price * item.qty * ((item.discount ?? 0) / 100))}</span>
                </div>
              )}
            </div>
          );
        })}

        <div className="pr-divider-solid" />

        <div className="pr-subtotals">
          <div className="pr-subtotal-row">
            <span>Subtotal</span>
            <span>${fmt(subtotal)}</span>
          </div>
          <div className="pr-subtotal-row">
            <span>Tax (10%)</span>
            <span>${fmt(tax)}</span>
          </div>
        </div>

        <div className="pr-divider-thick" />

        <div className="pr-grand-total">
          <span>TOTAL</span>
          <span>${fmt(total)}</span>
        </div>

        <div className="pr-divider-dash" />

        <div className="pr-payments">
          {paymentLines.map((l, idx) => (
            <div key={idx} className="pr-subtotal-row">
              <span style={{ textTransform: "capitalize" }}>{l.method}</span>
              <span>${fmt(l.amount)}</span>
            </div>
          ))}
          {change > 0.005 && (
            <div className="pr-subtotal-row pr-bold">
              <span>Change</span>
              <span>${fmt(change)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="pr-footer">
        <div className="pr-divider-wave">~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~</div>
        <div className="pr-thank-you">Thank you for your visit!</div>
        <div className="pr-footer-note">Please keep this receipt for your records.</div>
        <div className="pr-barcode">| ||| || | ||| | || ||| ||</div>
        <div className="pr-receipt-no">{receiptNo}</div>
      </div>
    </div>
  );
}

export function usePrintReceipt() {
  const printReceipt = () => {
    const receipt = document.getElementById("printable-receipt");
    if (!receipt) return;

    const receiptHTML = receipt.innerHTML;
    const existing = document.getElementById("__print_frame__");
    if (existing) existing.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "__print_frame__";
    iframe.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 80mm;
      height: 100%;
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

            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }

            html, body {
              width: 80mm;
              background: #fff;
              color: #000;
              font-family: 'Courier New', Courier, monospace;
              font-size: 10.5pt;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            /* ── WRAPPER: full-width, symmetric padding so nothing clips ── */
            .receipt-wrapper {
              width: 80mm;
              padding: 0 5mm;   /* equal left & right so content is centered */
            }

            /* ══ HEADER ══ */
            .pr-header {
              text-align: center;
              padding: 5mm 0 3mm;
            }
            .pr-shop-name {
              font-size: 20pt;
              font-weight: 900;
              letter-spacing: 3px;
              text-transform: uppercase;
            }
            .pr-tagline {
              font-size: 9pt;
              margin-top: 1.5mm;
              letter-spacing: 0.5px;
            }
            .pr-address {
              font-size: 8.5pt;
              margin-top: 0.8mm;
            }

            /* ══ BODY ══ */
            .pr-body {
              padding: 2mm 0;
            }

            /* Meta rows (Date, Receipt, etc.) */
            .pr-meta {
              margin: 2mm 0;
            }
            .pr-meta-row {
              display: flex;
              justify-content: space-between;
              font-size: 9.5pt;
              line-height: 1.7;
            }

            /* Column header */
            .pr-col-header {
              display: flex;
              font-size: 9pt;
              font-weight: 900;
              letter-spacing: 0.8px;
              text-transform: uppercase;
              margin: 1.5mm 0;
            }

            /* Line items */
            .pr-line-item { margin-bottom: 1mm; }
            .pr-line-row {
              display: flex;
              align-items: baseline;
              font-size: 10pt;
              line-height: 1.6;
            }
            .pr-discount-row {
              display: flex;
              justify-content: space-between;
              font-size: 8.5pt;
              padding-left: 3mm;
            }

            /* Shared column widths */
            .pr-col-item  { flex: 1 1 auto; word-break: break-word; min-width: 0; padding-right: 2mm; }
            .pr-col-qty   { flex: 0 0 8mm;  text-align: center; }
            .pr-col-price { flex: 0 0 16mm; text-align: right; }
            .pr-col-total { flex: 0 0 16mm; text-align: right; }

            /* Subtotals */
            .pr-subtotals { margin: 1mm 0; }
            .pr-subtotal-row {
              display: flex;
              justify-content: space-between;
              font-size: 9.5pt;
              line-height: 1.7;
            }

            /* Grand total */
            .pr-grand-total {
              display: flex;
              justify-content: space-between;
              font-size: 16pt;
              font-weight: 900;
              letter-spacing: 1px;
              margin: 1.5mm 0;
            }

            /* Payments */
            .pr-payments { margin: 1mm 0; }

            /* ══ FOOTER ══ */
            .pr-footer {
              text-align: center;
              padding: 2mm 0 5mm;
            }
            .pr-divider-wave {
              font-size: 9pt;
              letter-spacing: 1px;
              margin: 2mm 0;
            }
            .pr-thank-you {
              font-size: 11pt;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin-bottom: 1mm;
            }
            .pr-footer-note {
              font-size: 8.5pt;
              margin-bottom: 3mm;
            }
            .pr-barcode {
              font-size: 10pt;
              letter-spacing: 5px;
              margin-bottom: 1mm;
            }
            .pr-receipt-no {
              font-size: 8pt;
            }

            /* ══ DIVIDERS ══ */
            .pr-divider-thick {
              border-top: 2.5px solid #000;
              margin: 2mm 0;
            }
            .pr-divider-solid {
              border-top: 1px solid #000;
              margin: 2mm 0;
            }
            .pr-divider-dash {
              border-top: 1px dashed #000;
              margin: 2mm 0;
            }

            /* ══ UTILS ══ */
            .pr-bold { font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="receipt-wrapper">
            ${receiptHTML}
          </div>
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
  };

  return { printReceipt };
}