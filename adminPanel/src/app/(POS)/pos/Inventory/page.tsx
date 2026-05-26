"use client";


import { InventoryRange, ProductRow, useGetInventoryMovementsQuery, useGetInventoryQuery, useGetInventorySummaryQuery, useLazyGetProductMovementsQuery } from "@/redux/posinventory/posinverntoryApi";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Area, AreaChart,
} from "recharts";

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number, d = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtAxis(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0f1117", border: "1px solid #2a2d3a",
      borderRadius: 8, padding: "10px 14px", fontSize: 11,
    }}>
      <div style={{ color: "#6b7280", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <span style={{ color: "#f1f5f9", fontWeight: 700 }}>
            {p.name === "Revenue" ? `$${fmt(p.value)}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ type }: { type: "sale" | "return" }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: "0.8px",
      padding: "3px 7px", borderRadius: 4,
      background: type === "sale" ? "rgba(239,68,68,0.15)" : "rgba(52,211,153,0.15)",
      color: type === "sale" ? "#f87171" : "#34d399",
      border: `1px solid ${type === "sale" ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.3)"}`,
    }}>
      {type === "sale" ? "SALE" : "RTN"}
    </span>
  );
}

// ─── Stock pill ───────────────────────────────────────────────────────────────

function StockPill({ stock }: { stock: number }) {
  const cfg =
    stock === 0 ? { bg: "rgba(239,68,68,0.15)", color: "#f87171", border: "rgba(239,68,68,0.3)" }
    : stock <= 5 ? { bg: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "rgba(251,191,36,0.3)" }
    : { bg: "rgba(52,211,153,0.12)", color: "#34d399", border: "rgba(52,211,153,0.25)" };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>{stock}</span>
  );
}

// ─── Product Drawer ───────────────────────────────────────────────────────────

