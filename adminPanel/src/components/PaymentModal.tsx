"use client";

import { CartItem, Customer, fmt, calcLineTotal, TAX_RATE } from "@/types/pos";
import { useState } from "react";

export type CardBrand = "visa" | "mastercard" | "amex";

export type PaymentLine =
  | { method: "cash"; amount: number }
  | { method: "card"; amount: number; cardBrand: CardBrand }
  | { method: "check"; amount: number; checkNumber: string };

// ── Currency ────────────────────────────────────────────────────────────────
type Currency = "XCD" | "USD";
const USD_TO_XCD = 2.67;

function toXCD(amount: number, currency: Currency): number {
  return round2(currency === "USD" ? amount * USD_TO_XCD : amount);
}

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
  check: { icon: "📝", label: "Check" },
} as const;

type MethodKey = keyof typeof METHOD_META;

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeDefaultLine(method: MethodKey, amount: number): PaymentLine {
  if (method === "card")  return { method: "card",  amount, cardBrand: "visa" };
  if (method === "check") return { method: "check", amount, checkNumber: "" };
  return { method: "cash", amount };
}

function lineKey(l: PaymentLine) {
  return l.method;
}

// ── Currency Toggle ──────────────────────────────────────────────────────────
function CurrencyToggle({
  value,
  onChange,
}: {
  value: Currency;
  onChange: (c: Currency) => void;
}) {
  const btn = (c: Currency) => {
    const active = value === c;
    return (
      <button
        key={c}
        onClick={() => onChange(c)}
        style={{
          flex: 1,
          padding: "7px 0",
          borderRadius: 8,
          border: "none",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          fontFamily: "'DM Mono', monospace",
          background: active ? (c === "USD" ? "#1d4ed8" : "#065f46") : "transparent",
          color: active ? "#fff" : "#64748b",
          transition: "all 0.15s",
          letterSpacing: "0.04em",
        }}
      >
        {c === "USD" ? "🇺🇸 USD" : "🇦🇬 XCD"}
      </button>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        background: "#f1f5f9",
        borderRadius: 10,
        padding: 3,
      }}
    >
      {btn("XCD")}
      {btn("USD")}
    </div>
  );
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
  taxRate,
  taxReason,
  orderName,
  customer,
  cart,
  onClose,
  onConfirm,
  isSubmitting = false,
}: {
  total: number; 
  taxRate:number,  
  taxReason ?:string      
  orderName: string;
  customer: Customer | null;
  cart: CartItem[];
  onClose: () => void;
  onConfirm: (lines: PaymentLine[]) => void;  // amounts always in XCD
  isSubmitting?: boolean;
}) {
 const subtotalDisplay = round2(total / (1 + taxRate));
  const taxDisplay = round2(total - subtotalDisplay);

  // ── Currency state ────────────────────────────────────────────────────────
  const [currency, setCurrency] = useState<Currency>("XCD");

  // The displayed total in the chosen currency
  const displayTotal = currency === "USD" ? round2(total / USD_TO_XCD) : total;
  const currSymbol   = currency === "USD" ? "US$" : "EC$";

  // ── Lines stored in the INPUT currency; converted to XCD on confirm ───────
  const [lines, setLines] = useState<PaymentLine[]>([
    { method: "cash", amount: displayTotal },
  ]);

  // When currency flips, re-scale all amounts so they represent the same XCD value
  const handleCurrencyChange = (newCurrency: Currency) => {
    if (newCurrency === currency) return;
    setLines((prev) =>
      prev.map((l) => {
        const xcdAmount = toXCD(l.amount, currency);
        const newAmount =
          newCurrency === "USD" ? round2(xcdAmount / USD_TO_XCD) : xcdAmount;
        return { ...l, amount: newAmount };
      })
    );
    setCurrency(newCurrency);
  };

  // XCD equivalents for validation
  const paidXCD      = round2(lines.reduce((s, l) => s + toXCD(l.amount, currency), 0));
const changeXCD = Math.max(0, round2(paidXCD - total));
const remainingXCD = Math.max(0, round2(total - paidXCD - 0.005));
  const isComplete = paidXCD >= total - 0.01;

  // Displayed equivalents
  const paidDisplay      = currency === "USD" ? round2(paidXCD / USD_TO_XCD) : paidXCD;
  const changeDisplay    = currency === "USD" ? round2(changeXCD / USD_TO_XCD) : changeXCD;
  const remainingDisplay = currency === "USD" ? round2(remainingXCD / USD_TO_XCD) : remainingXCD;

  const checkLinesValid = lines
    .filter((l): l is Extract<PaymentLine, { method: "check" }> => l.method === "check")
    .every((l) => l.checkNumber.trim().length > 0);

  const canConfirm = isComplete && checkLinesValid && !isSubmitting;

  // ── Line ops ───────────────────────────────────────────────────────────────
  const addMethod = (method: MethodKey) => {
    if (lines.find((l) => l.method === method)) return;
    const remXCD = Math.max(0, remainingXCD);
    const remAmt = currency === "USD" ? round2(remXCD / USD_TO_XCD) : remXCD;
    setLines([...lines, makeDefaultLine(method, remAmt)]);
  };

  const removeLine = (method: MethodKey) =>
    setLines(lines.filter((l) => l.method !== method));

  const updateAmount = (method: MethodKey, val: string) => {
    const num = round2(parseFloat(val) || 0);
    setLines(lines.map((l) => (l.method === method ? { ...l, amount: num } : l)));
  };

  const updateCardBrand = (brand: CardBrand) =>
    setLines(lines.map((l) => (l.method === "card" ? { ...l, cardBrand: brand } : l)));

  const updateCheckNumber = (num: string) =>
    setLines(lines.map((l) => (l.method === "check" ? { ...l, checkNumber: num } : l)));

  const availableMethods = (["cash", "card", "check"] as MethodKey[]).filter(
    (m) => !lines.find((l) => l.method === m)
  );

  // On confirm, convert all amounts to XCD before passing up
  const handleConfirm = () => {
    if (!canConfirm) return;
    const xcdLines = lines.map((l) => ({
      ...l,
      amount: toXCD(l.amount, currency),
    })) as PaymentLine[];
    onConfirm(xcdLines);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
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
        {/* ── Header ──────────────────────────────────────────────────────── */}
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
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18 }}
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
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
                <span style={{ fontWeight: 600 }}>EC${fmt(calcLineTotal(item))}</span>
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
                <span>EC${fmt(subtotalDisplay)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b" }}>
                <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
                <span>EC${fmt(taxDisplay)}</span>
              </div>
            </div>
          </div>

          {/* ── Currency selector ──────────────────────────────────────────── */}
          <div
            style={{
              padding: "14px 24px 0",
              borderBottom: "none",
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
              Payment Currency
            </div>
            <CurrencyToggle value={currency} onChange={handleCurrencyChange} />
            {currency === "USD" && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: "#1d4ed8",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 8,
                  padding: "5px 10px",
                  fontWeight: 500,
                }}
              >
                💱 Rate: 1 USD = {USD_TO_XCD.toFixed(2)} XCD — amounts entered in US$, charged in EC$
              </div>
            )}
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
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    fontWeight: 800,
                    color: "#0f172a",
                    fontSize: 22,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {currSymbol}{fmt(displayTotal)}
                </span>
                {currency === "USD" && (
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                    = EC${fmt(total)}
                  </div>
                )}
              </div>
            </div>

            {isComplete && changeXCD > 0.005 && (
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
                <div style={{ textAlign: "right" }}>
                  <div>{currSymbol}{fmt(changeDisplay)}</div>
                  {currency === "USD" && (
                    <div style={{ fontSize: 11, fontWeight: 500, color: "#6ee7b7" }}>
                      EC${fmt(changeXCD)}
                    </div>
                  )}
                </div>
              </div>
            )}
            {!isComplete && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#ef4444" }}>
                <span>Remaining</span>
                <div style={{ textAlign: "right" }}>
                  <div>{currSymbol}{fmt(remainingDisplay)}</div>
                  {currency === "USD" && (
                    <div style={{ fontSize: 11, color: "#fca5a5" }}>EC${fmt(remainingXCD)}</div>
                  )}
                </div>
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
              {lines.map((line) => {
                const xcdForLine = toXCD(line.amount, currency);
                return (
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
                      <div style={{ flex: 1, position: "relative" }}>
                        <div
                          style={{
                            position: "absolute",
                            left: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#94a3b8",
                            fontFamily: "'DM Mono', monospace",
                            pointerEvents: "none",
                          }}
                        >
                          {currSymbol}
                        </div>
                        <input
                          type="number"
                          value={line.amount}
                          onChange={(e) => updateAmount(line.method, e.target.value)}
                          style={{
                            width: "100%",
                            border: "1.5px solid #e2e8f0",
                            borderRadius: 10,
                            padding: "8px 12px 8px 36px",
                            fontSize: 14,
                            fontWeight: 700,
                            textAlign: "right",
                            outline: "none",
                            fontFamily: "'DM Mono', monospace",
                            color: "#0f172a",
                            background: "#fff",
                            boxSizing: "border-box",
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#3b82f6";
                            e.currentTarget.select();
                          }}
                          onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                        />
                      </div>
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

                    {/* XCD equivalent when in USD mode */}
                    {currency === "USD" && line.amount > 0 && (
                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 11,
                          color: "#6366f1",
                          fontFamily: "'DM Mono', monospace",
                          fontWeight: 600,
                          paddingLeft: 2,
                        }}
                      >
                        = EC${fmt(xcdForLine)}
                      </div>
                    )}

                    {/* Card brand picker */}
                    {line.method === "card" && (
                      <CardBrandPicker selected={line.cardBrand} onChange={updateCardBrand} />
                    )}

                    {/* Check number */}
                    {line.method === "check" && (
                      <CheckInput value={line.checkNumber} onChange={updateCheckNumber} />
                    )}
                  </div>
                );
              })}
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
            {lines.some((l) => l.method === "check") && !checkLinesValid && (
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

        {/* ── Confirm button ───────────────────────────────────────────────── */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #f1f5f9",
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleConfirm}
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
              boxShadow: canConfirm ? "0 4px 16px rgba(59,130,246,0.35)" : "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {isSubmitting
              ? "Processing…"
              : !isComplete
              ? `Enter ${currSymbol}${fmt(remainingDisplay)} more`
              : lines.some((l) => l.method === "check") && !checkLinesValid
              ? "Enter check number to continue"
              : `✓ Validate Payment${
                  changeXCD > 0.005
                    ? ` · Change ${currSymbol}${fmt(changeDisplay)}`
                    : ""
                }`}
          </button>
          {currency === "USD" && isComplete && (
            <div
              style={{
                textAlign: "center",
                fontSize: 11,
                color: "#94a3b8",
                marginTop: 6,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              Total charged: EC${fmt(total)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;