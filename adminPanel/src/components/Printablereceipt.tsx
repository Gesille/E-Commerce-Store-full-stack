import { CartItem, Customer, PaymentLine } from "@/types/pos";

interface UsePrintReceiptOptions {
  cart: CartItem[];
  customer: Customer | null;
  paymentLines: PaymentLine[];
  odooOrderId?: number;
  receiptNo: string;
}

function buildReceiptHTML() {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />

    <style>
      @page {
        size: 80mm auto;
        margin: 0;
      }

      html,
      body {
        width: 80mm;
        margin: 0;
        padding: 0;
        background: white;
        font-family: Arial, sans-serif;
      }

      .receipt {
        width: 80mm;
        padding-top: 20px;
        text-align: center;
      }

      .logo {
        width: 180px;
        max-width: 100%;
        display: block;
        margin: 0 auto;
      }
    </style>
  </head>

  <body>
    <div class="receipt">
      <img
        src="${window.location.origin}/chefworldlogo1.png"
        class="logo"
      />
    </div>
  </body>
  </html>
  `;
}

export function usePrintReceipt(options: UsePrintReceiptOptions) {
  const printReceipt = () => {
    const html = buildReceiptHTML();

    const iframe = document.createElement("iframe");

    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    const doc =
      iframe.contentWindow?.document ||
      iframe.contentDocument;

    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();

        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    };
  };

  return { printReceipt };
}