import { useLazyPrintReceiptQuery } from "@/redux/reciept/recieptApi";
import { useState } from "react";

export function usePrintOdooReceipt() {
  const [triggerPrint] = useLazyPrintReceiptQuery();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const print = async (orderId: number) => {
    setLoading(true);
    setError(null);

    try {
      // RTK Query handles auth cookies automatically via apiSlice baseQuery
      const result = await triggerPrint(orderId).unwrap();

      // result is already a Blob (responseHandler returned blob())
      const url = URL.createObjectURL(result);

      document.getElementById("__odoo_receipt_frame__")?.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "__odoo_receipt_frame__";
      iframe.style.cssText =
        "position:fixed;top:0;left:0;width:1px;height:1px;border:none;opacity:0;pointer-events:none;z-index:-1;";
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            iframe.remove();
            URL.revokeObjectURL(url);
          }, 5000);
        }, 300);
      };
    } catch (err: any) {
      const msg = err?.data?.message ?? err?.message ?? "Failed to print receipt";
      setError(msg);
      console.error("[usePrintOdooReceipt]", msg);
    } finally {
      setLoading(false);
    }
  };

  return { print, loading, error };
}