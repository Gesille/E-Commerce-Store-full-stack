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
import { DailyMovement, InventoryRange, useGetInventoryQuery, useGetInventorySummaryQuery, useLazyGetProductMovementsQuery, Movement, useGetInventoryMovementsQuery } from "@/redux/posinventory/posinverntoryApi";
import { fmtCompact } from "@/types/pos";



// ─── Helpers ──────────────────────────────────────────────────────────────────

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
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent: "blue" | "green" | "red" | "amber" | "violet" | "cyan";
  trend?: "up" | "down";
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };
  const TrendIcon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#1a1d23] p-5">
      <div className="flex items-start justify-between">
        <div
          className={`inline-flex items-center justify-center rounded-lg border p-2.5 ${colors[accent]}`}
        >
          <Icon size={18} />
        </div>
        {TrendIcon && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              trend === "up" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            <TrendIcon size={14} />
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
        <p className="mt-0.5 text-xs font-medium text-white/40 uppercase tracking-widest">
          {label}
        </p>
        {sub && <p className="mt-1 text-xs text-white/30">{sub}</p>}
      </div>
      <div
        className={`absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-10 blur-xl ${
          colors[accent].split(" ")[0]
        }`}
      />
    </div>
  );
}

// ─── DailyBar ─────────────────────────────────────────────────────────────────

