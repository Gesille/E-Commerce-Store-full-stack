import { calcLineTotal, CartItem, Customer, fmt, PaymentLine } from "@/types/pos";
import { useState } from "react";


export function PaymentModal({
  total,
  orderName,
  customer,
  cart,
  onClose,
  onConfirm,
}: {
  total: number;
  orderName: string;
  customer: Customer | null;
  cart: CartItem[];
  onClose: () => void;
  onConfirm: (lines: PaymentLine[]) => void;
}) {
  const [lines, setLines] = useState<PaymentLine[]>([{ method: "cash", amount: total }]);
  

  const paid = lines.reduce((s, l) => s + l.amount, 0);
  const change = paid - total;
  const remaining = total - paid;
  const isComplete = paid >= total;

  const addMethod = (method: PaymentLine["method"]) => {
    const already = lines.find((l) => l.method === method);
    if (already) return;
    const rem = Math.max(0, total - lines.reduce((s, l) => s + l.amount, 0));
    setLines([...lines, { method, amount: rem }]);
  };

  const updateAmount = (method: PaymentLine["method"], val: string) => {
    const num = parseFloat(val) || 0;
    setLines(lines.map((l) => (l.method === method ? { ...l, amount: num } : l)));
  };

  const removeLine = (method: PaymentLine["method"]) => {
    setLines(lines.filter((l) => l.method !== method));
  };

  const methodLabel: Record<PaymentLine["method"], string> = {
    cash: "💵 Cash",
    card: "💳 Card",
    bank: "🏦 Bank Transfer",
  };

  // TODO: connect to Odoo invoice generation here
  // When onConfirm is called, send cart + customer + payment lines to your backend
  // POST /api/pos/orders with { cart, customer, paymentLines, orderName }
  // Then call Odoo's account.move.create to generate invoice if needed

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="text-[15px] font-semibold text-gray-900">Payment — {orderName}</div>
            {customer && <div className="text-xs text-gray-400 mt-0.5">Customer: {customer.name}</div>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-lg leading-none">✕</button>
        </div>

        {/* Order summary */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
          <div className="text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Order Summary</div>
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between text-[12px] text-gray-600 mb-0.5">
              <span>{item.qty}× {item.name}{item.discount ? ` (−${item.discount}%)` : ""}</span>
              <span>${fmt(calcLineTotal(item))}</span>
            </div>
          ))}
        </div>

        {/* Amount due */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex justify-between text-[13px] text-gray-500 mb-1">
            <span>Amount Due</span>
            <span className="font-semibold text-gray-900 text-base">${fmt(total)}</span>
          </div>
          {isComplete && change > 0.005 && (
            <div className="flex justify-between text-[13px] text-emerald-600 font-medium mt-1">
              <span>Change</span><span>${fmt(change)}</span>
            </div>
          )}
          {!isComplete && (
            <div className="flex justify-between text-[13px] text-red-500 mt-1">
              <span>Remaining</span><span>${fmt(remaining)}</span>
            </div>
          )}
        </div>

        {/* Payment methods */}
        <div className="px-6 py-4">
          <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Payment Methods</div>
          {lines.map((line) => (
            <div key={line.method} className="flex items-center gap-3 mb-2">
              <span className="text-[13px] text-gray-700 w-32">{methodLabel[line.method]}</span>
              <input
                type="number"
                value={line.amount}
                onChange={(e) => updateAmount(line.method, e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-blue-400 text-right"
              />
              {lines.length > 1 && (
                <button onClick={() => removeLine(line.method)} className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-sm">✕</button>
              )}
            </div>
          ))}
          <div className="flex gap-2 mt-3">
            {(["cash", "card", "bank"] as const)
              .filter((m) => !lines.find((l) => l.method === m))
              .map((m) => (
                <button key={m} onClick={() => addMethod(m)} className="text-[11px] text-blue-600 border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 bg-transparent cursor-pointer transition-colors">
                  + {methodLabel[m]}
                </button>
              ))}
          </div>
        </div>

        {/* Confirm */}
        <div className="px-6 pb-5 pt-2">
          <button
            onClick={() => isComplete && onConfirm(lines)}
            disabled={!isComplete}
            className={`w-full h-11 rounded-xl font-semibold text-[15px] border-none cursor-pointer transition-all ${
              isComplete
                ? "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isComplete ? `Validate Payment${change > 0.005 ? ` · Change $${fmt(change)}` : ""}` : `Enter $${fmt(remaining)} more`}
          </button>
          {/* TODO: Add "Generate Odoo Invoice" checkbox here */}
          {/* When checked, after payment confirmation call your Odoo invoice API */}
        </div>
      </div>
    </div>
  );
}
export default PaymentModal