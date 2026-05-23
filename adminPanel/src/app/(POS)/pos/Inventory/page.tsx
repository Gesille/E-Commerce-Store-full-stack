"use client";

import { useState } from "react";
import {
  Package,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  Search,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  BarChart2,
  Calendar,
  Layers,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  DailyMovement,
  InventoryRange,
  useGetInventoryQuery,
  useGetInventorySummaryQuery,
  useLazyGetProductMovementsQuery,
  Movement,
  useGetInventoryMovementsQuery,
} from "@/redux/posinventory/posinverntoryApi";
import { fmtCompact } from "@/types/pos";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  trend,
  trendValue,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent: "neutral" | "green" | "red" | "amber";
  trend?: "up" | "down";
  trendValue?: string;
}) {
  const iconColors: Record<string, string> = {
    neutral: "bg-stone-100 text-stone-500",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
  };
  const trendColors: Record<string, string> = {
    neutral: "",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
  };
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : null;

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`inline-flex items-center justify-center rounded-lg p-2 ${iconColors[accent]}`}>
          <Icon size={16} />
        </div>
        {TrendIcon && trendValue && (
          <span className={`flex items-center gap-0.5 text-[11px] font-600 px-2 py-0.5 rounded-full ${trendColors[accent]}`}>
            <TrendIcon size={11} />
            {trendValue}
          </span>
        )}
      </div>
      <p className="text-[22px] font-700 tracking-tight text-stone-900 leading-none">{value}</p>
      <p className="mt-1.5 text-[10px] font-600 text-stone-400 uppercase tracking-widest">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-stone-400">{sub}</p>}
    </div>
  );
}

// ─── DailyBar ─────────────────────────────────────────────────────────────────

