"use client";

import { useGetCategoriesQuery } from "@/redux/category/categoryApi";
import { Category } from "@/types/pos";

interface CategorySidebarProps {
  selected: string;
  setSelected: (id: string) => void;
}

export default function CategorySidebar({
  selected,
  setSelected,
}: CategorySidebarProps) {
  const { data: categories = [], isLoading } = useGetCategoriesQuery();

  const itemStyle = (active: boolean): React.CSSProperties => ({
    padding: "9px 12px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: active ? 500 : 400,
    background: active ? "#3B6D11" : "transparent",
    color: active ? "#EAF3DE" : "#444441",
    borderLeft: active ? "3px solid #27500A" : "3px solid transparent",
    borderBottom: "1px solid #D3D1C7",
    transition: "background 0.1s",
    userSelect: "none" as const,
  });

  return (
    <div
      style={{
        width: "152px",
        background: "#E8E4DA",
        borderRight: "1px solid #B4B2A9",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "9px 12px",
          background: "#444441",
          color: "#D3D1C7",
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.4px",
          textTransform: "uppercase",
          borderBottom: "1px solid #2C2C2A",
          flexShrink: 0,
        }}
      >
        Categories
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {/* All */}
        <div
          onClick={() => setSelected("All")}
          style={itemStyle(selected === "All")}
          onMouseEnter={(e) => {
            if (selected !== "All")
              (e.currentTarget as HTMLDivElement).style.background = "#D3D1C7";
          }}
          onMouseLeave={(e) => {
            if (selected !== "All")
              (e.currentTarget as HTMLDivElement).style.background =
                "transparent";
          }}
        >
          All items
        </div>

        {isLoading && (
          <div
            style={{ padding: "8px 12px", fontSize: "11px", color: "#888780" }}
          >
            Loading…
          </div>
        )}

        {categories.map((cat: Category) => (
          <div
            key={cat.odooCategoryId}
            onClick={() => setSelected(String(cat.odooCategoryId))}
            style={itemStyle(selected === String(cat.odooCategoryId))}
            onMouseEnter={(e) => {
              if (selected !== String(cat.odooCategoryId))
                (e.currentTarget as HTMLDivElement).style.background =
                  "#D3D1C7";
            }}
            onMouseLeave={(e) => {
              if (selected !== String(cat.odooCategoryId))
                (e.currentTarget as HTMLDivElement).style.background =
                  "transparent";
            }}
          >
            {cat.catTitle}
          </div>
        ))}
      </div>
    </div>
  );
}