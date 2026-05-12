"use client";

import CartPanel from "@/components/CartPanel";
import CategorySidebar from "@/components/CategorySidebar";
import POSSearchBar from "@/components/POSSearchBar";
import ProductGrid from "@/components/ProductGrid";
import { useState } from "react";

export default function CashierPage() {
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">

      {/* 🔎 SEARCH BAR (TOP like Odoo) */}
      <POSSearchBar search={search} setSearch={setSearch} />

      <div className="flex flex-1">

        {/* LEFT */}
        <CategorySidebar
          selected={category}
          setSelected={setCategory}
        />

        {/* CENTER */}
        <div className="flex-1 overflow-y-auto p-3">
          <ProductGrid
            category={category}
            search={search}
            cart={cart}
            setCart={setCart}
          />
        </div>

        {/* RIGHT */}
        <CartPanel cart={cart} setCart={setCart} />

      </div>
    </div>
  );
}