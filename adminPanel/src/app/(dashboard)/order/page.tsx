"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import { format, isSameDay, subDays } from "date-fns";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  CheckCircle2, XCircle, Clock, Package, MapPin, Calendar,
  RefreshCw, Inbox, AlertCircle, TrendingUp, ShoppingBag,
  DollarSign, Users, ChevronLeft, ChevronRight, X, ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  useGetAdminOrdersQuery,
  useGetAdminOrderDetailQuery,
  useConfirmOrderMutation,
  useCancelOrderMutation,
} from "@/redux/order/orderApi";

// ─── Types ────────────────────────────────────────────────────────────────────
interface OdooOrderLine {
  id: number;
  product_id: [number, string];
  name: string;
  product_uom_qty: number;
  price_unit: number;
  price_subtotal: number;
}

interface OdooOrderDetail {
  id: number;
  name: string;
  date_order: string;
  state: string;
  partner_id: [number, string];
  user_id?: [number, string];
  origin?: string;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  lines: OdooOrderLine[];
}

interface OdooOrder {
  id: number;
  name: string;
  date_order: string;
  state: string;
  partner_id: [number, string];
  amount_total: number;
  origin?: string;
  // MongoDB _id embedded when order came from store
  mongo_order_id?: string;
  mongo_status?: "pending" | "confirmed" | "cancelled" | "processing" | "done";
}

// ─── Config ───────────────────────────────────────────────────────────────────
const ODOO_STATE_COLORS: Record<string, { color: string; bg: string; border: string; label: string }> = {
  draft:  { color: "#64748b", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.2)", label: "Draft" },
  sent:   { color: "#3b82f6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.2)",  label: "Sent" },
  sale:   { color: "#059669", bg: "rgba(5,150,105,0.08)",   border: "rgba(5,150,105,0.2)",   label: "Confirmed" },
  done:   { color: "#7c3aed", bg: "rgba(124,58,237,0.08)",  border: "rgba(124,58,237,0.2)",  label: "Done" },
  cancel: { color: "#e11d48", bg: "rgba(225,29,72,0.08)",   border: "rgba(225,29,72,0.15)",  label: "Cancelled" },
};

const MONGO_STATUS_COLORS: Record<string, { color: string; bg: string; border: string; label: string }> = {
  pending:    { color: "#d97706", bg: "rgba(217,119,6,0.08)",   border: "rgba(217,119,6,0.22)",   label: "Pending" },
  confirmed:  { color: "#059669", bg: "rgba(5,150,105,0.08)",   border: "rgba(5,150,105,0.22)",   label: "Confirmed" },
  cancelled:  { color: "#e11d48", bg: "rgba(225,29,72,0.08)",   border: "rgba(225,29,72,0.18)",   label: "Cancelled" },
  processing: { color: "#3b82f6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.22)",  label: "Processing" },
  done:       { color: "#7c3aed", bg: "rgba(124,58,237,0.08)",  border: "rgba(124,58,237,0.22)",  label: "Done" },
};

// Tab definitions — keyed to Odoo states + a special "pending" for mongo pending
const TABS = [
  { key: "all",      label: "All Orders" },
  { key: "pending",  label: "Pending Approval" },
  { key: "sale",     label: "Confirmed" },
  { key: "cancel",   label: "Cancelled" },
];

const fmt  = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n ?? 0);
const fmtD = (iso: string) => new Date(iso).toLocaleString("en-US", {
  month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
});

