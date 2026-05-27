import { CartItem, Customer, PaymentLine } from "@/types/pos";
import "../app/(dashboard)/Printable.css";

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

  const shopName = "Chef's World";
  const shopTagline = "Restaurant, Bar & Kitchen Supplies";
  const shopAddress = "123 Culinary Ave, Foodie City, FL 12345";
  const shopPhone = "(555) 123-4567";

  return (
    <div id="printable-receipt">

      {/* HEADER */}
      <div className="pr-header">
        <div className="pr-title">{shopName}</div>

        <div className="pr-subtitle">{shopTagline}</div>

        <div className="pr-meta-center">{shopAddress}</div>

        <div className="pr-meta-center">{shopPhone}</div>
      </div>

      {/* ORDER INFO */}
      <div className="pr-section">

        <div className="pr-row">
          <span>Date:</span>
          <span>{dateStr}</span>
        </div>

        <div className="pr-row">
          <span>Receipt:</span>
          <span>{receiptNo}</span>
        </div>

        {odooOrderId && (
          <div className="pr-row">
            <span>Order ID:</span>
            <span>#{odooOrderId}</span>
          </div>
        )}

        {customer && (
          <div className="pr-row">
            <span>Customer:</span>
            <span>{customer.name}</span>
          </div>
        )}
      </div>

      <div className="pr-divider" />

      {/* TABLE HEADER */}
      <div className="pr-table-header">
        <span className="pr-col-name">Item</span>
        <span className="pr-col-qty">Qty</span>
        <span className="pr-col-price">Price</span>
        <span className="pr-col-total">Total</span>
      </div>

      <div className="pr-divider-dashed" />

      {/* ITEMS */}
      {cart.map((item, idx) => {
        const lineTotal = calcLineTotal(item);

        return (
          <div key={idx} className="pr-item">

            <div className="pr-table-row">
              <span className="pr-col-name pr-bold">
                {item.name}
              </span>

              <span className="pr-col-qty">
                {item.qty}
              </span>

              <span className="pr-col-price">
                ${fmt(item.price)}
              </span>

              <span className="pr-col-total pr-bold">
                ${fmt(lineTotal)}
              </span>
            </div>

            {(item.discount ?? 0) > 0 && (
              <div className="pr-discount">
                Discount {item.discount}%:
                -$
                {fmt(
                  item.price *
                    item.qty *
                    ((item.discount ?? 0) / 100)
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="pr-divider-dashed" />

      {/* TOTALS */}
      <div className="pr-row">
        <span>Subtotal</span>
        <span>${fmt(subtotal)}</span>
      </div>

      <div className="pr-row">
        <span>Tax (10%)</span>
        <span>${fmt(tax)}</span>
      </div>

      <div className="pr-divider-double" />

      <div className="pr-grand-total">
        <span>TOTAL</span>
        <span>${fmt(total)}</span>
      </div>

      <div className="pr-divider-dashed" />

      {/* PAYMENTS */}
      {paymentLines.map((l, idx) => (
        <div key={idx} className="pr-row">
          <span style={{ textTransform: "capitalize" }}>
            {l.method}
          </span>

          <span>${fmt(l.amount)}</span>
        </div>
      ))}

      {change > 0.005 && (
        <div className="pr-row pr-bold">
          <span>Change</span>
          <span>${fmt(change)}</span>
        </div>
      )}

      {/* FOOTER */}
      <div className="pr-footer">

        <div className="pr-thanks">
          Thank you for your visit!
        </div>

        <div className="pr-footer-text">
          Please keep this receipt for your records.
        </div>

       

        <div className="pr-footer-id">
          {receiptNo}
        </div>

      </div>

    </div>
  );
}

/* =========================================================
   PRINT HOOK
========================================================= */

export function usePrintReceipt() {

  const printReceipt = async () => {

    const receipt =
      document.getElementById("printable-receipt");

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
              margin: 0;
              padding: 0;
            }

            @page {
              size: 80mm auto;
              margin: 0;
            }

            html,
            body {
              width: 80mm;
              background: white;
              font-family: Arial, Helvetica, sans-serif;
              color: black;
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

            .pr-title {
              font-size: 22px;
              font-weight: 900;
              letter-spacing: 1px;
              text-transform: uppercase;
            }

            .pr-subtitle {
              font-size: 11px;
              margin-top: 4px;
            }

            .pr-meta-center {
              font-size: 10px;
              margin-top: 2px;
            }

            .pr-section {
              margin-top: 10px;
            }

            .pr-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 8px;
              margin-bottom: 4px;
              font-size: 11px;
              line-height: 1.4;
            }

            .pr-table-header {
              display: flex;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              margin-bottom: 4px;
            }

            .pr-table-row {
              display: flex;
              font-size: 11px;
              margin-bottom: 3px;
              align-items: flex-start;
            }

            .pr-col-name {
              width: 110px;
              word-break: break-word;
            }

            .pr-col-qty {
              width: 30px;
              text-align: center;
            }

            .pr-col-price {
              width: 55px;
              text-align: right;
            }

            .pr-col-total {
              width: 60px;
              text-align: right;
            }

            .pr-divider {
              border-top: 1px solid black;
              margin: 8px 0;
            }

            .pr-divider-dashed {
              border-top: 1px dashed black;
              margin: 8px 0;
            }

            .pr-divider-double {
              border-top: 3px double black;
              margin: 8px 0;
            }

            .pr-grand-total {
              display: flex;
              justify-content: space-between;
              font-size: 18px;
              font-weight: 900;
              margin: 8px 0;
            }

            .pr-bold {
              font-weight: 700;
            }

            .pr-discount {
              font-size: 10px;
              margin-left: 6px;
              margin-bottom: 6px;
            }

            .pr-footer {
              margin-top: 14px;
              text-align: center;
            }

            .pr-thanks {
              font-size: 13px;
              font-weight: 700;
            }

            .pr-footer-text {
              font-size: 10px;
              margin-top: 4px;
            }

            .pr-barcode {
              margin-top: 10px;
              font-family: monospace;
              letter-spacing: 2px;
              font-size: 12px;
            }

            .pr-footer-id {
              font-size: 10px;
              margin-top: 6px;
            }

          </style>
        </head>

        <body>
          ${receipt.innerHTML}
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