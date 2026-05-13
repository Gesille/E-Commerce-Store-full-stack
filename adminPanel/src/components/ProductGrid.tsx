import { useGetAllProductsQuery } from "@/redux/product/productApi";
import { CartItem, Product } from "@/types/pos";
import { useState } from "react";

export function ProductGrid({
  category,
  search,
  cart,
  setCart,
}: {
  category: string;
  search: string;
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
}) {
  const categoryId = category !== "All" ? Number(category) : undefined;

  const { data: products = [], isLoading } = useGetAllProductsQuery(
    categoryId !== undefined ? { categoryId } : undefined,
  );

  const filtered = (products as Product[]).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  // ─── MODAL STATE ─────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("");

  const cartQty = (id: number) =>
    cart.find((i) => i.id === id)?.qty ?? 0;

  // ─── ADD TO CART (FINAL STEP) ────────────────
  const confirmAddToCart = () => {
    if (!selectedProduct) return;

    const exist = cart.find(
      (i) =>
        i.id === selectedProduct.id &&
        i.size === selectedSize &&
        i.color === selectedColor &&
        i.material === selectedMaterial,
    );

    if (exist) {
      setCart(
        cart.map((i) =>
          i.id === selectedProduct.id &&
          i.size === selectedSize &&
          i.color === selectedColor &&
          i.material === selectedMaterial
            ? { ...i, qty: i.qty + 1 }
            : i,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          id: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          qty: 1,
          note: "",
          size: selectedSize,
          color: selectedColor,
          material: selectedMaterial,
        },
      ]);
    }

    setSelectedProduct(null);
  };

  if (isLoading) {
    return (
      <div
        className="grid gap-2.5 p-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No products found
      </div>
    );
  }

  return (
    <>
      {/* ─── PRODUCT GRID ───────────────────────── */}
      <div
        className="grid gap-2.5 p-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}
      >
        {filtered.map((p) => {
          const inCart = cartQty(p.id);
          const oos = p.qty_available <= 0;
          const lowStock = !oos && p.qty_available <= 3;

          return (
            <button
              key={p.id}
              onClick={() => {
                if (oos) return;
  console.log("PRODUCT CLICKED:", p);
                setSelectedProduct(p);
                setSelectedSize(p.attributes?.sizes?.[0] ?? "");
                setSelectedColor(p.attributes?.colors?.[0] ?? "");
                setSelectedMaterial(p.attributes?.materials?.[0] ?? "");
              }}
              disabled={oos}
              className={`relative bg-white rounded-xl border text-center p-3 ${
                oos
                  ? "opacity-40 cursor-not-allowed"
                  : "cursor-pointer hover:shadow-sm hover:-translate-y-px"
              }`}
            >
              {inCart > 0 && (
                <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {inCart}
                </span>
              )}

              <div className="w-11 h-11 bg-gray-100 rounded-xl mx-auto mb-2 flex items-center justify-center overflow-hidden">
                {p.image_1920 ? (
                  <img
                    src={`data:image/png;base64,${p.image_1920}`}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-xs text-gray-400">No Image</div>
                )}
              </div>

              <div className="text-[11px] font-medium line-clamp-2">
                {p.name}
              </div>

              <div className="text-[10px] text-gray-400">
                {p.attributes?.brand ?? ""}
              </div>

              <div className="text-[13px] font-semibold text-blue-600">
                ${p.price}
              </div>

              <div className="text-[10px] text-gray-400">
                {oos
                  ? "Out of stock"
                  : lowStock
                  ? `Low: ${p.qty_available}`
                  : `Stock: ${p.qty_available}`}
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── MODAL ──────────────────────────────── */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-80 rounded-xl p-4 shadow-lg">

            <div className="text-sm font-semibold mb-3">
              {selectedProduct.name}
            </div>

            {/* SIZE */}
            {(selectedProduct.attributes?.sizes?.length ?? 0) > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-1">Size</div>
                <div className="flex gap-2 flex-wrap">
                  {selectedProduct.attributes?.sizes?.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`px-2 py-1 text-xs border rounded ${
                        selectedSize === s ? "bg-blue-600 text-white" : ""
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* COLOR */}
            {(selectedProduct.attributes?.colors?.length ?? 0) > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-1">Color</div>
                <div className="flex gap-2 flex-wrap">
                  {selectedProduct.attributes?.colors?.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`px-2 py-1 text-xs border rounded ${
                        selectedColor === c ? "bg-blue-600 text-white" : ""
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* MATERIAL */}
            {(selectedProduct.attributes?.materials?.length ?? 0) > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-1">Material</div>
                <div className="flex gap-2 flex-wrap">
                  {selectedProduct.attributes?.materials?.map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedMaterial(m)}
                      className={`px-2 py-1 text-xs border rounded ${
                        selectedMaterial === m ? "bg-blue-600 text-white" : ""
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ACTIONS */}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-3 py-1 text-xs border rounded"
              >
                Cancel
              </button>

              <button
                onClick={confirmAddToCart}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}