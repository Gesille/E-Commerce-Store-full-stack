"use client";

import { useGetCategoriesQuery } from "@/redux/category/categoryApi";

export default function CategorySidebar({
  selected,
  setSelected,
}: any) {
  const { data: categories = [], isLoading } =
    useGetCategoriesQuery();

  return (
    <div className="w-44 border-r p-2 space-y-2">

      <h2 className="font-bold mb-2">Categories</h2>

      {/* ALL button */}
      <div
        onClick={() => setSelected("All")}
        className={`p-2 rounded cursor-pointer text-sm ${
          selected === "All"
            ? "bg-primary text-white"
            : "hover:bg-muted"
        }`}
      >
        All
      </div>

      {isLoading && (
        <p className="text-xs text-muted-foreground">
          Loading...
        </p>
      )}

      {categories.map((cat: any) => (
        <div
          key={cat.odooCategoryId}
          onClick={() => setSelected(cat.odooCategoryId)}
          className={`p-2 rounded cursor-pointer text-sm transition ${
            selected === cat.odooCategoryId
              ? "bg-primary text-white"
              : "hover:bg-muted"
          }`}
        >
          {cat.catTitle}
        </div>
      ))}

    </div>
  );
}