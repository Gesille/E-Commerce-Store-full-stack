"use client";

import { InventoryRange, Movement, ProductRow, useGetInventoryMovementsQuery, useGetInventoryQuery, useGetInventorySummaryQuery, useLazyGetProductMovementsQuery } from "@/redux/posinventory/posinverntoryApi";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";


// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "products" | "movements" | "chart";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtAxisDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="kpi-card">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  );
}

function RangeTabs({
  value,
  onChange,
}: {
  value: InventoryRange;
  onChange: (r: InventoryRange) => void;
}) {
  const opts: InventoryRange[] = ["day", "week", "month"];
  return (
    <div className="range-tabs">
      {opts.map((r) => (
        <button
          key={r}
          className={`range-tab${value === r ? " active" : ""}`}
          onClick={() => onChange(r)}
        >
          {r.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function MovementRow({ m }: { m: Movement }) {
  const isSale = m.type === "sale";
  return (
    <tr className="mvt-row">
      <td>
        <span className={`badge ${isSale ? "badge-sale" : "badge-return"}`}>
          {isSale ? "SALE" : "RETURN"}
        </span>
      </td>
      <td className="mvt-product">{m.productName}</td>
      <td className={`mvt-qty ${isSale ? "neg" : "pos"}`}>
        {isSale ? "-" : "+"}
        {m.qty}
      </td>
      <td className="mono">${fmt(m.price)}</td>
      <td className="dim">{m.cashier}</td>
      <td className="mono dim">{m.receiptNumber}</td>
      <td className="dim">{fmtDate(m.date)}</td>
    </tr>
  );
}

function ProductDrawer({
  product,
  range,
  onClose,
}: {
  product: ProductRow;
  range: InventoryRange;
  onClose: () => void;
}) {
  const [fetchMovements, { data, isFetching }] = useLazyGetProductMovementsQuery();

  useMemo(() => {
    fetchMovements({ productId: product._id, range });
  }, [product._id, range]);

  return (
    <div className="drawer">
      <div className="drawer-header">
        <div className="drawer-title">
          {product.image && (
            <img src={product.image} alt={product.name} className="drawer-img" />
          )}
          <div>
            <div className="drawer-name">{product.name}</div>
            <div className="drawer-ref dim">REF: {product.reference}</div>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="drawer-stats">
        <div className="dstat">
          <span className="dstat-label">STOCK</span>
          <span className="dstat-val">{product.stock}</span>
        </div>
        <div className="dstat">
          <span className="dstat-label">SOLD</span>
          <span className="dstat-val neg">{product.sold}</span>
        </div>
        <div className="dstat">
          <span className="dstat-label">RETURNED</span>
          <span className="dstat-val pos">{product.returned}</span>
        </div>
        <div className="dstat">
          <span className="dstat-label">STOCK VALUE</span>
          <span className="dstat-val">${fmt(product.stockValue)}</span>
        </div>
      </div>

      <div className="drawer-section-title">MOVEMENT HISTORY</div>
      {isFetching ? (
        <div className="loading-pulse">Loading…</div>
      ) : !data?.movements.length ? (
        <div className="empty">No movements in range</div>
      ) : (
        <div className="mvt-scroll">
          <table className="mvt-table">
            <thead>
              <tr>
                <th>TYPE</th>
                <th>QTY</th>
                <th>PRICE</th>
                <th>CASHIER</th>
                <th>RECEIPT</th>
                <th>DATE</th>
              </tr>
            </thead>
            <tbody>
              {data.movements.map((m:any) => (
                <tr key={m._id} className="mvt-row">
                  <td>
                    <span className={`badge ${m.type === "sale" ? "badge-sale" : "badge-return"}`}>
                      {m.type === "sale" ? "SALE" : "RTN"}
                    </span>
                  </td>
                  <td className={`mono ${m.type === "sale" ? "neg" : "pos"}`}>
                    {m.type === "sale" ? "-" : "+"}
                    {m.qty}
                  </td>
                  <td className="mono">${fmt(m.price)}</td>
                  <td className="dim">{m.cashier}</td>
                  <td className="mono dim">{m.receiptNumber}</td>
                  <td className="dim">{fmtDate(m.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [range, setRange] = useState<InventoryRange>("week");
  const [tab, setTab] = useState<Tab>("products");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [sortKey, setSortKey] = useState<keyof ProductRow>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const { data: inv, isFetching: invFetching } = useGetInventoryQuery({ range });
  const { data: summary } = useGetInventorySummaryQuery();
  const { data: movData, isFetching: movFetching } = useGetInventoryMovementsQuery(
    { range, limit: 100 },
    { skip: tab !== "movements" }
  );

  // Filter + sort products
  const products = useMemo(() => {
    let rows = inv?.products ?? [];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (p:any) =>
          p.name.toLowerCase().includes(q) ||
          p.reference?.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q)
      );
    }
    if (lowStockOnly) rows = rows.filter((p:any) => p.stock > 0 && p.stock <= 5);
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey] as any;
      const bv = b[sortKey] as any;
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });
    return rows;
  }, [inv?.products, search, sortKey, sortAsc, lowStockOnly]);

  function toggleSort(key: keyof ProductRow) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  function SortTh({
    col,
    label,
  }: {
    col: keyof ProductRow;
    label: string;
  }) {
    const active = sortKey === col;
    return (
      <th
        className={`sortable${active ? " sorted" : ""}`}
        onClick={() => toggleSort(col)}
      >
        {label}
        <span className="sort-icon">{active ? (sortAsc ? " ↑" : " ↓") : " ⇅"}</span>
      </th>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Syne:wght@400;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0d0f12;
          --bg2: #141720;
          --bg3: #1c2030;
          --border: #252a3a;
          --border2: #2e3450;
          --text: #e2e8f4;
          --dim: #6b7494;
          --accent: #4fffb0;
          --accent2: #ff6b6b;
          --accent3: #ffd166;
          --blue: #5b8cff;
          --sale: #ff6b6b;
          --return: #4fffb0;
          --font-display: 'Syne', sans-serif;
          --font-mono: 'IBM Plex Mono', monospace;
        }

        body { background: var(--bg); color: var(--text); font-family: var(--font-mono); }

        .inv-page {
          min-height: 100vh;
          padding: 0 0 60px;
          background: var(--bg);
        }

        /* ─── Header ─────────────────────────── */
        .inv-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 32px 20px;
          border-bottom: 1px solid var(--border);
          gap: 16px;
          flex-wrap: wrap;
        }

        .inv-title {
          font-family: var(--font-display);
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .inv-title::before {
          content: '';
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 10px var(--accent);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .range-tabs {
          display: flex;
          gap: 2px;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 3px;
        }

        .range-tab {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1px;
          padding: 5px 14px;
          border: none;
          background: transparent;
          color: var(--dim);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .range-tab:hover { color: var(--text); }
        .range-tab.active {
          background: var(--border2);
          color: var(--accent);
        }

        /* ─── KPI Strip ──────────────────────── */
        .kpi-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 1px;
          background: var(--border);
          border-bottom: 1px solid var(--border);
        }

        .kpi-card {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 20px 24px;
          background: var(--bg);
          transition: background 0.15s;
        }
        .kpi-card:hover { background: var(--bg2); }

        .kpi-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1.5px;
          color: var(--dim);
          text-transform: uppercase;
        }

        .kpi-value {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 800;
          color: var(--text);
          line-height: 1;
          letter-spacing: -1px;
        }

        .kpi-sub {
          font-size: 11px;
          color: var(--dim);
          margin-top: 2px;
        }

        /* ─── Tabs ───────────────────────────── */
        .tab-row {
          display: flex;
          gap: 0;
          padding: 0 32px;
          border-bottom: 1px solid var(--border);
          margin-top: 0;
        }

        .tab-btn {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1px;
          padding: 14px 20px;
          border: none;
          background: transparent;
          color: var(--dim);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.15s;
          text-transform: uppercase;
        }
        .tab-btn:hover { color: var(--text); }
        .tab-btn.active {
          color: var(--accent);
          border-bottom-color: var(--accent);
        }

        /* ─── Toolbar ────────────────────────── */
        .toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 32px;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 200px;
          max-width: 340px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 8px 12px;
        }

        .search-box input {
          background: transparent;
          border: none;
          outline: none;
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 13px;
          width: 100%;
        }

        .search-box input::placeholder { color: var(--dim); }

        .search-icon { color: var(--dim); font-size: 14px; }

        .filter-btn {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
          padding: 8px 14px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--dim);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .filter-btn:hover { border-color: var(--border2); color: var(--text); }
        .filter-btn.active {
          border-color: var(--accent3);
          color: var(--accent3);
          background: rgba(255, 209, 102, 0.07);
        }

        .result-count {
          font-size: 11px;
          color: var(--dim);
          margin-left: auto;
        }

        /* ─── Products Table ─────────────────── */
        .table-wrap {
          overflow-x: auto;
          padding: 0 32px 32px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        thead tr {
          border-bottom: 1px solid var(--border2);
        }

        th {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1.2px;
          color: var(--dim);
          text-transform: uppercase;
          padding: 10px 12px;
          text-align: left;
          white-space: nowrap;
        }

        th.sortable { cursor: pointer; user-select: none; }
        th.sortable:hover { color: var(--text); }
        th.sorted { color: var(--accent); }

        .sort-icon { font-size: 10px; }

        tbody tr {
          border-bottom: 1px solid var(--border);
          transition: background 0.1s;
          cursor: pointer;
        }
        tbody tr:hover { background: var(--bg2); }
        tbody tr.row-selected { background: rgba(79, 255, 176, 0.04); border-left: 2px solid var(--accent); }

        td {
          padding: 12px 12px;
          vertical-align: middle;
        }

        .prod-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .prod-thumb {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          object-fit: cover;
          background: var(--bg3);
          border: 1px solid var(--border);
          flex-shrink: 0;
        }

        .prod-thumb-placeholder {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          background: var(--bg3);
          border: 1px solid var(--border);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: var(--dim);
        }

        .prod-name {
          font-weight: 500;
          color: var(--text);
        }

        .prod-ref {
          font-size: 11px;
          color: var(--dim);
          margin-top: 1px;
        }

        .mono { font-family: var(--font-mono); }
        .dim { color: var(--dim); }
        .neg { color: var(--sale); }
        .pos { color: var(--return); }

        .stock-chip {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }
        .stock-ok { background: rgba(79,255,176,0.1); color: var(--accent); }
        .stock-low { background: rgba(255,209,102,0.1); color: var(--accent3); }
        .stock-zero { background: rgba(255,107,107,0.1); color: var(--sale); }

        /* ─── Chart Section ──────────────────── */
        .chart-section {
          padding: 0 32px 32px;
        }

        .chart-block {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 20px;
        }

        .chart-title {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: var(--text);
          margin-bottom: 20px;
          text-transform: uppercase;
        }

        .weekly-table {
          width: 100%;
        }

        .weekly-table th {
          background: var(--bg3);
        }

        .weekly-table td {
          border-bottom: 1px solid var(--border);
        }

        /* ─── Movements Table ────────────────── */
        .mvt-scroll {
          overflow-x: auto;
        }

        .mvt-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .mvt-table thead tr {
          border-bottom: 1px solid var(--border2);
        }

        .mvt-table tbody tr {
          border-bottom: 1px solid var(--border);
        }

        .mvt-table th {
          font-size: 10px;
          letter-spacing: 1.2px;
          color: var(--dim);
          text-transform: uppercase;
          padding: 10px 12px;
          text-align: left;
        }

        .mvt-table td {
          padding: 10px 12px;
          vertical-align: middle;
        }

        .mvt-product { max-width: 220px; font-weight: 500; }
        .mvt-qty { font-weight: 600; font-family: var(--font-mono); font-size: 14px; }

        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.8px;
        }
        .badge-sale { background: rgba(255,107,107,0.15); color: var(--sale); }
        .badge-return { background: rgba(79,255,176,0.12); color: var(--return); }

        /* ─── Drawer ─────────────────────────── */
        .drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(2px);
          z-index: 100;
          animation: fadeIn 0.15s ease;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

        .drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: min(520px, 95vw);
          background: var(--bg);
          border-left: 1px solid var(--border2);
          overflow-y: auto;
          z-index: 101;
          animation: slideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .drawer-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 24px;
          border-bottom: 1px solid var(--border);
          gap: 16px;
        }

        .drawer-title {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .drawer-img {
          width: 56px;
          height: 56px;
          border-radius: 6px;
          object-fit: cover;
          border: 1px solid var(--border2);
        }

        .drawer-name {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 700;
          color: var(--text);
          line-height: 1.2;
        }

        .drawer-ref {
          font-size: 11px;
          letter-spacing: 1px;
          margin-top: 4px;
        }

        .close-btn {
          background: var(--bg3);
          border: 1px solid var(--border);
          color: var(--dim);
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .close-btn:hover { color: var(--text); border-color: var(--border2); }

        .drawer-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: var(--border);
          border-bottom: 1px solid var(--border);
        }

        .dstat {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 16px;
          background: var(--bg);
        }

        .dstat-label {
          font-size: 9px;
          letter-spacing: 1.2px;
          color: var(--dim);
          text-transform: uppercase;
        }

        .dstat-val {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 800;
          color: var(--text);
        }

        .drawer-section-title {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1.5px;
          color: var(--dim);
          padding: 16px 24px 8px;
          text-transform: uppercase;
        }

        /* ─── Loading & Empty ────────────────── */
        .loading-pulse {
          text-align: center;
          padding: 48px;
          color: var(--dim);
          font-size: 13px;
          animation: blink 1.2s infinite;
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

        .empty {
          text-align: center;
          padding: 48px;
          color: var(--dim);
          font-size: 13px;
        }

        /* ─── Custom Tooltip ─────────────────── */
        .custom-tooltip {
          background: var(--bg2);
          border: 1px solid var(--border2);
          border-radius: 6px;
          padding: 10px 14px;
          font-size: 12px;
        }
        .custom-tooltip .tt-label {
          color: var(--dim);
          font-size: 11px;
          margin-bottom: 6px;
        }
        .custom-tooltip .tt-row {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          color: var(--text);
        }
        .custom-tooltip .tt-row span:first-child { color: var(--dim); }
      `}</style>

      <div className="inv-page">
        {/* ─── Header ─────────────────────────────────────────────── */}
        <div className="inv-header">
          <div className="inv-title">Inventory</div>
          <RangeTabs value={range} onChange={setRange} />
        </div>

        {/* ─── KPI Strip ──────────────────────────────────────────── */}
        <div className="kpi-strip">
          <KpiCard
            label="Total Products"
            value={String(summary?.totalProducts ?? "—")}
          />
          <KpiCard
            label="Stock Value"
            value={summary ? `$${fmt(summary.totalStockValue)}` : "—"}
            accent="var(--accent)"
          />
          <KpiCard
            label="Low Stock"
            value={String(summary?.lowStockCount ?? "—")}
            accent={summary && summary.lowStockCount > 0 ? "var(--accent3)" : undefined}
          />
          <KpiCard
            label="Sold Today"
            value={String(summary?.soldToday ?? "—")}
            sub="units"
          />
          <KpiCard
            label="Returned Today"
            value={String(summary?.returnedToday ?? "—")}
            sub="units"
          />
          <KpiCard
            label="Revenue Today"
            value={summary ? `$${fmt(summary.revenueToday)}` : "—"}
            accent="var(--blue)"
          />
        </div>

        {/* ─── Tab Nav ────────────────────────────────────────────── */}
        <div className="tab-row">
          {(["products", "movements", "chart"] as Tab[]).map((t) => (
            <button
              key={t}
              className={`tab-btn${tab === t ? " active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "products" ? "Products" : t === "movements" ? "Movements" : "Analytics"}
            </button>
          ))}
        </div>

        {/* ─── Products Tab ───────────────────────────────────────── */}
        {tab === "products" && (
          <>
            <div className="toolbar">
              <div className="search-box">
                <span className="search-icon">⌕</span>
                <input
                  placeholder="Search name, ref, barcode…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                className={`filter-btn${lowStockOnly ? " active" : ""}`}
                onClick={() => setLowStockOnly((v) => !v)}
              >
                ⚠ Low Stock
              </button>
              <span className="result-count">{products.length} products</span>
            </div>

            <div className="table-wrap">
              {invFetching ? (
                <div className="loading-pulse">Fetching inventory…</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <SortTh col="name" label="Product" />
                      <SortTh col="stock" label="Stock" />
                      <SortTh col="price" label="Price" />
                      <SortTh col="sold" label="Sold" />
                      <SortTh col="returned" label="Returned" />
                      <SortTh col="netMovement" label="Net Move" />
                      <SortTh col="stockValue" label="Value" />
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p:any) => {
                      const stockClass =
                        p.stock === 0
                          ? "stock-zero"
                          : p.stock <= 5
                          ? "stock-low"
                          : "stock-ok";
                      const isSelected = selectedProduct?._id === p._id;
                      return (
                        <tr
                          key={p._id}
                          className={isSelected ? "row-selected" : ""}
                          onClick={() =>
                            setSelectedProduct(isSelected ? null : p)
                          }
                        >
                          <td>
                            <div className="prod-cell">
                              {p.image ? (
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="prod-thumb"
                                />
                              ) : (
                                <div className="prod-thumb-placeholder">□</div>
                              )}
                              <div>
                                <div className="prod-name">{p.name}</div>
                                <div className="prod-ref">{p.reference}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`stock-chip ${stockClass}`}>
                              {p.stock}
                            </span>
                          </td>
                          <td className="mono">${fmt(p.price)}</td>
                          <td className="mono neg">{p.sold > 0 ? `-${p.sold}` : "0"}</td>
                          <td className="mono pos">{p.returned > 0 ? `+${p.returned}` : "0"}</td>
                          <td className={`mono ${p.netMovement < 0 ? "neg" : p.netMovement > 0 ? "pos" : "dim"}`}>
                            {p.netMovement > 0 ? `+${p.netMovement}` : p.netMovement}
                          </td>
                          <td className="mono">${fmt(p.stockValue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ─── Movements Tab ──────────────────────────────────────── */}
        {tab === "movements" && (
          <div className="table-wrap" style={{ paddingTop: 20 }}>
            {movFetching ? (
              <div className="loading-pulse">Loading movements…</div>
            ) : !movData?.movements.length ? (
              <div className="empty">No movements in this range</div>
            ) : (
              <table className="mvt-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Cashier</th>
                    <th>Receipt</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {movData.movements.map((m:any) => (
                    <MovementRow key={m._id} m={m} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ─── Chart Tab ──────────────────────────────────────────── */}
        {tab === "chart" && (
          <div className="chart-section" style={{ paddingTop: 24 }}>
            {invFetching ? (
              <div className="loading-pulse">Loading chart data…</div>
            ) : (
              <>
                {/* Daily chart */}
                <div className="chart-block">
                  <div className="chart-title">Daily Movement — {range}</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={(inv?.daily ?? []).map((d:any) => ({
                        ...d,
                        label: fmtAxisDate(d.date),
                      }))}
                      barGap={2}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#6b7494", fontSize: 11, fontFamily: "IBM Plex Mono" }}
                        axisLine={{ stroke: "#252a3a" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#6b7494", fontSize: 11, fontFamily: "IBM Plex Mono" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="custom-tooltip">
                              <div className="tt-label">{label}</div>
                              {payload.map((p:any) => (
                                <div key={p.dataKey} className="tt-row">
                                  <span>{p.name}</span>
                                  <span style={{ color: p.color as string }}>
                                    {p.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, fontFamily: "IBM Plex Mono", paddingTop: 12 }}
                      />
                      <Bar dataKey="sold" name="Sold" fill="#ff6b6b" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="returned" name="Returned" fill="#4fffb0" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Revenue chart */}
                <div className="chart-block">
                  <div className="chart-title">Daily Revenue — {range}</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={(inv?.daily ?? []).map((d:any) => ({
                        ...d,
                        label: fmtAxisDate(d.date),
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#6b7494", fontSize: 11, fontFamily: "IBM Plex Mono" }}
                        axisLine={{ stroke: "#252a3a" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#6b7494", fontSize: 11, fontFamily: "IBM Plex Mono" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="custom-tooltip">
                              <div className="tt-label">{label}</div>
                              <div className="tt-row">
                                <span>Revenue</span>
                                <span style={{ color: "#5b8cff" }}>
                                  ${fmt(payload[0]?.value as number)}
                                </span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="revenue" name="Revenue" fill="#5b8cff" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Weekly summary */}
                <div className="chart-block">
                  <div className="chart-title">4-Week Summary</div>
                  <table className="weekly-table">
                    <thead>
                      <tr>
                        <th>Week</th>
                        <th>Sold</th>
                        <th>Returned</th>
                        <th>Net</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(inv?.weekly ?? []).map((w:any) => (
                        <tr key={w.weekLabel}>
                          <td className="dim">{w.weekLabel}</td>
                          <td className="mono neg">{w.sold}</td>
                          <td className="mono pos">{w.returned}</td>
                          <td className={`mono ${w.sold - w.returned > 0 ? "neg" : "pos"}`}>
                            {w.sold - w.returned}
                          </td>
                          <td className="mono">${fmt(w.revenue)}</td>
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

      {/* ─── Product Drawer ───────────────────────────────────────── */}
      {selectedProduct && (
        <>
          <div
            className="drawer-backdrop"
            onClick={() => setSelectedProduct(null)}
          />
          <ProductDrawer
            product={selectedProduct}
            range={range}
            onClose={() => setSelectedProduct(null)}
          />
        </>
      )}
    </>
  );
}