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

  const { data: rawProducts = [], isLoading } = useGetAllProductsQuery(
    categoryId !== undefined ? { categoryId } : undefined,
  );

  // Cast here once — safe because pos.Product now matches backend shape
  const products = rawProducts as unknown as Product[];

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("");

  const cartQty = (id: number) => cart.find((i) => i.id === id)?.qty ?? 0;

  const openModal = (p: Product) => {
    setSelectedProduct(p);
    setSelectedSize(p.attributes?.sizes?.[0] ?? "");
    setSelectedColor(p.attributes?.colors?.[0] ?? "");
    setSelectedMaterial(p.attributes?.materials?.[0] ?? "");
  };

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

  // ── LOADING ──
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

  // ── EMPTY ──
  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No products found
      </div>
    );
  }

  return (
    <>
      {/* ────────────── GRID ────────────── */}
      <div
        className="grid gap-2.5 p-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}
      >
        {filtered.map((p) => {
          const inCart = cartQty(p.id);
          const oos = (p.stock ?? 0) <= 0;
          const lowStock = !oos && (p.stock ?? 0) <= 3;

          const hasVariants =
            (p.attributes?.sizes?.length ?? 0) > 0 ||
            (p.attributes?.colors?.length ?? 0) > 0 ||
            (p.attributes?.materials?.length ?? 0) > 0;

          return (
            <button
              key={p.id}
              onClick={() => { if (!oos) openModal(p); }}
              disabled={oos}
              className={`relative bg-white rounded-xl border text-center p-3 transition-all ${
                oos
                  ? "opacity-40 cursor-not-allowed"
                  : "cursor-pointer hover:shadow-md hover:-translate-y-px active:scale-95"
              }`}
            >
              {/* Cart badge */}
              {inCart > 0 && (
                <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {inCart}
                </span>
              )}

              {/* Has-variants dot */}
              {hasVariants && !oos && (
                <span className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}

              {/* Image */}
              <div className="w-11 h-11 bg-gray-100 rounded-xl mx-auto mb-2 flex items-center justify-center overflow-hidden">
                {p.image ? (
                  <img
                    src={`data:image/png;base64,${p.image}`}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg">📦</span>
                )}
              </div>

              {/* Name */}
              <div className="text-[11px] font-medium line-clamp-2 leading-tight mb-0.5">
                {p.name}
              </div>

              {/* Brand */}
              {p.attributes?.brand && (
                <div className="text-[10px] text-blue-400 font-medium truncate">
                  {p.attributes.brand}
                </div>
              )}

              {/* Color swatches preview */}
              {(p.attributes?.colors?.length ?? 0) > 0 && (
                <div className="flex justify-center gap-0.5 my-1">
                  {p.attributes!.colors!.slice(0, 3).map((c) => (
                    <span
                      key={c}
                      title={c}
                      className="w-2.5 h-2.5 rounded-full border border-gray-200 inline-block"
                      style={{ backgroundColor: c.toLowerCase() }}
                    />
                  ))}
                  {(p.attributes!.colors!.length ?? 0) > 3 && (
                    <span className="text-[9px] text-gray-400">
                      +{p.attributes!.colors!.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Price */}
              <div className="text-[13px] font-semibold text-blue-600">
                ${p.price.toFixed(2)}
              </div>

              {/* Stock status */}
              <div
                className={`text-[10px] ${
                  oos
                    ? "text-red-400"
                    : lowStock
                    ? "text-amber-500"
                    : "text-gray-400"
                }`}
              >
                {oos
                  ? "Out of stock"
                  : lowStock
                  ? `⚠ ${p.stock} left`
                  : `Stock: ${p.stock}`}
              </div>
            </button>
          );
        })}
      </div>

      {/* ────────────── MODAL ────────────── */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedProduct(null);
          }}
        >
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden">

            {/* Header */}
            <div className="flex items-start gap-3 p-4 border-b">
              <div className="w-14 h-14 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center">
                {selectedProduct.image ? (
                  <img
                    src={`data:image/png;base64,${selectedProduct.image}`}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">📦</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm leading-tight">
                  {selectedProduct.name}
                </div>
                {selectedProduct.attributes?.brand && (
                  <div className="text-xs text-blue-500 mt-0.5">
                    {selectedProduct.attributes.brand}
                  </div>
                )}
                <div className="text-blue-600 font-bold text-base mt-1">
                  ${selectedProduct.price.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Variant selectors */}
            <div className="p-4 space-y-4">

              {/* SIZE */}
              {(selectedProduct.attributes?.sizes?.length ?? 0) > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1.5">
                    Size{" "}
                    {selectedSize && (
                      <span className="text-blue-600 font-semibold">
                        — {selectedSize}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {selectedProduct.attributes!.sizes!.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        className={`px-3 py-1 text-xs border rounded-lg font-medium transition-colors ${
                          selectedSize === s
                            ? "bg-blue-600 text-white border-blue-600"
                            : "text-gray-600 hover:border-blue-400"
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
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1.5">
                    Color{" "}
                    {selectedColor && (
                      <span className="text-blue-600 font-semibold capitalize">
                        — {selectedColor}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {selectedProduct.attributes!.colors!.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-lg font-medium transition-colors ${
                          selectedColor === c
                            ? "border-blue-600 ring-1 ring-blue-600"
                            : "hover:border-gray-400"
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-gray-200 flex-shrink-0"
                          style={{ backgroundColor: c.toLowerCase() }}
                        />
                        <span className="capitalize">{c}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* MATERIAL */}
              {(selectedProduct.attributes?.materials?.length ?? 0) > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1.5">
                    Material{" "}
                    {selectedMaterial && (
                      <span className="text-blue-600 font-semibold">
                        — {selectedMaterial}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {selectedProduct.attributes!.materials!.map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelectedMaterial(m)}
                        className={`px-3 py-1 text-xs border rounded-lg font-medium transition-colors ${
                          selectedMaterial === m
                            ? "bg-blue-600 text-white border-blue-600"
                            : "text-gray-600 hover:border-blue-400"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No variants */}
              {(selectedProduct.attributes?.sizes?.length ?? 0) === 0 &&
                (selectedProduct.attributes?.colors?.length ?? 0) === 0 &&
                (selectedProduct.attributes?.materials?.length ?? 0) === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">
                    No variants for this product
                  </p>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 p-4 pt-0">
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex-1 py-2 text-sm border rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddToCart}
                className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
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