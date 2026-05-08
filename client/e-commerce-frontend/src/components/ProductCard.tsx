"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductType } from "../types";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import useCartStore from "@/src/stores/cartStore";
import { toast } from "react-toastify";

const ProductCard = ({
  product,
  showCartButton = true,
}: {
  product: ProductType;
  showCartButton?: boolean;
}) => {
  const [productTypes, setProductTypes] = useState({
    size: product.sizes[0],
    color: product.colors[0],
  });
  const [isAdding, setIsAdding] = useState(false);
  const { addToCart } = useCartStore();
  const imageUrl = Object.values(product.images)[0] ?? "/placeholder.png";

  const handleProductType = ({
    type,
    value,
  }: {
    type: "size" | "color";
    value: string;
  }) => {
    setProductTypes((prev) => ({
      ...prev,
      [type]: value,
    }));
  };

  const handleAddToCart = () => {
    setIsAdding(true);
    addToCart({
      ...product,
      quantity: 1,
      selectedSize: productTypes.size,
      selectedColor: productTypes.color,
    });

    toast.success(`${product.name} added to cart`);
    setTimeout(() => setIsAdding(false), 1200);
  };

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full">
      {/* IMAGE */}
      <Link href={`/products/${product.id}`}>
        <div className="relative h-48 overflow-hidden">
          <Image
            // In the IMAGE SECTION — replace the src line:
            src={imageUrl}
            alt={product.name}
            fill
            className="object-contain p-4 bg-neutral-100"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
           {/* Stock badge */}
        {product.stock <= 5 && product.stock > 0 && (
          <span className="absolute top-3 left-3 bg-rose-50 text-rose-400 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-rose-100">
            Only {product.stock} left
          </span>
        )}
        {product.stock === 0 && (
          <span className="absolute top-3 left-3 bg-gray-50 text-gray-400 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-gray-100">
            Out of stock
          </span>
        )}

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
        </div>
        <div className="w-full h-px bg-black" />
      </Link>

      {/* CONTENT */}
      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* TITLE */}
        <div className="flex flex-col gap-1">
  <h1 className="font-semibold text-lg text-gray-900 line-clamp-1 m-0">
    {product.name}
  </h1>

  <h2 className="text-sm text-gray-600 m-0">
    Default Code : {product.reference}
  </h2>

  <p className="text-sm text-gray-500 line-clamp-2 m-0">
    {product.shortDescription}
  </p>
</div>

        {/* OPTIONS */}
        <div className="flex items-start justify-between gap-4 min-h-22.5">
          {/* SIZE */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Size</span>

            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() =>
                    handleProductType({ type: "size", value: size })
                  }
                  className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200 whitespace-nowrap hover:scale-105 active:scale-95
                  ${
                    productTypes.size === size
                      ? "bg-linear-to-r from-pink-500 to-violet-500 text-white border-transparent shadow-md"
                      : "bg-white text-gray-700 border-gray-200 hover:border-pink-300 hover:text-pink-600"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* COLORS */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Color</span>

            <div className="flex items-center gap-2">
              {product.colors.map((color) => (
                <button
                  key={color}
                  onClick={() =>
                    handleProductType({ type: "color", value: color })
                  }
                  className={`w-4 h-4 rounded-full border transition-transform hover:scale-110 ${
                    productTypes.color === color
                      ? "ring-2 ring-black scale-110"
                      : "border-gray-300"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          {/* PRICE */}
          <p className="text-lg font-semibold text-gray-900">
            ${product.price.toFixed(2)}
          </p>

          {/* BUTTON */}

          {showCartButton && (
            <button
              onClick={handleAddToCart}
              disabled={isAdding || product.stock === 0}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 active:scale-95
                ${isAdding
                  ? "bg-green-400 text-white"
                  : product.stock === 0
                  ? "bg-blue-300 text-black cursor-not-allowed"
                  : "bg-white text-black hover:bg-blue-50 shadow-sm hover:shadow-md"
                }`}
            >
              <ShoppingCart className="w-4 h-4" />
              {isAdding ? "Added!" : "Add"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
