import { useGetAllProductsQuery } from "@/redux/product/productApi";
import { CartItem, Product } from "@/types/pos";

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

  const addToCart = (product: Product) => {
    const exist = cart.find((i) => i.id === product.id);
    if (exist) {
      setCart(cart.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i)));
    } else {
      setCart([...cart, {  note: "",id: product.id, name: product.name, price: product.price, qty: 1 }]);
    }
  };

  const cartQty = (id: number) => cart.find((i) => i.id === id)?.qty ?? 0;

  if (isLoading) {
    return (
      <div className="grid gap-2.5 p-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No products found</div>
    );
  }

  return (
    <div className="grid gap-2.5 p-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
      {filtered.map((p) => {
        const inCart = cartQty(p.id);
        const oos = p.qty_available <= 0;
        const lowStock = !oos && p.qty_available <= 3;

        return (
          <button
            key={p.id}
            onClick={() => !oos && addToCart(p)}
            disabled={oos}
            aria-label={`Add ${p.name} to cart`}
            className={`relative bg-white rounded-xl border text-center p-3 transition-all duration-150 ${
              oos
                ? "border-gray-100 opacity-40 cursor-not-allowed"
                : inCart > 0
                ? "border-blue-200 hover:border-blue-300 hover:shadow-sm hover:-translate-y-px cursor-pointer"
                : "border-gray-100 hover:border-blue-200 hover:shadow-sm hover:-translate-y-px cursor-pointer"
            }`}
          >
            {inCart > 0 && (
              <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center">
                {inCart}
              </span>
            )}
            <div className="w-11 h-11 bg-gray-100 rounded-xl mx-auto mb-2.5 flex items-center justify-center overflow-hidden">
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                  <line x1="12" y1="12" x2="12" y2="17" />
                  <line x1="9.5" y1="14.5" x2="14.5" y2="14.5" />
                </svg>
              )}
            </div>
            <div className="text-[11px] font-medium text-gray-900 leading-tight mb-1.5 overflow-hidden line-clamp-2">{p.name}</div>
            <div className="text-[13px] font-semibold text-blue-600">${Number(p.price).toFixed(2)}</div>
            <div className={`text-[10px] mt-0.5 ${oos ? "text-red-500" : lowStock ? "text-amber-500" : "text-gray-400"}`}>
              {oos ? "Out of stock" : lowStock ? `Low: ${p.qty_available}` : `Stock: ${p.qty_available}`}
            </div>
          </button>
        );
      })}
    </div>
  );
}
