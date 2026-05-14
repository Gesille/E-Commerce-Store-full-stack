"use client";

import { useState, useCallback, useEffect } from "react";
import {
  CartItem,
  Customer,
  fmt,
  calcLineTotal,
} from "@/types/pos";

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

  // ⭐ PROFESSIONAL DISCOUNT STATE (Odoo style)
  const [discount, setDiscount] = useState<Discount>({
    type: "percent",
    value: 0,
  });

  const totals = calcTotal(cart, discount);

  // ─── QTY UPDATE ───
  const changeQty = (id: number, delta: number) => {
    setCart(
      cart.map(item =>
        item.id === id
          ? { ...item, qty: Math.max(1, item.qty + delta) }
          : item
      )
    );
  };

  // ─── REMOVE ITEM ───
  const removeItem = (id: number) => {
    setCart(cart.filter(i => i.id !== id));
  };

  // ─── DISCOUNT UPDATE (PROFESSIONAL CONTROL) ───
  const updateDiscount = (value: number) => {
    setDiscount(prev => ({
      ...prev,
      value: Math.max(0, Math.min(100, value)),
    }));
  };

  // ─── UI ───
  return (
    <div className="w-72 bg-white border-l flex flex-col">

      {/* HEADER */}
      <div className="px-5 py-3 border-b">
        <div className="text-lg font-semibold">{orderName}</div>

        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{cart.length} items</span>
          <button onClick={onOpenCustomer} className="text-blue-600">
            {customer ? customer.name : "Add customer"}
          </button>
        </div>

        <button
          onClick={onOpenNote}
          className="mt-2 text-xs text-left text-gray-500"
        >
          📝 {orderNote || "Add order note…"}
        </button>
      </div>

      {/* CART */}
      <div className="flex-1 overflow-y-auto">
        {cart.map(item => (
          <div
            key={item.id}
            onClick={() => setSelectedId(item.id)}
            className="px-5 py-3 border-b hover:bg-gray-50"
          >
            <div className="flex justify-between text-sm">
              <span>{item.name}</span>
              <span>${fmt(calcLineTotal(item))}</span>
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs">
              <button onClick={() => changeQty(item.id, -1)}>-</button>
              <span>{item.qty}</span>
              <button onClick={() => changeQty(item.id, 1)}>+</button>

              <button
                onClick={() => removeItem(item.id)}
                className="ml-auto text-red-500"
              >
                remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* TOTALS (REAL POS STYLE) */}
      <div className="px-5 py-4 bg-gray-50 border-t">

        <div className="flex justify-between text-xs">
          <span>Subtotal</span>
          <span>${fmt(totals.subtotal)}</span>
        </div>

        {/* ⭐ DISCOUNT (PROFESSIONAL CONTROL) */}
        <div className="flex justify-between text-xs mt-2">
          <span>Discount %</span>
          <input
            type="number"
            value={discount.value}
            onChange={(e) => updateDiscount(Number(e.target.value))}
            className="w-14 text-right border px-1 rounded"
          />
        </div>

        <div className="flex justify-between text-xs mt-1">
          <span>Discount</span>
          <span>-${fmt(totals.discountAmt)}</span>
        </div>

        <div className="flex justify-between text-xs mt-1">
          <span>After Discount</span>
          <span>${fmt(totals.afterDiscount)}</span>
        </div>

        <div className="flex justify-between text-xs mt-1">
          <span>Tax</span>
          <span>${fmt(totals.tax)}</span>
        </div>

        <div className="flex justify-between text-lg font-bold mt-2">
          <span>Total</span>
          <span>${fmt(totals.total)}</span>
        </div>
      </div>

      {/* PAY */}
      <button
        onClick={() => cart.length > 0 && onOpenPayment()}
        className="m-3 h-11 bg-blue-600 text-white rounded-xl"
      >
        Pay ${fmt(totals.total)}
      </button>
    </div>
  );
}