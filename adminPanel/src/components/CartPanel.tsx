import {
  CartItem,
  Customer,
  calcOrderTotals,
  fmt,
  calcLineTotal,
} from "@/types/pos";
import { useState, useCallback, useEffect } from "react";

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
  const [globalDiscount, setGlobalDiscount] = useState(0);

  const { subtotal } = calcOrderTotals(cart);

  const discountAmt = subtotal * (globalDiscount / 100);
  const discountedSubtotal = subtotal - discountAmt;
  const taxOnDiscounted = discountedSubtotal * 0.1;
  const total = discountedSubtotal + taxOnDiscounted;

  // ─── UPDATE ITEM (numpad still works if needed) ───
  const updateItem = (id: number, val: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.id !== id) return item;

          if (mode === "Qty") return { ...item, qty: Math.max(1, val) };

          if (mode === "Disc")
            return {
              ...item,
              discount: Math.min(100, Math.max(0, val)),
            };

          if (mode === "Price") return { ...item, price: Math.max(0, val) };

          return item;
        })
        .filter((item) => item.qty > 0),
    );
  };

  // ─── + / - QUANTITY ───
  const changeQty = (id: number, delta: number) => {
    setCart(
      cart
        .map((item) =>
          item.id === id
            ? { ...item, qty: Math.max(1, item.qty + delta) }
            : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  // ─── NUMPAD (optional, still kept) ───
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
    [selectedId, buffer, mode],
  );

  // ─── REMOVE ITEM ───
  const removeItem = (id: number) => {
    setCart(cart.filter((i) => i.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setBuffer("");
    }
  };

  // ─── KEYBOARD ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Escape") {
        setSelectedId(null);
        setBuffer("");
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        if (e.key === "Backspace") {
          handleNumpad("del");
          return;
        }
        removeItem(selectedId);
      }

      if (/^[0-9.]$/.test(e.key) && selectedId) {
        handleNumpad(e.key);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, handleNumpad]);

  return (
    <div className="w-72 bg-white border-l flex flex-col">
      {/* ─── HEADER ─── */}
      <div className="px-5 py-3 border-b">
        <div className="text-[15px] font-semibold">{orderName}</div>

        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{cart.length} items</span>

          <button onClick={onOpenCustomer} className="text-blue-600">
            {customer ? customer.name : "Add customer"}
          </button>
        </div>

        {/* ORDER NOTE (KEEPED ONLY ONE NOTE) */}
        <button
          onClick={onOpenNote}
          className={`mt-2 text-left text-xs ${
            orderNote ? "text-amber-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          📝 {orderNote || "Add order note…"}
        </button>
      </div>

      {/* ─── CART ITEMS ─── */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-10">
            Cart is empty
          </div>
        )}

        {cart.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              setSelectedId(item.id);
              setBuffer("");
            }}
            className={`px-5 py-3 border-b cursor-pointer ${
              selectedId === item.id ? "bg-blue-50" : "hover:bg-gray-50"
            }`}
          >
            <div className="flex justify-between text-sm font-medium">
              <span className="truncate">{item.name}</span>

              <div className="flex items-center gap-2">
                <span>${fmt(calcLineTotal(item))}</span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item.id);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ─── QTY CONTROLS ─── */}
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  changeQty(item.id, -1);
                }}
                className="w-5 h-5 border rounded"
              >
                -
              </button>

              <span>{item.qty}</span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  changeQty(item.id, 1);
                }}
                className="w-5 h-5 border rounded"
              >
                +
              </button>

              <span className="ml-2">× ${fmt(item.price)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ─── TOTALS ─── */}
      {/* ─── TOTALS ─── */}
      <div className="px-5 py-4 bg-gray-50 border-t">
        <div className="flex justify-between text-xs">
          <span>Subtotal</span>
          <span>${fmt(subtotal)}</span>
        </div>

        {/* 🔥 ADD GLOBAL DISCOUNT HERE */}
        <div className="flex items-center justify-between text-xs mt-2">
          <span>Discount %</span>

          <input
            type="number"
            min="0"
            max="100"
            value={globalDiscount}
            onChange={(e) =>
              setGlobalDiscount(
                Math.max(0, Math.min(100, Number(e.target.value))),
              )
            }
            className="w-16 text-right border rounded px-1 py-0.5 text-xs"
          />
        </div>

        <div className="flex justify-between text-xs mt-1">
          <span>Discount Amount</span>
          <span>-${fmt(discountAmt)}</span>
        </div>

        <div className="flex justify-between text-xs mt-1">
          <span>After Discount</span>
          <span>${fmt(discountedSubtotal)}</span>
        </div>

        <div className="flex justify-between text-xs mt-1">
          <span>Tax (10%)</span>
          <span>${fmt(taxOnDiscounted)}</span>
        </div>

        <div className="flex justify-between text-lg font-semibold mt-2">
          <span>Total</span>
          <span>${fmt(total)}</span>
        </div>
      </div>
      {/* ─── PAY BUTTON ─── */}
      <button
        onClick={() => cart.length > 0 && onOpenPayment()}
        disabled={cart.length === 0}
        className="m-3 h-11 bg-blue-600 text-white rounded-xl disabled:bg-gray-200"
      >
        Pay ${fmt(total)}
      </button>
    </div>
  );
}
