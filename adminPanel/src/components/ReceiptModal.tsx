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
      setInvoiceState({
        status: "success",
        invoiceId: result.invoiceId,
        pdfUrl: result.pdfUrl,
      });
    } catch (err: any) {
      setInvoiceState({
        status: "error",
        message: err?.data?.message ?? "Failed to create invoice",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[360px] flex flex-col overflow-hidden">
        {/* Receipt */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="text-center mb-4">
            <div className="text-[16px] font-bold text-gray-900">POS — Shop #1</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{new Date().toLocaleString()}</div>
            <div className="text-[11px] text-gray-400">Receipt #{receiptNo}</div>
            {customer && (
              <div className="text-[11px] text-blue-600 mt-1">Customer: {customer.name}</div>
            )}
          </div>

          <div className="border-t border-dashed border-gray-200 pt-3 mb-3">
            {order.cart.map((item) => (
              <div key={item.id} className="flex justify-between text-[12px] text-gray-700 mb-1">
                <span className="flex-1 truncate pr-2">{item.name}</span>
                <span className="shrink-0 text-gray-400 mr-3">{item.qty}×${fmt(item.price)}</span>
                <span className="shrink-0">${fmt(calcLineTotal(item))}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-200 pt-3 space-y-1">
            <div className="flex justify-between text-[12px] text-gray-500"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
            <div className="flex justify-between text-[12px] text-gray-500"><span>Tax (10%)</span><span>${fmt(tax)}</span></div>
            <div className="flex justify-between text-[14px] font-bold text-gray-900 pt-1"><span>Total</span><span>${fmt(total)}</span></div>
          </div>

          <div className="border-t border-dashed border-gray-200 pt-3 mt-3 space-y-1">
            {paymentLines.map((l) => (
              <div key={l.method} className="flex justify-between text-[12px] text-gray-500">
                <span className="capitalize">{l.method}</span><span>${fmt(l.amount)}</span>
              </div>
            ))}
            {change > 0.005 && (
              <div className="flex justify-between text-[12px] text-emerald-600 font-medium">
                <span>Change</span><span>${fmt(change)}</span>
              </div>
            )}
          </div>

          {/* Invoice feedback */}
          {invoiceState.status === "success" && (
            <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center justify-between">
              <span className="text-[12px] text-emerald-700 font-medium">
                ✅ Invoice #{invoiceState.invoiceId} created
              </span>
              <a
                href={invoiceState.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-emerald-600 underline hover:text-emerald-800"
              >
                View PDF
              </a>
            </div>
          )}
          {invoiceState.status === "error" && (
            <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2">
              <span className="text-[12px] text-red-600">⚠️ {invoiceState.message}</span>
            </div>
          )}

          <div className="text-center text-[11px] text-gray-400 mt-4">Thank you for your purchase!</div>
        </div>

      {/* Actions */}
<div style={{
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  padding: "14px 16px",
  borderTop: "0.5px solid var(--color-border-tertiary)",
  background: "var(--color-background-secondary)",
}}>
  <button onClick={handlePrint} className="receipt-btn">
    <i className="ti ti-printer" /> Print
  </button>

  {odooOrderId && (
    <button onClick={handleDownloadPdf} disabled={isPdfLoading}
      className="receipt-btn receipt-btn-pdf">
      <i className="ti ti-download" />
      {isPdfLoading ? "Loading..." : "PDF receipt"}
    </button>
  )}

  {odooOrderId && invoiceState.status !== "success" && (
    <button onClick={handleCreateInvoice} disabled={isInvoicing}
      className="receipt-btn receipt-btn-invoice">
      <i className="ti ti-file-invoice" />
      {isInvoicing ? "Creating..." : "Create invoice"}
    </button>
  )}

  <button onClick={onNewOrder}
    className="receipt-btn receipt-btn-new"
    style={{ gridColumn: "1 / -1" }}>
    <i className="ti ti-plus" /> New order
  </button>
</div>
      </div>
    </div>
  );
}