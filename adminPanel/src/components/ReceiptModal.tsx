import { CartItem, Customer, fmt, Order, PaymentLine } from "@/types/pos";

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
}: {
  order: Order;
  customer: Customer | null;
  paymentLines: PaymentLine[];
  onClose: () => void;
  onNewOrder: () => void;
}) {
  const { subtotal, tax, total } = calcOrderTotals(order.cart);
  const paid = paymentLines.reduce((s, l) => s + l.amount, 0);
  const change = paid - total;
  const receiptNo = `RCP-${Date.now().toString().slice(-6)}`;

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[360px] flex flex-col overflow-hidden">
        {/* Receipt */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="text-center mb-4">
            <div className="text-[16px] font-bold text-gray-900">POS — Shop #1</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{new Date().toLocaleString()}</div>
            <div className="text-[11px] text-gray-400">Receipt #{receiptNo}</div>
            {customer && <div className="text-[11px] text-blue-600 mt-1">Customer: {customer.name}</div>}
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
              <div className="flex justify-between text-[12px] text-emerald-600 font-medium"><span>Change</span><span>${fmt(change)}</span></div>
            )}
          </div>

          <div className="text-center text-[11px] text-gray-400 mt-4">Thank you for your purchase!</div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 py-4">
          <button onClick={handlePrint} className="flex-1 h-9 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 bg-transparent cursor-pointer transition-colors">
            🖨 Print
          </button>
          {/* TODO: "Send to Odoo" button — POST receipt data to create account.move (invoice) in Odoo */}
          <button onClick={onNewOrder} className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-colors">
            New Order
          </button>
        </div>
      </div>
    </div>
  );
}