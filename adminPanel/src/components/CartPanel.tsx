"use client";

export default function CartPanel({ cart, setCart }: any) {

  const total = cart.reduce(
    (sum: number, i: any) => sum + i.price * i.qty,
    0
  );

  const updateQty = (id: number, qty: number) => {
    setCart(
      cart.map((i: any) =>
        i.id === id
          ? { ...i, qty: Math.max(1, qty) }
          : i
      )
    );
  };

  const removeItem = (id: number) => {
    setCart(cart.filter((i: any) => i.id !== id));
  };

  return (
    <div className="w-80 border-l flex flex-col bg-background">

      {/* HEADER */}
      <div className="p-3 border-b font-bold">
        Current Order
      </div>

      {/* ITEMS */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {cart.length === 0 && (
          <div className="text-center text-muted-foreground mt-10">
            No items
          </div>
        )}

        {cart.map((item: any) => (
          <div key={item.id} className="p-2 border rounded">

            <div className="flex justify-between">
              <span className="font-medium">{item.name}</span>
              <button onClick={() => removeItem(item.id)}>
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => updateQty(item.id, item.qty - 1)}>
                -
              </button>

              <span>{item.qty}</span>

              <button onClick={() => updateQty(item.id, item.qty + 1)}>
                +
              </button>
            </div>

            <div className="text-sm mt-1">
              ${item.price * item.qty}
            </div>

          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="border-t p-3">

        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>

        <button className="w-full mt-2 bg-green-600 text-white p-2 rounded">
          Checkout
        </button>

      </div>

    </div>
  );
}