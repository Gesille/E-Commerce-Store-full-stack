/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Categories from "./Categories";
import ProductCard from "./ProductCard";
import Filter from "./Filter";
import { useSearchParams } from "next/navigation";
import { useGetProductsQuery } from "@/redux/product/productApi";
import { useGetEffectiveTaxRateQuery } from "@/redux/tax/taxApi";

const HOMEPAGE_LIMIT = 8;

const ProductList = ({ params }: { params: "homepage" | "products" }) => {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("categoryId") || "";
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading, error } = useGetProductsQuery(
    categoryId ? categoryId : undefined,
  );

  const allProducts = data?.products || [];
console.log(allProducts)
  // On homepage: show 8 unless user clicked "View all"
  const products =
    params === "homepage" && !showAll
      ? allProducts.slice(0, HOMEPAGE_LIMIT)
      : allProducts;

  if (isLoading) return <p className="text-center py-10">Loading...</p>;
  if (error)
    return (
      <p className="text-center py-10 text-red-500">Error loading products</p>
    );
 const { data: taxData } = useGetEffectiveTaxRateQuery();
  const taxRate = taxData?.rate ?? 0;
  return (
    <div className="w-full">
      <Categories />

      {params === "products" && <Filter />}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {products.map((product: any) => {
          const raw = product.image;
          const imageUrl =
            raw && raw !== false
              ? raw.startsWith("data:image")
                ? raw
                : `data:image/png;base64,${raw}` // ← was image_1920, now image
              : "/placeholder.png";

          // colors comes back empty from Odoo, use materials or a default
          const colors = product.attributes?.colors?.length
            ? product.attributes.colors
            : ["#888888"];

          const sizes = product.attributes?.sizes?.length
            ? product.attributes.sizes
            : ["Standard"];

          return (
            <ProductCard
              key={product.id}
              taxRate={taxRate}
              product={{
                id: product.id,
                reference:product.reference,
                shortDescription: product.shortDescription,
                description: product.description,
                name: product.name,
                price: product.price ?? 0,
                stock: product.stock ?? 0,
                sizes,
                colors,
                images: {
                  [colors[0]]: imageUrl,
                },
              }}
            />
          );
        })}
      </div>

      {/* Homepage: show expand button instead of navigating away */}
      {params === "homepage" && allProducts.length > HOMEPAGE_LIMIT && (
        <div className="flex justify-end mt-6">
          <button
            onClick={() => setShowAll((prev) => !prev)}
            className="underline text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            {showAll
              ? "Show less"
              : `View all products (${allProducts.length})`}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductList;
