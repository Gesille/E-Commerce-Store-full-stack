import { CartItem, Customer, PaymentLine } from "@/types/pos";
import "../app/(dashboard)/Printable.css";
import html2canvas from "html2canvas-pro";

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
    <div id="printable-receipt">

      {/* ═══ DARK HEADER ═══ */}
      <div className="pr-header">
        <div className="pr-large">{shopName}</div>
        {shopTagline && <div className="pr-small pr-mt1">{shopTagline}</div>}
        {shopAddress && <div className="pr-xs">{shopAddress}</div>}
        {shopPhone   && <div className="pr-xs">{shopPhone}</div>}
      </div>

      {/* ═══ BODY ═══ */}
      <div className="pr-body">

        {/* Order meta */}
        <div className="pr-small pr-mt1">
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

        <hr className="pr-solid pr-mt2" />

        {/* Column headers */}
        <div className="pr-col-header">
          <span className="pr-name">Item</span>
          <span className="pr-qty">Qty</span>
          <span className="pr-price">Price</span>
          <span className="pr-total">Total</span>
        </div>

        <hr className="pr-dash" />

        {/* Line items */}
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
                  <span className="pr-name">&nbsp;&nbsp;Discount {item.discount}%</span>
                  <span className="pr-total">
                    -${fmt(item.price * item.qty * ((item.discount ?? 0) / 100))}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        <hr className="pr-dash" />

        {/* Subtotals */}
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

        {/* Grand total */}
        <div className="pr-total-row pr-grand">
          <span>TOTAL</span>
          <span>${fmt(total)}</span>
        </div>

        <hr className="pr-dash pr-mt1" />

        {/* Payments */}
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

      </div>{/* end pr-body */}

      {/* ═══ LIGHT FOOTER ═══ */}
      <div className="pr-footer">
        <div className="pr-small pr-bold">Thank you for your visit!</div>
        <div className="pr-xs pr-muted pr-mt1">
          Please keep this receipt for your records.
        </div>
        <div className="pr-barcode pr-mt2">
          {"| ||| || | ||| | || ||| ||"}
        </div>
        <div className="pr-xs pr-muted">{receiptNo}</div>
      </div>

    </div>
  );
}




export function usePrintReceipt() {
  const printReceipt = () => {
    const receipt = document.getElementById("printable-receipt");

    if (!receipt) return;

    const printWindow = window.open(
      "",
      "_blank",
      "width=400,height=800"
    );

    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt</title>

          <style>

            * {
              box-sizing: border-box;
            }

            @page {
              size: 80mm auto;
              margin: 0;
            }

            html,
            body {
              width: 80mm;
              margin: 0;
              padding: 0;
              background: #fff;
              font-family: Arial, sans-serif;
              color: #000;
            }

            body {
              padding: 4mm;
            }

            #printable-receipt {
              width: 272px;
            }

            .pr-header {
              text-align: center;
              margin-bottom: 10px;
            }

            .pr-large {
              font-size: 22px;
              font-weight: 900;
              text-transform: uppercase;
            }

            .pr-small {
              font-size: 11px;
            }

            .pr-xs {
              font-size: 10px;
            }

            .pr-row,
            .pr-total-row,
            .pr-col-header {
              display: flex;
              width: 100%;
              justify-content: space-between;
              align-items: flex-start;
              gap: 4px;
            }

            .pr-name {
              width: 110px;
              word-break: break-word;
            }

            .pr-qty {
              width: 28px;
              text-align: center;
            }

            .pr-price {
              width: 55px;
              text-align: right;
            }

            .pr-total {
              width: 60px;
              text-align: right;
            }

            .pr-dash {
              border: none;
              border-top: 1px dashed #000;
              margin: 8px 0;
            }

            .pr-solid {
              border: none;
              border-top: 1px solid #000;
              margin: 8px 0;
            }

            .pr-double {
              border: none;
              border-top: 3px double #000;
              margin: 8px 0;
            }

            .pr-grand {
              font-size: 18px;
              font-weight: 900;
            }

            .pr-footer {
              text-align: center;
              margin-top: 16px;
            }

            .pr-barcode {
              font-family: monospace;
              letter-spacing: 2px;
              margin-top: 8px;
            }

          </style>
        </head>

        <body>
          ${receipt.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();

      printWindow.print();

      setTimeout(() => {
        printWindow.close();
      }, 500);
    }, 500);
  };

  return { printReceipt };
}