"use client";

import { CartItem, Customer, fmt, calcLineTotal, TAX_RATE } from "@/types/pos";
import { useState } from "react";

export type CardBrand = "visa" | "mastercard" | "amex";

export type PaymentLine =
  | { method: "cash"; amount: number }
  | { method: "card"; amount: number; cardBrand: CardBrand }
  | { method: "bank"; amount: number }
  | { method: "check"; amount: number; checkNumber: string };



function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// ── Card brand SVG logos ────────────────────────────────────────────────────
function VisaLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.63} viewBox="0 0 48 30" fill="none">
      <rect width="48" height="30" rx="4" fill="#1A1F71" />
      <text x="8" y="22" fontFamily="Arial" fontWeight="bold" fontSize="14" fill="#FFFFFF" letterSpacing="1">
        VISA
      </text>
    </svg>
  );
}

function MastercardLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.63} viewBox="0 0 48 30" fill="none">
      <rect width="48" height="30" rx="4" fill="#252525" />
      <circle cx="18" cy="15" r="9" fill="#EB001B" />
      <circle cx="30" cy="15" r="9" fill="#F79E1B" />
      <path d="M24 8.5a9 9 0 0 1 0 13A9 9 0 0 1 24 8.5z" fill="#FF5F00" />
    </svg>
  );
}

function AmexLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.63} viewBox="0 0 48 30" fill="none">
      <rect width="48" height="30" rx="4" fill="#2E77BC" />
      <text x="5" y="21" fontFamily="Arial" fontWeight="bold" fontSize="10" fill="#FFFFFF" letterSpacing="0.5">
        AMERICAN
      </text>
      <text x="5" y="28" fontFamily="Arial" fontWeight="bold" fontSize="7" fill="#FFFFFF" letterSpacing="1.5">
        EXPRESS
      </text>
    </svg>
  );
}

const CARD_BRANDS: { id: CardBrand; label: string; Logo: React.FC<{ size?: number }> }[] = [
  { id: "visa", label: "Visa", Logo: VisaLogo },
  { id: "mastercard", label: "Mastercard", Logo: MastercardLogo },
  { id: "amex", label: "Amex", Logo: AmexLogo },
];

// ── Method config ───────────────────────────────────────────────────────────
const METHOD_META = {
  cash:  { icon: "💵", label: "Cash" },
  card:  { icon: "💳", label: "Card" },
  bank:  { icon: "🏦", label: "Bank Transfer" },
  check: { icon: "📝", label: "Check" },
} as const;

type MethodKey = keyof typeof METHOD_META;

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeDefaultLine(method: MethodKey, amount: number): PaymentLine {
  if (method === "card")  return { method: "card",  amount, cardBrand: "visa" };
  if (method === "check") return { method: "check", amount, checkNumber: "" };
  if (method === "bank")  return { method: "bank",  amount };
  return { method: "cash", amount };
}

function lineKey(l: PaymentLine) {
  return l.method;
}

// ── Card brand picker ────────────────────────────────────────────────────────
function CardBrandPicker({
  selected,
  onChange,
}: {
  selected: CardBrand;
  onChange: (b: CardBrand) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 10, paddingLeft: 2 }}>
      {CARD_BRANDS.map(({ id, label, Logo }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          title={label}
          style={{
            padding: 6,
            borderRadius: 8,
            border: selected === id ? "2px solid #3b82f6" : "2px solid #e2e8f0",
            background: selected === id ? "#eff6ff" : "#fff",
            cursor: "pointer",
            transition: "all 0.15s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: selected === id ? "0 0 0 3px rgba(59,130,246,0.12)" : "none",
          }}
        >
          <Logo size={36} />
        </button>
      ))}
    </div>
  );
}

