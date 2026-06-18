"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Package,
  User,
  MapPin,
  Hash,
  Calendar,
  DollarSign,
  RefreshCw,
  Inbox,
  AlertCircle,
  Filter,
} from "lucide-react";
import { useGetOrdersByStatusQuery } from "@/redux/order/orderApi";

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrderItem {
  productId: number;
  name: string;
  reference?: string;
  price: number;
  quantity: number;
}

interface Order {
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
const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "#d97706",
    bg: "rgba(217,119,6,0.08)",
    border: "rgba(217,119,6,0.2)",
    dot: "#d97706",
  },
  confirmed: {
    label: "Confirmed",
    icon: CheckCircle2,
    color: "#059669",
    bg: "rgba(5,150,105,0.08)",
    border: "rgba(5,150,105,0.2)",
    dot: "#059669",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "#e11d48",
    bg: "rgba(225,29,72,0.08)",
    border: "rgba(225,29,72,0.2)",
    dot: "#e11d48",
  },
  processing: {
    label: "Processing",
    icon: RefreshCw,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.2)",
    dot: "#3b82f6",
  },
  done: {
    label: "Done",
    icon: CheckCircle2,
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.08)",
    border: "rgba(124,58,237,0.2)",
    dot: "#7c3aed",
  },
};

const TABS = [
  { key: "all", label: "All Orders" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "cancelled", label: "Cancelled" },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n ?? 0);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Confirm/Cancel action hook ───────────────────────────────────────────────
