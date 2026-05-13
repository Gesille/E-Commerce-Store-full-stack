"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useGetCategoriesQuery } from "@/redux/category/categoryApi";
import { useGetAllProductsQuery } from "@/redux/product/productApi";
import { Order, CartItem, Product, Category } from "@/types/pos";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface PaymentLine {
  method: "cash" | "card" | "bank";
  amount: number;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toFixed(2);
}

function calcLineTotal(item: CartItem) {
  return item.price * item.qty * (1 - (item.discount || 0) / 100);
}

function calcOrderTotals(cart: CartItem[]) {
  const subtotal = cart.reduce((acc, i) => acc + calcLineTotal(i), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

// ─── CLOCK ────────────────────────────────────────────────────────────────────

function ClockDisplay() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
  useEffect(() => {
    const t = setInterval(
      () =>
        setTime(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        ),
      60000
    );
    return () => clearInterval(t);
  }, []);
  return <>{time}</>;
}

// ─── SEARCH BAR ───────────────────────────────────────────────────────────────

function POSSearchBar({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 h-8 w-52">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products…"
        className="bg-transparent border-none outline-none text-gray-700 text-xs w-full placeholder-gray-400"
      />
      {search && (
        <button onClick={() => setSearch("")} aria-label="Clear search" className="text-gray-400 hover:text-gray-600 text-xs leading-none bg-transparent border-none cursor-pointer">
          ✕
        </button>
      )}
    </div>
  );
}

// ─── CUSTOMER MODAL ───────────────────────────────────────────────────────────

function CustomerModal({
  current,
  onSelect,
  onClose,
}: {
  current: Customer | null;
  onSelect: (c: Customer | null) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  // TODO: replace with useGetCustomersQuery() from your API
  const mockCustomers: Customer[] = [
    { id: 1, name: "Alice Johnson", email: "alice@example.com", phone: "+1 555-0101" },
    { id: 2, name: "Bob Smith", email: "bob@example.com", phone: "+1 555-0102" },
    { id: 3, name: "Carol White", email: "carol@example.com", phone: "+1 555-0103" },
    { id: 4, name: "David Brown", email: "david@example.com", phone: "+1 555-0104" },
  ];

  const filtered = mockCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] max-h-[520px] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="text-[15px] font-semibold text-gray-900">Select Customer</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-lg leading-none">✕</button>
        </div>
        <div className="px-4 py-3 border-b border-gray-50">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 h-9">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or phone…" className="bg-transparent border-none outline-none text-gray-700 text-xs w-full placeholder-gray-400" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {current && (
            <button
              onClick={() => { onSelect(null); onClose(); }}
              className="w-full text-left px-5 py-3 text-xs text-red-500 hover:bg-red-50 border-b border-gray-50 cursor-pointer bg-transparent border-none transition-colors"
            >
              ✕ Remove customer
            </button>
          )}
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => { onSelect(c); onClose(); }}
              className={`px-5 py-3 border-b border-gray-50 cursor-pointer transition-colors hover:bg-blue-50 ${current?.id === c.id ? "bg-blue-50" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-medium text-gray-900">{c.name}</div>
                {current?.id === c.id && <span className="text-blue-500 text-xs">✓ Selected</span>}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">{c.email} · {c.phone}</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-20 text-gray-400 text-sm">No customers found</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PAYMENT MODAL ────────────────────────────────────────────────────────────

function PaymentModal({
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
  const [cashInput, setCashInput] = useState(fmt(total));

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

// ─── RECEIPT MODAL ────────────────────────────────────────────────────────────

function ReceiptModal({
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

// ─── ORDER NOTE MODAL ─────────────────────────────────────────────────────────

function NoteModal({
  initial,
  onSave,
  onClose,
}: {
  initial: string;
  onSave: (note: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[360px] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[14px] font-semibold text-gray-900">Order Note</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-lg leading-none">✕</button>
        </div>
        <textarea
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Allergies, special requests…"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-gray-700 outline-none focus:border-blue-400 resize-none h-24 placeholder-gray-400"
        />
        <div className="flex gap-2 mt-3">
          <button onClick={onClose} className="flex-1 h-9 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 bg-transparent cursor-pointer">Cancel</button>
          <button onClick={() => { onSave(note); onClose(); }} className="flex-1 h-9 bg-blue-600 text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── LINE NOTE MODAL ──────────────────────────────────────────────────────────

function LineNoteModal({
  item,
  onSave,
  onClose,
}: {
  item: CartItem;
  onSave: (note: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState(item.note || "");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[360px] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[14px] font-semibold text-gray-900">Note for {item.name}</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-lg leading-none">✕</button>
        </div>
        <textarea
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. No onions, well done…"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-gray-700 outline-none focus:border-blue-400 resize-none h-20 placeholder-gray-400"
        />
        <div className="flex gap-2 mt-3">
          <button onClick={onClose} className="flex-1 h-9 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 bg-transparent cursor-pointer">Cancel</button>
          <button onClick={() => { onSave(note); onClose(); }} className="flex-1 h-9 bg-blue-600 text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── CATEGORY SIDEBAR ─────────────────────────────────────────────────────────

function CategorySidebar({
  selected,
  setSelected,
}: {
  selected: string;
  setSelected: (id: string) => void;
}) {
  const { data: categories = [], isLoading } = useGetCategoriesQuery();

  return (
    <div className="w-36 bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div className="px-4 pt-4 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Categories</div>
      <div className="flex-1 overflow-y-auto">
        <button
          onClick={() => setSelected("All")}
          className={`w-full text-left px-4 py-2.5 text-[13px] font-normal border-l-2 transition-all cursor-pointer ${
            selected === "All" ? "bg-blue-50 text-blue-600 font-medium border-blue-500" : "text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          All items
        </button>
        {isLoading && <div className="px-4 py-2 text-[11px] text-gray-400">Loading…</div>}
        {categories.map((cat: Category) => (
          <button
            key={cat.odooCategoryId}
            onClick={() => setSelected(String(cat.odooCategoryId))}
            className={`w-full text-left px-4 py-2.5 text-[13px] font-normal border-l-2 transition-all cursor-pointer ${
              selected === String(cat.odooCategoryId) ? "bg-blue-50 text-blue-600 font-medium border-blue-500" : "text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {cat.catTitle}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── PRODUCT GRID ─────────────────────────────────────────────────────────────

function ProductGrid({
  category,
  search,
  cart,
  setCart,
}: {
  category: string;
  search: string;
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
}) {
  const categoryId = category !== "All" ? Number(category) : undefined;
  const { data: products = [], isLoading } = useGetAllProductsQuery(
    categoryId !== undefined ? { categoryId } : undefined
  );

  const filtered = (products as Product[]).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const exist = cart.find((i) => i.id === product.id);
    if (exist) {
      setCart(cart.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i)));
    } else {
      setCart([...cart, {  note: "",id: product.id, name: product.name, price: product.price, qty: 1 }]);
    }
  };

  const cartQty = (id: number) => cart.find((i) => i.id === id)?.qty ?? 0;

  if (isLoading) {
    return (
      <div className="grid gap-2.5 p-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No products found</div>
    );
  }

  return (
    <div className="grid gap-2.5 p-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
      {filtered.map((p) => {
        const inCart = cartQty(p.id);
        const oos = p.qty_available <= 0;
        const lowStock = !oos && p.qty_available <= 3;

        return (
          <button
            key={p.id}
            onClick={() => !oos && addToCart(p)}
            disabled={oos}
            aria-label={`Add ${p.name} to cart`}
            className={`relative bg-white rounded-xl border text-center p-3 transition-all duration-150 ${
              oos
                ? "border-gray-100 opacity-40 cursor-not-allowed"
                : inCart > 0
                ? "border-blue-200 hover:border-blue-300 hover:shadow-sm hover:-translate-y-px cursor-pointer"
                : "border-gray-100 hover:border-blue-200 hover:shadow-sm hover:-translate-y-px cursor-pointer"
            }`}
          >
            {inCart > 0 && (
              <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center">
                {inCart}
              </span>
            )}
            <div className="w-11 h-11 bg-gray-100 rounded-xl mx-auto mb-2.5 flex items-center justify-center overflow-hidden">
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                  <line x1="12" y1="12" x2="12" y2="17" />
                  <line x1="9.5" y1="14.5" x2="14.5" y2="14.5" />
                </svg>
              )}
            </div>
            <div className="text-[11px] font-medium text-gray-900 leading-tight mb-1.5 overflow-hidden line-clamp-2">{p.name}</div>
            <div className="text-[13px] font-semibold text-blue-600">${Number(p.price).toFixed(2)}</div>
            <div className={`text-[10px] mt-0.5 ${oos ? "text-red-500" : lowStock ? "text-amber-500" : "text-gray-400"}`}>
              {oos ? "Out of stock" : lowStock ? `Low: ${p.qty_available}` : `Stock: ${p.qty_available}`}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── CART PANEL ───────────────────────────────────────────────────────────────

function CartPanel({
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

// ─── HOLD ORDERS PANEL ────────────────────────────────────────────────────────

function HoldOrdersPanel({
  orders,
  setOrders,
  activeOrderId,
  setActiveOrderId,
}: {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  activeOrderId: number;
  setActiveOrderId: (id: number) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const addOrder = () => {
    const newId = Date.now();
    setOrders([...orders, { id: newId, name: `Order ${orders.length + 1}`, cart: [], createdAt: new Date() }]);
    setActiveOrderId(newId);
  };

  const deleteOrder = (id: number) => {
    const updated = orders.filter((o) => o.id !== id);
    setOrders(updated);
    if (activeOrderId === id && updated.length > 0) setActiveOrderId(updated[0].id);
    setConfirmDelete(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    if (order.cart.length > 0) {
      setConfirmDelete(order.id);
    } else {
      deleteOrder(order.id);
    }
  };

  const orderTotal = (order: Order) =>
    order.cart.reduce((s, i) => s + calcLineTotal(i), 0);

  return (
    <div className="w-36 bg-white border-l border-gray-100 flex flex-col shrink-0">
      {/* Header */}
      <div className="h-12 bg-gray-50 border-b border-gray-100 flex items-center justify-between px-3.5 shrink-0">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Orders</span>
        <button
          onClick={addOrder}
          aria-label="New order"
          className="w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white text-base rounded-md flex items-center justify-center border-none cursor-pointer transition-colors leading-none"
        >
          +
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {orders.map((order) => {
          const isActive = order.id === activeOrderId;
          const tot = orderTotal(order);

          return (
            <div key={order.id}>
              <div
                onClick={() => setActiveOrderId(order.id)}
                className={`px-3.5 py-2.5 border-b border-gray-50 cursor-pointer transition-colors border-l-2 ${
                  isActive ? "bg-blue-50 border-l-blue-500" : "border-l-transparent hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[12px] font-medium truncate flex-1 ${isActive ? "text-blue-600" : "text-gray-800"}`}>
                    {order.name}
                  </span>
                  {orders.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteClick(e, order)}
                      aria-label={`Delete ${order.name}`}
                      className="text-gray-300 hover:text-red-400 text-[11px] border-none bg-transparent cursor-pointer pl-1 leading-none"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className={`text-[10px] mt-0.5 ${isActive ? "text-blue-400" : "text-gray-400"}`}>
                  {order.cart.length} item{order.cart.length !== 1 ? "s" : ""}
                  {tot > 0 ? ` · $${fmt(tot)}` : ""}
                </div>
                <div className={`text-[10px] mt-0.5 ${isActive ? "text-blue-300" : "text-gray-300"}`}>
                  {order.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>

              {/* Confirm delete */}
              {confirmDelete === order.id && (
                <div className="px-3 py-2 bg-red-50 border-b border-red-100">
                  <div className="text-[10px] text-red-600 mb-1.5">Delete order with items?</div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="flex-1 text-[10px] border border-gray-200 rounded py-1 bg-white cursor-pointer hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="flex-1 text-[10px] bg-red-500 text-white rounded py-1 border-none cursor-pointer hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3.5 py-3 border-t border-gray-100 bg-gray-50 shrink-0">
        <div className="text-[10px] text-gray-400 mb-1">Active orders</div>
        <div className="text-base font-semibold text-gray-900">{orders.length}</div>
        <div className="text-[10px] text-gray-400 mt-0.5">
          Total: ${fmt(orders.reduce((s, o) => s + orderTotal(o), 0))}
        </div>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function CashierPage() {
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState<string>("");

  const [orders, setOrders] = useState<Order[]>([
    { id: 1, name: "Order 1", cart: [], createdAt: new Date() },
  ]);
  const [activeOrderId, setActiveOrderId] = useState<number>(1);

  // Per-order state: customer, note
  const [orderMeta, setOrderMeta] = useState<Record<number, { customer: Customer | null; note: string }>>({
    1: { customer: null, note: "" },
  });

  // Modals
  const [showCustomer, setShowCustomer] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [receipt, setReceipt] = useState<{ order: Order; paymentLines: PaymentLine[] } | null>(null);

  const activeOrder = orders.find((o) => o.id === activeOrderId);
  const activeMeta = orderMeta[activeOrderId] || { customer: null, note: "" };
  const { total } = calcOrderTotals(activeOrder?.cart || []);

  const updateCart = (newCart: CartItem[]) => {
    setOrders((prev) => prev.map((o) => (o.id === activeOrderId ? { ...o, cart: newCart } : o)));
  };

  const setMeta = (patch: Partial<{ customer: Customer | null; note: string }>) => {
    setOrderMeta((prev) => ({ ...prev, [activeOrderId]: { ...activeMeta, ...patch } }));
  };

  // When a new order is added, initialise its meta
  const handleSetOrders = (newOrders: Order[]) => {
    setOrders(newOrders);
    newOrders.forEach((o) => {
      if (!orderMeta[o.id]) {
        setOrderMeta((prev) => ({ ...prev, [o.id]: { customer: null, note: "" } }));
      }
    });
  };

  const handlePaymentConfirm = (lines: PaymentLine[]) => {
    if (!activeOrder) return;

    // TODO: POST to your backend here
    // Example:
    // await fetch("/api/pos/complete-order", {
    //   method: "POST",
    //   body: JSON.stringify({
    //     orderName: activeOrder.name,
    //     cart: activeOrder.cart,
    //     customer: activeMeta.customer,
    //     note: activeMeta.note,
    //     paymentLines: lines,
    //     generateOdooInvoice: true,   // ← triggers Odoo account.move.create
    //   }),
    // });

    setReceipt({ order: { ...activeOrder }, paymentLines: lines });
    setShowPayment(false);
  };

  const handleNewOrderAfterReceipt = () => {
    // Clear the completed order
    const newId = Date.now();
    const remaining = orders.filter((o) => o.id !== activeOrderId);
    if (remaining.length === 0) {
      setOrders([{ id: newId, name: "Order 1", cart: [], createdAt: new Date() }]);
      setActiveOrderId(newId);
      setOrderMeta({ [newId]: { customer: null, note: "" } });
    } else {
      setOrders(remaining);
      setActiveOrderId(remaining[0].id);
    }
    setReceipt(null);
  };

  // Barcode scanner support
  useEffect(() => {
    let barcodeBuffer = "";
    let barcodeTimer: ReturnType<typeof setTimeout>;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      clearTimeout(barcodeTimer);
      if (e.key === "Enter" && barcodeBuffer.length > 3) {
        // TODO: look up product by barcode
        // dispatch(lookupBarcode(barcodeBuffer));
        console.log("Barcode scanned:", barcodeBuffer);
        barcodeBuffer = "";
        return;
      }
      if (e.key.length === 1) barcodeBuffer += e.key;
      barcodeTimer = setTimeout(() => { barcodeBuffer = ""; }, 100);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <div className="flex flex-col bg-gray-50" style={{ height: "calc(100vh - 60px)" }}>
        {/* Top bar */}
        <div className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-[14px] font-semibold text-gray-900">POS — Shop #1</span>
            <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-medium">● Session open</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-gray-400 hidden sm:block">⌨ Keyboard shortcuts: Esc · Del · 0-9</span>
            <POSSearchBar search={search} setSearch={setSearch} />
            <span className="text-[13px] text-gray-500 font-medium">👤 Admin</span>
            <span className="text-[12px] text-gray-400"><ClockDisplay /></span>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          <CategorySidebar selected={category} setSelected={setCategory} />

          <div className="flex-1 overflow-y-auto bg-gray-50">
            <ProductGrid
              category={category}
              search={search}
              cart={activeOrder?.cart || []}
              setCart={updateCart}
            />
          </div>

          <CartPanel
            cart={activeOrder?.cart || []}
            setCart={updateCart}
            orderName={activeOrder?.name || ""}
            customer={activeMeta.customer}
            onOpenCustomer={() => setShowCustomer(true)}
            onOpenPayment={() => setShowPayment(true)}
            orderNote={activeMeta.note}
            onOpenNote={() => setShowNote(true)}
          />

          <HoldOrdersPanel
            orders={orders}
            setOrders={handleSetOrders}
            activeOrderId={activeOrderId}
            setActiveOrderId={setActiveOrderId}
          />
        </div>
      </div>

      {/* Modals */}
      {showCustomer && (
        <CustomerModal
          current={activeMeta.customer}
          onSelect={(c) => setMeta({ customer: c })}
          onClose={() => setShowCustomer(false)}
        />
      )}

      {showPayment && activeOrder && (
        <PaymentModal
          total={total}
          orderName={activeOrder.name}
          customer={activeMeta.customer}
          cart={activeOrder.cart}
          onClose={() => setShowPayment(false)}
          onConfirm={handlePaymentConfirm}
        />
      )}

      {showNote && (
        <NoteModal
          initial={activeMeta.note}
          onSave={(note) => setMeta({ note })}
          onClose={() => setShowNote(false)}
        />
      )}

      {receipt && (
        <ReceiptModal
          order={receipt.order}
          customer={activeMeta.customer}
          paymentLines={receipt.paymentLines}
          onClose={() => setReceipt(null)}
          onNewOrder={handleNewOrderAfterReceipt}
        />
      )}
    </>
  );
}