// ── Check number input ───────────────────────────────────────────────────────
function CheckInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginTop: 10, paddingLeft: 2 }}>
      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>
        CHECK NUMBER
      </div>
      <input
        type="text"
        placeholder="e.g. 001234"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
        style={{
          width: "100%",
          border: "1.5px solid #e2e8f0",
          borderRadius: 10,
          padding: "8px 12px",
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "'DM Mono', monospace",
          color: "#0f172a",
          outline: "none",
          transition: "border-color 0.15s",
          letterSpacing: "0.1em",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
      />
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────
export function PaymentModal({
  total,
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
  const subtotalDisplay = round2(total / (1 + TAX_RATE));
  const taxDisplay = round2(total - subtotalDisplay);

  const [lines, setLines] = useState<PaymentLine[]>([
    { method: "cash", amount: total },
  ]);

  const paid = round2(lines.reduce((s, l) => s + l.amount, 0));
  const change = round2(paid - total);
  const remaining = round2(total - paid);
  const isComplete = paid >= total;

  // Check: every check line must have a non-empty check number
  const checkLinesValid = lines
    .filter((l): l is Extract<PaymentLine, { method: "check" }> => l.method === "check")
    .every((l) => l.checkNumber.trim().length > 0);

  const canConfirm = isComplete && checkLinesValid && !isSubmitting;

  // ── Line ops ────────────────────────────────────────────────────────────
  const addMethod = (method: MethodKey) => {
    if (lines.find((l) => l.method === method)) return;
    const rem = round2(Math.max(0, total - lines.reduce((s, l) => s + l.amount, 0)));
    setLines([...lines, makeDefaultLine(method, rem)]);
  };

  const removeLine = (method: MethodKey) =>
    setLines(lines.filter((l) => l.method !== method));

  const updateAmount = (method: MethodKey, val: string) => {
    const num = round2(parseFloat(val) || 0);
    setLines(lines.map((l) => (l.method === method ? { ...l, amount: num } : l)));
  };

  const updateCardBrand = (brand: CardBrand) =>
    setLines(
      lines.map((l) =>
        l.method === "card" ? { ...l, cardBrand: brand } : l
      )
    );

  const updateCheckNumber = (num: string) =>
    setLines(
      lines.map((l) =>
        l.method === "check" ? { ...l, checkNumber: num } : l
      )
    );

  const availableMethods = (
    ["cash", "card", "bank", "check"] as MethodKey[]
  ).filter((m) => !lines.find((l) => l.method === m));

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          width: 500,
          maxHeight: "90vh",
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
            flexShrink: 0,
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

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {/* Order summary */}
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
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b" }}>
                <span>Subtotal</span>
                <span>${fmt(subtotalDisplay)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b" }}>
                <span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
                <span>${fmt(taxDisplay)}</span>
              </div>
            </div>
          </div>

          {/* Amount due */}
          <div style={{ padding: "14px 24px", borderBottom: "1px solid #f1f5f9" }}>
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
                  fontSize: 15,
                  color: "#10b981",
                  fontWeight: 700,
                  background: "#f0fdf4",
                  padding: "6px 10px",
                  borderRadius: 8,
                  marginTop: 4,
                }}
              >
                <span>💵 Change to return</span>
                <span>${fmt(change)}</span>
              </div>
            )}
            {!isComplete && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#ef4444" }}>
                <span>Remaining</span>
                <span>${fmt(remaining)}</span>
              </div>
            )}
          </div>

          {/* Payment lines */}
          <div style={{ padding: "16px 24px" }}>
            <div
              style={{
                fontSize: 11,
                color: "#94a3b8",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 12,
              }}
            >
              Payment Methods
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {lines.map((line) => (
                <div
                  key={lineKey(line)}
                  style={{
                    background: "#f8fafc",
                    borderRadius: 12,
                    padding: "12px 14px",
                    border: "1.5px solid #e2e8f0",
                  }}
                >
                  {/* Amount row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, color: "#374151", width: 136, flexShrink: 0, fontWeight: 600 }}>
                      {METHOD_META[line.method].icon} {METHOD_META[line.method].label}
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
                        background: "#fff",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#3b82f6";
                        e.currentTarget.select();
                      }}
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
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#cbd5e1")}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Card brand picker */}
                  {line.method === "card" && (
                    <CardBrandPicker
                      selected={line.cardBrand}
                      onChange={updateCardBrand}
                    />
                  )}

                  {/* Check number */}
                  {line.method === "check" && (
                    <CheckInput
                      value={line.checkNumber}
                      onChange={updateCheckNumber}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Add method buttons */}
            {availableMethods.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                {availableMethods.map((m) => (
                  <button
                    key={m}
                    onClick={() => addMethod(m)}
                    style={{
                      fontSize: 11,
                      color: "#3b82f6",
                      border: "1.5px solid #bfdbfe",
                      borderRadius: 8,
                      padding: "5px 12px",
                      background: "#eff6ff",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 600,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#dbeafe";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#eff6ff";
                    }}
                  >
                    + {METHOD_META[m].icon} {METHOD_META[m].label}
                  </button>
                ))}
              </div>
            )}

            {/* Check validation warning */}
            {lines.some((l) => l.method === "check") &&
              !checkLinesValid && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: "#d97706",
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontWeight: 500,
                  }}
                >
                  ⚠️ Please enter the check number to continue.
                </div>
              )}
          </div>
        </div>

        {/* ── Confirm button (always visible) ────────────────────────────── */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #f1f5f9",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => canConfirm && onConfirm(lines)}
            disabled={!canConfirm}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 15,
              border: "none",
              cursor: canConfirm ? "pointer" : "not-allowed",
              background: canConfirm
                ? "linear-gradient(135deg,#3b82f6,#6366f1)"
                : "#f1f5f9",
              color: canConfirm ? "#fff" : "#94a3b8",
              transition: "all 0.2s",
              boxShadow: canConfirm
                ? "0 4px 16px rgba(59,130,246,0.35)"
                : "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {isSubmitting
              ? "Processing…"
              : !isComplete
              ? `Enter $${fmt(remaining)} more`
              : lines.some((l) => l.method === "check") && !checkLinesValid
              ? "Enter check number to continue"
              : `✓ Validate Payment${change > 0.005 ? ` · Change $${fmt(change)}` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;