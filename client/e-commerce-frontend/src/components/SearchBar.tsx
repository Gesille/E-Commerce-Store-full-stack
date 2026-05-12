/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useGetProductsQuery } from "@/redux/product/productApi";
import Image from "next/image";

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data } = useGetProductsQuery(undefined);

  // Support both { products: [] } and [] shapes
  const allProducts: any[] = Array.isArray(data?.products)
    ? data.products
    : Array.isArray(data)
    ? data
    : [];

  const results = query.trim()
    ? allProducts.filter((p: any) =>
        p?.name?.toLowerCase().includes(query.toLowerCase()) ||
        p?.shortDescription?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8) // cap at 8 results
    : [];

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (product: any) => {
    setQuery("");
    setOpen(false);
    router.push(`/products/${product.slug ?? product.id}`);
  };

  return (
    <div ref={ref} className="relative w-full">
      {/* Input row */}
      <div className="flex items-center bg-gray-100 px-4 py-2 rounded-full w-full focus-within:ring-2 focus-within:ring-black transition">
        <Search size={18} className="text-gray-500 shrink-0" />

        <input
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          className="bg-transparent outline-none px-2 w-full text-sm"
        />

        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }}>
            <X size={14} className="text-gray-400 hover:text-gray-700" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && query.trim() && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">
              No products found for &quot;{query}&quot;
            </p>
          ) : (
            <ul>
              {results.map((product: any) => (
                <li key={product.id ?? product._id}>
                  <button
                    onClick={() => handleSelect(product)}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition text-left"
                  >
                    {/* Show image only if it exists */}
                    {product.images?.[0] && (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        width={40}
                        height={40}
                        className="rounded-md object-cover shrink-0"
                      />
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-800">
                        {product.name}
                      </span>
                      {product.price && (
                        <span className="text-xs text-gray-400">
                          ${product.price}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;