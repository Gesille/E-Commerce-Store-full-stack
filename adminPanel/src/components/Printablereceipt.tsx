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
       
        <div className="pr-xs pr-muted">{receiptNo}</div>
      </div>

    </div>
  );
}




export function usePrintReceipt() {
  const printReceipt = async () => {
    const receipt = document.getElementById("printable-receipt");
    if (!receipt) return;

    // Build a self-contained clone with all styles inlined
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      position: fixed;
      top: -9999px;
      left: 0;
      width: 302px;
      background: #fff;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: #000;
      padding: 8px 10px;
      box-sizing: border-box;
    `;

    wrapper.innerHTML = receipt.innerHTML;

    // Apply inline styles to all cloned elements
    const applyStyles = (el: HTMLElement) => {
      const cls = el.className || "";

      // Reset
      el.style.margin = "0";
      el.style.padding = "0";
      el.style.boxSizing = "border-box";

      if (cls.includes("pr-header")) {
        el.style.cssText = `
          text-align: center;
          padding: 8px 4px 6px;
          border-bottom: 2px solid #000;
          margin-bottom: 4px;
          box-sizing: border-box;
        `;
      }
      if (cls.includes("pr-large") && el.closest?.(".pr-header")) {
        el.style.cssText = `
          font-size: 20pt;
          font-weight: 900;
          letter-spacing: 2px;
          text-transform: uppercase;
          display: block;
          color: #000;
        `;
      }
      if (cls.includes("pr-body")) {
        el.style.cssText = `padding: 4px 0; box-sizing: border-box;`;
      }
      if (cls.includes("pr-footer")) {
        el.style.cssText = `
          border-top: 2px solid #000;
          text-align: center;
          padding: 6px 0 8px;
          margin-top: 4px;
          box-sizing: border-box;
        `;
      }
      if (cls.includes("pr-row")) {
        el.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          width: 100%;
          line-height: 1.6;
          box-sizing: border-box;
        `;
      }
      if (cls.includes("pr-total-row")) {
        el.style.cssText = `
          display: flex;
          justify-content: space-between;
          width: 100%;
          line-height: 1.7;
          box-sizing: border-box;
        `;
      }
      if (cls.includes("pr-col-header")) {
        el.style.cssText = `
          display: flex;
          justify-content: space-between;
          width: 100%;
          font-size: 9pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-sizing: border-box;
        `;
      }
      if (cls.includes("pr-grand")) {
        el.style.fontSize = "15pt";
        el.style.fontWeight = "900";
      }
      if (cls.includes("pr-bold")) el.style.fontWeight = "700";
      if (cls.includes("pr-small")) el.style.fontSize = "10pt";
      if (cls.includes("pr-xs"))    el.style.fontSize  = "9pt";
      if (cls.includes("pr-muted")) el.style.color     = "#555";
      if (cls.includes("pr-mt1"))   el.style.marginTop = "4px";
      if (cls.includes("pr-mt2"))   el.style.marginTop = "8px";

      // Column widths
      if (cls.includes("pr-name"))  { el.style.flex = "1 1 auto"; el.style.paddingRight = "4px"; el.style.wordBreak = "break-word"; el.style.minWidth = "0"; }
      if (cls.includes("pr-qty"))   { el.style.flex = "0 0 28px"; el.style.textAlign = "center"; }
      if (cls.includes("pr-price")) { el.style.flex = "0 0 54px"; el.style.textAlign = "right"; }
      if (cls.includes("pr-total")) { el.style.flex = "0 0 54px"; el.style.textAlign = "right"; }

      // Dividers
      const tag = el.tagName?.toLowerCase();
      if (tag === "hr") {
        el.style.border = "none";
        el.style.margin = "5px 0";
        if (cls.includes("pr-dash"))   el.style.borderTop = "1px dashed #000";
        if (cls.includes("pr-solid"))  el.style.borderTop = "1.5px solid #000";
        if (cls.includes("pr-double")) el.style.borderTop = "3px double #000";
      }

      if (cls.includes("pr-barcode")) {
        el.style.fontFamily = "Courier New, monospace";
        el.style.fontSize   = "10pt";
        el.style.letterSpacing = "4px";
        el.style.textAlign  = "center";
        el.style.marginTop  = "4px";
      }

      // Recurse
      Array.from(el.children).forEach(child => applyStyles(child as HTMLElement));
    };

    Array.from(wrapper.children).forEach(child => applyStyles(child as HTMLElement));
    document.body.appendChild(wrapper);

    try {
      const canvas = await html2canvas(wrapper, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: 302,
        height: wrapper.scrollHeight,
        windowWidth: 302,
        logging: false,
      });

      const imgDataUrl = canvas.toDataURL("image/png");

      const existing = document.getElementById("__print_frame__");
      if (existing) existing.remove();

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
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 80mm; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          img { width: 80mm; display: block; }
        </style>
      </head><body><img src="${imgDataUrl}"/></body></html>`);
      doc.close();

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => iframe.remove(), 2000);
        }, 300);
      };
    } finally {
      document.body.removeChild(wrapper);
    }
  };

  return { printReceipt };
}