function useOrderAction() {
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, "confirmed" | "cancelled">>({});

  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URI ?? "";

  const confirm = async (orderId: string) => {
    setLoading(orderId);
    try {
      const res = await fetch(`${baseUrl}/api/v1/manager-confirm/${orderId}`);
      if (res.ok) setDone((p) => ({ ...p, [orderId]: "confirmed" }));
    } finally {
      setLoading(null);
    }
  };

  const cancel = async (orderId: string) => {
    setLoading(orderId);
    try {
      const res = await fetch(`${baseUrl}/api/v1/manager-cancel/${orderId}`);
      if (res.ok) setDone((p) => ({ ...p, [orderId]: "cancelled" }));
    } finally {
      setLoading(null);
    }
  };

  return { confirm, cancel, loading, done };
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({
  order,
  onConfirm,
  onCancel,
  actionLoading,
  overrideStatus,
}: {
  order: Order;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  actionLoading: string | null;
  overrideStatus?: "confirmed" | "cancelled";
}) {
  const [expanded, setExpanded] = useState(false);
  const status = overrideStatus ?? order.status;
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const isLoading = actionLoading === order._id;
  const isPending = status === "pending";

  return (
    <div
      style={{
        background: "var(--card)",
        border: `1px solid var(--border)`,
        borderRadius: 14,
        overflow: "hidden",
        transition: "box-shadow 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {/* ── Card header ── */}
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Status dot */}
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: cfg.dot,
            flexShrink: 0,
          }}
        />

        {/* Order ID */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: 13,
                color: "var(--foreground)",
              }}
            >
              #{order._id.slice(-8).toUpperCase()}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 9px",
                borderRadius: 20,
                color: cfg.color,
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
              }}
            >
              {cfg.label}
            </span>
            {order.odooSaleOrderId && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                  fontFamily: "monospace",
                }}
              >
                Odoo #{order.odooSaleOrderId}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--muted-foreground)",
              marginTop: 3,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar size={11} />
              {fmtDate(order.createdAt)}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Package size={11} />
              {order.items.length} item{order.items.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Total */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 15,
              color: "var(--foreground)",
              fontFamily: "monospace",
            }}
          >
            {fmt(order.total)}
          </div>
        </div>

        {/* Chevron */}
        <div style={{ color: "var(--muted-foreground)", flexShrink: 0 }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Shipping */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: 13,
              color: "var(--muted-foreground)",
            }}
          >
            <MapPin size={14} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>{order.shippingAddress || "No address provided"}</span>
          </div>

          {/* Items table */}
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto",
                gap: 12,
                padding: "9px 14px",
                background: "var(--muted)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--muted-foreground)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <span>Product</span>
              <span style={{ textAlign: "center" }}>Qty</span>
              <span style={{ textAlign: "right" }}>Unit</span>
              <span style={{ textAlign: "right" }}>Total</span>
            </div>

            {/* Rows */}
            {order.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto",
                  gap: 12,
                  padding: "10px 14px",
                  fontSize: 13,
                  alignItems: "center",
                  borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                  background:
                    i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                }}
              >
                <div>
                  <div
                    style={{ fontWeight: 500, color: "var(--foreground)" }}
                  >
                    {item.name || `Product #${item.productId}`}
                  </div>
                  {item.reference && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted-foreground)",
                        fontFamily: "monospace",
                        marginTop: 2,
                      }}
                    >
                      SKU: {item.reference}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    textAlign: "center",
                    fontWeight: 600,
                    color: "var(--foreground)",
                  }}
                >
                  {item.quantity}
                </div>
                <div
                  style={{
                    textAlign: "right",
                    color: "var(--muted-foreground)",
                    fontFamily: "monospace",
                  }}
                >
                  {fmt(item.price)}
                </div>
                <div
                  style={{
                    textAlign: "right",
                    fontWeight: 700,
                    color: "var(--foreground)",
                    fontFamily: "monospace",
                  }}
                >
                  {fmt(item.price * item.quantity)}
                </div>
              </div>
            ))}

            {/* Total row */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                padding: "10px 14px",
                borderTop: "1px solid var(--border)",
                background: "var(--muted)",
                gap: 24,
                alignItems: "center",
              }}
            >
              <span
                style={{ fontSize: 12, color: "var(--muted-foreground)" }}
              >
                Order Total
              </span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 15,
                  fontFamily: "monospace",
                  color: "var(--foreground)",
                }}
              >
                {fmt(order.total)}
              </span>
            </div>
          </div>

          {/* Action buttons — only for pending orders */}
          {isPending && (
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                paddingTop: 4,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(order._id);
                }}
                disabled={isLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 18px",
                  borderRadius: 9,
                  border: "1px solid rgba(225,29,72,0.3)",
                  background: "rgba(225,29,72,0.06)",
                  color: "#e11d48",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.6 : 1,
                  transition: "all 0.15s",
                }}
              >
                <XCircle size={15} />
                {isLoading ? "Processing…" : "Cancel Order"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm(order._id);
                }}
                disabled={isLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 18px",
                  borderRadius: 9,
                  border: "none",
                  background: "#059669",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.6 : 1,
                  transition: "all 0.15s",
                  boxShadow: "0 2px 8px rgba(5,150,105,0.3)",
                }}
              >
                <CheckCircle2 size={15} />
                {isLoading ? "Processing…" : "Confirm Order"}
              </button>
            </div>
          )}

          {/* Confirmed/cancelled info banners */}
          {status === "confirmed" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 9,
                background: "rgba(5,150,105,0.08)",
                border: "1px solid rgba(5,150,105,0.2)",
                fontSize: 13,
                color: "#059669",
                fontWeight: 500,
              }}
            >
              <CheckCircle2 size={15} />
              Order confirmed — synced to Odoo
              {order.odooSaleOrderId && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontFamily: "monospace",
                    fontSize: 12,
                  }}
                >
                  Sale Order #{order.odooSaleOrderId}
                </span>
              )}
            </div>
          )}
          {status === "cancelled" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 9,
                background: "rgba(225,29,72,0.06)",
                border: "1px solid rgba(225,29,72,0.15)",
                fontSize: 13,
                color: "#e11d48",
                fontWeight: 500,
              }}
            >
              <XCircle size={15} />
              Order cancelled — customer has been notified by email
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ status }: { status: string }) {
  const messages: Record<string, { icon: any; title: string; sub: string }> = {
    pending: {
      icon: Clock,
      title: "No pending orders",
      sub: "New orders from customers will appear here waiting for your approval.",
    },
    confirmed: {
      icon: CheckCircle2,
      title: "No confirmed orders yet",
      sub: "Orders you approve will appear here along with their Odoo sync status.",
    },
    cancelled: {
      icon: XCircle,
      title: "No cancelled orders",
      sub: "Orders you cancel will be kept here for reference.",
    },
    all: {
      icon: Inbox,
      title: "No orders yet",
      sub: "Orders placed by customers or created by managers will appear here.",
    },
  };

  const m = messages[status] ?? messages.all;
  const Icon = m.icon;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        gap: 12,
        color: "var(--muted-foreground)",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={22} />
      </div>
      <p style={{ fontWeight: 600, fontSize: 14, color: "var(--foreground)" }}>
        {m.title}
      </p>
      <p style={{ fontSize: 13, textAlign: "center", maxWidth: 320 }}>
        {m.sub}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlStatus = searchParams.get("status") ?? "all";
  const [activeTab, setActiveTab] = useState(urlStatus);

  // keep URL in sync with tab
  useEffect(() => {
    setActiveTab(urlStatus);
  }, [urlStatus]);

  const switchTab = (key: string) => {
    setActiveTab(key);
    router.push(key === "all" ? "/order" : `/order?status=${key}`);
  };

  // Fetch orders for the active status (RTK Query)
  const { data, isLoading, isFetching, refetch } = useGetOrdersByStatusQuery(
    activeTab === "all" ? "" : activeTab,
  );

  const orders: Order[] = data?.orders ?? [];

  const { confirm, cancel, loading: actionLoading, done } = useOrderAction();

  // Count badges
  const { data: pendingData } = useGetOrdersByStatusQuery("pending");
  const pendingCount = pendingData?.orders?.length ?? 0;

  const handleConfirm = async (id: string) => {
    await confirm(id);
    refetch();
  };

  const handleCancel = async (id: string) => {
    await cancel(id);
    refetch();
  };

  return (
    <div
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "28px 20px",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* ── Page header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 24,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--foreground)",
              margin: 0,
            }}
          >
            Order Management
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--muted-foreground)",
              marginTop: 4,
            }}
          >
            Review, confirm, or cancel orders from customers and managers
          </p>
        </div>

        <button
          onClick={() => refetch()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 9,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--foreground)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* ── Tabs ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          borderBottom: "1px solid var(--border)",
          paddingBottom: 0,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              style={{
                padding: "9px 16px",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive
                  ? "var(--foreground)"
                  : "var(--muted-foreground)",
                background: "none",
                border: "none",
                borderBottom: isActive
                  ? "2px solid var(--foreground)"
                  : "2px solid transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "color 0.15s",
                marginBottom: -1,
              }}
            >
              {tab.label}
              {tab.key === "pending" && pendingCount > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 7px",
                    borderRadius: 20,
                    background: "#d97706",
                    color: "#fff",
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Alert for pending ── */}
      {activeTab === "pending" && pendingCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 10,
            background: "rgba(217,119,6,0.08)",
            border: "1px solid rgba(217,119,6,0.25)",
            marginBottom: 16,
            fontSize: 13,
            color: "#d97706",
            fontWeight: 500,
          }}
        >
          <AlertCircle size={15} />
          {pendingCount} order{pendingCount !== 1 ? "s" : ""} waiting for your
          approval — expand each card to confirm or cancel.
        </div>
      )}

      {/* ── Order count ── */}
      {!isLoading && orders.length > 0 && (
        <div
          style={{
            fontSize: 12,
            color: "var(--muted-foreground)",
            marginBottom: 12,
          }}
        >
          Showing {orders.length} order{orders.length !== 1 ? "s" : ""}
          {activeTab !== "all" && ` · ${activeTab}`}
        </div>
      )}

      {/* ── Order list ── */}
      {isLoading || isFetching ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 72,
                borderRadius: 14,
                background: "var(--muted)",
                animation: "pulse 1.5s ease-in-out infinite",
                opacity: 1 - i * 0.15,
              }}
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState status={activeTab} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {orders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              actionLoading={actionLoading}
              overrideStatus={done[order._id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}