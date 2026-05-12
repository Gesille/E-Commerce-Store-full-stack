"use client";

import CartPanel from "@/components/CartPanel";
import CategorySidebar from "@/components/CategorySidebar";
import HoldOrdersPanel from "@/components/HoldOrdersPanel";
import POSSearchBar from "@/components/POSSearchBar";
import ProductGrid from "@/components/ProductGrid";
import { useState } from "react";


export default function CashierPage() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  // 🔥 MULTIPLE ORDERS (Odoo sessions)
  const [orders, setOrders] = useState<any[]>([
    { id: 1, name: "Order 1", cart: [] },
  ]);

  const [activeOrderId, setActiveOrderId] = useState(1);

  const activeOrder = orders.find((o) => o.id === activeOrderId);

  const updateCart = (newCart: any[]) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === activeOrderId ? { ...o, cart: newCart } : o
      )
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">

      <POSSearchBar search={search} setSearch={setSearch} />

      <div className="flex flex-1">

        <CategorySidebar
          selected={category}
          setSelected={setCategory}
        />

        <div className="flex-1 p-3 overflow-y-auto">
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