function DailyBar({ day, maxRevenue }: { day: DailyMovement; maxRevenue: number }) {
  const height = maxRevenue > 0 ? Math.max(4, (day.revenue / maxRevenue) * 60) : 4;
  const retHeight = maxRevenue > 0 ? Math.max(2, (day.returned / Math.max(day.sold, 1)) * height) : 2;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[9px] text-stone-400">{fmt(day.revenue).replace("$", "")}</span>
      <div className="flex items-end gap-0.5">
        <div className="w-5 rounded-t-sm bg-stone-800/70" style={{ height }} title={`Sold: ${day.sold}`} />
        <div className="w-2.5 rounded-t-sm bg-stone-400/50" style={{ height: retHeight }} title={`Returned: ${day.returned}`} />
      </div>
      <span className="text-[10px] text-stone-400">{format(parseISO(day.date), "EEE")}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [range, setRange] = useState<InventoryRange>("week");
  const [viewMode, setViewMode] = useState<"list" | "movements">("list");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "stock" | "sold" | "stockValue">("sold");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const { data: inventoryData, isFetching: invFetching, refetch: refetchInventory } =
    useGetInventoryQuery({ range });
  const { data: summaryData, isFetching: sumFetching, refetch: refetchSummary } =
    useGetInventorySummaryQuery();
  const { data: movementsData, isFetching: movFetching, refetch: refetchMovements } =
    useGetInventoryMovementsQuery({ range, limit: 50 });
  const [fetchProductMovements, { data: productMovData, isFetching: productMovFetching }] =
    useLazyGetProductMovementsQuery();

  const loading = invFetching || sumFetching || movFetching;
  const refetchAll = () => { refetchInventory(); refetchSummary(); refetchMovements(); };

  const toggleExpand = (productId: string) => {
    if (expandedProduct === productId) { setExpandedProduct(null); return; }
    setExpandedProduct(productId);
    fetchProductMovements({ productId, range });
  };

  const products = inventoryData?.products ?? [];
  const dailyMovements = inventoryData?.daily ?? [];
  const weeklyMovements = inventoryData?.weekly ?? [];
  const recentMovements = movementsData?.movements ?? [];
  const productMovements: Movement[] = productMovData?.movements ?? [];
  const summary = summaryData ?? null;
  const maxRev = Math.max(...dailyMovements.map((d: any) => d.revenue), 1);

  const sorted = [...products]
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.reference?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      if (typeof av === "number" && typeof bv === "number")
        return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

  const setSort = (key: typeof sortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />
    ) : (
      <ChevronDown size={11} className="opacity-30" />
    );

  const exportCSV = () => {
    const headers = ["Name", "Reference", "Stock", "Sold", "Returned", "Net", "Stock Value"];
    const rows = sorted.map((p) => [p.name, p.reference, p.stock, p.sold, p.returned, p.netMovement, p.stockValue.toFixed(2)]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-stone-900" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-stone-200">
        <div className="mx-auto max-w-[1400px] px-6 py-0 h-[52px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900 text-white">
              <Layers size={14} />
            </div>
            <div>
              <h1 className="text-[14px] font-600 leading-tight text-stone-900">Inventory</h1>
              <p className="text-[11px] text-stone-400">Products · Movements · Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-stone-200 overflow-hidden bg-stone-50">
              {(["day", "week", "month"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 text-[11.5px] font-500 capitalize transition-colors ${
                    range === r ? "bg-stone-900 text-white" : "text-stone-400 hover:text-stone-700"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[11.5px] text-stone-500 hover:text-stone-900 hover:border-stone-300 transition-colors"
            >
              <Download size={12} /> Export
            </button>
            <button
              onClick={refetchAll}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[11.5px] text-stone-500 hover:text-stone-900 hover:border-stone-300 transition-colors"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-5 space-y-4">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Package} label="Products" value={String(summary?.totalProducts ?? "—")} accent="neutral" />
          <StatCard icon={Layers} label="Stock Value" value={summary ? fmtCompact(summary.totalStockValue) : "—"} sub="All inventory" accent="neutral" />
          <StatCard icon={AlertTriangle} label="Low Stock" value={String(summary?.lowStockCount ?? "—")} sub="≤ 5 units" accent="amber" />
          <StatCard icon={TrendingDown} label="Sold Today" value={String(summary?.soldToday ?? "—")} accent="green" trend="up" trendValue="+12%" />
          <StatCard icon={RotateCcw} label="Returned" value={String(summary?.returnedToday ?? "—")} accent="red" trend="down" trendValue="−4%" />
          <StatCard icon={TrendingUp} label="Revenue Today" value={summary ? fmt(summary.revenueToday) : "—"} accent="green" trend="up" trendValue="+9%" />
        </div>

        {/* Chart + Weekly */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="col-span-2 bg-white border border-stone-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 size={14} className="text-stone-400" />
                <span className="text-[13px] font-600 text-stone-900">Daily sales vs returns</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-stone-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-3 rounded-sm bg-stone-800/70" /> Sales
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-sm bg-stone-400/50" /> Returns
                </span>
              </div>
            </div>
            {invFetching ? (
              <div className="flex h-20 items-center justify-center text-stone-300 text-sm">Loading…</div>
            ) : (
              <div className="flex items-end gap-3 overflow-x-auto pb-1">
                {dailyMovements.length === 0 ? (
                  <p className="text-stone-300 text-xs">No data for this range.</p>
                ) : (
                  dailyMovements.map((d: any) => (
                    <DailyBar key={d.date} day={d} maxRevenue={maxRev} />
                  ))
                )}
              </div>
            )}
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={14} className="text-stone-400" />
              <span className="text-[13px] font-600 text-stone-900">Weekly summary</span>
            </div>
            <div className="space-y-2">
              {invFetching ? (
                <div className="text-stone-300 text-xs text-center py-4">Loading…</div>
              ) : weeklyMovements.length === 0 ? (
                <p className="text-stone-300 text-xs">No data.</p>
              ) : (
                weeklyMovements.map((w: any) => (
                  <div key={w.weekLabel} className="flex items-center justify-between rounded-lg bg-stone-50 border border-stone-100 px-3 py-2.5">
                    <div>
                      <p className="text-[12px] font-500 text-stone-800">{w.weekLabel}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">↓{w.sold} sold · ↑{w.returned} ret</p>
                    </div>
                    <span className="text-[12px] font-700 text-stone-900">{fmt(w.revenue)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-1 w-fit">
          {[
            { id: "list", label: "Products", icon: Package },
            { id: "movements", label: "Movements", icon: RotateCcw },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setViewMode(id as "list" | "movements")}
              className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-[12px] font-500 transition-all ${
                viewMode === id ? "bg-stone-900 text-white" : "text-stone-400 hover:text-stone-700"
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {/* Products table */}
        {viewMode === "list" && (
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products…"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 pl-8 pr-3 py-1.5 text-[12px] text-stone-900 placeholder-stone-400 focus:border-stone-400 focus:bg-white outline-none transition-colors"
                />
              </div>
              <span className="text-[11px] text-stone-400">{sorted.length} products</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-400 text-[10px] uppercase tracking-wider">
                    <th className="px-4 py-3 text-left font-600">Product</th>
                    <th className="px-3 py-3 text-right font-600 cursor-pointer hover:text-stone-700 transition-colors" onClick={() => setSort("stock")}>
                      <span className="flex items-center justify-end gap-1">Stock <SortIcon k="stock" /></span>
                    </th>
                    <th className="px-3 py-3 text-right font-600 cursor-pointer hover:text-stone-700 transition-colors" onClick={() => setSort("sold")}>
                      <span className="flex items-center justify-end gap-1">Sold <SortIcon k="sold" /></span>
                    </th>
                    <th className="px-3 py-3 text-right font-600">Returned</th>
                    <th className="px-3 py-3 text-right font-600">Net move</th>
                    <th className="px-3 py-3 text-right font-600 cursor-pointer hover:text-stone-700 transition-colors" onClick={() => setSort("stockValue")}>
                      <span className="flex items-center justify-end gap-1">Stock value <SortIcon k="stockValue" /></span>
                    </th>
                    <th className="px-3 py-3 text-center font-600">Status</th>
                    <th className="px-3 py-3 text-center font-600">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {invFetching
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-stone-50">
                          {Array.from({ length: 8 }).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-3 rounded bg-stone-100 animate-pulse" style={{ width: `${40 + (i * j * 7) % 40}%` }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    : sorted.map((p) => {
                        const lowStock = p.stock > 0 && p.stock <= 5;
                        const outOfStock = p.stock === 0;
                        const isExpanded = expandedProduct === p._id;
                        return (
                          <>
                            <tr
                              key={p._id}
                              className={`border-b border-stone-50 hover:bg-stone-50/60 transition-colors ${isExpanded ? "bg-stone-50/60" : ""}`}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {p.image ? (
                                    <img src={p.image} alt={p.name} className="h-8 w-8 rounded-lg object-cover border border-stone-200" />
                                  ) : (
                                    <div className="h-8 w-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400">
                                      <Package size={13} />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-500 text-[13px] text-stone-900">{p.name}</p>
                                    <p className="text-[10px] text-stone-400 font-mono">{p.reference || p.barcode || `#${p.odooProductId}`}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right">
                                <span className={`font-mono font-600 text-[12px] ${outOfStock ? "text-red-600" : lowStock ? "text-amber-600" : "text-stone-700"}`}>
                                  {p.stock}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-[12px] text-emerald-700">{p.sold}</td>
                              <td className="px-3 py-3 text-right font-mono text-[12px] text-red-500">{p.returned}</td>
                              <td className="px-3 py-3 text-right">
                                <span className={`font-mono text-[12px] ${p.netMovement < 0 ? "text-red-500" : "text-stone-400"}`}>
                                  {p.netMovement > 0 ? `+${p.netMovement}` : p.netMovement}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-[12px] text-stone-600">{fmt(p.stockValue)}</td>
                              <td className="px-3 py-3 text-center">
                                {outOfStock ? (
                                  <span className="rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-[10px] font-600">Out of stock</span>
                                ) : lowStock ? (
                                  <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-600">Low stock</span>
                                ) : (
                                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-600">In stock</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <button
                                  onClick={() => toggleExpand(p._id)}
                                  className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-[10px] text-stone-500 hover:text-stone-900 hover:border-stone-300 transition-colors"
                                >
                                  <Eye size={10} /> {isExpanded ? "Hide" : "View"}
                                </button>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr key={`${p._id}-expand`} className="bg-stone-50/80">
                                <td colSpan={8} className="px-4 py-4">
                                  <p className="text-[10px] font-600 text-stone-400 uppercase tracking-wider mb-3">
                                    Movement history — {p.name}
                                  </p>
                                  {productMovFetching ? (
                                    <p className="text-stone-400 text-xs py-2">Loading…</p>
                                  ) : productMovements.length === 0 ? (
                                    <p className="text-stone-400 text-xs py-2">No movements in this range.</p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {productMovements.map((m) => (
                                        <div key={m._id} className="flex items-center justify-between rounded-lg bg-white border border-stone-100 px-3 py-2.5">
                                          <div className="flex items-center gap-3">
                                            <span className={`h-6 w-6 rounded-md flex items-center justify-center ${
                                              m.type === "sale" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                                            }`}>
                                              {m.type === "sale" ? <ArrowDownRight size={11} /> : <RotateCcw size={11} />}
                                            </span>
                                            <div>
                                              <p className="text-[12px] font-500 text-stone-800 capitalize">{m.type} · {m.receiptNumber}</p>
                                              <p className="text-[10px] text-stone-400">{m.cashier}</p>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <p className={`text-[12px] font-mono font-600 ${m.type === "sale" ? "text-emerald-700" : "text-red-600"}`}>
                                              {m.type === "sale" ? `−${m.qty}` : `+${m.qty}`}
                                            </p>
                                            <p className="text-[10px] text-stone-400">{format(parseISO(m.date), "MMM d, h:mm a")}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Movements feed */}
        {viewMode === "movements" && (
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="border-b border-stone-100 px-4 py-3 flex items-center gap-2">
              <RotateCcw size={13} className="text-stone-400" />
              <span className="text-[13px] font-600 text-stone-900">All stock movements</span>
              <span className="ml-auto text-[11px] text-stone-400">{recentMovements.length} records</span>
            </div>
            <div className="divide-y divide-stone-50">
              {movFetching
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3">
                      <div className="h-8 w-8 rounded-lg bg-stone-100 animate-pulse" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 rounded bg-stone-100 animate-pulse w-40" />
                        <div className="h-2.5 rounded bg-stone-50 animate-pulse w-24" />
                      </div>
                      <div className="h-3 rounded bg-stone-100 animate-pulse w-16" />
                    </div>
                  ))
                : recentMovements.length === 0 ? (
                    <p className="text-center text-stone-400 text-sm py-10">No movements found for this range.</p>
                  ) : (
                    recentMovements.map((m: any) => (
                      <div key={m._id} className="flex items-center gap-4 px-4 py-3 hover:bg-stone-50/60 transition-colors">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          m.type === "sale"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-red-50 text-red-600 border border-red-100"
                        }`}>
                          {m.type === "sale" ? <TrendingDown size={13} /> : <RotateCcw size={13} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-500 text-stone-800 truncate">{m.productName}</p>
                          <p className="text-[10px] text-stone-400">{m.cashier} · {m.receiptNumber}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-[12px] font-mono font-600 ${m.type === "sale" ? "text-emerald-700" : "text-red-600"}`}>
                            {m.type === "sale" ? `−${m.qty}` : `+${m.qty}`}
                          </p>
                          <p className="text-[10px] text-stone-400">{format(parseISO(m.date), "MMM d, HH:mm")}</p>
                        </div>
                        <div className="text-right shrink-0 w-20">
                          <p className="text-[12px] font-mono text-stone-500">{fmt(m.price * m.qty)}</p>
                          <p className="text-[10px] text-stone-400 capitalize">{m.type}</p>
                        </div>
                      </div>
                    ))
                  )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}