// ─── Order Detail Modal (read-only, for confirmed/done/cancelled) ─────────────
function OrderDetailModal({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const { data, isLoading } = useGetAdminOrderDetailQuery(orderId);
  const order: OdooOrderDetail | undefined = data?.order;
  const cfg = order ? (ODOO_STATE_COLORS[order.state] ?? ODOO_STATE_COLORS.draft) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--card)", borderRadius: 18,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          width: "100%", maxWidth: 660, maxHeight: "90vh",
          overflowY: "auto", border: "1px solid var(--border)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {isLoading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>
            Loading order details…
          </div>
        ) : !order ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>
            Order not found
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              padding: "20px 24px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
              gap: 12, position: "sticky", top: 0,
              background: "var(--card)", zIndex: 1,
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: "var(--foreground)" }}>
                    {order.name}
                  </span>
                  {cfg && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      {cfg.label}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                  <Calendar size={11} /> {format(new Date(order.date_order), "MMMM d, yyyy · h:mm a")}
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  padding: 8, borderRadius: 9, border: "1px solid var(--border)",
                  background: "var(--muted)", cursor: "pointer", flexShrink: 0,
                  display: "flex", alignItems: "center", color: "var(--muted-foreground)",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Customer / meta */}
            <div style={{
              padding: "16px 24px", borderBottom: "1px solid var(--border)",
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13,
            }}>
              <div>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Customer</p>
                <p style={{ fontWeight: 600, margin: 0 }}>{order.partner_id?.[1]}</p>
              </div>
              {order.user_id && (
                <div>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Salesperson</p>
                  <p style={{ fontWeight: 600, margin: 0 }}>{order.user_id[1]}</p>
                </div>
              )}
              {order.origin && (
                <div>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Origin</p>
                  <p style={{ fontWeight: 600, margin: 0, fontFamily: "monospace", fontSize: 12 }}>{order.origin}</p>
                </div>
              )}
            </div>

            {/* Lines */}
            <div style={{ padding: "20px 24px" }}>
              <p style={{ fontWeight: 600, fontSize: 12, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <Package size={13} /> Products
              </p>
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 52px 90px 90px",
                  gap: 8, padding: "9px 16px", background: "var(--muted)",
                  fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)",
                  textTransform: "uppercase", letterSpacing: "0.05em",
                }}>
                  <span>Product</span>
                  <span style={{ textAlign: "center" }}>Qty</span>
                  <span style={{ textAlign: "right" }}>Unit</span>
                  <span style={{ textAlign: "right" }}>Subtotal</span>
                </div>
                {order.lines?.map((line, i) => (
                  <div key={line.id ?? i} style={{
                    display: "grid", gridTemplateColumns: "1fr 52px 90px 90px",
                    gap: 8, padding: "12px 16px", fontSize: 13, alignItems: "center",
                    borderTop: "1px solid var(--border)",
                    background: i % 2 !== 0 ? "rgba(0,0,0,0.015)" : "transparent",
                  }}>
                    <div>
                      <p style={{ fontWeight: 500, margin: 0, color: "var(--foreground)" }}>{line.product_id?.[1]}</p>
                      {line.name !== line.product_id?.[1] && (
                        <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>{line.name}</p>
                      )}
                    </div>
                    <p style={{ textAlign: "center", margin: 0, fontWeight: 700 }}>{line.product_uom_qty}</p>
                    <p style={{ textAlign: "right", margin: 0, fontFamily: "monospace", fontSize: 12, color: "var(--muted-foreground)" }}>{fmt(line.price_unit)}</p>
                    <p style={{ textAlign: "right", margin: 0, fontWeight: 700, fontFamily: "monospace" }}>{fmt(line.price_subtotal)}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, fontSize: 13 }}>
                <div style={{ display: "flex", gap: 32 }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Subtotal</span>
                  <span style={{ fontFamily: "monospace" }}>{fmt(order.amount_untaxed)}</span>
                </div>
                <div style={{ display: "flex", gap: 32 }}>
                  <span style={{ color: "var(--muted-foreground)" }}>Tax</span>
                  <span style={{ fontFamily: "monospace" }}>{fmt(order.amount_tax)}</span>
                </div>
                <div style={{ display: "flex", gap: 32, fontWeight: 800, fontSize: 15, borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 4 }}>
                  <span>Total</span>
                  <span style={{ fontFamily: "monospace" }}>{fmt(order.amount_total)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Pending Approval Modal (with confirm / cancel actions) ──────────────────
function PendingApprovalModal({
  orderId,
  onClose,
  onActionDone,
}: {
  orderId: number;
  onClose: () => void;
  onActionDone: () => void;
}) {
  const { data, isLoading } = useGetAdminOrderDetailQuery(orderId);
  const order: OdooOrderDetail | undefined = data?.order;

  // We need the mongo _id from origin field: "WEB_ORDER_<mongoId>"
  const mongoId = order?.origin?.startsWith("WEB_ORDER_")
    ? order.origin.replace("WEB_ORDER_", "")
    : null;

  const [confirmOrder, { isLoading: confirming }] = useConfirmOrderMutation();
  const [cancelOrder,  { isLoading: cancelling  }] = useCancelOrderMutation();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const isActing = confirming || cancelling;

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleConfirm = async () => {
    if (!mongoId) { showToast("Cannot find MongoDB order ID in origin field.", false); return; }
    try {
      await confirmOrder(mongoId).unwrap();
      showToast("Order confirmed and synced to Odoo.", true);
      setTimeout(() => { onClose(); onActionDone(); }, 1200);
    } catch {
      showToast("Failed to confirm order. Please try again.", false);
    }
  };

  const handleCancel = async () => {
    if (!mongoId) { showToast("Cannot find MongoDB order ID in origin field.", false); return; }
    try {
      await cancelOrder(mongoId).unwrap();
      showToast("Order cancelled. Customer has been notified.", true);
      setTimeout(() => { onClose(); onActionDone(); }, 1200);
    } catch {
      showToast("Failed to cancel order. Please try again.", false);
    }
  };

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--card)", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", width: "100%", maxWidth: 660, maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Toast */}
        {toast && (
          <div style={{
            padding: "12px 20px", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8,
            background: toast.ok ? "rgba(5,150,105,0.1)" : "rgba(225,29,72,0.08)",
            color: toast.ok ? "#059669" : "#e11d48",
            borderBottom: `1px solid ${toast.ok ? "rgba(5,150,105,0.2)" : "rgba(225,29,72,0.15)"}`,
          }}>
            {toast.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {toast.msg}
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>Loading order details…</div>
        ) : !order ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>Order not found</div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              padding: "20px 24px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
              gap: 12, position: "sticky", top: 0, background: "var(--card)", zIndex: 1,
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>{order.name}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                    color: "#d97706", background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.25)",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    Pending Approval
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                  <Calendar size={11} /> {format(new Date(order.date_order), "MMMM d, yyyy · h:mm a")}
                </p>
              </div>
              <button onClick={onClose} style={{ padding: 8, borderRadius: 9, border: "1px solid var(--border)", background: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--muted-foreground)" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div style={{ background: "var(--muted)", borderRadius: 10, padding: "12px 14px" }}>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Customer</p>
                  <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{order.partner_id?.[1]}</p>
                </div>
                <div style={{ background: "var(--muted)", borderRadius: 10, padding: "12px 14px" }}>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Products</p>
                  <p style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>{order.lines?.length ?? 0}</p>
                </div>
                <div style={{ background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.2)", borderRadius: 10, padding: "12px 14px" }}>
                  <p style={{ fontSize: 11, color: "#059669", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Total</p>
                  <p style={{ fontWeight: 800, fontSize: 18, margin: 0, color: "#059669", fontFamily: "monospace" }}>{fmt(order.amount_total)}</p>
                </div>
              </div>

              {/* Items table */}
              <div>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <Package size={12} /> Items Ordered
                </p>
                <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 52px 90px 90px", gap: 8, padding: "9px 16px", background: "var(--muted)", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <span>Product</span>
                    <span style={{ textAlign: "center" }}>Qty</span>
                    <span style={{ textAlign: "right" }}>Unit</span>
                    <span style={{ textAlign: "right" }}>Subtotal</span>
                  </div>
                  {order.lines?.map((line, i) => (
                    <div key={line.id ?? i} style={{ display: "grid", gridTemplateColumns: "1fr 52px 90px 90px", gap: 8, padding: "12px 16px", fontSize: 13, alignItems: "center", borderTop: "1px solid var(--border)", background: i % 2 !== 0 ? "rgba(0,0,0,0.015)" : "transparent" }}>
                      <div>
                        <p style={{ fontWeight: 500, margin: 0 }}>{line.product_id?.[1]}</p>
                        {line.name !== line.product_id?.[1] && (
                          <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>{line.name}</p>
                        )}
                      </div>
                      <p style={{ textAlign: "center", margin: 0, fontWeight: 700 }}>{line.product_uom_qty}</p>
                      <p style={{ textAlign: "right", margin: 0, fontFamily: "monospace", fontSize: 12, color: "var(--muted-foreground)" }}>{fmt(line.price_unit)}</p>
                      <p style={{ textAlign: "right", margin: 0, fontWeight: 700, fontFamily: "monospace" }}>{fmt(line.price_subtotal)}</p>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--muted)", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                      {order.lines?.length ?? 0} product{(order.lines?.length ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Total</span>
                      <span style={{ fontWeight: 800, fontSize: 17, fontFamily: "monospace" }}>{fmt(order.amount_total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* No mongoId warning */}
              {!mongoId && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 9, background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)", fontSize: 13, color: "#d97706" }}>
                  <AlertCircle size={14} />
                  This order has no WEB_ORDER origin — confirm/cancel via Odoo directly.
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <button onClick={onClose} disabled={isActing} style={{ padding: "10px 20px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 600, cursor: isActing ? "not-allowed" : "pointer", opacity: isActing ? 0.5 : 1 }}>
                  Close
                </button>
                {mongoId && (
                  <>
                    <button onClick={handleCancel} disabled={isActing} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 9, border: "1px solid rgba(225,29,72,0.3)", background: "rgba(225,29,72,0.06)", color: "#e11d48", fontSize: 13, fontWeight: 600, cursor: isActing ? "not-allowed" : "pointer", opacity: isActing ? 0.6 : 1 }}>
                      <XCircle size={15} />
                      {cancelling ? "Cancelling…" : "Cancel Order"}
                    </button>
                    <button onClick={handleConfirm} disabled={isActing} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 24px", borderRadius: 9, border: "none", background: "#059669", color: "#fff", fontSize: 13, fontWeight: 600, cursor: isActing ? "not-allowed" : "pointer", opacity: isActing ? 0.6 : 1, boxShadow: "0 2px 8px rgba(5,150,105,0.3)" }}>
                      <CheckCircle2 size={15} />
                      {confirming ? "Confirming…" : "Confirm Order"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OdooOrderCard({
  order,
  isPending,
  onSelect,
}: {
  order: OdooOrder;
  isPending: boolean;
  onSelect: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data, isFetching } = useGetAdminOrderDetailQuery(order.id, { skip: !expanded });
  const detail: OdooOrderDetail | undefined = data?.order;

  const cfg = isPending
    ? MONGO_STATUS_COLORS.pending
    : (ODOO_STATE_COLORS[order.state] ?? ODOO_STATE_COLORS.draft);

  const handleClick = () => {
    if (isPending) {
      onSelect(order.id);
    } else {
      setExpanded(e => !e);
    }
  };

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      {/* Header row */}
      <div
        onClick={handleClick}
        style={{ padding: "15px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "var(--foreground)" }}>
              {order.name}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
              {cfg.label}
            </span>
            {order.origin?.startsWith("WEB_ORDER") && (
              <span style={{ fontSize: 10, fontWeight: 600, color: "#7c3aed" }}>From Store</span>
            )}
            {isPending && (
              <span style={{ fontSize: 11, color: "#d97706" }}>· click to review</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar size={11} />{fmtD(order.date_order)}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Users size={11} />{order.partner_id?.[1]}
            </span>
          </div>
        </div>

        <span style={{ fontWeight: 800, fontSize: 15, fontFamily: "monospace", color: "var(--foreground)", flexShrink: 0 }}>
          {fmt(order.amount_total)}
        </span>

        <div style={{ color: "var(--muted-foreground)", flexShrink: 0 }}>
          {isPending ? (
            <ChevronRight size={16} style={{ color: "#d97706" }} />
          ) : expanded ? (
            <ChevronUp size={16} />
          ) : (
            <ChevronDown size={16} />
          )}
        </div>
      </div>

      {/* Expanded detail (non-pending) */}
      {expanded && !isPending && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {isFetching || !detail ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
          ) : (
            <>
              {/* Items table */}
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 48px 80px 80px", gap: 12, padding: "9px 14px", background: "var(--muted)", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <span>Product</span>
                  <span style={{ textAlign: "center" }}>Qty</span>
                  <span style={{ textAlign: "right" }}>Unit</span>
                  <span style={{ textAlign: "right" }}>Total</span>
                </div>
                {detail.lines?.map((line, i) => (
                  <div key={line.id ?? i} style={{ display: "grid", gridTemplateColumns: "1fr 48px 80px 80px", gap: 12, padding: "10px 14px", fontSize: 13, alignItems: "center", borderTop: i > 0 ? "1px solid var(--border)" : undefined, background: i % 2 !== 0 ? "rgba(0,0,0,0.015)" : "transparent" }}>
                    <div>
                      <div style={{ fontWeight: 500, color: "var(--foreground)" }}>{line.product_id?.[1]}</div>
                      {line.name !== line.product_id?.[1] && (
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{line.name}</div>
                      )}
                    </div>
                    <div style={{ textAlign: "center", fontWeight: 600 }}>{line.product_uom_qty}</div>
                    <div style={{ textAlign: "right", color: "var(--muted-foreground)", fontFamily: "monospace" }}>{fmt(line.price_unit)}</div>
                    <div style={{ textAlign: "right", fontWeight: 700, fontFamily: "monospace" }}>{fmt(line.price_subtotal)}</div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 14px", borderTop: "1px solid var(--border)", background: "var(--muted)", gap: 24, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Order Total</span>
                  <span style={{ fontWeight: 800, fontSize: 15, fontFamily: "monospace" }}>{fmt(detail.amount_total)}</span>
                </div>
              </div>

              {/* Status banner */}
              {order.state === "sale" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 9, background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.2)", fontSize: 13, color: "#059669", fontWeight: 500 }}>
                  <CheckCircle2 size={15} /> Order confirmed in Odoo
                </div>
              )}
              {order.state === "cancel" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 9, background: "rgba(225,29,72,0.06)", border: "1px solid rgba(225,29,72,0.15)", fontSize: 13, color: "#e11d48", fontWeight: 500 }}>
                  <XCircle size={15} /> Order cancelled
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrderPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const urlStatus    = searchParams.get("status") ?? "all";

  const [activeTab, setActiveTab]           = useState(urlStatus);
  const [selectedMonth, setSelectedMonth]   = useState(new Date());
  const [selectedDate, setSelectedDate]     = useState(new Date());
  const [pendingModalId, setPendingModalId] = useState<number | null>(null);
  const mgmtRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setActiveTab(urlStatus); }, [urlStatus]);

  // Switch tabs without navigating to top — use `replace` + `scroll: false`
  const switchTab = (key: string) => {
    setActiveTab(key);
    router.replace(key === "all" ? "/order" : `/order?status=${key}`, { scroll: false });
  };

  // ── Data ──
  const { data: adminData, isLoading: adminLoading, refetch } = useGetAdminOrdersQuery({});
  const allOrders: OdooOrder[] = adminData?.orders ?? [];

  // ── Filter by tab ──
  const displayedOrders = useMemo(() => {
    if (activeTab === "all") return allOrders;
    if (activeTab === "pending") {
      // Pending = draft orders that came from WEB_ORDER origin
      return allOrders.filter(o => o.state === "draft" && o.origin?.startsWith("WEB_ORDER"));
    }
    return allOrders.filter(o => o.state === activeTab);
  }, [allOrders, activeTab]);

  const pendingOrders = useMemo(
    () => allOrders.filter(o => o.state === "draft" && o.origin?.startsWith("WEB_ORDER")),
    [allOrders]
  );

  // ── Analytics ──
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = allOrders.filter(o => {
      const d = new Date(o.date_order);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = allOrders.filter(o => {
      const d  = new Date(o.date_order);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });
    const totalRevenue  = thisMonth.reduce((s, o) => s + o.amount_total, 0);
    const lastRevenue   = lastMonth.reduce((s, o) => s + o.amount_total, 0);
    const revenueGrowth = lastRevenue > 0
      ? (((totalRevenue - lastRevenue) / lastRevenue) * 100).toFixed(1) : "0";

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const day = subDays(now, 6 - i);
      const dayOrders = allOrders.filter(o => isSameDay(new Date(o.date_order), day));
      return {
        day: format(day, "EEE"),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((s, o) => s + o.amount_total, 0),
      };
    });

    const byState = Object.entries(
      allOrders.reduce((acc: Record<string, number>, o) => {
        acc[o.state] = (acc[o.state] || 0) + 1; return acc;
      }, {})
    ).map(([state, count]) => ({ state: ODOO_STATE_COLORS[state]?.label ?? state, count }));

    const uniqueCustomers = new Set(thisMonth.map(o => o.partner_id?.[0])).size;

    return { thisMonth, totalRevenue, revenueGrowth, last7, byState, uniqueCustomers };
  }, [allOrders]);

  // ── Calendar ──
  const dayOrders = allOrders.filter(o => isSameDay(new Date(o.date_order), selectedDate));
  const daysWithOrders = allOrders.reduce((acc: Record<string, number>, o) => {
    const day = format(new Date(o.date_order), "yyyy-MM-dd");
    acc[day] = (acc[day] || 0) + 1; return acc;
  }, {});
  const firstDay  = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const lastDay   = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
  const startPad  = firstDay.getDay();
  const calDays   = Array.from({ length: lastDay.getDate() }, (_, i) =>
    new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), i + 1));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Page title ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", margin: 0 }}>Orders & Analytics</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
            All data sourced from Odoo · {allOrders.length} total orders
          </p>
        </div>
        <button
          onClick={() => refetch()}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 13, cursor: "pointer" }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Orders this month",     value: stats.thisMonth.length,     Icon: ShoppingBag, color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
          { label: "Revenue this month",    value: fmt(stats.totalRevenue),    Icon: DollarSign,  color: "#059669", bg: "rgba(5,150,105,0.08)" },
          { label: "Month-on-month growth", value: `${stats.revenueGrowth}%`,  Icon: TrendingUp,  color: "#e11d48", bg: "rgba(225,29,72,0.08)" },
          { label: "Unique customers",      value: stats.uniqueCustomers,      Icon: Users,       color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <s.Icon size={19} color={s.color} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0 }}>{s.label}</p>
              <p style={{ fontWeight: 800, fontSize: 18, margin: 0, color: "var(--foreground)" }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 20px 14px" }}>
          <p style={{ fontWeight: 600, fontSize: 13, margin: "0 0 16px", color: "var(--foreground)" }}>Revenue — Last 7 Days</p>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={stats.last7}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.05} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Revenue"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 20px 14px" }}>
          <p style={{ fontWeight: 600, fontSize: 13, margin: "0 0 16px", color: "var(--foreground)" }}>Orders by Status</p>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={stats.byState} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.05} />
              <XAxis dataKey="state" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: any) => [v, "Orders"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Calendar + day orders ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 32 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}><ChevronLeft size={17} /></button>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--foreground)" }}>{format(selectedMonth, "MMMM yyyy")}</span>
            <button onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}><ChevronRight size={17} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, color: "var(--muted-foreground)", paddingBottom: 4 }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {Array.from({ length: startPad }).map((_, i) => <div key={`p${i}`} />)}
            {calDays.map(day => {
              const key     = format(day, "yyyy-MM-dd");
              const count   = daysWithOrders[key] || 0;
              const isSel   = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              return (
                <button key={key} onClick={() => setSelectedDate(day)}
                  style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 36, borderRadius: 9, fontSize: 13, fontWeight: isSel ? 700 : 400, border: isSel ? "none" : isToday ? "1px solid var(--primary)" : "none", background: isSel ? "var(--primary)" : "none", color: isSel ? "var(--primary-foreground)" : "var(--foreground)", cursor: "pointer" }}
                >
                  {day.getDate()}
                  {count > 0 && <span style={{ position: "absolute", bottom: 3, width: 5, height: 5, borderRadius: "50%", background: isSel ? "#fff" : "var(--primary)" }} />}
                </button>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <div style={{ background: "var(--muted)", borderRadius: 10, padding: "10px 14px" }}>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0 }}>Orders this month</p>
              <p style={{ fontWeight: 800, fontSize: 20, margin: "2px 0 0" }}>{stats.thisMonth.length}</p>
            </div>
            <div style={{ background: "var(--muted)", borderRadius: 10, padding: "10px 14px" }}>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0 }}>Revenue this month</p>
              <p style={{ fontWeight: 800, fontSize: 17, margin: "2px 0 0" }}>{fmt(stats.totalRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Day orders */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--foreground)" }}>{format(selectedDate, "MMMM d, yyyy")}</span>
            <span style={{ fontSize: 12, background: "var(--muted)", padding: "3px 10px", borderRadius: 20, color: "var(--muted-foreground)" }}>
              {dayOrders.length} orders · {fmt(dayOrders.reduce((s, o) => s + o.amount_total, 0))}
            </span>
          </div>
          {dayOrders.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No orders on this day</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: 340 }}>
              {dayOrders.map(order => {
                const cfg = ODOO_STATE_COLORS[order.state] ?? ODOO_STATE_COLORS.draft;
                return (
                  <div key={order.id}
                    onClick={() => setPendingModalId(order.id)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderRadius: 10, border: "1px solid var(--border)", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{order.name}</p>
                      <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                        {order.partner_id?.[1]} · {format(new Date(order.date_order), "h:mm a")}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                      <p style={{ fontWeight: 700, fontSize: 13, margin: "4px 0 0", fontFamily: "monospace" }}>{fmt(order.amount_total)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══════ ORDER MANAGEMENT ══════ */}
      <div ref={mgmtRef} style={{ borderTop: "1px solid var(--border)", paddingTop: 28 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)", margin: "0 0 6px" }}>Order Management</h2>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 20px" }}>
          Review, confirm, or cancel orders from the store. All data is live from Odoo.
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => switchTab(tab.key)}
                style={{ padding: "9px 16px", fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? "var(--foreground)" : "var(--muted-foreground)", background: "none", border: "none", borderBottom: isActive ? "2px solid var(--foreground)" : "2px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: -1 }}
              >
                {tab.label}
                {tab.key === "pending" && pendingOrders.length > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: "#d97706", color: "#fff" }}>
                    {pendingOrders.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Pending alert */}
        {activeTab === "pending" && pendingOrders.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderRadius: 10, background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)", marginBottom: 14, fontSize: 13, color: "#d97706", fontWeight: 500 }}>
            <AlertCircle size={15} />
            {pendingOrders.length} order{pendingOrders.length !== 1 ? "s" : ""} waiting for approval — click any order to review.
          </div>
        )}

        {!adminLoading && displayedOrders.length > 0 && (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 12px" }}>
            Showing {displayedOrders.length} order{displayedOrders.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Cards */}
        {adminLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 70, borderRadius: 14, background: "var(--muted)", opacity: 1 - i * 0.18 }} />
            ))}
          </div>
        ) : displayedOrders.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "52px 24px", gap: 12, color: "var(--muted-foreground)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Inbox size={21} />
            </div>
            <p style={{ fontWeight: 600, fontSize: 14, color: "var(--foreground)", margin: 0 }}>
              {activeTab === "pending" ? "No pending orders" : activeTab === "sale" ? "No confirmed orders" : activeTab === "cancel" ? "No cancelled orders" : "No orders"}
            </p>
            <p style={{ fontSize: 13, textAlign: "center", maxWidth: 300, margin: 0 }}>
              {activeTab === "pending" ? "Web store orders awaiting approval will appear here." : "Orders will appear here once they exist in Odoo."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {displayedOrders.map(order => {
              const isPending = order.state === "draft" && !!order.origin?.startsWith("WEB_ORDER");
              return (
                <OdooOrderCard
                  key={order.id}
                  order={order}
                  isPending={isPending}
                  onSelect={id => setPendingModalId(id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {pendingModalId !== null && (() => {
        const order = allOrders.find(o => o.id === pendingModalId);
        const isPending = order?.state === "draft" && !!order?.origin?.startsWith("WEB_ORDER");
        if (isPending) {
          return (
            <PendingApprovalModal
              orderId={pendingModalId}
              onClose={() => setPendingModalId(null)}
              onActionDone={() => refetch()}
            />
          );
        }
        return (
          <OrderDetailModal
            orderId={pendingModalId}
            onClose={() => setPendingModalId(null)}
          />
        );
      })()}
    </div>
  );
}