"use client";

import { useEffect, useState } from "react";
import { useGetCategoriesQuery } from "@/redux/category/categoryApi";
import { useGetAllProductsQuery } from "@/redux/product/productApi";
import { Order, CartItem, Product, Category } from "@/types/pos";

// ─── CLOCK ───────────────────────────────────────────────────────────────────

function ClockDisplay() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  );
  useEffect(() => {
    const t = setInterval(
      () =>
        setTime(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        ),
      10000,
    );
    return () => clearInterval(t);
  }, []);
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
    <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 h-8 w-52">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#9CA3AF"
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
        className="bg-transparent border-none outline-none text-gray-700 text-xs w-full placeholder-gray-400"
      />
      {search && (
        <button
          onClick={() => setSearch("")}
          aria-label="Clear search"
          className="text-gray-400 hover:text-gray-600 text-xs leading-none bg-transparent border-none cursor-pointer"
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
    <div className="w-36 bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div className="px-4 pt-4 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
        Categories
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* All */}
        <button
          onClick={() => setSelected("All")}
          className={`w-full text-left px-4 py-2.5 text-[13px] font-normal border-l-2 transition-all cursor-pointer ${
            selected === "All"
              ? "bg-blue-50 text-blue-600 font-medium border-blue-500"
              : "text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          All items
        </button>

        {isLoading && (
          <div className="px-4 py-2 text-[11px] text-gray-400">Loading…</div>
        )}

        {categories.map((cat: Category) => (
          <button
            key={cat.odooCategoryId}
            onClick={() => setSelected(String(cat.odooCategoryId))}
            className={`w-full text-left px-4 py-2.5 text-[13px] font-normal border-l-2 transition-all cursor-pointer ${
              selected === String(cat.odooCategoryId)
                ? "bg-blue-50 text-blue-600 font-medium border-blue-500"
                : "text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900"
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
    categoryId !== undefined ? { categoryId } : undefined,
  );

  const filtered = (products as Product[]).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const addToCart = (product: Product) => {
    const exist = cart.find((i) => i.id === product.id);
    if (exist) {
      setCart(
        cart.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i)),
      );
    } else {
      setCart([
        ...cart,
        { id: product.id, name: product.name, price: product.price, qty: 1 },
      ]);
    }
  };

  const cartQty = (id: number) => cart.find((i) => i.id === id)?.qty ?? 0;

  if (isLoading) {
    return (
      <div
        className="grid gap-2.5 p-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No products found
      </div>
    );
  }

  return (
    <div
      className="grid gap-2.5 p-4"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}
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

            <div className="w-11 h-11 bg-gray-100 rounded-xl mx-auto mb-2.5 flex items-center justify-center text-2xl overflow-hidden">
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
              ) : (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#D1D5DB"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                  <line x1="12" y1="12" x2="12" y2="17" />
                  <line x1="9.5" y1="14.5" x2="14.5" y2="14.5" />
                </svg>
              )}
            </div>

            <div className="text-[11px] font-medium text-gray-900 leading-tight mb-1.5 overflow-hidden line-clamp-2">
              {p.name}
            </div>

            <div className="text-[13px] font-semibold text-blue-600">
              ${Number(p.price).toFixed(2)}
            </div>

            <div
              className={`text-[10px] mt-0.5 ${oos ? "text-red-500" : "text-gray-400"}`}
            >
              {oos ? "Out of stock" : `Stock: ${p.qty_available}`}
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
    (acc, item) =>
      acc + item.price * item.qty * (1 - (item.discount || 0) / 100),
    0,
  );
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const updateItem = (id: number, val: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.id !== id) return item;
          if (mode === "Qty") return { ...item, qty: Math.max(0, val) };
          if (mode === "Disc")
            return { ...item, discount: Math.min(100, Math.max(0, val)) };
          if (mode === "Price") return { ...item, price: val };
          return item;
        })
        .filter((item) => item.qty > 0),
    );
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
    <div className="w-72 bg-white border-l border-gray-100 flex flex-col shrink-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50">
        <div className="text-[15px] font-semibold text-gray-900">
          {orderName}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {cart.length} item{cart.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Lines */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 && (
          <div className="flex flex-col items-center justify-center h-28 gap-2">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="1.5"
              aria-hidden="true"
            >
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
    onClick={() => {
      setSelectedId(item.id);
      setBuffer("");
    }}
    className={`px-5 py-3 border-b border-gray-50 cursor-pointer transition-colors ${
      selectedId === item.id
        ? "bg-blue-50 border-l-2 border-l-blue-500"
        : "hover:bg-gray-50"
    }`}
  >
    <div className="flex justify-between text-[13px] font-medium text-gray-900">
      <span className="truncate max-w-[150px]">{item.name}</span>
      <div className="flex items-center gap-2">
        <span>
          ${(item.price * item.qty * (1 - (item.discount || 0) / 100)).toFixed(2)}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCart(cart.filter((i) => i.id !== item.id));
            if (selectedId === item.id) setSelectedId(null);
          }}
          aria-label={`Remove ${item.name}`}
          className="text-gray-300 hover:text-red-500 bg-transparent border-none cursor-pointer leading-none transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
    <div className="text-[11px] text-gray-400 mt-1">
      {item.qty} × ${item.price.toFixed(2)}
      {item.discount ? (
        <span className="text-blue-500"> −{item.discount}%</span>
      ) : null}
    </div>
  </div>
))}
      </div>

      {/* Totals */}
      <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>Tax (10%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-semibold text-gray-900">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex border-t border-gray-100">
        {(["Qty", "Disc", "Price"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setBuffer("");
            }}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors cursor-pointer border-none ${
              mode === m
                ? "bg-blue-50 text-blue-600 font-semibold"
                : "bg-white text-gray-500 hover:bg-gray-50"
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
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map(
          (key) => (
            <button
              key={key}
              onClick={() => handleNumpad(key)}
              className="h-10 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 active:bg-blue-50 active:text-blue-600 transition-colors cursor-pointer border-none"
            >
              {key === "del" ? "⌫" : key}
            </button>
          ),
        )}
      </div>

      {/* Pay button */}
      <button className="mx-3 my-3 h-11 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-[15px] rounded-xl border-none cursor-pointer transition-all">
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
      {
        id: newId,
        name: `Order ${orders.length + 1}`,
        cart: [],
        createdAt: new Date(),
      },
    ]);
    setActiveOrderId(newId);
  };

  const deleteOrder = (id: number) => {
    const updated = orders.filter((o) => o.id !== id);
    setOrders(updated);
    if (activeOrderId === id && updated.length > 0)
      setActiveOrderId(updated[0].id);
  };

  const orderTotal = (order: Order) =>
    order.cart.reduce(
      (s, i) => s + i.price * i.qty * (1 - (i.discount || 0) / 100),
      0,
    );

  return (
    <div className="w-36 bg-white border-l border-gray-100 flex flex-col shrink-0">
      {/* Header */}
      <div className="h-12 bg-gray-50 border-b border-gray-100 flex items-center justify-between px-3.5 shrink-0">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
          Orders
        </span>
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
            <div
              key={order.id}
              onClick={() => setActiveOrderId(order.id)}
              className={`px-3.5 py-2.5 border-b border-gray-50 cursor-pointer transition-colors border-l-2 ${
                isActive
                  ? "bg-blue-50 border-l-blue-500"
                  : "border-l-transparent hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[12px] font-medium truncate flex-1 ${
                    isActive ? "text-blue-600" : "text-gray-800"
                  }`}
                >
                  {order.name}
                </span>
                {orders.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteOrder(order.id);
                    }}
                    aria-label={`Delete ${order.name}`}
                    className="text-gray-300 hover:text-red-400 text-[11px] border-none bg-transparent cursor-pointer pl-1 leading-none"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div
                className={`text-[10px] mt-0.5 ${isActive ? "text-blue-400" : "text-gray-400"}`}
              >
                {order.cart.length} item{order.cart.length !== 1 ? "s" : ""}
                {tot > 0 ? ` · $${tot.toFixed(2)}` : ""}
              </div>
              <div
                className={`text-[10px] mt-0.5 ${isActive ? "text-blue-300" : "text-gray-300"}`}
              >
                {order.createdAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3.5 py-3 border-t border-gray-100 bg-gray-50 shrink-0">
        <div className="text-[10px] text-gray-400 mb-1">Active orders</div>
        <div className="text-base font-semibold text-gray-900">
          {orders.length}
        </div>
        <div className="text-[10px] text-gray-400 mt-0.5">
          Total: ${orders.reduce((s, o) => s + orderTotal(o), 0).toFixed(2)}
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
      prev.map((o) => (o.id === activeOrderId ? { ...o, cart: newCart } : o)),
    );
  };

  return (
    <div
      className="flex flex-col bg-gray-50"
      style={{ height: "calc(100vh - 60px)" }}
    >
      {/* Top bar */}
      <div className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-3">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2563EB"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-[14px] font-semibold text-gray-900">
            POS — Shop #1
          </span>
          <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-medium">
            ● Session open
          </span>
        </div>
        <div className="flex items-center gap-4">
          <POSSearchBar search={search} setSearch={setSearch} />
          <span className="text-[13px] text-gray-500 font-medium">
            👤 Admin
          </span>
          <span className="text-[12px] text-gray-400">
            <ClockDisplay />
          </span>
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
