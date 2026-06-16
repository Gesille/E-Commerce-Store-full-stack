"use client";

import { useGetInventoryReportQuery, useLazyExportInventoryQuery } from "@/redux/inventory/inventoryApi";
import { useState, useMemo } from "react";


type SortKey = "name" | "qty_available" | "virtual_available" | "list_price" | "standard_price";
type SortDir = "asc" | "desc";
type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";

const getLowStockThreshold = (qty: number) => {
  return Math.ceil(qty * 0.5); 
};

function StockBadge({ qty }: { qty: number }) {
  const lowThreshold = getLowStockThreshold(qty);

  if (qty <= 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
        Out of stock
      </span>
    );
  }

  if (qty <= lowThreshold) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
        Low stock
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
        In stock
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 inline-block transition-opacity ${active ? "opacity-100" : "opacity-30"}`}>
      {active && dir === "desc" ? "↓" : "↑"}
    </span>
  );
}

export default function InventoryPage() {
  const { data: inventory = [], isLoading, isError, refetch } = useGetInventoryReportQuery();
  const [triggerExport, { isFetching: isExporting }] = useLazyExportInventoryQuery();

  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Stats
  const stats = useMemo(() => {
    const total = inventory.length;
   const inStock = inventory.filter((p) => {
  const threshold = getLowStockThreshold(p.qty_available);
  return p.qty_available > threshold;
}).length;

const lowStock = inventory.filter((p) => {
  const threshold = getLowStockThreshold(p.qty_available);
  return (
    p.qty_available > 0 &&
    p.qty_available <= threshold
  );
}).length;
   
    const outOfStock = inventory.filter((p) => p.qty_available <= 0).length;
    const totalValue = inventory.reduce((acc, p) => acc + p.qty_available * p.standard_price, 0);
    return { total, inStock, lowStock, outOfStock, totalValue };
  }, [inventory]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...inventory];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.default_code && String(p.default_code).toLowerCase().includes(q))
      );
    }
if (stockFilter === "in_stock") {
  result = result.filter((p) => {
    const threshold = getLowStockThreshold(
      p.qty_available
    );
    return p.qty_available > threshold;
  });
}

if (stockFilter === "low_stock") {
  result = result.filter((p) => {
    const threshold = getLowStockThreshold(
      p.qty_available
    );

    return (
      p.qty_available > 0 &&
      p.qty_available <= threshold
    );
  });
}
    if (stockFilter === "out_of_stock") result = result.filter((p) => p.qty_available <= 0);

    result.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av ?? "").toLowerCase();
      const bs = String(bv ?? "").toLowerCase();
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });

    return result;
  }, [inventory, search, stockFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  async function handleExport(format: "pdf" | "excel") {
    const result = await triggerExport(format);
    if (result.data) {
      const url = URL.createObjectURL(result.data);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().split("T")[0];
      a.download = `Inventory_Report_${date}.${format === "pdf" ? "pdf" : "xlsx"}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  const thClass =
    "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 whitespace-nowrap";
  const tdClass = "px-4 py-3 text-sm text-gray-700";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1">
              Operations
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">Inventory Report</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={() => handleExport("excel")}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Excel
            </button>
            <button
              onClick={() => handleExport("pdf")}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total products", value: stats.total, color: "text-gray-900" },
            { label: "In stock", value: stats.inStock, color: "text-emerald-600" },
            { label: "Low stock", value: stats.lowStock, color: "text-amber-600" },
            { label: "Out of stock", value: stats.outOfStock, color: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-semibold ${s.color}`}>{isLoading ? "—" : s.value}</p>
            </div>
          ))}
        </div>

        {/* Stock value card */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">Total stock value (cost price)</p>
            <p className="text-2xl font-semibold text-gray-900">
              {isLoading ? "—" : `$${stats.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "in_stock", "low_stock", "out_of_stock"] as StockFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => { setStockFilter(f); setPage(1); }}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  stockFilter === f
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {f === "all" ? "All" : f === "in_stock" ? "In stock" : f === "low_stock" ? "Low stock" : "Out of stock"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <svg className="w-8 h-8 animate-spin mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p className="text-sm">Loading inventory...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-400">
              <svg className="w-8 h-8 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-red-600">Failed to load inventory</p>
              <button onClick={() => refetch()} className="mt-2 text-sm text-blue-500 hover:underline">Try again</button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className={thClass} onClick={() => handleSort("name")}>
                        Product name <SortIcon active={sortKey === "name"} dir={sortDir} />
                      </th>
                      <th className={thClass}>SKU</th>
                      <th className={thClass} onClick={() => handleSort("qty_available")}>
                        On hand <SortIcon active={sortKey === "qty_available"} dir={sortDir} />
                      </th>
                      <th className={thClass} onClick={() => handleSort("virtual_available")}>
                        Forecasted <SortIcon active={sortKey === "virtual_available"} dir={sortDir} />
                      </th>
                      <th className={thClass} onClick={() => handleSort("list_price")}>
                        Sale price <SortIcon active={sortKey === "list_price"} dir={sortDir} />
                      </th>
                      <th className={thClass} onClick={() => handleSort("standard_price")}>
                        Cost <SortIcon active={sortKey === "standard_price"} dir={sortDir} />
                      </th>
                      <th className={thClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                          No products match your filters.
                        </td>
                      </tr>
                    ) : (
                      paginated.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                          <td className={`${tdClass} font-medium text-gray-900 max-w-xs truncate`}>
                            {product.name}
                          </td>
                          <td className={`${tdClass} font-mono text-xs text-gray-500`}>
                            {product.default_code || <span className="text-gray-300">—</span>}
                          </td>
                          <td className={tdClass}>
                           <span
  className={
    product.qty_available <= 0
      ? "text-red-600 font-medium"
      : product.qty_available <=
        getLowStockThreshold(product.qty_available)
      ? "text-amber-600 font-medium"
      : "text-gray-700"
  }
>
                              {product.qty_available.toLocaleString()}
                            </span>
                          </td>
                          <td className={tdClass}>
                            <span className={product.virtual_available < 0 ? "text-red-500" : "text-gray-700"}>
                              {product.virtual_available.toLocaleString()}
                            </span>
                          </td>
                          <td className={tdClass}>
                            ${Number(product.list_price).toFixed(2)}
                          </td>
                          <td className={tdClass}>
                            ${Number(product.standard_price).toFixed(2)}
                          </td>
                          <td className={tdClass}>
                            <StockBadge qty={product.qty_available} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} products
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                      const pageNum = start + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-3 py-1.5 text-xs border rounded-lg transition-colors ${
                            page === pageNum
                              ? "bg-gray-900 text-white border-gray-900"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}