/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useGetCategoriesQuery } from "@/redux/category/categoryApi";
import {
  ShoppingBasket,
  Coffee,
  Utensils,
  Flame,
  Refrigerator,
  Wind
} from "lucide-react";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

const iconMap: Record<string, any> = {
  all: <ShoppingBasket size={16} />,
  "coffee-machines": <Coffee size={16} />,
  cooking: <Flame size={16} />,
  cooling: <Refrigerator size={16} />,
  "prep-tools": <Utensils size={16} />,
  hvac: <Wind size={16} />,
};

const Categories = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { data, isLoading, error } = useGetCategoriesQuery();

  const categories = data?.categories || [];

  // 👇 real selected filter (IMPORTANT)
  const selectedCategoryId = searchParams.get("categoryId");

  const handleClick = (category: any | "all") => {
    const params = new URLSearchParams(searchParams.toString());

    if (category === "all") {
      params.delete("categoryId");
    } else {
      params.set("categoryId", String(category.odooCategoryId));
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (isLoading) {
    return <p className="text-center text-sm text-gray-500">Loading categories...</p>;
  }

  if (error) {
    return <p className="text-center text-sm text-red-500">Failed to load categories</p>;
  }

  return (
    <div className="w-full flex justify-center mb-6">
      <div className="flex flex-wrap gap-3 p-1 rounded-xl">

        {/* ALL */}
        <button
          onClick={() => handleClick("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border
            ${!selectedCategoryId
              ? "bg-black text-white shadow-md"
              : "bg-white text-gray-600"}
          `}
        >
          {iconMap["all"]}
          All
        </button>

        {/* categories */}
        {categories.map((category: any) => {
          const isActive =
            selectedCategoryId === String(category.odooCategoryId);

          return (
            <button
              key={category.odooCategoryId}
              onClick={() => handleClick(category)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition
                ${isActive
                  ? "bg-black text-white shadow-md"
                  : "bg-white text-gray-600 hover:bg-gray-200"}
              `}
            >
              {iconMap[category.slug] || <ShoppingBasket size={16} />}
              {category.catTitle}
            </button>
          );
        })}

      </div>
    </div>
  );
};

export default Categories;