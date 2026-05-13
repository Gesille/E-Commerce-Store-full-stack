import { Order, calcLineTotal, fmt } from "@/types/pos";
import { useState } from "react";

export function HoldOrdersPanel({
  orders,
  setOrders,
  activeOrderId,
  setActiveOrderId,
}: {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  activeOrderId: number;
  setActiveOrderId: (id: number) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const addOrder = () => {
    const newId = Date.now();
    setOrders([...orders, { id: newId, name: `Order ${orders.length + 1}`, cart: [], createdAt: new Date() }]);
    setActiveOrderId(newId);
  };

  const deleteOrder = (id: number) => {
    const updated = orders.filter((o) => o.id !== id);
    setOrders(updated);
    if (activeOrderId === id && updated.length > 0) setActiveOrderId(updated[0].id);
    setConfirmDelete(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    if (order.cart.length > 0) {
      setConfirmDelete(order.id);
    } else {
      deleteOrder(order.id);
    }
  };

  const orderTotal = (order: Order) =>
    order.cart.reduce((s, i) => s + calcLineTotal(i), 0);

  return (
    <div className="w-36 bg-white border-l border-gray-100 flex flex-col shrink-0">
      {/* Header */}
      <div className="h-12 bg-gray-50 border-b border-gray-100 flex items-center justify-between px-3.5 shrink-0">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Orders</span>
        <button
          onClick={addOrder}
          aria-label="New order"
          className="w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white text-base rounded-md flex items-center justify-center border-none cursor-pointer transition-colors leading-none"
        >
          +
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {orders.map((order) => {
          const isActive = order.id === activeOrderId;
          const tot = orderTotal(order);

          return (
            <div key={order.id}>
              <div
                onClick={() => setActiveOrderId(order.id)}
                className={`px-3.5 py-2.5 border-b border-gray-50 cursor-pointer transition-colors border-l-2 ${
                  isActive ? "bg-blue-50 border-l-blue-500" : "border-l-transparent hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[12px] font-medium truncate flex-1 ${isActive ? "text-blue-600" : "text-gray-800"}`}>
                    {order.name}
                  </span>
                  {orders.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteClick(e, order)}
                      aria-label={`Delete ${order.name}`}
                      className="text-gray-300 hover:text-red-400 text-[11px] border-none bg-transparent cursor-pointer pl-1 leading-none"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className={`text-[10px] mt-0.5 ${isActive ? "text-blue-400" : "text-gray-400"}`}>
                  {order.cart.length} item{order.cart.length !== 1 ? "s" : ""}
                  {tot > 0 ? ` · $${fmt(tot)}` : ""}
                </div>
                <div className={`text-[10px] mt-0.5 ${isActive ? "text-blue-300" : "text-gray-300"}`}>
                  {order.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>

              {/* Confirm delete */}
              {confirmDelete === order.id && (
                <div className="px-3 py-2 bg-red-50 border-b border-red-100">
                  <div className="text-[10px] text-red-600 mb-1.5">Delete order with items?</div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="flex-1 text-[10px] border border-gray-200 rounded py-1 bg-white cursor-pointer hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="flex-1 text-[10px] bg-red-500 text-white rounded py-1 border-none cursor-pointer hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3.5 py-3 border-t border-gray-100 bg-gray-50 shrink-0">
        <div className="text-[10px] text-gray-400 mb-1">Active orders</div>
        <div className="text-base font-semibold text-gray-900">{orders.length}</div>
        <div className="text-[10px] text-gray-400 mt-0.5">
          Total: ${fmt(orders.reduce((s, o) => s + orderTotal(o), 0))}
        </div>
      </div>
    </div>
  );
}