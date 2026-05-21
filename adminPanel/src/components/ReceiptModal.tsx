import { useLazyGetOrderReceiptPdfQuery, useCreateOdooInvoiceMutation } from "@/redux/pos/Posapi";
import { CartItem, Customer, fmt, Order, PaymentLine } from "@/types/pos";
import { useState } from "react";

function calcLineTotal(item: CartItem) {
  return item.price * item.qty * (1 - (item.discount || 0) / 100);
}

function calcOrderTotals(cart: CartItem[]) {
  const subtotal = cart.reduce((acc, i) => acc + calcLineTotal(i), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

const pill = (bg: string, color: string): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  height: 44,
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  border: "none",
  background: bg,
  color,
  transition: "transform 0.12s, opacity 0.12s",
  flex: 1,
});

export function ReceiptModal({
  order,
  customer,
  paymentLines,
  onClose,
  onNewOrder,
  odooOrderId,
}: {
  order: Order;
  customer: Customer | null;
  paymentLines: PaymentLine[];
  onClose: () => void;
  onNewOrder: () => void;
  odooOrderId?: number;
}) {
  const { subtotal, tax, total } = calcOrderTotals(order.cart);
  const paid = paymentLines.reduce((s, l) => s + l.amount, 0);
  const change = paid - total;
  const receiptNo = `RCP-${Date.now().toString().slice(-6)}`;

  const [fetchPdf, { isLoading: isPdfLoading }] = useLazyGetOrderReceiptPdfQuery();
  const [createOdooInvoice, { isLoading: isInvoicing }] = useCreateOdooInvoiceMutation();

  const [invoiceState, setInvoiceState] = useState<{
    status: "idle" | "success" | "error";
    invoiceId?: number;
    pdfUrl?: string;
    message?: string;
  }>({ status: "idle" });

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    if (!odooOrderId) return;
    const result = await fetchPdf(odooOrderId).unwrap();
    const url = URL.createObjectURL(result);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${odooOrderId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateInvoice = async () => {
    if (!odooOrderId) return;
    try {
      const result = await createOdooInvoice({ odooOrderId }).unwrap();
      setInvoiceState({ status: "success", invoiceId: result.invoiceId, pdfUrl: result.pdfUrl });
    } catch (err: any) {
      setInvoiceState({ status: "error", message: err?.data?.message ?? "Failed to create invoice" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div style={{
        width: 360,
        borderRadius: 24,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
      }}>

        {/* ── Gradient header ── */}
        <div style={{
          background: "linear-gradient(135deg, #1e40af 0%, #4f46e5 100%)",
          padding: "22px 24px 26px",
          textAlign: "center",
          color: "#fff",
        }}>
          <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: "0.01em" }}>
            POS — Shop #1
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>
            {new Date().toLocaleString()} · #{receiptNo}
          </div>
          {customer && (
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              {customer.name}
            </div>
          )}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            marginTop: 12, background: "rgba(255,255,255,0.2)",
            borderRadius: 999, padding: "4px 14px", fontSize: 11, fontWeight: 500,
          }}>
            ✓ Paid
          </span>
        </div>

        {/* ── Receipt body ── */}
        <div style={{ padding: "18px 22px" }}>

          {/* Items */}
          <div style={{ marginBottom: 12 }}>
            {order.cart.map((item) => (
              <div key={item.id} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", fontSize: 13, marginBottom: 6,
                color: "#374151",
              }}>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>
                  {item.name}
                </span>
                <span style={{ color: "#9CA3AF", marginRight: 12, flexShrink: 0 }}>
                  {item.qty}×${fmt(item.price)}
                </span>
                <span style={{ fontWeight: 500, flexShrink: 0 }}>
                  ${fmt(calcLineTotal(item))}
                </span>
              </div>
            ))}
          </div>

          {/* Dashed divider */}
          <div style={{ borderTop: "1.5px dashed #E5E7EB", margin: "12px 0" }} />

          {/* Totals */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6B7280" }}>
              <span>Subtotal</span><span>${fmt(subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6B7280" }}>
              <span>Tax (10%)</span><span>${fmt(tax)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 600, color: "#111827", marginTop: 4 }}>
              <span>Total</span><span>${fmt(total)}</span>
            </div>
          </div>

          {/* Dashed divider */}
          <div style={{ borderTop: "1.5px dashed #E5E7EB", margin: "12px 0" }} />

          {/* Payment lines */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {paymentLines.map((l) => (
              <div key={l.method} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6B7280" }}>
                <span style={{ textTransform: "capitalize" }}>{l.method}</span>
                <span>${fmt(l.amount)}</span>
              </div>
            ))}
            {change > 0.005 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#059669", fontWeight: 500 }}>
                <span>Change</span><span>${fmt(change)}</span>
              </div>
            )}
          </div>

          {/* Invoice feedback */}
          {invoiceState.status === "success" && (
            <div style={{
              marginTop: 12, borderRadius: 12, background: "#ECFDF5",
              border: "1px solid #A7F3D0", padding: "8px 12px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 12, color: "#065F46", fontWeight: 500 }}>
                ✅ Invoice #{invoiceState.invoiceId} created
              </span>
              <a href={invoiceState.pdfUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: "#059669", textDecoration: "underline" }}>
                View PDF
              </a>
            </div>
          )}
          {invoiceState.status === "error" && (
            <div style={{
              marginTop: 12, borderRadius: 12, background: "#FEF2F2",
              border: "1px solid #FECACA", padding: "8px 12px",
            }}>
              <span style={{ fontSize: 12, color: "#991B1B" }}>⚠️ {invoiceState.message}</span>
            </div>
          )}

          <div style={{ textAlign: "center", fontSize: 11, color: "#9CA3AF", marginTop: 16 }}>
            Thank you for your purchase!
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div style={{
          padding: "12px 16px 18px",
          background: "#F9FAFB",
          borderTop: "1px solid #F3F4F6",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          {/* Row 1 — Print + PDF */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handlePrint}
              style={pill("#F1F5F9", "#334155")}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "none")}
            >
              🖨 Print
            </button>

            {odooOrderId && (
              <button
                onClick={handleDownloadPdf}
                disabled={isPdfLoading}
                style={pill("#EDE9FE", "#5B21B6")}
                onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "none")}
              >
                ⬇ {isPdfLoading ? "Loading..." : "PDF"}
              </button>
            )}
          </div>

          {/* Row 2 — Invoice (full width) */}
          {odooOrderId && invoiceState.status !== "success" && (
            <button
              onClick={handleCreateInvoice}
              disabled={isInvoicing}
              style={{ ...pill("#FEF3C7", "#92400E"), flex: "none", width: "100%" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "none")}
            >
              🧾 {isInvoicing ? "Creating..." : "Create invoice"}
            </button>
          )}

          {/* Row 3 — New order (full width, gradient) */}
          <button
            onClick={onNewOrder}
            style={{
              ...pill("linear-gradient(90deg, #2563EB, #4f46e5)", "#fff"),
              flex: "none",
              width: "100%",
              height: 48,
              fontSize: 14,
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "none")}
          >
            ＋ New order
          </button>
        </div>

      </div>
    </div>
  );
}