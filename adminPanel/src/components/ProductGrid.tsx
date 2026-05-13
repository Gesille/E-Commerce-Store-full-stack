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

  const { data: apiProducts = [], isLoading } =
    useGetAllProductsQuery(
      categoryId !== undefined ? { categoryId } : undefined
    );


  const products: Product[] = apiProducts.map((p: any) => ({
    id: Number(p.id),
    name: p.name ?? "",
    reference: p.reference ?? "",
    shortDescription: p.shortDescription ?? "",
    description: p.description ?? "",
    price: p.price ?? 0,
    sizes: p.sizes ?? [],
    colors: p.colors ?? [],
    images: p.image_1920
  ? ({ default: `data:image/png;base64,${p.image_1920}` } as Record<string, string>)
  : undefined,
    stock: p.qty_available ?? 0,
  }));

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("");

  const cartQty = (id: number) =>
    cart.find((i) => i.id === id)?.qty ?? 0;

  const confirmAddToCart = () => {
    if (!selectedProduct) return;

    const productId = Number(selectedProduct.id);

    const exist = cart.find(
      (i) =>
        i.id === productId &&
        i.size === selectedSize &&
        i.color === selectedColor &&
        i.material === selectedMaterial
    );

    if (exist) {
      setCart(
        cart.map((i) =>
          i.id === productId &&
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
          id: productId,
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
        style={{
          gridTemplateColumns:
            "repeat(auto-fill, minmax(110px, 1fr))",
        }}
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
      {/* GRID */}
      <div
        className="grid gap-2.5 p-4"
        style={{
          gridTemplateColumns:
            "repeat(auto-fill, minmax(110px, 1fr))",
        }}
      >
        {filtered.map((p) => {
          const inCart = cartQty(Number(p.id));
          const oos = p.stock <= 0;
          const lowStock = !oos && p.stock <= 3;

          return (
            <button
              key={p.id}
              onClick={() => {
                if (oos) return;

                setSelectedProduct(p);
                setSelectedSize(p.sizes[0] ?? "");
                setSelectedColor(p.colors[0] ?? "");
                setSelectedMaterial("");
              }}
              disabled={oos}
              className={`relative bg-white rounded-xl border text-center p-3 transition ${
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

              {/* IMAGE */}
              <div className="w-11 h-11 bg-gray-100 rounded-xl mx-auto mb-2 overflow-hidden flex items-center justify-center">
                {p.images?.default ? (
                  <img
                    src={p.images.default}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-[10px] text-gray-400">
                    No Image
                  </div>
                )}
              </div>

              {/* NAME */}
              <div className="text-[11px] font-medium line-clamp-2">
                {p.name}
              </div>

              {/* PRICE */}
              <div className="text-[13px] font-semibold text-blue-600">
                ${p.price}
              </div>

              {/* STOCK */}
              <div className="text-[10px] text-gray-400">
                {oos
                  ? "Out of stock"
                  : lowStock
                  ? `Low: ${p.stock}`
                  : `Stock: ${p.stock}`}
              </div>
            </button>
          );
        })}
      </div>

      {/* MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-80 rounded-xl p-4 shadow-lg">

            <div className="text-sm font-semibold mb-4">
              {selectedProduct.name}
            </div>

            {/* SIZE */}
            {selectedProduct.sizes.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-2">
                  Size
                </div>

                <div className="flex gap-2 flex-wrap">
                  {selectedProduct.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`px-2 py-1 text-xs border rounded ${
                        selectedSize === s
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* COLOR */}
            {selectedProduct.colors.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-2">
                  Color
                </div>

                <div className="flex gap-2 flex-wrap">
                  {selectedProduct.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`px-2 py-1 text-xs border rounded ${
                        selectedColor === c
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ACTIONS */}
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-3 py-1.5 text-xs border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={confirmAddToCart}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg"
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