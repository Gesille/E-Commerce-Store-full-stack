"use client";

import { Minus, Plus, ShoppingCart } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { ProductType } from "../types";
import useCartStore from "../stores/cartStore";

const ProductInteraction = ({
  product,
  selectedSize,
  selectedColor,
}: {
  product: ProductType;
  selectedSize: string;
  selectedColor: string;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [quantity, setQuantity] = useState(1);

  const { addToCart } = useCartStore();

  const handleTypeChange = (type: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(type, value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleQuantityChange = (type: "increment" | "decrement") => {
    if (type === "increment") {
      if (quantity < product.stock) {
        setQuantity((prev) => prev + 1);
      } else {
        toast.error("No more items in stock");
      }
    } else {
      if (quantity > 1) {
        setQuantity((prev) => prev - 1);
      }
    }
  };

  const handleAddToCart = () => {
    addToCart({
      ...product,
      quantity,
      selectedColor,
      selectedSize,
    });
    toast.success("Product added to cart");
  };
  return (
    <div className="flex flex-col gap-4 mt-4">
      {/* SIZE */}
     {/* SIZE */}
<div className="flex flex-col gap-2 text-xs">
  <span className="text-gray-500">Size</span>
  <div className="flex flex-wrap gap-2">
    {product.sizes.map((size) => (
      <button
        key={size}
        onClick={() => handleTypeChange("size", size)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 whitespace-nowrap hover:scale-105 active:scale-95
          ${selectedSize === size
            ? "bg-gray-900 text-white border-transparent shadow-md"
            : "bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:text-gray-900"
          }`}
      >
        {size}
      </button>
    ))}
  </div>
</div>
      {/* COLOR */}
      <div className="flex flex-col gap-2 text-sm">
        <span className="text-gray-500">Color</span>
        <div className="flex items-center gap-2">
          {product.colors.map((color) => (
            <div
              className={`cursor-pointer border p-0.5 ${
                selectedColor === color ? "border-gray-300" : "border-white"
              }`}
              key={color}
              onClick={() => handleTypeChange("color", color)}
            >
              <div className={`w-6 h-6`} style={{ backgroundColor: color }} />
            </div>
          ))}
        </div>
      </div>
    
     
      {/* QUANTITY */}
      <div className="flex flex-col gap-2 text-sm">
        <span className="text-gray-500">Quantity</span>

        <div className="flex items-center border rounded-lg overflow-hidden w-fit">
          <button
            onClick={() => handleQuantityChange("decrement")}
            className="px-3 py-2 hover:bg-gray-100 active:bg-gray-200 transition"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="px-4 py-2 bg-white font-medium min-w-10 text-center">
            {quantity}
          </div>

          <button
            onClick={() => handleQuantityChange("increment")}
            className="px-3 py-2 hover:bg-gray-100 active:bg-gray-200 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* BUTTONS */}
     <button
  onClick={handleAddToCart}
  disabled={product.stock === 0}
  className={`px-4 py-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium
  ${
    product.stock === 0
      ? "bg-gray-300 cursor-not-allowed"
      : "bg-gray-800 text-white hover:bg-black"
  }`}
>
  <Plus className="w-4 h-4" />
  {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
</button>
      <button className="ring-1 ring-gray-400 shadow-lg text-gray-800 px-4 py-2 rounded-md flex items-center justify-center cursor-pointer gap-2 text-sm font-medium">
        <ShoppingCart className="w-4 h-4" />
        Buy this Item
      </button>
    </div>
  );
};

export default ProductInteraction;
