"use client";

import {
  CartItem,
  Customer,
  fmt,
  calcLineTotal,
  TAX_RATE,
} from "@/types/pos";

import { useState, useCallback, useEffect, useRef } from "react";
import { calcTotal, Discount } from "./posPricing";
import { LineNoteModal } from "./LineNoteModal";
import { useGetEffectiveTaxRateQuery } from "@/redux/tax/taxApi";

// ─── Discount Pill Button ───────────────────────────────────────────────────
function DiscountToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-[11px] font-semibold rounded-full border transition-all duration-150 ${
        active
          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
          : "bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-600"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Preset chip ────────────────────────────────────────────────────────────
function PresetChip({
  value,
  active,
  label,
  onClick,
}: {
  value: number;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border transition-all duration-150 ${
        active
          ? "bg-indigo-50 text-indigo-700 border-indigo-300"
          : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Cart Row ────────────────────────────────────────────────────────────────
function CartRow({
  item,
  selected,
  onSelect,
  onChangeQty,
  onRemove,
  onOpenNote
}: {
  item: CartItem;
  selected: boolean;
  onSelect: () => void;
  onChangeQty: (delta: number) => void;
  onRemove: () => void;
  onOpenNote: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors duration-100 ${
        selected ? "bg-indigo-50/60" : "hover:bg-gray-50/70"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p
            className={`text-[13px] font-semibold truncate ${
              selected ? "text-indigo-800" : "text-gray-800"
            }`}
          >
            {item.name}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            ${fmt(item.price)} × {item.qty}
          </p>
          {item.note ? (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenNote(); }}
              className="mt-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-1.5 py-0.5 max-w-full truncate text-left hover:bg-amber-100 transition-colors"
            >
              📝 {item.note}
            </button>
          ) : selected ? (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenNote(); }}
              className="mt-1 text-[10px] text-gray-400 hover:text-indigo-500 transition-colors"
            >
              + Add note
            </button>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-[13px] font-bold tabular-nums ${
              selected ? "text-indigo-700" : "text-gray-700"
            }`}
          >
            ${fmt(calcLineTotal(item))}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (item.qty === 1) onRemove();
                else onChangeQty(-1);
              }}
              className={`w-5 h-5 rounded-md text-[12px] font-bold flex items-center justify-center transition-colors ${
                item.qty === 1
                  ? "bg-red-100 text-red-500 hover:bg-red-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {item.qty === 1 ? "×" : "−"}
            </button>
            <span className="text-[11px] w-5 text-center font-semibold text-gray-600">
              {item.qty}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChangeQty(1);
              }}
              className="w-5 h-5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 text-[12px] font-bold flex items-center justify-center transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
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
  onOpenPayment: (payload: {
  cart: CartItem[];
  total: number;
  discountAmt: number;
}) => void;
  orderNote: string;
  onOpenNote: () => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [buffer, setBuffer] = useState("");
  const [discount, setDiscount] = useState<Discount>({ type: "percent", value: 0 });
  const [discountOpen, setDiscountOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: taxData } = useGetEffectiveTaxRateQuery({ customerId: customer?.id });
const effectiveTaxRate = taxData?.rate ?? TAX_RATE; 

const { subtotal, discountAmt, afterDiscount, tax, total } = calcTotal(cart, discount, effectiveTaxRate);

  const PRESETS_PERCENT = [5, 10, 15, 20];
  const PRESETS_FLAT = [1, 2, 5, 10];
  const presets = discount.type === "percent" ? PRESETS_PERCENT : PRESETS_FLAT;

  // ─── Item ops ─────────────────────────────────────────────────────────────
  const updateItem = (id: number, val: number) =>
    setCart(cart.map((i) => (i.id === id ? { ...i, qty: Math.max(1, val) } : i)).filter((i) => i.qty > 0));

  const changeQty = (id: number, delta: number) =>
    setCart(cart.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)).filter((i) => i.qty > 0));

  const removeItem = (id: number) => {
    setCart(cart.filter((i) => i.id !== id));
    if (selectedId === id) { setSelectedId(null); setBuffer(""); }
  };

  // ─── Discount handlers ────────────────────────────────────────────────────
  const handleDiscountValue = (v: number) => {
    const max = discount.type === "percent" ? 100 : subtotal;
    setDiscount((prev) => ({ ...prev, value: Math.max(0, Math.min(max, v)) }));
  };

  const applyPreset = (v: number) =>
    setDiscount((prev) => ({ ...prev, value: prev.value === v ? 0 : v }));

  const clearDiscount = () => setDiscount({ type: "percent", value: 0 });

  // ─── Numpad ───────────────────────────────────────────────────────────────
  const handleNumpad = useCallback(
    (key: string) => {
      if (!selectedId) return;
      const next = key === "del" ? buffer.slice(0, -1) : buffer + key;
      setBuffer(next);
      const num = parseFloat(next);
      if (!isNaN(num)) updateItem(selectedId, num);
    },
    [selectedId, buffer]
  );

  // ─── Keyboard ─────────────────────────────────────────────────────────────
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

  const hasDiscount = discount.value > 0;
const [noteItemId, setNoteItemId] = useState<number | null>(null);
const noteItem = noteItemId !== null ? cart.find((i) => i.id === noteItemId) ?? null : null;

const saveLineNote = (note: string) => {
  if (noteItemId === null) return;
  setCart(cart.map((i) => (i.id === noteItemId ? { ...i, note } : i)));
  setNoteItemId(null);
};
  return (
    <div
      className="w-[300px] flex flex-col border-l border-gray-100 bg-white"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100">
        {/* Order badge + name */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-200" />
            <span className="text-[13px] font-bold text-gray-800 tracking-tight">
              {orderName}
            </span>
          </div>
          <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
            {cart.length} {cart.length === 1 ? "item" : "items"}
          </span>
        </div>

        {/* Customer + Note */}
        <div className="flex items-center justify-between mt-3 gap-2">
          <button
            onClick={onOpenCustomer}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {customer ? customer.name : "Add customer"}
          </button>

          <button
            onClick={onOpenNote}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {orderNote ? (
              <span className="max-w-[80px] truncate">{orderNote}</span>
            ) : (
              "Note"
            )}
          </button>
        </div>
      </div>

      {/* ── CART ITEMS ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-[12px] font-medium text-gray-400">Cart is empty</p>
            <p className="text-[11px] text-gray-300 mt-0.5">Tap a product to add it</p>
          </div>
        ) : (
          cart.map((item) => (
            <CartRow
              key={item.id}
              item={item}
              selected={selectedId === item.id}
              onSelect={() => { setSelectedId(item.id); setBuffer(""); }}
              onChangeQty={(d) => changeQty(item.id, d)}
              onRemove={() => removeItem(item.id)}
              onOpenNote={() => setNoteItemId(item.id)}
            />
          ))
        )}
      </div>

      {/* ── DISCOUNT SECTION ───────────────────────────────────────── */}
      <div className="border-t border-gray-100">
        {/* Toggle row */}
        <button
          onClick={() => setDiscountOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M17 17h.01M7 17l10-10M7 7l10 10" />
            </svg>
            <span className="text-[12px] font-semibold text-gray-600">
              Discount
            </span>
            {hasDiscount && (
              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full">
                {discount.type === "percent" ? `${discount.value}%` : `$${discount.value}`}
              </span>
            )}
          </div>
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${discountOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expanded panel */}
        {discountOpen && (
          <div className="px-4 pb-3 space-y-3 bg-gray-50/50">
            {/* Type toggle */}
            <div className="flex gap-1.5">
              <DiscountToggle
                label="% Percent"
                active={discount.type === "percent"}
                onClick={() => setDiscount({ type: "percent", value: 0 })}
              />
              <DiscountToggle
                label="$ Flat"
                active={discount.type === "fixed"}
                onClick={() => setDiscount({ type: "fixed", value: 0 })}
              />
              {hasDiscount && (
                <button
                  onClick={clearDiscount}
                  className="ml-auto text-[10px] text-red-400 hover:text-red-600 font-semibold transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Presets */}
            <div className="flex gap-1.5">
              {presets.map((p) => (
                <PresetChip
                  key={p}
                  value={p}
                  active={discount.value === p}
                  label={discount.type === "percent" ? `${p}%` : `$${p}`}
                  onClick={() => applyPreset(p)}
                />
              ))}
            </div>

            {/* Custom input */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-400">
                {discount.type === "percent" ? "%" : "$"}
              </span>
              <input
                ref={inputRef}
                type="number"
                min={0}
                max={discount.type === "percent" ? 100 : subtotal}
                value={discount.value || ""}
                placeholder={discount.type === "percent" ? "Custom %" : "Custom amount"}
                onChange={(e) => handleDiscountValue(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-1.5 text-[12px] font-semibold text-gray-700 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── TOTALS ────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-1.5">
        <div className="flex justify-between text-[12px] text-gray-500">
          <span>Subtotal</span>
          <span className="tabular-nums font-medium">${fmt(subtotal)}</span>
        </div>

        {hasDiscount && (
          <>
            <div className="flex justify-between text-[12px]">
              <span className="text-emerald-600 font-medium">
                Discount
                {discount.type === "percent" && ` (${discount.value}%)`}
              </span>
              <span className="tabular-nums text-emerald-600 font-semibold">
                −${fmt(discountAmt)}
              </span>
            </div>
            <div className="flex justify-between text-[12px] text-gray-500">
              <span>After discount</span>
              <span className="tabular-nums font-medium">${fmt(afterDiscount)}</span>
            </div>
          </>
        )}

        <div className="flex justify-between text-[12px] text-gray-500">
          <span>Tax</span>
          <span className="tabular-nums font-medium">${fmt(tax)}</span>
        </div>

        <div className="pt-1.5 border-t border-gray-200 flex justify-between items-baseline">
          <span className="text-[13px] font-bold text-gray-800">Total</span>
          <span className="text-[22px] font-black text-gray-900 tabular-nums tracking-tight">
            ${fmt(total)}
          </span>
        </div>
      </div>

      {/* ── PAY BUTTON ────────────────────────────────────────────────── */}
      <div className="p-3">
        <button
          onClick={() => cart.length > 0 && onOpenPayment({ cart, total, discountAmt })}
          disabled={cart.length === 0}
          className={`w-full h-12 rounded-2xl text-[14px] font-bold tracking-wide transition-all duration-200 flex items-center justify-center gap-2 ${
            cart.length === 0
              ? "bg-gray-100 text-gray-300 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white shadow-md shadow-indigo-200"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          {cart.length === 0 ? "Cart empty" : `Pay $${fmt(total)}`}
        </button>
      </div>
      {noteItem && (
        <LineNoteModal
          item={noteItem}
          onSave={saveLineNote}
          onClose={() => setNoteItemId(null)}
        />
      )}
      
    </div>
  );
}