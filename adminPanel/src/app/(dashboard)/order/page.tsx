"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import { format, isSameDay, subDays } from "date-fns";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  Package, MapPin, Calendar, RefreshCw, Inbox, AlertCircle,
  TrendingUp, ShoppingBag, DollarSign, Users, ChevronLeft,
  ChevronRight, X,
} from "lucide-react";
import {
  useGetAdminOrdersQuery,
  useGetAdminOrderDetailQuery,
  useGetOrdersByStatusQuery,
  useConfirmOrderMutation,
  useCancelOrderMutation,
} from "@/redux/order/orderApi";

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrderItem {
  productId: number;
  name: string;
  reference?: string;
  price: number;
  quantity: number;
}
interface MongoOrder {
  _id: string;
  userId: string;
  odooPartnerId?: number;
  items: OrderItem[];
  shippingAddress: string;
  total: number;
  status: "pending" | "confirmed" | "cancelled" | "processing" | "done";
  odooSaleOrderId?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:    { label: "Pending",    color: "#d97706", bg: "rgba(217,119,6,0.08)",    border: "rgba(217,119,6,0.22)" },
  confirmed:  { label: "Confirmed",  color: "#059669", bg: "rgba(5,150,105,0.08)",    border: "rgba(5,150,105,0.22)" },
  cancelled:  { label: "Cancelled",  color: "#e11d48", bg: "rgba(225,29,72,0.08)",    border: "rgba(225,29,72,0.18)" },
  processing: { label: "Processing", color: "#3b82f6", bg: "rgba(59,130,246,0.08)",   border: "rgba(59,130,246,0.22)" },
  done:       { label: "Done",       color: "#7c3aed", bg: "rgba(124,58,237,0.08)",   border: "rgba(124,58,237,0.22)" },
};

const ODOO_STATE_COLORS: Record<string, string> = {
  draft:  "bg-gray-100 text-gray-600 dark:bg-gray-800",
  sent:   "bg-blue-100 text-blue-600",
  sale:   "bg-green-100 text-green-600",
  done:   "bg-violet-100 text-violet-600",
  cancel: "bg-red-100 text-red-500",
};
const ODOO_STATE_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", sale: "Confirmed", done: "Done", cancel: "Cancelled",
};

const TABS = [
  { key: "all",       label: "All Orders" },
  { key: "pending",   label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "cancelled", label: "Cancelled" },
];

const fmt  = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n ?? 0);
const fmtD = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

