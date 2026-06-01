import {
  useLazyGetOrderReceiptPdfQuery,
  useCreateOdooInvoiceMutation,
} from "@/redux/pos/Posapi";
import { useSendReceiptByEmailMutation } from "@/redux/reciept/recieptApi";
import { CartItem, Customer, fmt, Order, PaymentLine } from "@/types/pos";
import { useState, useMemo } from "react"; // أضفنا useMemo لثبات رقم الإيصال
import { PrintableReceipt, usePrintReceipt } from "./Printablereceipt";

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

  // استخدام useMemo لضمان عدم تغير رقم الإيصال عند إعادة رندر الـ Modal
  const receiptNo = useMemo(() => `RCP-${Date.now().toString().slice(-6)}`, []);

  const [fetchPdf, { isLoading: isPdfLoading }] =
    useLazyGetOrderReceiptPdfQuery();
  const [createOdooInvoice, { isLoading: isInvoicing }] =
    useCreateOdooInvoiceMutation();

  const [invoiceState, setInvoiceState] = useState<{
    status: "idle" | "success" | "error";
    invoiceId?: number;
    pdfUrl?: string;
    message?: string;
  }>({ status: "idle" });

  // ربط الـ Hook ببيانات الإيصال المحدثة
  const { printReceipt } = usePrintReceipt({
    cart: order.cart,
    customer,
    paymentLines,
    odooOrderId,
    receiptNo,
  });

  const handlePrint = () => printReceipt();

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

  const [sendReceiptByEmail, { isLoading: isSending }] =
    useSendReceiptByEmailMutation();

  const [emailModal, setEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState(customer?.email ?? "");
  const [emailState, setEmailState] = useState<{
    status: "idle" | "success" | "error";
    message?: string;
  }>({ status: "idle" });

  const handleSendEmail = async () => {
    if (!odooOrderId) return;
    try {
      await sendReceiptByEmail({
        receiptId: odooOrderId,
        email: emailInput.trim(),
      }).unwrap();
      setEmailState({ status: "success" });
      setTimeout(() => setEmailModal(false), 1500);
    } catch (err: any) {
      setEmailState({
        status: "error",
        message: err?.data?.message ?? "Failed to send email",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[360px] flex flex-col overflow-hidden">
        {/* شاشة العرض المباشرة في الموقع (UI) */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="text-center mb-4">
            <div className="text-[16px] font-bold text-gray-900">
              POS — Shop #1
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {new Date().toLocaleString()}
            </div>
            <div className="text-[11px] text-gray-400">
              Receipt #{receiptNo}
            </div>
            {customer && (
              <div className="text-[11px] text-blue-600 mt-1">
                Customer: {customer.name}
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-gray-200 pt-3 mb-3">
            {order.cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between text-[12px] text-gray-700 mb-1"
              >
                <span className="flex-1 truncate pr-2">{item.name}</span>
                <span className="shrink-0 text-gray-400 mr-3">
                  {item.qty}×${fmt(item.price)}
                </span>
                <span className="shrink-0">${fmt(calcLineTotal(item))}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-200 pt-3 space-y-1">
            <div className="flex justify-between text-[12px] text-gray-500">
              <span>Subtotal</span>
              <span>${fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[12px] text-gray-500">
              <span>Tax (10%)</span>
              <span>${fmt(tax)}</span>
            </div>
            <div className="flex justify-between text-[14px] font-bold text-gray-900 pt-1">
              <span>Total</span>
              <span>${fmt(total)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-200 pt-3 mt-3 space-y-1">
            {paymentLines.map((l) => (
              <div
                key={l.method}
                className="flex justify-between text-[12px] text-gray-500"
              >
                <span className="capitalize">{l.method}</span>
                <span>${fmt(l.amount)}</span>
              </div>
            ))}
            {change > 0.005 && (
              <div className="flex justify-between text-[12px] text-emerald-600 font-medium">
                <span>Change</span>
                <span>${fmt(change)}</span>
              </div>
            )}
          </div>

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
              <span className="text-[12px] text-red-600">
                ⚠️ {invoiceState.message}
              </span>
            </div>
          )}

          <div className="text-center text-[11px] text-gray-400 mt-4">
            Thank you for your purchase!
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrint}
              className="h-9 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 bg-transparent cursor-pointer transition-colors"
            >
              🖨 Print
            </button>

            {odooOrderId && invoiceState.status !== "success" ? (
              <button
                onClick={handleCreateInvoice}
                disabled={isInvoicing}
                className="h-9 border border-amber-200 bg-amber-50 text-amber-700 rounded-xl text-[13px] font-semibold hover:bg-amber-100 cursor-pointer transition-colors disabled:opacity-50"
              >
                {isInvoicing ? "Creating..." : "🧾 Invoice"}
              </button>
            ) : (
              <div />
            )}
          </div>
          {odooOrderId && (
            <button
              onClick={() => {
                setEmailInput(customer?.email ?? "");
                setEmailState({ status: "idle" });
                setEmailModal(true);
              }}
              className="w-full h-9 border border-blue-200 bg-blue-50 text-blue-700 rounded-xl text-[13px] font-semibold hover:bg-blue-100 cursor-pointer transition-colors"
            >
              📧 Send Receipt by Email
            </button>
          )}

          <button
            onClick={onNewOrder}
            className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-colors"
          >
            New Order
          </button>
        </div>
      </div>

      {/* Email Modal */}
      {emailModal && (
        <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-[300px] p-5 flex flex-col gap-3">
            <div className="text-[15px] font-bold text-gray-900">
              📧 Send Receipt
            </div>
            <div className="text-[12px] text-gray-500">
              Enter the customer's email address
            </div>

            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="customer@email.com"
              className="h-10 px-3 rounded-xl border border-gray-200 text-[13px] text-gray-800 outline-none focus:border-blue-400 transition-colors"
            />

            {emailState.status === "success" && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12px] text-emerald-700 font-medium">
                ✅ Receipt sent successfully!
              </div>
            )}
            {emailState.status === "error" && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-600">
                ⚠️ {emailState.message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => setEmailModal(false)}
                className="h-9 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 bg-transparent cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={isSending || !emailInput.trim()}
                className="h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-colors disabled:opacity-50"
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

     
      <PrintableReceipt
        cart={order.cart}
        customer={customer}
        paymentLines={paymentLines}
        odooOrderId={odooOrderId}
        receiptNo={receiptNo}
      />
    </div>
  );
}