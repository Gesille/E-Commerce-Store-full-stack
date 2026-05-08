/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import ProductCard from "@/src/components/ProductCard";
import { useSearchParams } from "next/navigation";
import {products} from "@/src/MockData";

export default function SearchPage() {
  const params = useSearchParams();
  const query = params.get("q")?.toLowerCase() || "";

  const filteredProducts = products.filter((product :any) =>
    product.name.toLowerCase().includes(query) ||
    product.shortDescription.toLowerCase().includes(query)
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Results for: {query}
      </h1>

      {filteredProducts.length === 0 ? (
        <p className="text-gray-500">No products found</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}