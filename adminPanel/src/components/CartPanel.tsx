"use client";

import { useState } from "react";
import { CartItem } from "@/types/pos";

interface CartPanelProps {
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  orderName: string;
}

type NumpadMode = "Qty" | "Disc" | "Price";

export default function CartPanel({ cart, setCart, orderName }: CartPanelProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<NumpadMode>("Qty");
  const [buf, setBuf] = useState("");
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<"cash" | "card" | null>(null);
  const [cashInput, setCashInput] = useState("");

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty * (1 - (i.discount || 0) / 100), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const updateQty = (id: number, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((i) => i.id !== id));
      setSelectedId(null);
    } else {
      setCart(cart.map((i) => (i.id === id ? { ...i, qty } : i)));
    }
  };

  const updateDiscount = (id: number, discount: number) => {
    setCart(cart.map((i) => (i.id === id ? { ...i, discount: Math.min(100, Math.max(0, discount)) } : i)));
  };

  const updatePrice = (id: number, price: number) => {
    if (price >= 0) setCart(cart.map((i) => (i.id === id ? { ...i, price } : i)));
  };

  const removeItem = (id: number) => {
    setCart(cart.filter((i) => i.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleNp = (val: string) => {
    if (!selectedId) return;
    const line = cart.find((i) => i.id === selectedId);
    if (!line) return;

    let nextBuf = buf;
    if (val === "del") {
      nextBuf = buf.slice(0, -1);
    } else if (val === "." && buf.includes(".")) {
      return;
    } else {
      nextBuf = buf + val;
    }
    setBuf(nextBuf);

    const num = parseFloat(nextBuf);
    if (isNaN(num)) return;
    if (mode === "Qty") updateQty(selectedId, Math.round(num));
    else if (mode === "Disc") updateDiscount(selectedId, num);
    else if (mode === "Price") updatePrice(selectedId, num);
  };

  const handleNpQuick = (delta: number) => {
    if (!selectedId) return;
    const line = cart.find((i) => i.id === selectedId);
    if (!line) return;
    setBuf("");
    if (mode === "Qty") updateQty(selectedId, Math.max(0, line.qty + delta));
  };

  const handleCheckout = (method: "cash" | "card") => {
    setPayMethod(method);
    setShowPayModal(true);
    setCashInput("");
  };

  const confirmPayment = () => {
    setCart([]);
    setSelectedId(null);
    setShowPayModal(false);
    setPayMethod(null);
    setCashInput("");
    setBuf("");
  };

  const cashGiven = parseFloat(cashInput) || 0;
  const change = cashGiven - total;

  const btnBase: React.CSSProperties = {
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    transition: "background 0.1s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <>
      <div
        style={{
          width: "288px",
          borderLeft: "1px solid #B4B2A9",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#444441",
            color: "#F1EFE8",
            padding: "0 12px",
            height: "38px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 500 }}>{orderName}</span>
          <span style={{ fontSize: "11px", color: "#888780" }}>
            {cart.length} item{cart.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Customer row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "7px 12px",
            background: "#F1EFE8",
            borderBottom: "1px solid #B4B2A9",
            cursor: "pointer",
            fontSize: "12px",
            color: "#5F5E5A",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLDivElement).style.background = "#EAF3DE")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLDivElement).style.background = "#F1EFE8")
          }
        >
          <span>👤</span>
          <span>Select customer</span>
          <span style={{ marginLeft: "auto", color: "#B4B2A9" }}>▾</span>
        </div>

        {/* Order lines */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {cart.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "80px",
                color: "#B4B2A9",
                fontSize: "12px",
                gap: "4px",
              }}
            >
              <span style={{ fontSize: "22px" }}>🛒</span>
              <span>No items yet</span>
            </div>
          )}

          {cart.map((item) => {
            const lineTotal = item.price * item.qty * (1 - (item.discount || 0) / 100);
            const isSel = selectedId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  setBuf("");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "7px 10px",
                  borderBottom: "1px solid #F1EFE8",
                  background: isSel ? "#EAF3DE" : "#fff",
                  cursor: "pointer",
                  transition: "background 0.1s",
                  borderLeft: isSel ? "3px solid #3B6D11" : "3px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isSel)
                    (e.currentTarget as HTMLDivElement).style.background = "#F1EFE8";
                }}
                onMouseLeave={(e) => {
                  if (!isSel)
                    (e.currentTarget as HTMLDivElement).style.background = "#fff";
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "#2C2C2A",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "#888780", marginTop: "1px" }}>
                    ${item.price.toFixed(2)}
                    {item.discount ? (
                      <span style={{ color: "#3B6D11", marginLeft: "4px" }}>
                        -{item.discount}%
                      </span>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "3px", marginRight: "6px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => updateQty(item.id, item.qty - 1)}
                    style={{
                      ...btnBase,
                      width: "18px",
                      height: "18px",
                      background: "#F1EFE8",
                      border: "1px solid #B4B2A9",
                      borderRadius: "2px",
                      fontSize: "14px",
                      color: "#444441",
                    }}
                    aria-label={`Decrease qty for ${item.name}`}
                  >
                    −
                  </button>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      minWidth: "20px",
                      textAlign: "center",
                      color: "#2C2C2A",
                    }}
                  >
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateQty(item.id, item.qty + 1)}
                    style={{
                      ...btnBase,
                      width: "18px",
                      height: "18px",
                      background: "#F1EFE8",
                      border: "1px solid #B4B2A9",
                      borderRadius: "2px",
                      fontSize: "14px",
                      color: "#444441",
                    }}
                    aria-label={`Increase qty for ${item.name}`}
                  >
                    +
                  </button>
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#2C2C2A",
                    minWidth: "44px",
                    textAlign: "right",
                    marginRight: "6px",
                  }}
                >
                  ${lineTotal.toFixed(2)}
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                  style={{ ...btnBase, background: "none", color: "#B4B2A9", padding: "2px 3px", fontSize: "12px" }}
                  aria-label={`Remove ${item.name}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div
          style={{
            padding: "8px 12px",
            background: "#F1EFE8",
            borderTop: "1px solid #B4B2A9",
            flexShrink: 0,
          }}
        >
          {[
            ["Subtotal", `$${subtotal.toFixed(2)}`],
            ["Tax (10%)", `$${tax.toFixed(2)}`],
            ["Discount", "— $0.00"],
          ].map(([label, val]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "#5F5E5A",
                padding: "2px 0",
              }}
            >
              <span>{label}</span>
              <span style={label === "Discount" ? { color: "#3B6D11" } : {}}>{val}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
              fontWeight: 500,
              color: "#2C2C2A",
              borderTop: "1px solid #B4B2A9",
              marginTop: "5px",
              paddingTop: "6px",
            }}
          >
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Numpad mode tabs */}
        <div style={{ display: "flex", background: "#444441", flexShrink: 0 }}>
          {(["Qty", "Disc", "Price"] as NumpadMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setBuf(""); }}
              style={{
                ...btnBase,
                flex: 1,
                height: "28px",
                borderRight: "1px solid #5F5E5A",
                background: mode === m ? "#3B6D11" : "transparent",
                color: mode === m ? "#EAF3DE" : "#B4B2A9",
                fontSize: "11px",
                fontWeight: mode === m ? 500 : 400,
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Numpad */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1px",
            background: "#B4B2A9",
            flexShrink: 0,
          }}
        >
          {["7","8","9","del","4","5","6","rm","1","2","3","+1","0","0",".","-1"].map((k, i) => {
            const isDark = k === "del" || k === "+1" || k === "-1";
            const isRed = k === "rm";
            return (
              <button
                key={i}
                onClick={() => {
                  if (k === "rm") { if (selectedId) removeItem(selectedId); }
                  else if (k === "+1") handleNpQuick(1);
                  else if (k === "-1") handleNpQuick(-1);
                  else handleNp(k);
                }}
                style={{
                  ...btnBase,
                  height: "34px",
                  background: isRed ? "#A32D2D" : isDark ? "#444441" : "#F1EFE8",
                  color: isRed ? "#fff" : isDark ? "#F1EFE8" : "#2C2C2A",
                  fontSize: k === "del" || k === "rm" ? "14px" : "13px",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = isRed
                    ? "#791F1F"
                    : isDark
                    ? "#5F5E5A"
                    : "#EAF3DE";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = isRed
                    ? "#A32D2D"
                    : isDark
                    ? "#444441"
                    : "#F1EFE8";
                }}
                aria-label={k === "del" ? "Backspace" : k === "rm" ? "Remove item" : k}
              >
                {k === "del" ? "⌫" : k === "rm" ? "🗑" : k}
              </button>
            );
          })}
        </div>

        {/* Pay buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "#B4B2A9", flexShrink: 0 }}>
          <button
            onClick={() => handleCheckout("cash")}
            disabled={cart.length === 0}
            style={{
              ...btnBase,
              height: "42px",
              background: cart.length === 0 ? "#888780" : "#3B6D11",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              gap: "5px",
              cursor: cart.length === 0 ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => { if (cart.length > 0) (e.currentTarget as HTMLButtonElement).style.background = "#27500A"; }}
            onMouseLeave={(e) => { if (cart.length > 0) (e.currentTarget as HTMLButtonElement).style.background = "#3B6D11"; }}
          >
            💵 Cash
          </button>
          <button
            onClick={() => handleCheckout("card")}
            disabled={cart.length === 0}
            style={{
              ...btnBase,
              height: "42px",
              background: cart.length === 0 ? "#888780" : "#185FA5",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              gap: "5px",
              cursor: cart.length === 0 ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => { if (cart.length > 0) (e.currentTarget as HTMLButtonElement).style.background = "#0C447C"; }}
            onMouseLeave={(e) => { if (cart.length > 0) (e.currentTarget as HTMLButtonElement).style.background = "#185FA5"; }}
          >
            💳 Card
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setShowPayModal(false)}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #B4B2A9",
              width: "320px",
              borderRadius: "4px",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              style={{
                background: "#444441",
                color: "#F1EFE8",
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 500 }}>
                {payMethod === "cash" ? "💵 Cash payment" : "💳 Card payment"}
              </span>
              <button
                onClick={() => setShowPayModal(false)}
                style={{ background: "none", border: "none", color: "#888780", cursor: "pointer", fontSize: "16px" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "16px" }}>
              {/* Order summary */}
              <div style={{ background: "#F1EFE8", border: "1px solid #D3D1C7", borderRadius: "3px", padding: "10px 12px", marginBottom: "14px" }}>
                {cart.map((i) => (
                  <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "2px 0", color: "#5F5E5A" }}>
                    <span>{i.qty}x {i.name}</span>
                    <span>${(i.price * i.qty).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #D3D1C7", marginTop: "6px", paddingTop: "6px", display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 500, color: "#2C2C2A" }}>
                  <span>Total due</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Cash input */}
              {payMethod === "cash" && (
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "11px", color: "#5F5E5A", display: "block", marginBottom: "5px" }}>
                    Cash given
                  </label>
                  <input
                    type="number"
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    placeholder={`${total.toFixed(2)}`}
                    autoFocus
                    style={{
                      width: "100%",
                      height: "36px",
                      border: "1px solid #B4B2A9",
                      borderRadius: "3px",
                      padding: "0 10px",
                      fontSize: "14px",
                      fontWeight: 500,
                      outline: "none",
                      background: "#F1EFE8",
                    }}
                  />
                  {cashInput && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "8px",
                        padding: "8px 10px",
                        background: change >= 0 ? "#EAF3DE" : "#FCEBEB",
                        border: `1px solid ${change >= 0 ? "#C0DD97" : "#F7C1C1"}`,
                        borderRadius: "3px",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: change >= 0 ? "#27500A" : "#791F1F",
                      }}
                    >
                      <span>Change</span>
                      <span>${Math.abs(change).toFixed(2)}{change < 0 ? " (short)" : ""}</span>
                    </div>
                  )}
                </div>
              )}

              {payMethod === "card" && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "14px",
                    background: "#E6F1FB",
                    border: "1px solid #B5D4F4",
                    borderRadius: "3px",
                    marginBottom: "12px",
                    color: "#0C447C",
                    fontSize: "12px",
                  }}
                >
                  💳 Present card or tap terminal
                </div>
              )}

              <button
                onClick={confirmPayment}
                disabled={payMethod === "cash" && cashInput !== "" && change < 0}
                style={{
                  width: "100%",
                  height: "40px",
                  background: "#3B6D11",
                  color: "#fff",
                  border: "none",
                  borderRadius: "3px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#27500A")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#3B6D11")}
              >
                ✓ Validate payment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}