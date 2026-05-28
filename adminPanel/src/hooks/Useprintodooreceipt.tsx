import { useState } from "react";

// Base URL of YOUR backend (not Odoo directly)
const API_BASE = process.env.NEXT_PUBLIC_SERVER_URL

export function usePrintOdooReceipt() {
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState<string | null>(null);

  const print = async (orderId: number) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch PDF blob from your backend
      const res = await fetch(`${API_BASE}/print/${orderId}`, {
        credentials: "include", // send auth cookie / token
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as any).message ?? `HTTP ${res.status}`);
      }

      const blob = await res.blob();               // application/pdf
      const url  = URL.createObjectURL(blob);

      // 2. Load PDF into a hidden iframe and trigger print
      const existing = document.getElementById("__odoo_receipt_frame__");
      existing?.remove();

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
          // Clean up after the dialog closes (~5s)
          setTimeout(() => {
            iframe.remove();
            URL.revokeObjectURL(url);
          }, 5000);
        }, 300);
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to print receipt";
      setError(msg);
      console.error("[usePrintOdooReceipt]", msg);
    } finally {
      setLoading(false);
    }
  };

  return { print, loading, error };
}