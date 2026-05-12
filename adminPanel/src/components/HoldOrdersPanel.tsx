"use client";

import { Order } from "@/types/pos";

interface HoldOrdersPanelProps {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  activeOrderId: number;
  setActiveOrderId: (id: number) => void;
}

export default function HoldOrdersPanel({
  orders,
  setOrders,
  activeOrderId,
  setActiveOrderId,
}: HoldOrdersPanelProps) {
  const addOrder = () => {
    const newId = Date.now();
    setOrders([
      ...orders,
      {
        id: newId,
        name: `Order ${orders.length + 1}`,
        cart: [],
        createdAt: new Date(),
      },
    ]);
    setActiveOrderId(newId);
  };

  const deleteOrder = (id: number) => {
    const updated = orders.filter((o) => o.id !== id);
    setOrders(updated);
    if (activeOrderId === id && updated.length > 0) {
      setActiveOrderId(updated[0].id);
    }
  };

  const orderTotal = (order: Order) =>
    order.cart.reduce(
      (s, i) => s + i.price * i.qty * (1 - (i.discount || 0) / 100),
      0
    );

  return (
    <div
      style={{
        width: "148px",
        borderLeft: "1px solid #B4B2A9",
        display: "flex",
        flexDirection: "column",
        background: "#E8E4DA",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#444441",
          color: "#D3D1C7",
          padding: "0 10px",
          height: "38px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px" }}>
          Orders
        </span>
        <button
          onClick={addOrder}
          title="New order"
          aria-label="New order"
          style={{
            background: "#3B6D11",
            border: "none",
            color: "#EAF3DE",
            fontSize: "16px",
            width: "22px",
            height: "22px",
            borderRadius: "2px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = "#27500A")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = "#3B6D11")
          }
        >
          +
        </button>
      </div>

      {/* Order list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {orders.map((order) => {
          const isActive = order.id === activeOrderId;
          const tot = orderTotal(order);

          return (
            <div
              key={order.id}
              onClick={() => setActiveOrderId(order.id)}
              style={{
                padding: "8px 10px",
                borderBottom: "1px solid #D3D1C7",
                cursor: "pointer",
                background: isActive ? "#3B6D11" : "transparent",
                borderLeft: isActive ? "3px solid #27500A" : "3px solid transparent",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLDivElement).style.background =
                    "#D3D1C7";
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLDivElement).style.background =
                    "transparent";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: isActive ? "#EAF3DE" : "#2C2C2A",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}
                >
                  {order.name}
                </span>

                {orders.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteOrder(order.id);
                    }}
                    aria-label={`Delete ${order.name}`}
                    style={{
                      background: "none",
                      border: "none",
                      color: isActive ? "#9FE1CB" : "#888780",
                      cursor: "pointer",
                      fontSize: "11px",
                      padding: "0 0 0 4px",
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div
                style={{
                  marginTop: "3px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: isActive ? "#9FE1CB" : "#888780",
                }}
              >
                <span>{order.cart.length} item{order.cart.length !== 1 ? "s" : ""}</span>
                {tot > 0 && <span>${tot.toFixed(2)}</span>}
              </div>

              {/* Time stamp */}
              <div
                style={{
                  marginTop: "2px",
                  fontSize: "10px",
                  color: isActive ? "#5DCAA5" : "#B4B2A9",
                }}
              >
                {order.createdAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div
        style={{
          padding: "8px 10px",
          borderTop: "1px solid #B4B2A9",
          background: "#D3D1C7",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: "10px", color: "#5F5E5A", marginBottom: "2px" }}>
          Active orders
        </div>
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#2C2C2A" }}>
          {orders.length}
        </div>
        <div style={{ fontSize: "10px", color: "#888780", marginTop: "2px" }}>
          Total: $
          {orders
            .reduce((s, o) => s + orderTotal(o), 0)
            .toFixed(2)}
        </div>
      </div>
    </div>
  );
}