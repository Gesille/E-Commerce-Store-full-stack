"use client";

import { useState } from "react";

import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Receipt,
  User,
  CalendarDays,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  useGetPosOrderByIdQuery,
  useGetPosOrdersQuery,
} from "@/redux/pos/Posapi";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  paid: { label: "Paid", color: "#059669", bg: "rgba(5,150,105,0.1)" },
  invoiced: { label: "Invoiced", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  nothing: { label: "Draft", color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  done: { label: "Done", color: "#059669", bg: "rgba(5,150,105,0.1)" },
  cancelled: {
    label: "Cancelled",
    color: "#e11d48",
    bg: "rgba(225,29,72,0.1)",
  },
};

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

// ── Order detail drawer ────────────────────────────────────────────────────
function OrderDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: order, isLoading } = useGetPosOrderByIdQuery(id);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.3)",
        }}
      />
      {/* panel */}
      <div
        style={{
          position: "relative",
          width: 420,
          height: "100%",
          background: "var(--bg-card)",
          borderLeft: "1px solid var(--border)",
          overflowY: "auto",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Order Detail
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Loading…
          </div>
        ) : order ? (
          <>
            {/* Header info */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {[
                { label: "Reference", value: order.ref },
                {
                  label: "Status",
                  value: STATUS_CONFIG[order.status]?.label ?? order.status,
                },
                { label: "Cashier", value: order.cashier },
                { label: "Session", value: order.session },
                { label: "Date", value: fmtDate(order.date), full: true },
              ].map((f) => (
                <div
                  key={f.label}
                  style={{
                    gridColumn: (f as any).full ? "span 2" : undefined,
                    background: "var(--bg-muted)",
                    borderRadius: 9,
                    padding: "10px 12px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10.5,
                      color: "var(--text-muted)",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 4,
                    }}
                  >
                    {f.label}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {f.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Lines */}
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 10,
                }}
              >
                Items
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {order.lines.map((l: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      background: "var(--bg-muted)",
                      borderRadius: 9,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                        }}
                      >
                        {l.product}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
                        {l.qty} × {fmt(l.price)}
                        {l.discount > 0 && (
                          <span style={{ color: "#e11d48", marginLeft: 6 }}>
                            -{l.discount}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        fontFamily: "monospace",
                      }}
                    >
                      {fmt(l.subtotal)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payments */}
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 10,
                }}
              >
                Payments
              </div>
              {order.payments.map((p: any, i: number) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{ fontSize: 13, color: "var(--text-secondary)" }}
                  >
                    {p.method}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      fontFamily: "monospace",
                    }}
                  >
                    {fmt(p.amount)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "14px 16px",
                background: "rgba(59,130,246,0.06)",
                borderRadius: 10,
                border: "1px solid rgba(59,130,246,0.15)",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                Total
              </span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#3b82f6",
                  fontFamily: "monospace",
                }}
              >
                {fmt(order.total)}
              </span>
            </div>
          </>
        ) : (
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Order not found.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function PosOrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isFetching } = useGetPosOrdersQuery({
    page,
    limit: 20,
    search,
    status,
    date_from: dateFrom,
    date_to: dateTo,
  });

  const orders = data?.orders ?? [];
  const pages = data?.pages ?? 1;
  const total = data?.total ?? 0;

  return (
    <>
      <style>{`
        :root {
          --bg: #f5f6f8; --bg-card: #ffffff; --bg-muted: #f1f3f6;
          --border: #e8eaed; --text-primary: #0f1117;
          --text-secondary: #4a5568; --text-muted: #8a94a6; --accent: #3b82f6;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --bg: #0e1117; --bg-card: #161b27; --bg-muted: #1e2535;
            --border: #262e3d; --text-primary: #f0f3f9;
            --text-secondary: #8892a4; --text-muted: #4a5568;
          }
        }
        * { box-sizing: border-box; }
        .orders-row:hover { background: var(--bg-muted) !important; cursor: pointer; }
      `}</style>

      <div
        style={{
          padding: "24px",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          background: "var(--bg)",
          minHeight: "100vh",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            POS Orders
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {total.toLocaleString()} orders total
          </p>
        </div>

        {/* Filters */}
        <Card style={{ marginBottom: 16 }}>
          <div
            style={{
              padding: "14px 16px",
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {/* Search */}
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by reference…"
                style={{
                  width: "100%",
                  paddingLeft: 32,
                  paddingRight: 12,
                  paddingTop: 8,
                  paddingBottom: 8,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 13,
                  background: "var(--bg-muted)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              />
            </div>

            {/* Status filter */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "8px 10px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
                background: "var(--bg-muted)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            >
              <option value="">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="invoiced">Invoiced</option>
              <option value="draft">Draft</option>
              <option value="done">Done</option>
            </select>

            {/* Date range */}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "8px 10px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
                background: "var(--bg-muted)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "8px 10px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
                background: "var(--bg-muted)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />

            {/* Clear */}
            {(search || status || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "none",
                  fontSize: 13,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <X size={13} /> Clear
              </button>
            )}
          </div>
        </Card>

        {/* Table */}
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {[
                    "Reference",
                    "Date",
                    "Cashier",
                    "Session",
                    "Items",
                    "Payment",
                    "Total",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "11px 16px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isFetching ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} style={{ padding: "12px 16px" }}>
                          <div
                            style={{
                              height: 14,
                              borderRadius: 4,
                              background: "var(--bg-muted)",
                              width: j === 0 ? 100 : 60,
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "var(--text-muted)",
                        fontSize: 13,
                      }}
                    >
                      No orders found
                    </td>
                  </tr>
                ) : (
                  orders.map((o: any) => {
                    const s = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.nothing;
                    return (
                      <tr
                        key={o.id}
                        className="orders-row"
                        onClick={() => setSelectedId(o.id)}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          transition: "background 0.12s",
                        }}
                      >
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            fontFamily: "monospace",
                          }}
                        >
                          {o.ref}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 12.5,
                            color: "var(--text-secondary)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {fmtDate(o.date)}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                            color: "var(--text-secondary)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <User size={12} color="var(--text-muted)" />
                            {o.cashier}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 12.5,
                            color: "var(--text-muted)",
                          }}
                        >
                          {o.session}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                            color: "var(--text-secondary)",
                            textAlign: "center",
                          }}
                        >
                          {o.lineCount}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 12,
                            color: "var(--text-muted)",
                          }}
                        >
                          {o.payments.map((p: any) => p.method).join(", ") ||
                            "—"}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            fontFamily: "monospace",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {fmt(o.total)}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: 20,
                              color: s.color,
                              background: s.bg,
                            }}
                          >
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div
              style={{
                padding: "14px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                Page {page} of {pages}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 7,
                    border: "1px solid var(--border)",
                    background: "none",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    opacity: page === 1 ? 0.4 : 1,
                    color: "var(--text-primary)",
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 7,
                    border: "1px solid var(--border)",
                    background: "none",
                    cursor: page === pages ? "not-allowed" : "pointer",
                    opacity: page === pages ? 0.4 : 1,
                    color: "var(--text-primary)",
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
      {/* Drawer */}
      {selectedId !== null && (
        <OrderDrawer id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}
