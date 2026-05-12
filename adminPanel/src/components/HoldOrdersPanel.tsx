"use client";

export default function HoldOrdersPanel({
  orders,
  setOrders,
  activeOrderId,
  setActiveOrderId,
}: any) {

  // ➕ New order
  const addOrder = () => {
    const newId = Date.now();

    setOrders([
      ...orders,
      { id: newId, name: `Order ${orders.length + 1}`, cart: [] },
    ]);

    setActiveOrderId(newId);
  };

  // 🗑 delete order
  const deleteOrder = (id: number) => {
    const updated = orders.filter((o: any) => o.id !== id);
    setOrders(updated);

    if (activeOrderId === id && updated.length > 0) {
      setActiveOrderId(updated[0].id);
    }
  };

  return (
    <div className="w-48 border-l p-2 flex flex-col">

      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold text-sm">Orders</h2>

        <button
          onClick={addOrder}
          className="text-xs bg-primary text-white px-2 py-1 rounded"
        >
          + New
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">

        {orders.map((order: any) => (
          <div
            key={order.id}
            onClick={() => setActiveOrderId(order.id)}
            className={`p-2 border rounded cursor-pointer text-sm ${
              activeOrderId === order.id
                ? "bg-primary text-white"
                : "hover:bg-muted"
            }`}
          >
            <div className="flex justify-between items-center">
              <span>{order.name}</span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteOrder(order.id);
                }}
              >
                ✕
              </button>
            </div>

            <div className="text-xs mt-1">
              Items: {order.cart.length}
            </div>
          </div>
        ))}

      </div>

    </div>
  );
}