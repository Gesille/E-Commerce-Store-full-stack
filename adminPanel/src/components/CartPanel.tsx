"use client";

import {
  CartItem,
  Customer,
  fmt,
  calcLineTotal,
} from "@/types/pos";

import { useState, useCallback, useEffect } from "react";
import { calcTotal, Discount } from "./posPricing";

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
  const [buffer, setBuffer] = useState("");

  // ✅ GLOBAL DISCOUNT (NOW WORKING)
  const [discount, setDiscount] = useState<Discount>({
    type: "percent",
    value: 0,
  });

  // ✅ SINGLE SOURCE OF TRUTH
  const { subtotal, discountAmt, afterDiscount, tax, total } = calcTotal(
    cart,
    discount,
  );

  // ─────────────────────────────
  // UPDATE ITEM
  // ─────────────────────────────
  const updateItem = (id: number, val: number) => {
    setCart(
      cart
        .map((item) =>
          item.id === id
            ? { ...item, qty: Math.max(1, val) }
            : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  // ─────────────────────────────
  // QTY +/- (PROFESSIONAL FIX)
  // ─────────────────────────────
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

  // ─────────────────────────────
  // DISCOUNT INPUT HANDLER ⭐ IMPORTANT
  // ─────────────────────────────
  const handleDiscountChange = (value: number) => {
    setDiscount((prev) => ({
      ...prev,
      value: Math.max(0, Math.min(100, value)),
    }));
  };

  // ─────────────────────────────
  // NUMPAD
  // ─────────────────────────────
  const handleNumpad = useCallback(
    (key: string) => {
      if (!selectedId) return;

      let next = buffer;

      if (key === "del") next = buffer.slice(0, -1);
      else next = buffer + key;

      setBuffer(next);

      const num = parseFloat(next);
      if (!isNaN(num)) updateItem(selectedId, num);
    },
    [selectedId, buffer],
  );

  // ─────────────────────────────
  // REMOVE
  // ─────────────────────────────
  const removeItem = (id: number) => {
    setCart(cart.filter((i) => i.id !== id));

    if (selectedId === id) {
      setSelectedId(null);
      setBuffer("");
    }
  };

  // ─────────────────────────────
  // KEYBOARD
  // ─────────────────────────────
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

  // ─────────────────────────────
  // UI
  // ─────────────────────────────
  return (
    <div className="w-72 bg-white border-l flex flex-col">

      {/* HEADER */}
      <div className="px-5 py-3 border-b">
        <div className="text-[15px] font-semibold">{orderName}</div>

        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{cart.length} items</span>

          <button onClick={onOpenCustomer} className="text-blue-600">
            {customer ? customer.name : "Add customer"}
          </button>
        </div>

        <button
          onClick={onOpenNote}
          className="mt-2 text-left text-xs text-gray-500"
        >
          📝 {orderNote || "Add order note…"}
        </button>
      </div>

      {/* CART */}
      <div className="flex-1 overflow-y-auto">
        {cart.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              setSelectedId(item.id);
              setBuffer("");
            }}
            className="px-5 py-3 border-b cursor-pointer hover:bg-gray-50"
          >
            <div className="flex justify-between text-sm font-medium">
              <span>{item.name}</span>
              <span>${fmt(calcLineTotal(item))}</span>
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <button onClick={() => changeQty(item.id, -1)}>-</button>
              <span>{item.qty}</span>
              <button onClick={() => changeQty(item.id, 1)}>+</button>
            </div>
          </div>
        ))}
      </div>

      {/* TOTALS (PROFESSIONAL ODOO STYLE) */}
      <div className="px-5 py-4 bg-gray-50 border-t">

        <div className="flex justify-between text-xs">
          <span>Subtotal</span>
          <span>${fmt(subtotal)}</span>
        </div>

        {/* ⭐ DISCOUNT INPUT (FIXED) */}
        <div className="flex justify-between text-xs mt-2">
          <span>Discount %</span>
          <input
            type="number"
            value={discount.value}
            onChange={(e) =>
              handleDiscountChange(Number(e.target.value))
            }
            className="w-16 text-right border px-1 rounded"
          />
        </div>

        <div className="flex justify-between text-xs mt-1">
          <span>Discount</span>
          <span>-${fmt(discountAmt)}</span>
        </div>

        <div className="flex justify-between text-xs mt-1">
          <span>After Discount</span>
          <span>${fmt(afterDiscount)}</span>
        </div>

        <div className="flex justify-between text-xs mt-1">
          <span>Tax</span>
          <span>${fmt(tax)}</span>
        </div>

        <div className="flex justify-between text-lg font-bold mt-2">
          <span>Total</span>
          <span>${fmt(total)}</span>
        </div>
      </div>

      {/* PAY */}
      <button
        onClick={() => cart.length > 0 && onOpenPayment()}
        className="m-3 h-11 bg-blue-600 text-white rounded-xl"
      >
        Pay ${fmt(total)}
      </button>
    </div>
  );
}