function ProductDrawer({
  product, range, onClose,
}: {
  product: ProductRow; range: InventoryRange; onClose: () => void;
}) {
  const [fetch, { data, isFetching }] = useLazyGetProductMovementsQuery();
  const fetchedKey = useRef("");

  useEffect(() => {
    const key = `${product._id}-${range}`;
    if (fetchedKey.current === key) return;
    fetchedKey.current = key;
    fetch({ productId: product._id, range });
  }, [product._id, range, fetch]);

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
        style={{
          width: "min(420px,96vw)",
          background: "#0d0f18",
          borderLeft: "1px solid #1e2130",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #1e2130",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, overflow: "hidden",
            background: "#1a1d2e", border: "1px solid #2a2d3a",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            {product.image
              ? <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 20 }}>📦</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.3 }}>
              {product.name}
            </div>
            <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>
              REF {product.reference || "—"}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8, border: "1px solid #2a2d3a",
            background: "transparent", color: "#6b7280", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: "1px solid #1e2130" }}>
          {[
            { label: "Stock", value: String(product.stock), color: "#f1f5f9" },
            { label: "Sold", value: String(product.sold), color: "#f87171" },
            { label: "Returned", value: String(product.returned), color: "#34d399" },
            { label: "Value", value: `$${fmt(product.stockValue)}`, color: "#60a5fa" },
          ].map((s, i) => (
            <div key={s.label} style={{
              padding: "14px 12px",
              borderRight: i < 3 ? "1px solid #1e2130" : "none",
            }}>
              <div style={{ fontSize: 9, color: "#4b5563", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 6 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Movements label */}
        <div style={{ padding: "14px 20px 8px", fontSize: 9, fontWeight: 700, color: "#4b5563", letterSpacing: "1px", textTransform: "uppercase" }}>
          Movement History
        </div>

        {/* Movements list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {isFetching ? (
            <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 12, color: "#4b5563" }}>Loading…</div>
          ) : !data?.movements.length ? (
            <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 12, color: "#4b5563" }}>
              No movements in this range
            </div>
          ) : (
            <div style={{ padding: "0 20px 20px" }}>
              {data.movements.map((m: any) => (
                <div key={m._id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 0", borderBottom: "1px solid #1a1d2e",
                }}>
                  <Badge type={m.type} />
                  <span style={{
                    fontSize: 13, fontWeight: 700, minWidth: 32,
                    color: m.type === "sale" ? "#f87171" : "#34d399",
                  }}>
                    {m.type === "sale" ? "−" : "+"}{m.qty}
                  </span>
                  <span style={{ fontSize: 12, color: "#9ca3af", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.cashier}
                  </span>
                  <span style={{ fontSize: 11, color: "#4b5563", flexShrink: 0 }}>
                    {fmtDate(m.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = "products" | "movements" | "chart";

export default function InventoryPage() {
  const [range, setRange] = useState<InventoryRange>("week");
  const [tab, setTab] = useState<Tab>("products");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ProductRow | null>(null);
  const [sortKey, setSortKey] = useState<keyof ProductRow>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [lowOnly, setLowOnly] = useState(false);

  const { data: inv, isFetching: invLoading } = useGetInventoryQuery({ range });
  const { data: summary } = useGetInventorySummaryQuery();
  const { data: movData, isFetching: movLoading } = useGetInventoryMovementsQuery(
    { range, limit: 100 },
    { skip: tab !== "movements" }
  );

  useEffect(() => { setSelected(null); }, [range]);

  const products = useMemo(() => {
    let rows = inv?.products ?? [];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((p: any) =>
        p.name.toLowerCase().includes(q) ||
        p.reference?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
      );
    }
    if (lowOnly) rows = rows.filter((p: any) => p.stock > 0 && p.stock <= 5);
    return [...rows].sort((a, b) => {
      const av = a[sortKey] as any;
      const bv = b[sortKey] as any;
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });
  }, [inv?.products, search, sortKey, sortAsc, lowOnly]);

  function toggleSort(k: keyof ProductRow) {
    if (sortKey === k) setSortAsc((v) => !v);
    else { setSortKey(k); setSortAsc(true); }
  }

  const kpis = [
    { label: "Total Products", value: String(summary?.totalProducts ?? "—"), color: "#f1f5f9", icon: "▦" },
    { label: "Stock Value", value: summary ? `$${fmt(summary.totalStockValue)}` : "—", color: "#60a5fa", icon: "◈" },
    { label: "Low Stock", value: String(summary?.lowStockCount ?? "—"), color: (summary?.lowStockCount ?? 0) > 0 ? "#fbbf24" : "#f1f5f9", icon: "⚠" },
    { label: "Sold Today", value: String(summary?.soldToday ?? "—"), color: "#f87171", icon: "↓" },
    { label: "Returned", value: String(summary?.returnedToday ?? "—"), color: "#34d399", icon: "↑" },
    { label: "Revenue Today", value: summary ? `$${fmt(summary.revenueToday)}` : "—", color: "#a78bfa", icon: "$" },
  ];

  const thStyle = (col: keyof ProductRow, right = false): React.CSSProperties => ({
    padding: "10px 14px",
    textAlign: right ? "right" : "left",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.8px",
    textTransform: "uppercase",
    color: sortKey === col ? "#60a5fa" : "#374151",
    background: "#0a0c14",
    borderBottom: "1px solid #1e2130",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  });

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "calc(100vh - 60px)",
      background: "#080a12",
      fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
    }}>

      {/* ── Top bar ── */}
      <div style={{
        height: 52, background: "#0d0f18",
        borderBottom: "1px solid #1e2130",
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13,
          }}>▦</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.2px" }}>
            Inventory
          </span>
          <span style={{ fontSize: 11, color: "#374151", marginLeft: 2 }}>· POS</span>
        </div>

        {/* Range switcher */}
        <div style={{
          display: "flex", gap: 2, background: "#0a0c14",
          border: "1px solid #1e2130", borderRadius: 8, padding: 3,
        }}>
          {(["day", "week", "month"] as InventoryRange[]).map((r) => (
            <button key={r} onClick={() => setRange(r)} style={{
              fontSize: 11, fontWeight: 600, padding: "5px 14px",
              borderRadius: 6, border: "none", cursor: "pointer",
              background: range === r ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "transparent",
              color: range === r ? "#fff" : "#4b5563",
              transition: "all 0.15s",
            }}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={{
        flexShrink: 0, display: "grid",
        gridTemplateColumns: "repeat(6,1fr)",
        background: "#0d0f18",
        borderBottom: "1px solid #1e2130",
      }}>
        {kpis.map((k, i) => (
          <div key={k.label} style={{
            padding: "14px 16px",
            borderRight: i < 5 ? "1px solid #1e2130" : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: "#374151" }}>{k.icon}</span>
              <span style={{ fontSize: 9, color: "#374151", fontWeight: 700, letterSpacing: "0.7px", textTransform: "uppercase" }}>
                {k.label}
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.color, letterSpacing: "-0.5px" }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center",
        background: "#0d0f18", borderBottom: "1px solid #1e2130",
        padding: "0 20px",
      }}>
        {([["products", "Products"], ["movements", "Movements"], ["chart", "Analytics"]] as [Tab, string][]).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontSize: 12, fontWeight: 600, padding: "13px 16px",
            border: "none", background: "transparent", cursor: "pointer",
            color: tab === t ? "#60a5fa" : "#374151",
            borderBottom: tab === t ? "2px solid #3b82f6" : "2px solid transparent",
            marginBottom: -1, transition: "all 0.15s",
          }}>
            {l}
          </button>
        ))}

        {tab === "products" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#374151" }}>⌕</span>
              <input
                style={{
                  fontSize: 12, paddingLeft: 28, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                  background: "#0a0c14", border: "1px solid #1e2130",
                  borderRadius: 8, color: "#d1d5db", outline: "none", width: 180,
                  fontFamily: "inherit",
                }}
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Low stock toggle */}
            <button onClick={() => setLowOnly((v) => !v)} style={{
              fontSize: 11, fontWeight: 600, padding: "7px 12px",
              borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
              background: lowOnly ? "rgba(251,191,36,0.12)" : "transparent",
              border: lowOnly ? "1px solid rgba(251,191,36,0.4)" : "1px solid #1e2130",
              color: lowOnly ? "#fbbf24" : "#4b5563",
            }}>
              ⚠ Low stock
            </button>

            <span style={{ fontSize: 11, color: "#374151" }}>{products.length} items</span>
          </div>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* ── Products tab ── */}
        {tab === "products" && (
          <div style={{ padding: 16 }}>
            {invLoading ? (
              <div style={{ padding: "64px 0", textAlign: "center", fontSize: 12, color: "#374151" }}>
                Loading inventory…
              </div>
            ) : products.length === 0 ? (
              <div style={{ padding: "64px 0", textAlign: "center", fontSize: 12, color: "#374151" }}>
                No products found
              </div>
            ) : (
              <div style={{
                background: "#0d0f18", borderRadius: 12,
                border: "1px solid #1e2130", overflow: "hidden",
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {[
                        { col: "name" as keyof ProductRow, label: "Product" },
                        { col: "stock" as keyof ProductRow, label: "Stock" },
                        { col: "price" as keyof ProductRow, label: "Price" },
                        { col: "sold" as keyof ProductRow, label: "Sold" },
                        { col: "returned" as keyof ProductRow, label: "Returned" },
                        { col: "netMovement" as keyof ProductRow, label: "Net" },
                        { col: "stockValue" as keyof ProductRow, label: "Value", right: true },
                      ].map(({ col, label, right }) => (
                        <th key={col} onClick={() => toggleSort(col)} style={thStyle(col, right)}>
                          {label}{sortKey === col ? (sortAsc ? " ↑" : " ↓") : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const isSel = selected?._id === p._id;
                      return (
                        <tr
                          key={p._id}
                          onClick={() => setSelected(isSel ? null : p)}
                          style={{
                            borderBottom: "1px solid #131520",
                            cursor: "pointer",
                            background: isSel
                              ? "rgba(59,130,246,0.08)"
                              : "transparent",
                            transition: "background 0.1s",
                          }}
                          onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = "#111420"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isSel ? "rgba(59,130,246,0.08)" : "transparent"; }}
                        >
                          {/* Product */}
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: 8, overflow: "hidden",
                                background: "#1a1d2e", border: "1px solid #2a2d3a",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0,
                              }}>
                                {p.image
                                  ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  : <span style={{ fontSize: 15 }}>📦</span>}
                              </div>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.3 }}>{p.name}</div>
                                <div style={{ fontSize: 10, color: "#374151", marginTop: 1 }}>{p.reference || "—"}</div>
                              </div>
                            </div>
                          </td>
                          {/* Stock */}
                          <td style={{ padding: "10px 14px" }}>
                            <StockPill stock={p.stock} />
                          </td>
                          {/* Price */}
                          <td style={{ padding: "10px 14px", fontSize: 12, color: "#9ca3af", fontVariantNumeric: "tabular-nums" }}>
                            ${fmt(p.price)}
                          </td>
                          {/* Sold */}
                          <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: p.sold > 0 ? "#f87171" : "#374151" }}>
                            {p.sold > 0 ? `−${p.sold}` : "0"}
                          </td>
                          {/* Returned */}
                          <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: p.returned > 0 ? "#34d399" : "#374151" }}>
                            {p.returned > 0 ? `+${p.returned}` : "0"}
                          </td>
                          {/* Net */}
                          <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: p.netMovement < 0 ? "#f87171" : p.netMovement > 0 ? "#34d399" : "#374151" }}>
                            {p.netMovement > 0 ? "+" : ""}{p.netMovement}
                          </td>
                          {/* Value */}
                          <td style={{ padding: "10px 14px", fontSize: 12, color: "#9ca3af", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                            ${fmt(p.stockValue)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Movements tab ── */}
        {tab === "movements" && (
          <div style={{ padding: 16 }}>
            {movLoading ? (
              <div style={{ padding: "64px 0", textAlign: "center", fontSize: 12, color: "#374151" }}>
                Loading movements…
              </div>
            ) : !movData?.movements.length ? (
              <div style={{ padding: "64px 0", textAlign: "center", fontSize: 12, color: "#374151" }}>
                No movements in this range
              </div>
            ) : (
              <div style={{ background: "#0d0f18", borderRadius: 12, border: "1px solid #1e2130", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Type", "Product", "Qty", "Price", "Cashier", "Receipt", "Date"].map((h) => (
                        <th key={h} style={{
                          padding: "10px 14px", textAlign: "left", fontSize: 9,
                          fontWeight: 700, color: "#374151", letterSpacing: "0.8px",
                          textTransform: "uppercase", background: "#0a0c14",
                          borderBottom: "1px solid #1e2130",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movData.movements.map((m: any) => (
                      <tr key={m._id} style={{ borderBottom: "1px solid #131520" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#111420"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <td style={{ padding: "10px 14px" }}><Badge type={m.type} /></td>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 500, color: "#e2e8f0", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.productName}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: m.type === "sale" ? "#f87171" : "#34d399" }}>
                          {m.type === "sale" ? "−" : "+"}{m.qty}
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: 12, color: "#9ca3af", fontVariantNumeric: "tabular-nums" }}>${fmt(m.price)}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, color: "#6b7280" }}>{m.cashier}</td>
                        <td style={{ padding: "10px 14px", fontSize: 11, color: "#4b5563", fontVariantNumeric: "tabular-nums" }}>{m.receiptNumber}</td>
                        <td style={{ padding: "10px 14px", fontSize: 11, color: "#4b5563" }}>{fmtDate(m.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Analytics tab ── */}
        {tab === "chart" && (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            {invLoading ? (
              <div style={{ padding: "64px 0", textAlign: "center", fontSize: 12, color: "#374151" }}>
                Loading…
              </div>
            ) : (
              <>
                {/* Sold vs Returned */}
                <div style={{ background: "#0d0f18", borderRadius: 12, border: "1px solid #1e2130", padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.5px", marginBottom: 20, textTransform: "uppercase" }}>
                    Daily Units — Sold vs Returned
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={(inv?.daily ?? []).map((d: any) => ({ ...d, label: fmtAxis(d.date) }))}
                      barGap={4}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1d2e" />
                      <XAxis dataKey="label" tick={{ fill: "#374151", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#374151", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="sold" name="Sold" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.85} />
                      <Bar dataKey="returned" name="Returned" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Revenue */}
                <div style={{ background: "#0d0f18", borderRadius: 12, border: "1px solid #1e2130", padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.5px", marginBottom: 20, textTransform: "uppercase" }}>
                    Daily Revenue
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={(inv?.daily ?? []).map((d: any) => ({ ...d, label: fmtAxis(d.date) }))}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1d2e" />
                      <XAxis dataKey="label" tick={{ fill: "#374151", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#374151", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* 4-week summary */}
                <div style={{ background: "#0d0f18", borderRadius: 12, border: "1px solid #1e2130", overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e2130", fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                    4-Week Summary
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Week", "Sold", "Returned", "Net", "Revenue"].map((h) => (
                          <th key={h} style={{
                            padding: "9px 14px", textAlign: "left", fontSize: 9,
                            fontWeight: 700, color: "#374151", letterSpacing: "0.8px",
                            textTransform: "uppercase", background: "#0a0c14",
                            borderBottom: "1px solid #1e2130",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(inv?.weekly ?? []).map((w: any) => (
                        <tr key={w.weekLabel} style={{ borderBottom: "1px solid #131520" }}>
                          <td style={{ padding: "10px 14px", fontSize: 12, color: "#6b7280" }}>{w.weekLabel}</td>
                          <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#f87171", fontVariantNumeric: "tabular-nums" }}>{w.sold}</td>
                          <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#34d399", fontVariantNumeric: "tabular-nums" }}>{w.returned}</td>
                          <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: w.sold - w.returned > 0 ? "#f87171" : "#34d399" }}>
                            {w.sold - w.returned}
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 12, color: "#9ca3af", fontVariantNumeric: "tabular-nums" }}>${fmt(w.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Drawer ── */}
      {selected && (
        <ProductDrawer product={selected} range={range} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}