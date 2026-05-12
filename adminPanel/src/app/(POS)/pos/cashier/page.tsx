"use client";

import CartPanel from "@/components/CartPanel";
import CategorySidebar from "@/components/CategorySidebar";
import HoldOrdersPanel from "@/components/HoldOrdersPanel";
import POSSearchBar from "@/components/POSSearchBar";
import ProductGrid from "@/components/ProductGrid";
import { Order, CartItem } from "@/types/pos";
import { useState } from "react";

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
      prev.map((o) =>
        o.id === activeOrderId ? { ...o, cart: newCart } : o
      )
    );
  };

  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - 60px)", background: "#f5f0e8" }}
    >
      {/* Top bar */}
      <div
        style={{
          background: "#3a3936",
          borderBottom: "1px solid #2C2C2A",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          height: "42px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#f1efe8", fontSize: "13px", fontWeight: 500 }}>
            🏪 POS — Shop #1
          </span>
          <span
            style={{
              background: "#3B6D11",
              color: "#EAF3DE",
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "3px",
              marginLeft: "8px",
            }}
          >
            ● Session open
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <POSSearchBar search={search} setSearch={setSearch} />
          <span style={{ color: "#B4B2A9", fontSize: "11px" }}>
            👤 Admin
          </span>
          <span style={{ color: "#B4B2A9", fontSize: "11px" }}>
            <ClockDisplay />
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <CategorySidebar selected={category} setSelected={setCategory} />

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            background: "#f5f0e8",
          }}
        >
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

function ClockDisplay() {
  const [time, setTime] = useState(
    () =>
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
  useState(() => {
    const t = setInterval(
      () =>
        setTime(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        ),
      10000
    );
    return () => clearInterval(t);
  });
  return <>{time}</>;
}