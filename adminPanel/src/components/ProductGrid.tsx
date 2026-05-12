"use client";

import { useGetAllProductsQuery } from "@/redux/product/productApi";



export default function ProductGrid({
  category,
  cart,
  search,
  setCart,
}: any) {

  const { data: products = [], isLoading } =
    useGetAllProductsQuery(
      category !== "All"
        ? { categoryId: category }
        : undefined
    );
  const filteredProducts = products.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: any) => {
    const exist = cart.find((i: any) => i.id === product.id);

    if (exist) {
      setCart(
        cart.map((i: any) =>
          i.id === product.id
            ? { ...i, qty: i.qty + 1 }
            : i
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          qty: 1,
        },
      ]);
    }
  };

  if (isLoading) return <div>Loading products...</div>;

  return (
    <div className="grid grid-cols-3 gap-3">

      {filteredProducts.map((p: any) => (
        <div
          key={p.id}
          onClick={() => addToCart(p)}
          className="border rounded-xl p-3 cursor-pointer hover:scale-105 transition bg-card"
        >
          <div className="font-bold">{p.name}</div>
          <div className="text-sm text-muted-foreground">
            ${p.price}
          </div>
          <div className="text-xs mt-1">
            Stock: {p.qty_available}
          </div>
        </div>
      ))}

    </div>
  );
}