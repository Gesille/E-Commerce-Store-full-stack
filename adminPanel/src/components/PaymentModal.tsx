"use client";

import { CartItem, Customer, fmt, calcLineTotal } from "@/types/pos";
import { useState } from "react";

export type PaymentLine = {
  method: "cash" | "card" | "bank";
  amount: number;
};

const TAX_RATE = 0.1; // 10% — keep in sync with backend

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function PaymentModal({
  total, // this is the TAX-INCLUSIVE total from calcOrderTotals
  orderName,
  customer,
  cart,
  onClose,
  onConfirm,
  isSubmitting = false,
}: {
  total: number;
  orderName: string;
  customer: Customer | null;
  cart: CartItem[];
  onClose: () => void;
  onConfirm: (lines: PaymentLine[]) => void;
  isSubmitting?: boolean;
}) {
  // Derive subtotal and tax from the tax-inclusive total for display
  // total = subtotal * (1 + TAX_RATE)  →  subtotal = total / (1 + TAX_RATE)
  const subtotalDisplay = round2(total / (1 + TAX_RATE));
  const taxDisplay = round2(total - subtotalDisplay);

  const [lines, setLines] = useState<PaymentLine[]>([
    { method: "cash", amount: total },
  ]);

  const paid = round2(lines.reduce((s, l) => s + l.amount, 0));
  const change = round2(paid - total);
  const remaining = round2(total - paid);
  const isComplete = paid >= total;

  const addMethod = (method: PaymentLine["method"]) => {
    if (lines.find((l) => l.method === method)) return;
    const rem = round2(Math.max(0, total - lines.reduce((s, l) => s + l.amount, 0)));
    setLines([...lines, { method, amount: rem }]);
  };

  const updateAmount = (method: PaymentLine["method"], val: string) => {
    const num = round2(parseFloat(val) || 0);
    setLines(lines.map((l) => (l.method === method ? { ...l, amount: num } : l)));
  };

  const removeLine = (method: PaymentLine["method"]) => {
    setLines(lines.filter((l) => l.method !== method));
  };

  const methodLabel: Record<PaymentLine["method"], string> = {
    cash: "💵 Cash",
    card: "💳 Card",
    bank: "🏦 Bank Transfer",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
          width: 480,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              Payment — {orderName}
            </div>
            {customer && (
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                Customer: {customer.name}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              fontSize: 18,
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Order summary ───────────────────────────────────────────────── */}
        <div
          style={{
            padding: "12px 24px",
            background: "#f8fafc",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#94a3b8",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Order Summary
          </div>
          {cart.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                color: "#374151",
                marginBottom: 4,
              }}
            >
              <span>
                {item.qty}× {item.name}
                {item.discount ? ` (−${item.discount}%)` : ""}
                {item.note ? (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 11,
                      color: "#92400e",
                      background: "#fef3c7",
                      padding: "1px 5px",
                      borderRadius: 4,
                    }}
                  >
                    📝 {item.note}
                  </span>
                ) : null}
              </span>
              <span style={{ fontWeight: 600 }}>${fmt(calcLineTotal(item))}</span>
            </div>
          ))}

          {/* Subtotal / Tax breakdown */}
          <div
            style={{
              borderTop: "1px dashed #e2e8f0",
              marginTop: 8,
              paddingTop: 8,
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "#64748b",
              }}
            >
              <span>Subtotal</span>
              <span>${fmt(subtotalDisplay)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "#64748b",
              }}
            >
              <span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
              <span>${fmt(taxDisplay)}</span>
            </div>
          </div>
        </div>

        {/* ── Amount due ──────────────────────────────────────────────────── */}
        <div
          style={{
            padding: "14px 24px",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 14,
              color: "#64748b",
              marginBottom: 4,
            }}
          >
            <span>Amount Due</span>
            <span
              style={{
                fontWeight: 800,
                color: "#0f172a",
                fontSize: 22,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              ${fmt(total)}
            </span>
          </div>

          {isComplete && change > 0.005 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                color: "#10b981",
                fontWeight: 600,
              }}
            >
              <span>Change</span>
              <span>${fmt(change)}</span>
            </div>
          )}
          {!isComplete && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                color: "#ef4444",
              }}
            >
              <span>Remaining</span>
              <span>${fmt(remaining)}</span>
            </div>
          )}
        </div>

        {/* ── Payment lines ───────────────────────────────────────────────── */}
        <div style={{ padding: "16px 24px" }}>
          <div
            style={{
              fontSize: 11,
              color: "#94a3b8",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 10,
            }}
          >
            Payment Methods
          </div>

          {lines.map((line) => (
            <div
              key={line.method}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "#374151",
                  width: 128,
                  flexShrink: 0,
                }}
              >
                {methodLabel[line.method]}
              </span>
              <input
                type="number"
                value={line.amount}
                onChange={(e) => updateAmount(line.method, e.target.value)}
                style={{
                  flex: 1,
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 14,
                  fontWeight: 700,
                  textAlign: "right",
                  outline: "none",
                  fontFamily: "'DM Mono', monospace",
                  color: "#0f172a",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />
              {lines.length > 1 && (
                <button
                  onClick={() => removeLine(line.method)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#cbd5e1",
                    fontSize: 14,
                    padding: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#cbd5e1")}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {/* Add method buttons */}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {(["cash", "card", "bank"] as const)
              .filter((m) => !lines.find((l) => l.method === m))
              .map((m) => (
                <button
                  key={m}
                  onClick={() => addMethod(m)}
                  style={{
                    fontSize: 11,
                    color: "#3b82f6",
                    border: "1.5px solid #bfdbfe",
                    borderRadius: 8,
                    padding: "4px 10px",
                    background: "#eff6ff",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    transition: "all 0.15s",
                  }}
                >
                  + {methodLabel[m]}
                </button>
              ))}
          </div>
        </div>

        {/* ── Confirm button ──────────────────────────────────────────────── */}
        <div style={{ padding: "0 24px 24px" }}>
          <button
            onClick={() => isComplete && !isSubmitting && onConfirm(lines)}
            disabled={!isComplete || isSubmitting}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 15,
              border: "none",
              cursor: isComplete && !isSubmitting ? "pointer" : "not-allowed",
              background:
                isComplete && !isSubmitting
                  ? "linear-gradient(135deg,#3b82f6,#6366f1)"
                  : "#f1f5f9",
              color: isComplete && !isSubmitting ? "#fff" : "#94a3b8",
              transition: "all 0.2s",
              boxShadow:
                isComplete && !isSubmitting
                  ? "0 4px 16px rgba(59,130,246,0.35)"
                  : "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {isSubmitting
              ? "Processing…"
              : isComplete
              ? `✓ Validate Payment${change > 0.005 ? ` · Change $${fmt(change)}` : ""}`
              : `Enter $${fmt(remaining)} more`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;