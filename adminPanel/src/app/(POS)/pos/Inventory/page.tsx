"use client";


import { InventoryRange, ProductRow, useGetInventoryMovementsQuery, useGetInventoryQuery, useGetInventorySummaryQuery, useLazyGetProductMovementsQuery } from "@/redux/posinventory/posinverntoryApi";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
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

// ─── Product drawer ───────────────────────────────────────────────────────────

function ProductDrawer({
  product,
  range,
  onClose,
}: {
  product: ProductRow;
  range: InventoryRange;
  onClose: () => void;
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
        style={{ background: "rgba(0,0,0,0.15)" }}
        onClick={onClose}
      />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 bg-white flex flex-col"
        style={{ width: "min(400px,95vw)", borderLeft: "1px solid #e5e7eb" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            {product.image ? (
              <img src={product.image} alt={product.name}
                className="w-9 h-9 rounded-lg object-cover border border-gray-100" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-base">📦</div>
            )}
            <div>
              <div className="text-[13px] font-semibold text-gray-900 leading-tight">{product.name}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">REF {product.reference || "—"}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 text-sm bg-transparent cursor-pointer"
          >✕</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 border-b border-gray-100 shrink-0">
          {[
            { label: "Stock", value: String(product.stock), cls: "text-gray-900" },
            { label: "Sold", value: String(product.sold), cls: "text-red-500" },
            { label: "Returned", value: String(product.returned), cls: "text-emerald-600" },
            { label: "Value", value: `$${fmt(product.stockValue)}`, cls: "text-blue-600" },
          ].map((s, i) => (
            <div key={s.label} className="px-3 py-2.5"
              style={{ borderRight: i < 3 ? "1px solid #f3f4f6" : "none" }}>
              <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">{s.label}</div>
              <div className={`text-[15px] font-bold ${s.cls}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Movements */}
        <div className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest shrink-0">
          Movement history
        </div>
        <div className="flex-1 overflow-y-auto">
          {isFetching ? (
            <div className="py-10 text-center text-[12px] text-gray-400">Loading…</div>
          ) : !data?.movements.length ? (
            <div className="py-10 text-center text-[12px] text-gray-400">No movements in this range</div>
          ) : (
            <div className="px-4 pb-4">
              {data.movements.map((m:any) => (
                <div key={m._id} className="flex items-center gap-2.5 py-2 border-b border-gray-50">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    m.type === "sale" ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
                  }`}>
                    {m.type === "sale" ? "SALE" : "RTN"}
                  </span>
                  <span className={`text-[13px] font-semibold min-w-[28px] ${
                    m.type === "sale" ? "text-red-500" : "text-emerald-600"
                  }`}>
                    {m.type === "sale" ? "-" : "+"}{m.qty}
                  </span>
                  <span className="text-[12px] text-gray-500 flex-1 truncate">{m.cashier}</span>
                  <span className="text-[11px] text-gray-400">{fmtDate(m.date)}</span>
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

const { data: inv, isFetching: invLoading } =
  useGetInventoryQuery({ range });
  const { data: summary } = useGetInventorySummaryQuery();
  const { data: movData, isFetching: movLoading } = useGetInventoryMovementsQuery(
    { range, limit: 100 },
    { skip: tab !== "movements" }
  );

  // Clear drawer when range changes (stale data would show the old range's movements)
  useEffect(() => { setSelected(null); }, [range]);

  const products = useMemo(() => {
    let rows = inv?.products ?? [];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((p:any) =>
        p.name.toLowerCase().includes(q) ||
        p.reference?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
      );
    }
    if (lowOnly) rows = rows.filter((p:any) => p.stock > 0 && p.stock <= 5);
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

  const Th = ({ col, label, right }: { col: keyof ProductRow; label: string; right?: boolean }) => (
    <th
      onClick={() => toggleSort(col)}
      className="cursor-pointer select-none whitespace-nowrap px-3 py-2.5"
      style={{
        textAlign: right ? "right" : "left",
        fontSize: 10, fontWeight: 600, letterSpacing: "0.6px",
        textTransform: "uppercase",
        color: sortKey === col ? "#2563EB" : "#9ca3af",
        background: "#fafafa", borderBottom: "1px solid #f3f4f6",
      }}
    >
      {label}{sortKey === col ? (sortAsc ? " ↑" : " ↓") : ""}
    </th>
  );

  const kpis = [
    { label: "Products", value: String(summary?.totalProducts ?? "—") },
    { label: "Stock value", value: summary ? `$${fmt(summary.totalStockValue)}` : "—", green: true },
    { label: "Low stock", value: String(summary?.lowStockCount ?? "—"), warn: (summary?.lowStockCount ?? 0) > 0 },
    { label: "Sold today", value: String(summary?.soldToday ?? "—"), red: true },
    { label: "Returned", value: String(summary?.returnedToday ?? "—") },
    { label: "Revenue today", value: summary ? `$${fmt(summary.revenueToday)}` : "—", blue: true },
  ];

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: "calc(100vh - 60px)" }}>

      {/* Top bar */}
      <div className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <span className="text-[14px] font-semibold text-gray-900">Inventory · POS</span>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["day", "week", "month"] as InventoryRange[]).map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`text-[11px] font-semibold px-3 py-1 rounded-md border-none cursor-pointer transition-all ${
                range === r ? "bg-white text-gray-900 shadow-sm" : "bg-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="shrink-0 grid border-b border-gray-100 bg-white" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        {kpis.map((k, i) => (
          <div key={k.label} className="px-4 py-2.5" style={{ borderRight: i < 5 ? "1px solid #f3f4f6" : "none" }}>
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{k.label}</div>
            <div className={`text-[16px] font-bold mt-0.5 ${
              k.green ? "text-emerald-600" : k.warn ? "text-amber-500" : k.red ? "text-red-500" : k.blue ? "text-blue-600" : "text-gray-900"
            }`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="shrink-0 flex bg-white border-b border-gray-100 px-5">
        {([["products", "Products"], ["movements", "Movements"], ["chart", "Analytics"]] as [Tab, string][]).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-[12px] font-semibold px-4 py-3 border-none bg-transparent cursor-pointer border-b-2 transition-colors ${
              tab === t ? "text-blue-600 border-blue-600" : "text-gray-400 border-transparent hover:text-gray-600"
            }`}
            style={{ marginBottom: -1 }}>
            {l}
          </button>
        ))}

        {tab === "products" && (
          <div className="flex items-center gap-2 ml-auto py-1.5">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300 text-[12px]">🔍</span>
              <input
                className="text-[12px] pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none focus:border-blue-400 w-48"
                placeholder="Search…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontFamily: "inherit" }}
              />
            </div>
            <button
              onClick={() => setLowOnly((v) => !v)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                lowOnly ? "bg-amber-50 border-amber-300 text-amber-600" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
              }`}>
              ⚠️ Low stock
            </button>
            <span className="text-[11px] text-gray-400">{products.length} items</span>
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Products tab ── */}
        {tab === "products" && (
          <div className="p-4">
            {invLoading ? (
              <div className="py-16 text-center text-[12px] text-gray-400 animate-pulse">Loading inventory…</div>
            ) : products.length === 0 ? (
              <div className="py-16 text-center text-[12px] text-gray-400">No products found</div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <Th col="name" label="Product" />
                      <Th col="stock" label="Stock" />
                      <Th col="price" label="Price" />
                      <Th col="sold" label="Sold" />
                      <Th col="returned" label="Returned" />
                      <Th col="netMovement" label="Net" />
                      <Th col="stockValue" label="Value" right />
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const sc = p.stock === 0 ? "bg-red-50 text-red-500"
                        : p.stock <= 5 ? "bg-amber-50 text-amber-600"
                        : "bg-emerald-50 text-emerald-600";
                      const isSel = selected?._id === p._id;
                      return (
                        <tr key={p._id} onClick={() => setSelected(isSel ? null : p)}
                          className={`border-b border-gray-50 cursor-pointer transition-colors ${isSel ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              {p.image ? (
                                <img src={p.image} alt={p.name}
                                  className="w-8 h-8 rounded-lg object-cover border border-gray-100 shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm shrink-0">📦</div>
                              )}
                              <div>
                                <div className="text-[12px] font-semibold text-gray-900 leading-tight">{p.name}</div>
                                <div className="text-[10px] text-gray-400">{p.reference || "—"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${sc}`}>{p.stock}</span>
                          </td>
                          <td className="px-3 py-2.5 text-[12px] text-gray-700 tabular-nums">${fmt(p.price)}</td>
                          <td className={`px-3 py-2.5 text-[12px] font-semibold tabular-nums ${p.sold > 0 ? "text-red-500" : "text-gray-300"}`}>
                            {p.sold > 0 ? `-${p.sold}` : "0"}
                          </td>
                          <td className={`px-3 py-2.5 text-[12px] font-semibold tabular-nums ${p.returned > 0 ? "text-emerald-600" : "text-gray-300"}`}>
                            {p.returned > 0 ? `+${p.returned}` : "0"}
                          </td>
                          <td className={`px-3 py-2.5 text-[12px] font-semibold tabular-nums ${
                            p.netMovement < 0 ? "text-red-500" : p.netMovement > 0 ? "text-emerald-600" : "text-gray-300"
                          }`}>
                            {p.netMovement > 0 ? "+" : ""}{p.netMovement}
                          </td>
                          <td className="px-3 py-2.5 text-[12px] text-gray-700 tabular-nums text-right">
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
          <div className="p-4">
            {movLoading ? (
              <div className="py-16 text-center text-[12px] text-gray-400 animate-pulse">Loading movements…</div>
            ) : !movData?.movements.length ? (
              <div className="py-16 text-center text-[12px] text-gray-400">No movements in this range</div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {["Type", "Product", "Qty", "Price", "Cashier", "Receipt", "Date"].map((h) => (
                        <th key={h} style={{
                          padding: "10px 12px", textAlign: "left", fontSize: 10,
                          fontWeight: 600, color: "#9ca3af", letterSpacing: "0.6px",
                          textTransform: "uppercase", background: "#fafafa",
                          borderBottom: "1px solid #f3f4f6",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movData.movements.map((m:any) => (
                      <tr key={m._id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            m.type === "sale" ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
                          }`}>{m.type === "sale" ? "SALE" : "RTN"}</span>
                        </td>
                        <td className="px-3 py-2.5 text-[12px] font-medium text-gray-800 max-w-[180px] truncate">{m.productName}</td>
                        <td className={`px-3 py-2.5 text-[12px] font-semibold tabular-nums ${
                          m.type === "sale" ? "text-red-500" : "text-emerald-600"
                        }`}>{m.type === "sale" ? "-" : "+"}{m.qty}</td>
                        <td className="px-3 py-2.5 text-[12px] text-gray-700 tabular-nums">${fmt(m.price)}</td>
                        <td className="px-3 py-2.5 text-[12px] text-gray-500">{m.cashier}</td>
                        <td className="px-3 py-2.5 text-[11px] text-gray-400 tabular-nums">{m.receiptNumber}</td>
                        <td className="px-3 py-2.5 text-[11px] text-gray-400">{fmtDate(m.date)}</td>
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
          <div className="p-4 flex flex-col gap-4">
            {invLoading ? (
              <div className="py-16 text-center text-[12px] text-gray-400 animate-pulse">Loading…</div>
            ) : (
              <>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="text-[12px] font-semibold text-gray-600 mb-4">Daily units — sold vs returned</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={(inv?.daily ?? []).map((d:any) => ({ ...d, label: fmtAxis(d.date) }))} barGap={3}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                      <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 11, fontFamily: "inherit" }} />
                      <Bar dataKey="sold" name="Sold" fill="#ef4444" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="returned" name="Returned" fill="#10b981" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="text-[12px] font-semibold text-gray-600 mb-4">Daily revenue</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={(inv?.daily ?? []).map((d:any) => ({ ...d, label: fmtAxis(d.date) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                      <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 11, fontFamily: "inherit" }}
                        formatter={(v: any) => [`$${fmt(v)}`, "Revenue"]} />
                      <Bar dataKey="revenue" name="Revenue" fill="#2563EB" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 text-[12px] font-semibold text-gray-600">4-week summary</div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {["Week", "Sold", "Returned", "Net", "Revenue"].map((h) => (
                          <th key={h} style={{
                            padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 600,
                            color: "#9ca3af", letterSpacing: "0.6px", textTransform: "uppercase",
                            background: "#fafafa", borderBottom: "1px solid #f3f4f6",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(inv?.weekly ?? []).map((w:any) => (
                        <tr key={w.weekLabel} className="border-b border-gray-50">
                          <td className="px-3 py-2.5 text-[12px] text-gray-500">{w.weekLabel}</td>
                          <td className="px-3 py-2.5 text-[12px] font-semibold text-red-500 tabular-nums">{w.sold}</td>
                          <td className="px-3 py-2.5 text-[12px] font-semibold text-emerald-600 tabular-nums">{w.returned}</td>
                          <td className={`px-3 py-2.5 text-[12px] font-semibold tabular-nums ${
                            w.sold - w.returned > 0 ? "text-red-500" : "text-emerald-600"
                          }`}>{w.sold - w.returned}</td>
                          <td className="px-3 py-2.5 text-[12px] text-gray-700 tabular-nums">${fmt(w.revenue)}</td>
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

      {/* Drawer */}
      {selected && (
        <ProductDrawer product={selected} range={range} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}