"use client";

import { useState } from "react";
import { useGetCategoriesQuery } from "@/redux/category/categoryApi";
import { useGetAllProductsQuery } from "@/redux/product/productApi";
import { Order, CartItem, Product, Category } from "@/types/pos";

// ─── CLOCK ───────────────────────────────────────────────────────────────────

function ClockDisplay() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
  useState(() => {
    const t = setInterval(
      () =>
        setTime(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        ),
      10000
    );
    return () => clearInterval(t);
  });
  return <>{time}</>;
}

// ─── SEARCH BAR ──────────────────────────────────────────────────────────────

function POSSearchBar({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 h-8 w-52 border border-slate-600">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#94A3B8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products…"
        className="bg-transparent border-none outline-none text-slate-200 text-xs w-full placeholder-slate-500"
      />
      {search && (
        <button
          onClick={() => setSearch("")}
          aria-label="Clear search"
          className="text-slate-400 hover:text-slate-200 text-xs leading-none bg-transparent border-none cursor-pointer"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ─── CATEGORY SIDEBAR ────────────────────────────────────────────────────────

function CategorySidebar({
  selected,
  setSelected,
}: {
  selected: string;
  setSelected: (id: string) => void;
}) {
  const { data: categories = [], isLoading } = useGetCategoriesQuery();

  return (
    <div className="w-36 bg-slate-800 border-r border-slate-700 flex flex-col shrink-0">
      <div className="px-4 pt-4 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        Categories
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* All */}
        <button
          onClick={() => setSelected("All")}
          className={`w-full text-left px-4 py-2.5 text-[13px] font-normal border-l-2 transition-all cursor-pointer ${
            selected === "All"
              ? "bg-blue-600/20 text-blue-400 font-semibold border-blue-500"
              : "text-slate-400 border-transparent hover:bg-slate-700 hover:text-slate-200"
          }`}
        >
          All items
        </button>

        {isLoading && (
          <div className="px-4 py-2 text-[11px] text-slate-500">Loading…</div>
        )}

        {categories.map((cat: Category) => (
          <button
            key={cat.odooCategoryId}
            onClick={() => setSelected(String(cat.odooCategoryId))}
            className={`w-full text-left px-4 py-2.5 text-[13px] font-normal border-l-2 transition-all cursor-pointer ${
              selected === String(cat.odooCategoryId)
                ? "bg-blue-600/20 text-blue-400 font-semibold border-blue-500"
                : "text-slate-400 border-transparent hover:bg-slate-700 hover:text-slate-200"
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
      setCart([...cart, { id: product.id, name: product.name, price: product.price, qty: 1 }]);
    }
  };

  const cartQty = (id: number) => cart.find((i) => i.id === id)?.qty ?? 0;

  if (isLoading) {
    return (
      <div className="grid gap-3 p-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-slate-700 rounded-xl border border-slate-600 h-44 animate-pulse" />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No products found
      </div>
    );
  }

  return (
    <div
      className="grid gap-3 p-4"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}
    >
      {filtered.map((p) => {
        const inCart = cartQty(p.id);
        const oos = p.qty_available <= 0;

        return (
          <button
            key={p.id}
            onClick={() => !oos && addToCart(p)}
            disabled={oos}
            aria-label={`Add ${p.name} to cart`}
            className={`relative bg-slate-700 rounded-xl border text-center overflow-hidden transition-all duration-150 ${
              oos
                ? "border-slate-600 opacity-40 cursor-not-allowed"
                : inCart > 0
                ? "border-blue-500 shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 hover:-translate-y-0.5 cursor-pointer"
                : "border-slate-600 hover:border-blue-500/60 hover:shadow-md hover:shadow-slate-900/40 hover:-translate-y-0.5 cursor-pointer"
            }`}
          >
            {/* Badge */}
            {inCart > 0 && (
              <span className="absolute top-2 right-2 z-10 bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                {inCart}
              </span>
            )}

            {/* Full-bleed image */}
            <div className="w-full h-28 bg-slate-600 overflow-hidden">
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl bg-slate-600">
                  📦
                </div>
              )}
            </div>

            {/* Info */}
            <div className="px-2.5 py-2 text-left">
              <div className="text-[12px] font-medium text-slate-200 leading-tight mb-1 overflow-hidden line-clamp-2">
                {p.name}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-bold text-blue-400">
                  ${Number(p.price).toFixed(2)}
                </div>
                <div className={`text-[10px] ${oos ? "text-red-400" : "text-slate-500"}`}>
                  {oos ? "Out of stock" : `×${p.qty_available}`}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── CART PANEL ──────────────────────────────────────────────────────────────

function CartPanel({
  cart,
  setCart,
  orderName,
}: {
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  orderName: string;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<"Qty" | "Disc" | "Price">("Qty");
  const [buffer, setBuffer] = useState("");

  const subtotal = cart.reduce(
    (acc, item) => acc + item.price * item.qty * (1 - (item.discount || 0) / 100),
    0
  );
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const updateItem = (id: number, val: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.id !== id) return item;
          if (mode === "Qty") return { ...item, qty: Math.max(0, val) };
          if (mode === "Disc") return { ...item, discount: Math.min(100, Math.max(0, val)) };
          if (mode === "Price") return { ...item, price: val };
          return item;
        })
        .filter((item) => item.qty > 0)
    );
    // Deselect if qty zeroed out
    if (mode === "Qty" && val === 0) setSelectedId(null);
  };

  // ── Remove item completely ──
  const removeItem = (id: number) => {
    setCart(cart.filter((item) => item.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // ── Increment / decrement helpers ──
  const incrementItem = (id: number) => {
    setCart(cart.map((item) => (item.id === id ? { ...item, qty: item.qty + 1 } : item)));
  };

  const decrementItem = (id: number) => {
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    if (item.qty <= 1) {
      removeItem(id);
    } else {
      setCart(cart.map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i)));
    }
  };

  const handleNumpad = (key: string) => {
    if (!selectedId) return;
    let next = buffer;
    if (key === "del") next = buffer.slice(0, -1);
    else if (key === "." && buffer.includes(".")) return;
    else next = buffer + key;
    setBuffer(next);
    const num = parseFloat(next);
    if (!isNaN(num)) updateItem(selectedId, num);
  };

  return (
    <div className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col shrink-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700">
        <div className="text-[15px] font-semibold text-slate-100">{orderName}</div>
        <div className="text-xs text-slate-500 mt-0.5">
          {cart.length} item{cart.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Lines */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 && (
          <div className="flex flex-col items-center justify-center h-28 gap-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" aria-hidden="true">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <span className="text-xs text-slate-600">Cart is empty</span>
          </div>
        )}
        {cart.map((item) => (
          <div
            key={item.id}
            onClick={() => { setSelectedId(item.id); setBuffer(""); }}
            className={`px-4 py-3 border-b border-slate-700 cursor-pointer transition-colors ${
              selectedId === item.id
                ? "bg-blue-600/15 border-l-2 border-l-blue-500"
                : "hover:bg-slate-700/50"
            }`}
          >
            <div className="flex justify-between items-start gap-2">
              <span className="truncate max-w-[130px] text-[13px] font-medium text-slate-200">
                {item.name}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[13px] font-semibold text-blue-400">
                  ${(item.price * item.qty * (1 - (item.discount || 0) / 100)).toFixed(2)}
                </span>
                {/* Remove button */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                  aria-label={`Remove ${item.name}`}
                  className="ml-1 text-slate-600 hover:text-red-400 transition-colors border-none bg-transparent cursor-pointer text-[12px] leading-none p-0.5"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Qty controls */}
            <div className="flex items-center gap-2 mt-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); decrementItem(item.id); }}
                aria-label="Decrease quantity"
                className="w-5 h-5 rounded bg-slate-600 hover:bg-red-500/80 text-slate-300 hover:text-white border-none cursor-pointer text-[12px] leading-none flex items-center justify-center transition-colors"
              >
                −
              </button>
              <span className="text-[12px] text-slate-300 min-w-[20px] text-center font-medium">
                {item.qty}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); incrementItem(item.id); }}
                aria-label="Increase quantity"
                className="w-5 h-5 rounded bg-slate-600 hover:bg-blue-500/80 text-slate-300 hover:text-white border-none cursor-pointer text-[12px] leading-none flex items-center justify-center transition-colors"
              >
                +
              </button>
              <span className="text-[11px] text-slate-500">
                × ${item.price.toFixed(2)}
                {item.discount ? (
                  <span className="text-blue-400"> −{item.discount}%</span>
                ) : null}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="px-5 py-4 bg-slate-900/60 border-t border-slate-700">
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>Tax (10%)</span>
          <span className="text-slate-400">${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-slate-100">
          <span>Total</span>
          <span className="text-blue-400">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex border-t border-slate-700">
        {(["Qty", "Disc", "Price"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setBuffer(""); }}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors cursor-pointer border-none ${
              mode === m
                ? "bg-blue-600/25 text-blue-400"
                : "bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Buffer hint */}
      {selectedId && buffer && (
        <div className="text-center text-[11px] text-blue-400 font-semibold bg-blue-600/10 py-1">
          {mode}: {buffer}
        </div>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-px bg-slate-700 p-px">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map((key) => (
          <button
            key={key}
            onClick={() => handleNumpad(key)}
            className="h-10 bg-slate-800 text-base font-medium text-slate-300 hover:bg-slate-700 active:bg-blue-600/30 active:text-blue-400 transition-colors cursor-pointer border-none"
          >
            {key === "del" ? "⌫" : key}
          </button>
        ))}
      </div>

      {/* Pay button */}
      <button className="mx-3 my-3 h-11 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold text-[15px] rounded-xl border-none cursor-pointer transition-all shadow-lg shadow-blue-900/40">
        Pay ${total.toFixed(2)}
      </button>
    </div>
  );
}

// ─── HOLD ORDERS PANEL ───────────────────────────────────────────────────────

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
  const addOrder = () => {
    const newId = Date.now();
    setOrders([
      ...orders,
      { id: newId, name: `Order ${orders.length + 1}`, cart: [], createdAt: new Date() },
    ]);
    setActiveOrderId(newId);
  };

  const deleteOrder = (id: number) => {
    const updated = orders.filter((o) => o.id !== id);
    setOrders(updated);
    if (activeOrderId === id && updated.length > 0) setActiveOrderId(updated[0].id);
  };

  const orderTotal = (order: Order) =>
    order.cart.reduce((s, i) => s + i.price * i.qty * (1 - (i.discount || 0) / 100), 0);

  return (
    <div className="w-36 bg-slate-800 border-l border-slate-700 flex flex-col shrink-0">
      {/* Header */}
      <div className="h-12 bg-slate-900/50 border-b border-slate-700 flex items-center justify-between px-3.5 shrink-0">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Orders
        </span>
        <button
          onClick={addOrder}
          aria-label="New order"
          className="w-6 h-6 bg-blue-600 hover:bg-blue-500 text-white text-base rounded-md flex items-center justify-center border-none cursor-pointer transition-colors leading-none shadow-sm"
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
            <div
              key={order.id}
              onClick={() => setActiveOrderId(order.id)}
              className={`px-3.5 py-2.5 border-b border-slate-700 cursor-pointer transition-colors border-l-2 ${
                isActive
                  ? "bg-blue-600/15 border-l-blue-500"
                  : "border-l-transparent hover:bg-slate-700/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[12px] font-medium truncate flex-1 ${
                    isActive ? "text-blue-400" : "text-slate-300"
                  }`}
                >
                  {order.name}
                </span>
                {orders.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }}
                    aria-label={`Delete ${order.name}`}
                    className="text-slate-600 hover:text-red-400 text-[11px] border-none bg-transparent cursor-pointer pl-1 leading-none"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className={`text-[10px] mt-0.5 ${isActive ? "text-blue-500" : "text-slate-500"}`}>
                {order.cart.length} item{order.cart.length !== 1 ? "s" : ""}
                {tot > 0 ? ` · $${tot.toFixed(2)}` : ""}
              </div>
              <div className={`text-[10px] mt-0.5 ${isActive ? "text-blue-600" : "text-slate-600"}`}>
                {order.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3.5 py-3 border-t border-slate-700 bg-slate-900/50 shrink-0">
        <div className="text-[10px] text-slate-500 mb-1">Active orders</div>
        <div className="text-base font-bold text-slate-200">{orders.length}</div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          Total: <span className="text-blue-400">${orders.reduce((s, o) => s + orderTotal(o), 0).toFixed(2)}</span>
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

  const activeOrder = orders.find((o) => o.id === activeOrderId);

  const updateCart = (newCart: CartItem[]) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === activeOrderId ? { ...o, cart: newCart } : o))
    );
  };

  return (
    <div
      className="flex flex-col bg-slate-900"
      style={{ height: "calc(100vh - 60px)" }}
    >
      {/* Top bar */}
      <div className="h-12 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span className="text-[14px] font-semibold text-slate-100">POS — Shop #1</span>
          <span className="text-[11px] bg-emerald-900/50 text-emerald-400 border border-emerald-700/50 px-2.5 py-0.5 rounded-full font-medium">
            ● Session open
          </span>
        </div>
        <div className="flex items-center gap-4">
          <POSSearchBar search={search} setSearch={setSearch} />
          <span className="text-[13px] text-slate-400 font-medium">👤 Admin</span>
          <span className="text-[12px] text-slate-500 font-mono">
            <ClockDisplay />
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <CategorySidebar selected={category} setSelected={setCategory} />

        <div className="flex-1 overflow-y-auto bg-slate-900">
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
        />

        <HoldOrdersPanel
          orders={orders}
          setOrders={setOrders}
          activeOrderId={activeOrderId}
          setActiveOrderId={setActiveOrderId}
        />
      </div>
    </div>
  );
}