function DailyBar({
  day,
  maxRevenue,
}: {
  day: DailyMovement;
  maxRevenue: number;
}) {
  const height = maxRevenue > 0 ? Math.max(4, (day.revenue / maxRevenue) * 64) : 4;
  const retHeight =
    maxRevenue > 0
      ? Math.max(2, (day.returned / Math.max(day.sold, 1)) * height)
      : 2;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] text-white/30">
        {fmt(day.revenue).replace("$", "")}
      </span>
      <div className="flex items-end gap-0.5">
        <div
          className="w-6 rounded-t-sm bg-blue-500/70 transition-all"
          style={{ height }}
          title={`Sold: ${day.sold}`}
        />
        <div
          className="w-3 rounded-t-sm bg-red-400/50 transition-all"
          style={{ height: retHeight }}
          title={`Returned: ${day.returned}`}
        />
      </div>
      <span className="text-[10px] text-white/40">
        {format(parseISO(day.date), "EEE")}
      </span>
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

  // ── RTK Query hooks ──────────────────────────────────────────────────────────
  const {
    data: inventoryData,
    isFetching: invFetching,
    refetch: refetchInventory,
  } = useGetInventoryQuery({ range });

  const {
    data: summaryData,
    isFetching: sumFetching,
    refetch: refetchSummary,
  } = useGetInventorySummaryQuery();

  const {
    data: movementsData,
    isFetching: movFetching,
    refetch: refetchMovements,
  } = useGetInventoryMovementsQuery({ range, limit: 50 });

  const [fetchProductMovements, { data: productMovData, isFetching: productMovFetching }] =
    useLazyGetProductMovementsQuery();

  const loading = invFetching || sumFetching || movFetching;

  const refetchAll = () => {
    refetchInventory();
    refetchSummary();
    refetchMovements();
  };

  // ── Expand row ───────────────────────────────────────────────────────────────
  const toggleExpand = (productId: string) => {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
      return;
    }
    setExpandedProduct(productId);
    fetchProductMovements({ productId, range });
  };

  // ── Derived data ─────────────────────────────────────────────────────────────
  const products = inventoryData?.products ?? [];
  const dailyMovements = inventoryData?.daily ?? [];
  const weeklyMovements = inventoryData?.weekly ?? [];
  const recentMovements = movementsData?.movements ?? [];
  const productMovements: Movement[] = productMovData?.movements ?? [];
  const summary = summaryData ?? null;
  const maxRev = Math.max(...dailyMovements.map((d:any) => d.revenue), 1);

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
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? (
        <ChevronUp size={12} />
      ) : (
        <ChevronDown size={12} />
      )
    ) : (
      <ChevronDown size={12} className="opacity-30" />
    );

  const exportCSV = () => {
    const headers = ["Name", "Reference", "Stock", "Sold", "Returned", "Net", "Stock Value"];
    const rows = sorted.map((p) => [
      p.name,
      p.reference,
      p.stock,
      p.sold,
      p.returned,
      p.netMovement,
      p.stockValue.toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f1115] text-white font-['DM_Sans',sans-serif]">
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0f1115]/90 backdrop-blur-md">
        <div className="mx-auto max-w-[1400px] px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20">
              <Layers size={16} />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold leading-tight">Inventory</h1>
              <p className="text-[11px] text-white/30">Products · Movements · Analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
              {(["day", "week", "month"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    range === r
                      ? "bg-blue-600 text-white"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/50 hover:text-white transition-colors"
            >
              <Download size={13} /> Export
            </button>
            <button
              onClick={refetchAll}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/50 hover:text-white transition-colors"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Package} label="Products" value={String(summary?.totalProducts ?? "—")} accent="blue" />
          <StatCard icon={Layers} label="Stock Value" value={summary ? fmtCompact(summary.totalStockValue) : "—"} sub="All inventory" accent="violet" />
          <StatCard icon={AlertTriangle} label="Low Stock" value={String(summary?.lowStockCount ?? "—")} sub="≤ 5 units" accent="amber" />
          <StatCard icon={TrendingDown} label="Sold Today" value={String(summary?.soldToday ?? "—")} accent="green" trend="up" />
          <StatCard icon={RotateCcw} label="Returned" value={String(summary?.returnedToday ?? "—")} accent="red" trend="down" />
          <StatCard icon={TrendingUp} label="Revenue Today" value={summary ? fmt(summary.revenueToday) : "—"} accent="cyan" trend="up" />
        </div>

        {/* ── Daily chart + weekly table ── */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="col-span-2 rounded-xl border border-white/[0.06] bg-[#1a1d23] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 size={15} className="text-blue-400" />
                <span className="text-sm font-semibold">Daily Sales vs Returns</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-white/30">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-3 rounded-sm bg-blue-500/70" /> Sales
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm bg-red-400/50" /> Returns
                </span>
              </div>
            </div>
            {invFetching ? (
              <div className="flex h-24 items-center justify-center text-white/20 text-sm">
                Loading…
              </div>
            ) : (
              <div className="flex items-end gap-3 overflow-x-auto pb-1">
                {dailyMovements.length === 0 ? (
                  <p className="text-white/20 text-xs">No data for this range.</p>
                ) : (
                  dailyMovements.map((d:any) => (
                    <DailyBar key={d.date} day={d} maxRevenue={maxRev} />
                  ))
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-[#1a1d23] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={15} className="text-violet-400" />
              <span className="text-sm font-semibold">Weekly Summary</span>
            </div>
            <div className="space-y-2">
              {invFetching ? (
                <div className="text-white/20 text-xs text-center py-4">Loading…</div>
              ) : weeklyMovements.length === 0 ? (
                <p className="text-white/20 text-xs">No data.</p>
              ) : (
                weeklyMovements.map((w:any) => (
                  <div
                    key={w.weekLabel}
                    className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2"
                  >
                    <div>
                      <p className="text-xs font-medium">{w.weekLabel}</p>
                      <p className="text-[10px] text-white/30">
                        ↓{w.sold} sold · ↑{w.returned} ret
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400">
                      {fmt(w.revenue)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── View tabs ── */}
        <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#1a1d23] p-1 w-fit">
          {[
            { id: "list", label: "Products", icon: Package },
            { id: "movements", label: "Movements", icon: RotateCcw },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setViewMode(id as "list" | "movements")}
              className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
                viewMode === id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-white/40 hover:text-white"
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Products table ── */}
        {viewMode === "list" && (
          <div className="rounded-xl border border-white/[0.06] bg-[#1a1d23] overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
              <div className="relative flex-1 max-w-xs">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products…"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/20 focus:border-blue-500/50 outline-none"
                />
              </div>
              <span className="text-xs text-white/20">{sorted.length} products</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-white/30 text-[11px] uppercase tracking-wider">
                    <th className="px-4 py-3 text-left font-medium">Product</th>
                    <th
                      className="px-3 py-3 text-right font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => setSort("stock")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Stock <SortIcon k="stock" />
                      </span>
                    </th>
                    <th
                      className="px-3 py-3 text-right font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => setSort("sold")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Sold <SortIcon k="sold" />
                      </span>
                    </th>
                    <th className="px-3 py-3 text-right font-medium">Returned</th>
                    <th className="px-3 py-3 text-right font-medium">Net Move</th>
                    <th
                      className="px-3 py-3 text-right font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => setSort("stockValue")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Stock Value <SortIcon k="stockValue" />
                      </span>
                    </th>
                    <th className="px-3 py-3 text-center font-medium">Status</th>
                    <th className="px-3 py-3 text-center font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {invFetching
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-white/[0.04]">
                          {Array.from({ length: 8 }).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div
                                className="h-3 rounded bg-white/[0.05] animate-pulse"
                                style={{ width: `${40 + (i * j * 7) % 40}%` }}
                              />
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
                              className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                                isExpanded ? "bg-white/[0.02]" : ""
                              }`}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {p.image ? (
                                    <img
                                      src={p.image}
                                      alt={p.name}
                                      className="h-8 w-8 rounded-md object-cover border border-white/10"
                                    />
                                  ) : (
                                    <div className="h-8 w-8 rounded-md bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/20">
                                      <Package size={14} />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-medium text-white/90">{p.name}</p>
                                    <p className="text-[10px] text-white/30 font-mono">
                                      {p.reference || p.barcode || `#${p.odooProductId}`}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right">
                                <span
                                  className={`font-mono font-semibold ${
                                    outOfStock
                                      ? "text-red-400"
                                      : lowStock
                                      ? "text-amber-400"
                                      : "text-white/70"
                                  }`}
                                >
                                  {p.stock}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right text-emerald-400 font-mono">
                                {p.sold}
                              </td>
                              <td className="px-3 py-3 text-right text-red-400/80 font-mono">
                                {p.returned}
                              </td>
                              <td className="px-3 py-3 text-right">
                                <span
                                  className={`font-mono ${
                                    p.netMovement < 0 ? "text-red-400" : "text-white/50"
                                  }`}
                                >
                                  {p.netMovement > 0 ? `+${p.netMovement}` : p.netMovement}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-white/60">
                                {fmt(p.stockValue)}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {outOfStock ? (
                                  <span className="rounded-full bg-red-500/15 text-red-400 px-2 py-0.5 text-[10px] font-medium border border-red-500/20">
                                    Out of stock
                                  </span>
                                ) : lowStock ? (
                                  <span className="rounded-full bg-amber-500/15 text-amber-400 px-2 py-0.5 text-[10px] font-medium border border-amber-500/20">
                                    Low stock
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-emerald-500/15 text-emerald-400 px-2 py-0.5 text-[10px] font-medium border border-emerald-500/20">
                                    In stock
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <button
                                  onClick={() => toggleExpand(p._id)}
                                  className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] px-2 py-1 text-[10px] text-white/40 hover:text-white transition-colors"
                                >
                                  <Eye size={11} /> {isExpanded ? "Hide" : "View"}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded row */}
                            {isExpanded && (
                              <tr key={`${p._id}-expand`} className="bg-[#131619]">
                                <td colSpan={8} className="px-4 py-4">
                                  <p className="text-[11px] text-white/30 uppercase tracking-wider mb-3">
                                    Movement history — {p.name}
                                  </p>
                                  {productMovFetching ? (
                                    <p className="text-white/20 text-xs py-2">Loading…</p>
                                  ) : productMovements.length === 0 ? (
                                    <p className="text-white/20 text-xs py-2">
                                      No movements in this range.
                                    </p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {productMovements.map((m) => (
                                        <div
                                          key={m._id}
                                          className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2"
                                        >
                                          <div className="flex items-center gap-3">
                                            <span
                                              className={`h-5 w-5 rounded flex items-center justify-center ${
                                                m.type === "sale"
                                                  ? "bg-emerald-500/15 text-emerald-400"
                                                  : "bg-red-500/15 text-red-400"
                                              }`}
                                            >
                                              {m.type === "sale" ? (
                                                <ArrowDownRight size={11} />
                                              ) : (
                                                <RotateCcw size={11} />
                                              )}
                                            </span>
                                            <div>
                                              <p className="text-xs font-medium capitalize">
                                                {m.type} · {m.receiptNumber}
                                              </p>
                                              <p className="text-[10px] text-white/30">
                                                {m.cashier}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <p
                                              className={`text-xs font-mono font-semibold ${
                                                m.type === "sale"
                                                  ? "text-emerald-400"
                                                  : "text-red-400"
                                              }`}
                                            >
                                              {m.type === "sale" ? `−${m.qty}` : `+${m.qty}`}
                                            </p>
                                            <p className="text-[10px] text-white/30">
                                              {format(parseISO(m.date), "MMM d, h:mm a")}
                                            </p>
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

        {/* ── Movements feed ── */}
        {viewMode === "movements" && (
          <div className="rounded-xl border border-white/[0.06] bg-[#1a1d23] overflow-hidden">
            <div className="border-b border-white/[0.06] px-4 py-3 flex items-center gap-2">
              <RotateCcw size={14} className="text-white/40" />
              <span className="text-sm font-semibold">All Stock Movements</span>
              <span className="ml-auto text-xs text-white/20">
                {recentMovements.length} records
              </span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {movFetching ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3">
                    <div className="h-8 w-8 rounded-lg bg-white/[0.05] animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 rounded bg-white/[0.05] animate-pulse w-40" />
                      <div className="h-2.5 rounded bg-white/[0.03] animate-pulse w-24" />
                    </div>
                    <div className="h-3 rounded bg-white/[0.05] animate-pulse w-16" />
                  </div>
                ))
              ) : recentMovements.length === 0 ? (
                <p className="text-center text-white/20 text-sm py-10">
                  No movements found for this range.
                </p>
              ) : (
                recentMovements.map((m:any) => (
                  <div
                    key={m._id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.015] transition-colors"
                  >
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        m.type === "sale"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/15 text-red-400 border border-red-500/20"
                      }`}
                    >
                      {m.type === "sale" ? (
                        <TrendingDown size={14} />
                      ) : (
                        <RotateCcw size={14} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white/90 truncate">
                        {m.productName}
                      </p>
                      <p className="text-[10px] text-white/30">
                        {m.cashier} · {m.receiptNumber}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`text-xs font-mono font-semibold ${
                          m.type === "sale" ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {m.type === "sale" ? `−${m.qty}` : `+${m.qty}`}
                      </p>
                      <p className="text-[10px] text-white/30">
                        {format(parseISO(m.date), "MMM d, HH:mm")}
                      </p>
                    </div>
                    <div className="text-right shrink-0 w-20">
                      <p className="text-xs font-mono text-white/50">
                        {fmt(m.price * m.qty)}
                      </p>
                      <p className="text-[10px] text-white/20 capitalize">{m.type}</p>
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