"use client";

import { useGetAllProductsQuery } from "@/redux/product/productApi";
import { CartItem, Product } from "@/types/pos";

interface ProductGridProps {
  category: string;
  cart: CartItem[];
  search: string;
  setCart: (cart: CartItem[]) => void;
}

export default function ProductGrid({
  category,
  cart,
  search,
  setCart,
}: ProductGridProps) {
  const categoryId = category !== "All" ? Number(category) : undefined;

  const { data: products = [], isLoading } = useGetAllProductsQuery(
    categoryId !== undefined ? { categoryId } : undefined
  );

  const filteredProducts = (products as Product[]).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const exist = cart.find((i) => i.id === product.id);
    if (exist) {
      setCart(
        cart.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        )
      );
    } else {
      setCart([
        ...cart,
        { id: product.id, name: product.name, price: product.price, qty: 1 },
      ]);
    }
  };

  const getCartQty = (id: number) =>
    cart.find((i) => i.id === id)?.qty ?? 0;

  if (isLoading) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: "1px",
          background: "#B4B2A9",
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: "#F1EFE8",
              height: "96px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: "11px", color: "#B4B2A9" }}>…</span>
          </div>
        ))}
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "200px",
          color: "#888780",
          fontSize: "13px",
        }}
      >
        No products found
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: "1px",
        background: "#B4B2A9",
      }}
    >
      {filteredProducts.map((p) => {
        const inCart = getCartQty(p.id);
        const outOfStock = p.qty_available <= 0;

        return (
          <button
            key={p.id}
            onClick={() => !outOfStock && addToCart(p)}
            disabled={outOfStock}
            aria-label={`Add ${p.name} to cart`}
            style={{
              background: outOfStock ? "#E8E4DA" : "#F1EFE8",
              border: "none",
              padding: "10px 8px",
              cursor: outOfStock ? "not-allowed" : "pointer",
              textAlign: "center",
              position: "relative",
              transition: "background 0.1s",
              opacity: outOfStock ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!outOfStock)
                (e.currentTarget as HTMLButtonElement).style.background =
                  "#EAF3DE";
            }}
            onMouseLeave={(e) => {
              if (!outOfStock)
                (e.currentTarget as HTMLButtonElement).style.background =
                  "#F1EFE8";
            }}
          >
            {inCart > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "5px",
                  right: "5px",
                  background: "#3B6D11",
                  color: "#EAF3DE",
                  fontSize: "10px",
                  fontWeight: 500,
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {inCart}
              </span>
            )}

            <div
              style={{
                width: "40px",
                height: "40px",
                background: "#D3D1C7",
                borderRadius: "4px",
                margin: "0 auto 6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                overflow: "hidden",
              }}
            >
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                "📦"
              )}
            </div>

            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "#2C2C2A",
                lineHeight: 1.2,
                marginBottom: "3px",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {p.name}
            </div>

            <div style={{ fontSize: "12px", color: "#3B6D11", fontWeight: 500 }}>
              ${Number(p.price).toFixed(2)}
            </div>

            <div
              style={{
                fontSize: "10px",
                color: outOfStock ? "#A32D2D" : "#888780",
                marginTop: "2px",
              }}
            >
              {outOfStock ? "Out of stock" : `Stock: ${p.qty_available}`}
            </div>
          </button>
        );
      })}
    </div>
  );
}