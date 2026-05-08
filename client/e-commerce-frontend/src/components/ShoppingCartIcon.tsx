"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import React from "react";
import useCartStore from "../stores/cartStore";

const ShoppingCartIcon = () => {
     const { cart, hasHydrated } = useCartStore();

  if (!hasHydrated) return null;
  return (
    <Link
      href="/cart"
      className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors duration-200"
    >
      {/* ICON */}
      <ShoppingCart className="w-6 h-6 text-gray-800" />

      {/* BADGE */}
      <span className="absolute -top-1 -right-1 bg-amber-400 text-white text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
          {cart.reduce((acc, item) => acc + item.quantity, 0)}
      </span>
    </Link>
  );
};

export default ShoppingCartIcon;