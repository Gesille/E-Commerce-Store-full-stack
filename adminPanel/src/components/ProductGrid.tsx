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
    categoryId !== undefined ? { categoryId } : undefined
  );

  const filtered = (products as Product[]).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("");

  const cartQty = (id: number) =>
    cart.find((i) => i.id === id)?.qty ?? 0;

  // ✅ ADD TO CART
  const confirmAddToCart = () => {
    if (!selectedProduct) return;

    const exist = cart.find(
      (i) =>
        i.id === selectedProduct.id &&
        i.size === selectedSize &&
        i.color === selectedColor &&
        i.material === selectedMaterial
    );

    if (exist) {
      setCart(
        cart.map((i) =>
          i.id === selectedProduct.id &&
          i.size === selectedSize &&
          i.color === selectedColor &&
          i.material === selectedMaterial
            ? { ...i, qty: i.qty + 1 }
            : i
        )
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
        } as CartItem,
      ]);
    }

    setSelectedProduct(null);
  };

  if (isLoading) {
    return (
      <div className="grid gap-2.5 p-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border h-32 animate-pulse" />
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
      {/* GRID */}
      <div className="grid gap-2.5 p-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>

        {filtered.map((p) => {
          const inCart = cartQty(p.id);
          const oos = p.qty_available <= 0;

          const sizes = p.attributes?.sizes ?? [];
          const colors = p.attributes?.colors ?? [];
          const materials = p.attributes?.materials ?? [];

          return (
            <button
              key={p.id}
              disabled={oos}
              onClick={() => {
                if (oos) return;

                setSelectedProduct(p);

                // ✅ SAFE DEFAULTS
                setSelectedSize(sizes[0] ?? "");
                setSelectedColor(colors[0] ?? "");
                setSelectedMaterial(materials[0] ?? "");
              }}
              className={`relative bg-white rounded-xl border p-3 ${
                oos ? "opacity-40 cursor-not-allowed" : "hover:shadow"
              }`}
            >
              {inCart > 0 && (
                <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {inCart}
                </span>
              )}

              <div className="text-[11px] font-medium">{p.name}</div>
              <div className="text-[13px] text-blue-600">${p.price}</div>
              <div className="text-[10px] text-gray-400">
                Stock: {p.qty_available}
              </div>
            </button>
          );
        })}
      </div>

      {/* MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-80 rounded-xl p-4">

            <div className="font-semibold mb-3">
              {selectedProduct.name}
            </div>

            {/* SIZE */}
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">Size</div>
              {selectedProduct.attributes?.sizes?.length ? (
                <div className="flex gap-2 flex-wrap">
                  {selectedProduct.attributes.sizes.map((s) => (
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
              ) : (
                <div className="text-xs text-gray-400">No sizes</div>
              )}
            </div>

            {/* COLOR */}
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">Color</div>
              {selectedProduct.attributes?.colors?.length ? (
                <div className="flex gap-2 flex-wrap">
                  {selectedProduct.attributes.colors.map((c) => (
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
              ) : (
                <div className="text-xs text-gray-400">No colors</div>
              )}
            </div>

            {/* MATERIAL */}
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">Material</div>
              {selectedProduct.attributes?.materials?.length ? (
                <div className="flex gap-2 flex-wrap">
                  {selectedProduct.attributes.materials.map((m) => (
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
              ) : (
                <div className="text-xs text-gray-400">No materials</div>
              )}
            </div>

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