// ─── Odoo order detail modal ──────────────────────────────────────────────────
function OdooOrderModal({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const { data, isLoading } = useGetAdminOrderDetailQuery(orderId);
  const order = data?.order;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : !order ? (
          <div className="p-8 text-center text-muted-foreground">Order not found</div>
        ) : (
          <>
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">{order.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(order.date_order), "MMMM d, yyyy · h:mm a")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${ODOO_STATE_COLORS[order.state] || "bg-gray-100"}`}>
                  {ODOO_STATE_LABELS[order.state] || order.state}
                </span>
                <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 border-b grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-1">Customer</p>
                <p className="font-semibold">{order.partner_id?.[1]}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Salesperson</p>
                <p className="font-semibold">{order.user_id?.[1] || "—"}</p>
              </div>
              {order.origin && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Origin</p>
                  <p className="font-semibold">{order.origin}</p>
                </div>
              )}
            </div>

            <div className="p-6">
              <p className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <Package size={16} /> Products
              </p>
              <div className="border rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted text-xs text-muted-foreground font-medium">
                  <span className="col-span-5">Product</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Unit</span>
                  <span className="col-span-3 text-right">Subtotal</span>
                </div>
                {order.lines?.map((line: any, i: number) => (
                  <div key={line.id || i} className={`grid grid-cols-12 gap-2 px-4 py-3 text-sm items-center ${i % 2 !== 0 ? "bg-muted/40" : ""}`}>
                    <div className="col-span-5">
                      <p className="font-medium">{line.product_id?.[1]}</p>
                      {line.name !== line.product_id?.[1] && (
                        <p className="text-xs text-muted-foreground truncate">{line.name}</p>
                      )}
                    </div>
                    <p className="col-span-2 text-center">{line.product_uom_qty}</p>
                    <p className="col-span-2 text-right">${line.price_unit?.toFixed(2)}</p>
                    <p className="col-span-3 text-right font-semibold">${line.price_subtotal?.toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-col items-end gap-1 text-sm">
                <div className="flex gap-8"><span className="text-muted-foreground">Subtotal</span><span>${order.amount_untaxed?.toFixed(2)}</span></div>
                <div className="flex gap-8"><span className="text-muted-foreground">Tax</span><span>${order.amount_tax?.toFixed(2)}</span></div>
                <div className="flex gap-8 font-bold text-base border-t pt-2 mt-1"><span>Total</span><span>${order.amount_total?.toFixed(2)}</span></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Pending Order Modal ──────────────────────────────────────────────────────
function PendingOrderModal({
  order,
  onClose,
  onConfirm,
  onCancel,
  confirming,
  cancelling,
}: {
  order: MongoOrder;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirming: boolean;
  cancelling: boolean;
}) {
  const isActing = confirming || cancelling;

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: 18,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          width: "100%",
          maxWidth: 640,
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          position: "sticky",
          top: 0,
          background: "var(--card)",
          zIndex: 1,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
              <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: "var(--foreground)" }}>
                #{order._id.slice(-10).toUpperCase()}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                color: "#d97706", background: "rgba(217,119,6,0.1)",
                border: "1px solid rgba(217,119,6,0.25)",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                Pending Approval
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
              <Calendar size={11} /> {fmtD(order.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: 8, borderRadius: 9, border: "1px solid var(--border)",
              background: "var(--muted)", cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--muted-foreground)",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Summary cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div style={{ background: "var(--muted)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Items</p>
              <p style={{ fontWeight: 700, fontSize: 18, margin: 0, color: "var(--foreground)" }}>
                {order.items.reduce((s, i) => s + i.quantity, 0)}
              </p>
            </div>
            <div style={{ background: "var(--muted)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Products</p>
              <p style={{ fontWeight: 700, fontSize: 18, margin: 0, color: "var(--foreground)" }}>
                {order.items.length}
              </p>
            </div>
            <div style={{ background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.2)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ fontSize: 11, color: "#059669", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Order Total</p>
              <p style={{ fontWeight: 800, fontSize: 18, margin: 0, color: "#059669", fontFamily: "monospace" }}>
                {fmt(order.total)}
              </p>
            </div>
          </div>

          {/* ── Shipping address ── */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
            <p style={{
              fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase",
              letterSpacing: "0.05em", margin: "0 0 10px", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <MapPin size={12} /> Shipping Address
            </p>
            <p style={{ fontSize: 13, color: "var(--foreground)", margin: 0, lineHeight: 1.5 }}>
              {order.shippingAddress || "No address provided"}
            </p>
          </div>

          {/* ── Items table ── */}
          <div>
            <p style={{
              fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase",
              letterSpacing: "0.05em", margin: "0 0 10px", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <Package size={12} /> Items Ordered
            </p>
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              {/* Table header */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 52px 90px 90px",
                gap: 8, padding: "9px 16px",
                background: "var(--muted)",
                fontSize: 11, fontWeight: 600,
                color: "var(--muted-foreground)",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                <span>Product</span>
                <span style={{ textAlign: "center" }}>Qty</span>
                <span style={{ textAlign: "right" }}>Unit Price</span>
                <span style={{ textAlign: "right" }}>Total</span>
              </div>

              {/* Table rows */}
              {order.items.map((item, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "1fr 52px 90px 90px",
                  gap: 8, padding: "13px 16px", fontSize: 13,
                  alignItems: "center",
                  borderTop: "1px solid var(--border)",
                  background: i % 2 !== 0 ? "rgba(0,0,0,0.015)" : "transparent",
                }}>
                  <div>
                    <div style={{ fontWeight: 500, color: "var(--foreground)" }}>
                      {item.name || `Product #${item.productId}`}
                    </div>
                    {item.reference && (
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace", marginTop: 2 }}>
                        SKU: {item.reference}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "center", fontWeight: 700, color: "var(--foreground)" }}>
                    {item.quantity}
                  </div>
                  <div style={{ textAlign: "right", color: "var(--muted-foreground)", fontFamily: "monospace", fontSize: 12 }}>
                    {fmt(item.price)}
                  </div>
                  <div style={{ textAlign: "right", fontWeight: 700, fontFamily: "monospace" }}>
                    {fmt(item.price * item.quantity)}
                  </div>
                </div>
              ))}

              {/* Table footer total */}
              <div style={{
                display: "flex", justifyContent: "space-between",
                padding: "12px 16px", borderTop: "1px solid var(--border)",
                background: "var(--muted)", alignItems: "center",
              }}>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  {order.items.length} product{order.items.length !== 1 ? "s" : ""} · {order.items.reduce((s, i) => s + i.quantity, 0)} unit{order.items.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Order Total</span>
                  <span style={{ fontWeight: 800, fontSize: 17, fontFamily: "monospace" }}>{fmt(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div style={{
            display: "flex", gap: 10, justifyContent: "flex-end",
            paddingTop: 8, borderTop: "1px solid var(--border)",
          }}>
            <button
              onClick={onClose}
              disabled={isActing}
              style={{
                padding: "10px 20px", borderRadius: 9,
                border: "1px solid var(--border)",
                background: "transparent", color: "var(--muted-foreground)",
                fontSize: 13, fontWeight: 600,
                cursor: isActing ? "not-allowed" : "pointer",
                opacity: isActing ? 0.5 : 1,
                transition: "all 0.15s",
              }}
            >
              Close
            </button>
            <button
              onClick={onCancel}
              disabled={isActing}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 20px", borderRadius: 9,
                border: "1px solid rgba(225,29,72,0.3)",
                background: "rgba(225,29,72,0.06)", color: "#e11d48",
                fontSize: 13, fontWeight: 600,
                cursor: isActing ? "not-allowed" : "pointer",
                opacity: isActing ? 0.6 : 1,
                transition: "all 0.15s",
              }}
            >
              <XCircle size={15} />
              {cancelling ? "Cancelling…" : "Cancel Order"}
            </button>
            <button
              onClick={onConfirm}
              disabled={isActing}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 24px", borderRadius: 9,
                border: "none", background: "#059669", color: "#fff",
                fontSize: 13, fontWeight: 600,
                cursor: isActing ? "not-allowed" : "pointer",
                opacity: isActing ? 0.6 : 1,
                boxShadow: "0 2px 8px rgba(5,150,105,0.3)",
                transition: "all 0.15s",
              }}
            >
              <CheckCircle2 size={15} />
              {confirming ? "Confirming…" : "Confirm Order"}
            </button>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── MongoDB order card ───────────────────────────────────────────────────────
function MongoOrderCard({
  order,
  refetch,
}: {
  order: MongoOrder;
  refetch: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [localStatus, setLocalStatus] = useState(order.status);
  const [confirmOrder, { isLoading: confirming }] = useConfirmOrderMutation();
  const [cancelOrder,  { isLoading: cancelling  }] = useCancelOrderMutation();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const cfg = STATUS_CFG[localStatus] ?? STATUS_CFG.pending;
  const isActing = confirming || cancelling;

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleConfirm = async () => {
    try {
      await confirmOrder(order._id).unwrap();
      setLocalStatus("confirmed");
      setModalOpen(false);
      showToast("Order confirmed and synced to Odoo.", true);
      refetch();
    } catch {
      showToast("Failed to confirm order. Try again.", false);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelOrder(order._id).unwrap();
      setLocalStatus("cancelled");
      setModalOpen(false);
      showToast("Order cancelled. Customer notified.", true);
      refetch();
    } catch {
      showToast("Failed to cancel order. Try again.", false);
    }
  };

  const handleCardClick = () => {
    if (localStatus === "pending") {
      setModalOpen(true);
    } else {
      setExpanded((e) => !e);
    }
  };

  return (
    <>
      {/* Pending modal */}
      {modalOpen && localStatus === "pending" && (
        <PendingOrderModal
          order={order}
          onClose={() => setModalOpen(false)}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          confirming={confirming}
          cancelling={cancelling}
        />
      )}

      <div style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        {/* Toast */}
        {toast && (
          <div style={{
            padding: "10px 16px", fontSize: 13, fontWeight: 500,
            background: toast.ok ? "rgba(5,150,105,0.1)" : "rgba(225,29,72,0.08)",
            color: toast.ok ? "#059669" : "#e11d48",
            borderBottom: `1px solid ${toast.ok ? "rgba(5,150,105,0.2)" : "rgba(225,29,72,0.15)"}`,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            {toast.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {toast.msg}
          </div>
        )}

        {/* Header row */}
        <div
          onClick={handleCardClick}
          style={{
            padding: "15px 20px", display: "flex", alignItems: "center",
            gap: 14, cursor: "pointer", userSelect: "none",
          }}
        >
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: "var(--foreground)" }}>
                #{order._id.slice(-8).toUpperCase()}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20,
                color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
              }}>
                {cfg.label}
              </span>
              {order.odooSaleOrderId && (
                <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>
                  Odoo #{order.odooSaleOrderId}
                </span>
              )}
              {/* Hint for pending cards */}
              {localStatus === "pending" && (
                <span style={{
                  fontSize: 11, color: "#d97706",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  · click to review
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Calendar size={11} />{fmtD(order.createdAt)}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Package size={11} />{order.items.length} item{order.items.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <span style={{ fontWeight: 800, fontSize: 15, fontFamily: "monospace", color: "var(--foreground)", flexShrink: 0 }}>
            {fmt(order.total)}
          </span>

          {/* For non-pending: show expand icon. For pending: show arrow hint */}
          <div style={{ color: "var(--muted-foreground)", flexShrink: 0 }}>
            {localStatus === "pending" ? (
              <ChevronRight size={16} style={{ color: "#d97706" }} />
            ) : expanded ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </div>
        </div>

        {/* Expanded body — only for non-pending orders */}
        {expanded && localStatus !== "pending" && (
          <div style={{ borderTop: "1px solid var(--border)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Address */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--muted-foreground)" }}>
              <MapPin size={14} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>{order.shippingAddress || "No address provided"}</span>
            </div>

            {/* Items table */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 48px 80px 80px", gap: 12,
                padding: "9px 14px", background: "var(--muted)",
                fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                <span>Product</span>
                <span style={{ textAlign: "center" }}>Qty</span>
                <span style={{ textAlign: "right" }}>Unit</span>
                <span style={{ textAlign: "right" }}>Total</span>
              </div>
              {order.items.map((item, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "1fr 48px 80px 80px", gap: 12,
                  padding: "10px 14px", fontSize: 13, alignItems: "center",
                  borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                  background: i % 2 !== 0 ? "rgba(0,0,0,0.015)" : "transparent",
                }}>
                  <div>
                    <div style={{ fontWeight: 500, color: "var(--foreground)" }}>
                      {item.name || `Product #${item.productId}`}
                    </div>
                    {item.reference && (
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace", marginTop: 2 }}>
                        SKU: {item.reference}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "center", fontWeight: 600 }}>{item.quantity}</div>
                  <div style={{ textAlign: "right", color: "var(--muted-foreground)", fontFamily: "monospace" }}>{fmt(item.price)}</div>
                  <div style={{ textAlign: "right", fontWeight: 700, fontFamily: "monospace" }}>{fmt(item.price * item.quantity)}</div>
                </div>
              ))}
              <div style={{
                display: "flex", justifyContent: "flex-end",
                padding: "10px 14px", borderTop: "1px solid var(--border)",
                background: "var(--muted)", gap: 24, alignItems: "center",
              }}>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Order Total</span>
                <span style={{ fontWeight: 800, fontSize: 15, fontFamily: "monospace" }}>{fmt(order.total)}</span>
              </div>
            </div>

            {/* Status banners for non-pending */}
            {localStatus === "confirmed" && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: 9,
                background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.2)",
                fontSize: 13, color: "#059669", fontWeight: 500,
              }}>
                <CheckCircle2 size={15} />
                Order confirmed — synced to Odoo
                {order.odooSaleOrderId && (
                  <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 12 }}>
                    Sale Order #{order.odooSaleOrderId}
                  </span>
                )}
              </div>
            )}
            {localStatus === "cancelled" && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: 9,
                background: "rgba(225,29,72,0.06)", border: "1px solid rgba(225,29,72,0.15)",
                fontSize: 13, color: "#e11d48", fontWeight: 500,
              }}>
                <XCircle size={15} />
                Order cancelled — customer has been notified by email
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function OrderPage() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const urlStatus     = searchParams.get("status") ?? "all";
  const [activeTab, setActiveTab]           = useState(urlStatus);
  const [selectedMonth, setSelectedMonth]   = useState(new Date());
  const [selectedDate, setSelectedDate]     = useState(new Date());
  const [selectedOdooId, setSelectedOdooId] = useState<number | null>(null);

  useEffect(() => { setActiveTab(urlStatus); }, [urlStatus]);

  const switchTab = (key: string) => {
    setActiveTab(key);
    router.push(key === "all" ? "/order" : `/order?status=${key}`);
  };

  // ── Data ──
  const { data: adminData, isLoading: adminLoading } = useGetAdminOrdersQuery({});
  const { data: mongoData, isLoading: mongoLoading, isFetching, refetch } =
    useGetOrdersByStatusQuery(activeTab === "all" ? "all" : activeTab);
  const { data: pendingData } = useGetOrdersByStatusQuery("pending");

  const odooOrders: any[]         = adminData?.orders ?? [];
  const mongoOrders: MongoOrder[] = mongoData?.orders ?? [];
  const pendingCount               = pendingData?.orders?.length ?? 0;

  // ── Analytics ──
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = odooOrders.filter((o: any) => {
      const d = new Date(o.date_order);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = odooOrders.filter((o: any) => {
      const d  = new Date(o.date_order);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });
    const totalRevenue  = thisMonth.reduce((s: number, o: any) => s + o.amount_total, 0);
    const lastRevenue   = lastMonth.reduce((s: number, o: any) => s + o.amount_total, 0);
    const revenueGrowth = lastRevenue > 0
      ? (((totalRevenue - lastRevenue) / lastRevenue) * 100).toFixed(1) : "0";

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const day = subDays(now, 6 - i);
      const dayOrders = odooOrders.filter((o: any) => isSameDay(new Date(o.date_order), day));
      return {
        day: format(day, "EEE"),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((s: number, o: any) => s + o.amount_total, 0),
      };
    });

    const byState = Object.entries(
      odooOrders.reduce((acc: Record<string, number>, o: any) => {
        acc[o.state] = (acc[o.state] || 0) + 1; return acc;
      }, {})
    ).map(([state, count]) => ({ state: ODOO_STATE_LABELS[state] || state, count }));

    const uniqueCustomers = new Set(thisMonth.map((o: any) => o.partner_id?.[0])).size;

    return { thisMonth, totalRevenue, revenueGrowth, last7, byState, uniqueCustomers };
  }, [odooOrders]);

  // ── Calendar ──
  const dayOrders = odooOrders.filter((o: any) => isSameDay(new Date(o.date_order), selectedDate));
  const daysWithOrders = odooOrders.reduce((acc: Record<string, number>, o: any) => {
    const day = format(new Date(o.date_order), "yyyy-MM-dd");
    acc[day] = (acc[day] || 0) + 1; return acc;
  }, {});
  const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const lastDay  = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
  const startPad = firstDay.getDay();
  const calDays  = Array.from({ length: lastDay.getDate() }, (_, i) =>
    new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), i + 1));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Page title ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", margin: 0 }}>Orders & Analytics</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
            Overview of sales, revenue, and order management
          </p>
        </div>
        <button
          onClick={() => refetch()}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 13, cursor: "pointer" }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ══════════════ ANALYTICS SECTION ══════════════ */}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Orders this month",    value: stats.thisMonth.length,        Icon: ShoppingBag, color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
          { label: "Revenue this month",   value: fmt(stats.totalRevenue),       Icon: DollarSign,  color: "#059669", bg: "rgba(5,150,105,0.08)" },
          { label: "Month-on-month growth",value: `${stats.revenueGrowth}%`,     Icon: TrendingUp,  color: "#e11d48", bg: "rgba(225,29,72,0.08)" },
          { label: "Unique customers",     value: stats.uniqueCustomers,         Icon: Users,       color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
        ].map((s) => (
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

      {/* Charts row */}
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

      {/* Calendar + day orders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 32 }}>
        {/* Calendar */}
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
              const key    = format(day, "yyyy-MM-dd");
              const count  = daysWithOrders[key] || 0;
              const isSel  = isSameDay(day, selectedDate);
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

        {/* Odoo orders on selected day */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--foreground)" }}>{format(selectedDate, "MMMM d, yyyy")}</span>
            <span style={{ fontSize: 12, background: "var(--muted)", padding: "3px 10px", borderRadius: 20, color: "var(--muted-foreground)" }}>
              {dayOrders.length} orders · {fmt(dayOrders.reduce((s: number, o: any) => s + o.amount_total, 0))}
            </span>
          </div>
          {dayOrders.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No orders on this day</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: 340 }}>
              {dayOrders.map((order: any) => (
                <div key={order.id} onClick={() => setSelectedOdooId(Number(order.id))}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderRadius: 10, border: "1px solid var(--border)", cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{order.name}</p>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                      {order.partner_id?.[1]} · {format(new Date(order.date_order), "h:mm a")}
                    </p>
                    {order.origin?.startsWith("WEB_ORDER") && (
                      <span style={{ fontSize: 10, color: "#7c3aed" }}>From store</span>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}
                      className={`${ODOO_STATE_COLORS[order.state] || "bg-gray-100"}`}
                    >
                      {ODOO_STATE_LABELS[order.state] || order.state}
                    </span>
                    <p style={{ fontWeight: 700, fontSize: 13, margin: "4px 0 0", fontFamily: "monospace" }}>${order.amount_total?.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ ORDER MANAGEMENT SECTION ══════════════ */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 28 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)", margin: "0 0 6px" }}>Order Management</h2>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 20px" }}>
          Review, confirm, or cancel orders placed through the store or created by managers
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => switchTab(tab.key)}
                style={{ padding: "9px 16px", fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? "var(--foreground)" : "var(--muted-foreground)", background: "none", border: "none", borderBottom: isActive ? "2px solid var(--foreground)" : "2px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: -1, transition: "color 0.15s" }}
              >
                {tab.label}
                {tab.key === "pending" && pendingCount > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: "#d97706", color: "#fff" }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Pending alert */}
        {activeTab === "pending" && pendingCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderRadius: 10, background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)", marginBottom: 14, fontSize: 13, color: "#d97706", fontWeight: 500 }}>
            <AlertCircle size={15} />
            {pendingCount} order{pendingCount !== 1 ? "s" : ""} waiting for your approval — click any order to review and confirm or cancel.
          </div>
        )}

        {/* Count */}
        {!mongoLoading && mongoOrders.length > 0 && (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 12px" }}>
            Showing {mongoOrders.length} order{mongoOrders.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Order cards */}
        {mongoLoading || isFetching ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 70, borderRadius: 14, background: "var(--muted)", opacity: 1 - i * 0.18 }} />
            ))}
          </div>
        ) : mongoOrders.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "52px 24px", gap: 12, color: "var(--muted-foreground)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Inbox size={21} />
            </div>
            <p style={{ fontWeight: 600, fontSize: 14, color: "var(--foreground)", margin: 0 }}>
              {activeTab === "pending" ? "No pending orders" : activeTab === "confirmed" ? "No confirmed orders yet" : activeTab === "cancelled" ? "No cancelled orders" : "No orders yet"}
            </p>
            <p style={{ fontSize: 13, textAlign: "center", maxWidth: 300, margin: 0 }}>
              {activeTab === "pending" ? "New store orders will appear here waiting for your approval." : activeTab === "confirmed" ? "Orders you approve will show here with their Odoo reference." : activeTab === "cancelled" ? "Cancelled orders are kept here for reference." : "Orders from customers and managers will appear here."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mongoOrders.map(order => (
              <MongoOrderCard key={order._id} order={order} refetch={refetch} />
            ))}
          </div>
        )}
      </div>

      {/* Odoo order detail modal */}
      {selectedOdooId !== null && (
        <OdooOrderModal orderId={selectedOdooId} onClose={() => setSelectedOdooId(null)} />
      )}
    </div>
  );
}