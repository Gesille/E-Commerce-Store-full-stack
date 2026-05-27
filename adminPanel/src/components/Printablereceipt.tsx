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
    <div id="printable-receipt" className="hidden print:block">

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
  const printReceipt = async () => {
    const receipt = document.getElementById("printable-receipt");
    if (!receipt) return;

    // 1. Temporarily reveal the receipt so html2canvas can read it
    receipt.style.display = "block";
    receipt.style.visibility = "visible";
    receipt.style.position = "fixed";
    receipt.style.top = "-9999px";
    receipt.style.left = "0";
    receipt.style.width = "302px"; // 80mm at 96dpi

    try {
      // 2. Capture to canvas at 3× scale for sharp print output
     const canvas = await html2canvas(receipt, {
  scale: 3,
  useCORS: true,
  backgroundColor: "#ffffff",
  width: 302,
  windowWidth: 302,
  logging: false,
  onclone: (clonedDoc) => {
    // Inject the same styles the iframe uses when printing
    const style = clonedDoc.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11pt;
        color: #000;
        width: 302px;
        background: #fff;
      }
      #printable-receipt {
        display: block !important;
        width: 302px;
        padding: 3mm 4mm;
      }
      .pr-header {
        text-align: center;
        padding: 4mm 2mm 3mm;
        border-bottom: 2px solid #000;
        margin-bottom: 2mm;
      }
      .pr-header .pr-large {
        font-size: 18pt;
        font-weight: 900;
        letter-spacing: 2px;
        text-transform: uppercase;
        display: block;
        color: #000;
      }
      .pr-header .pr-small {
        font-size: 10pt;
        font-weight: 500;
        margin-top: 1mm;
        display: block;
        color: #000;
      }
      .pr-header .pr-xs {
        font-size: 9.5pt;
        font-weight: 400;
        margin-top: 0.5mm;
        display: block;
        color: #000;
      }
      .pr-body { padding: 2mm 0; }
      .pr-footer {
        border-top: 2px solid #000;
        text-align: center;
        padding: 3mm 0 4mm;
        margin-top: 2mm;
      }
      .pr-bold   { font-weight: 700; }
      .pr-large  { font-size: 13pt; font-weight: 700; }
      .pr-small  { font-size: 10pt; }
      .pr-xs     { font-size: 9.5pt; }
      .pr-muted  { color: #555; }
      .pr-mt1 { margin-top: 2mm; }
      .pr-mt2 { margin-top: 4mm; }
      .pr-dash   { border: none; border-top: 1px dashed #000; margin: 2.5mm 0; }
      .pr-solid  { border: none; border-top: 1.5px solid #000; margin: 2.5mm 0; }
      .pr-double { border: none; border-top: 3px double #000; margin: 2.5mm 0; }
      .pr-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        width: 100%;
        line-height: 1.6;
      }
      .pr-row .pr-name  { flex: 1 1 auto; padding-right: 2mm; word-break: break-word; min-width: 0; }
      .pr-row .pr-qty   { flex: 0 0 9mm; text-align: center; }
      .pr-row .pr-price { flex: 0 0 17mm; text-align: right; }
      .pr-row .pr-total { flex: 0 0 17mm; text-align: right; }
      .pr-total-row {
        display: flex;
        justify-content: space-between;
        width: 100%;
        line-height: 1.7;
      }
      .pr-grand { font-size: 15pt; font-weight: 900; }
      .pr-col-header {
        display: flex;
        justify-content: space-between;
        width: 100%;
        font-size: 9.5pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .pr-col-header .pr-name  { flex: 1 1 auto; }
      .pr-col-header .pr-qty   { flex: 0 0 9mm; text-align: center; }
      .pr-col-header .pr-price { flex: 0 0 17mm; text-align: right; }
      .pr-col-header .pr-total { flex: 0 0 17mm; text-align: right; }
      .pr-barcode {
        font-family: 'Courier New', monospace;
        font-size: 10pt;
        letter-spacing: 4px;
        text-align: center;
        margin-top: 2mm;
      }
    `;
    clonedDoc.head.appendChild(style);
  },
});

      const imgDataUrl = canvas.toDataURL("image/png");

      // 3. Build a minimal iframe that prints just the image
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
      // 4. Hide receipt again
      receipt.style.display = "";
      receipt.style.visibility = "";
      receipt.style.position = "";
      receipt.style.top = "";
      receipt.style.left = "";
      receipt.style.width = "";
    }
  };

  return { printReceipt };
}