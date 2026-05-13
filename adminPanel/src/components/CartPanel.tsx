import { CartItem, Customer, calcOrderTotals, fmt, calcLineTotal } from "@/types/pos";
import { useState, useCallback, useEffect } from "react";
import { LineNoteModal } from "./LineNoteModal";

export function CartPanel({
  cart,
  setCart,
  orderName,
  customer,
  onOpenCustomer,
  onOpenPayment,
  orderNote,
  onOpenNote,
}: {
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  orderName: string;
  customer: Customer | null;
  onOpenCustomer: () => void;
  onOpenPayment: () => void;
  orderNote: string;
  onOpenNote: () => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<"Qty" | "Disc" | "Price">("Qty");
  const [buffer, setBuffer] = useState("");
  const [lineNoteItem, setLineNoteItem] = useState<CartItem | null>(null);
  const [globalDiscount, setGlobalDiscount] = useState(0);

  const { subtotal, tax } = calcOrderTotals(cart);
  const discountAmt = subtotal * (globalDiscount / 100);
  const discountedSubtotal = subtotal - discountAmt;
  const taxOnDiscounted = discountedSubtotal * 0.1;
  const total = discountedSubtotal + taxOnDiscounted;

  const updateItem = (id: number, val: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.id !== id) return item;
          if (mode === "Qty") return { ...item, qty: Math.max(0, val) };
          if (mode === "Disc") return { ...item, discount: Math.min(100, Math.max(0, val)) };
          if (mode === "Price") return { ...item, price: Math.max(0, val) };
          return item;
        })
        .filter((item) => item.qty > 0)
    );
  };

  const handleNumpad = useCallback(
    (key: string) => {
      if (!selectedId) return;
      let next = buffer;
      if (key === "del") next = buffer.slice(0, -1);
      else if (key === "." && buffer.includes(".")) return;
      else next = buffer + key;
      setBuffer(next);
      const num = parseFloat(next);
      if (!isNaN(num)) updateItem(selectedId, num);
    },
    [selectedId, buffer, mode, cart]
  );

  const removeItem = (id: number) => {
    setCart(cart.filter((i) => i.id !== id));
    if (selectedId === id) { setSelectedId(null); setBuffer(""); }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Escape") { setSelectedId(null); setBuffer(""); }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        if (e.key === "Backspace") { handleNumpad("del"); return; }
        removeItem(selectedId);
      }
      if (/^[0-9.]$/.test(e.key) && selectedId) handleNumpad(e.key);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, handleNumpad]);

  return (
    <>
      <div className="w-72 bg-white border-l border-gray-100 flex flex-col shrink-0">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-50">
          <div className="text-[15px] font-semibold text-gray-900">{orderName}</div>
          <div className="flex items-center justify-between mt-1">
            <div className="text-xs text-gray-400">{cart.length} item{cart.length !== 1 ? "s" : ""}</div>
            {/* Customer */}
            <button
              onClick={onOpenCustomer}
              className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 bg-transparent border-none cursor-pointer"
            >
              {customer ? (
                <><span className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center text-[9px]">👤</span>{customer.name}</>
              ) : (
                <><span className="text-gray-400">+</span><span className="text-gray-400 hover:text-blue-500 transition-colors">Add customer</span></>
              )}
            </button>
          </div>
          {/* Order note */}
          <button
            onClick={onOpenNote}
            className={`mt-1.5 w-full text-left text-[11px] bg-transparent border-none cursor-pointer transition-colors ${
              orderNote ? "text-amber-600" : "text-gray-300 hover:text-gray-500"
            }`}
          >
            📝 {orderNote || "Add order note…"}
          </button>
        </div>

        {/* Lines */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center h-28 gap-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E2E8F0" strokeWidth="1.5" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              <span className="text-xs text-gray-400">Cart is empty</span>
            </div>
          )}

          {cart.map((item) => (
            <div
              key={item.id}
              onClick={() => { setSelectedId(item.id); setBuffer(""); }}
              className={`px-5 py-3 border-b border-gray-50 cursor-pointer transition-colors ${
                selectedId === item.id ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex justify-between text-[13px] font-medium text-gray-900">
                <span className="truncate max-w-[150px]">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span>${fmt(calcLineTotal(item))}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                    aria-label={`Remove ${item.name}`}
                    className="text-gray-300 hover:text-red-500 bg-transparent border-none cursor-pointer leading-none transition-colors text-[13px]"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                {item.qty} × ${fmt(item.price)}
                {item.discount ? <span className="text-blue-500"> −{item.discount}%</span> : null}
              </div>
              {/* Line note */}
              <button
                onClick={(e) => { e.stopPropagation(); setLineNoteItem(item); }}
                className={`mt-0.5 text-[10px] bg-transparent border-none cursor-pointer transition-colors ${
                  item.note ? "text-amber-500" : "text-gray-300 hover:text-gray-500"
                }`}
              >
                📝 {item.note || "Add note…"}
              </button>
            </div>
          ))}
        </div>

        {/* Global discount */}
        <div className="px-5 py-2 border-t border-gray-100 flex items-center gap-2">
          <span className="text-[11px] text-gray-400 shrink-0">Global Disc. %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={globalDiscount || ""}
            onChange={(e) => setGlobalDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
            placeholder="0"
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-[12px] outline-none focus:border-blue-400 text-right"
          />
          <span className="text-[11px] text-gray-400">%</span>
          {globalDiscount > 0 && (
            <button onClick={() => setGlobalDiscount(0)} className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-xs">✕</button>
          )}
        </div>

        {/* Totals */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Subtotal</span><span>${fmt(subtotal)}</span>
          </div>
          {globalDiscount > 0 && (
            <div className="flex justify-between text-xs text-amber-500 mb-1">
              <span>Discount ({globalDiscount}%)</span><span>−${fmt(discountAmt)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Tax (10%)</span><span>${fmt(taxOnDiscounted)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold text-gray-900">
            <span>Total</span><span>${fmt(total)}</span>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex border-t border-gray-100">
          {(["Qty", "Disc", "Price"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setBuffer(""); }}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors cursor-pointer border-none ${
                mode === m ? "bg-blue-50 text-blue-600 font-semibold" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Buffer hint */}
        {selectedId && buffer && (
          <div className="text-center text-[11px] text-blue-600 font-medium bg-blue-50 py-1">
            {mode}: {buffer}
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-px bg-gray-100 p-px">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map((key) => (
            <button
              key={key}
              onClick={() => handleNumpad(key)}
              className="h-10 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 active:bg-blue-50 active:text-blue-600 transition-colors cursor-pointer border-none"
            >
              {key === "del" ? "⌫" : key}
            </button>
          ))}
        </div>

        {/* Pay button */}
        <button
          onClick={() => cart.length > 0 && onOpenPayment()}
          disabled={cart.length === 0}
          className={`mx-3 my-3 h-11 font-semibold text-[15px] rounded-xl border-none transition-all ${
            cart.length > 0
              ? "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white cursor-pointer"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {cart.length > 0 ? `Pay $${fmt(total)}` : "Cart is empty"}
        </button>
      </div>

      {/* Line note modal */}
      {lineNoteItem && (
        <LineNoteModal
          item={lineNoteItem}
          onSave={(note) => {
            setCart(cart.map((i) => (i.id === lineNoteItem.id ? { ...i, note } : i)));
            setLineNoteItem(null);
          }}
          onClose={() => setLineNoteItem(null)}
        />
      )}
    </>
  );
}
