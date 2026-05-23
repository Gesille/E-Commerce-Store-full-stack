"use client";

import { ProductRow, InventoryRange, useLazyGetProductMovementsQuery, useGetInventoryQuery, useGetInventorySummaryQuery, useGetInventoryMovementsQuery } from "@/redux/posinventory/posinverntoryApi";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";


type Tab = "products" | "movements" | "chart";

function fmt(n: number, d = 2) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtAxis(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ProductDrawer({ product, range, onClose }: { product: ProductRow; range: InventoryRange; onClose: () => void }) {
  const [fetch, { data, isFetching }] = useLazyGetProductMovementsQuery();
  useMemo(() => { fetch({ productId: product._id, range }); }, [product._id, range]);

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: "min(480px,95vw)",
      background: "#fff", borderLeft: "1px solid #e5e7eb", zIndex: 101,
      overflowY: "auto", display: "flex", flexDirection: "column",
    }}>
      {/* Drawer header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {product.image
            ? <img src={product.image} alt={product.name} style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", border: "1px solid #e5e7eb" }} />
            : <div style={{ width: 52, height: 52, borderRadius: 10, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#9ca3af" }}>📦</div>
          }
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#111827", lineHeight: 1.3 }}>{product.name}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3, letterSpacing: "0.5px" }}>REF {product.reference}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "transparent", cursor: "pointer", fontSize: 16, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderBottom: "1px solid #f3f4f6" }}>
        {[
          { label: "Stock", value: String(product.stock), color: "#111827" },
          { label: "Sold", value: String(product.sold), color: "#ef4444" },
          { label: "Returned", value: String(product.returned), color: "#10b981" },
          { label: "Value", value: `$${fmt(product.stockValue)}`, color: "#3b82f6" },
        ].map(s => (
          <div key={s.label} style={{ padding: "16px 12px", borderRight: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Movement history */}
      <div style={{ padding: "16px 24px 8px", fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "1px", textTransform: "uppercase" }}>Movement history</div>
      {isFetching
        ? <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Loading…</div>
        : !data?.movements.length
        ? <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No movements in this range</div>
        : <div style={{ padding: "0 24px 24px" }}>
            {data.movements.map((m: any) => (
              <div key={m._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f9fafb" }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, letterSpacing: "0.5px",
                  background: m.type === "sale" ? "#fef2f2" : "#f0fdf4",
                  color: m.type === "sale" ? "#ef4444" : "#10b981",
                }}>
                  {m.type === "sale" ? "SALE" : "RTN"}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: m.type === "sale" ? "#ef4444" : "#10b981", minWidth: 36 }}>
                  {m.type === "sale" ? "-" : "+"}{m.qty}
                </span>
                <span style={{ fontSize: 13, color: "#6b7280", flex: 1 }}>{m.cashier}</span>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{fmtDate(m.date)}</span>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

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

  const products = useMemo(() => {
    let rows = inv?.products ?? [];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((p: any) => p.name.toLowerCase().includes(q) || p.reference?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q));
    }
    if (lowOnly) rows = rows.filter((p: any) => p.stock > 0 && p.stock <= 5);
    return [...rows].sort((a, b) => {
      const av = a[sortKey] as any, bv = b[sortKey] as any;
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });
  }, [inv?.products, search, sortKey, sortAsc, lowOnly]);

  function toggleSort(k: keyof ProductRow) {
    if (sortKey === k) setSortAsc(v => !v); else { setSortKey(k); setSortAsc(true); }
  }

  const Th = ({ col, label }: { col: keyof ProductRow; label: string }) => (
    <th
      onClick={() => toggleSort(col)}
      style={{
        padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600,
        color: sortKey === col ? "#3b82f6" : "#9ca3af",
        letterSpacing: "0.7px", textTransform: "uppercase", cursor: "pointer",
        whiteSpace: "nowrap", userSelect: "none", borderBottom: "1px solid #f3f4f6",
        background: "#fafafa",
      }}
    >
      {label} {sortKey === col ? (sortAsc ? "↑" : "↓") : ""}
    </th>
  );

  const kpis = [
    { label: "Products", value: String(summary?.totalProducts ?? "—"), icon: "🗃️" },
    { label: "Stock value", value: summary ? `$${fmt(summary.totalStockValue)}` : "—", icon: "💰", highlight: true },
    { label: "Low stock", value: String(summary?.lowStockCount ?? "—"), icon: "⚠️", warn: (summary?.lowStockCount ?? 0) > 0 },
    { label: "Sold today", value: String(summary?.soldToday ?? "—"), icon: "📤" },
    { label: "Returned today", value: String(summary?.returnedToday ?? "—"), icon: "📥" },
    { label: "Revenue today", value: summary ? `$${fmt(summary.revenueToday)}` : "—", icon: "📈", blue: true },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f9fafb; }
        .inv-page { min-height: 100vh; background: #f9fafb; padding-bottom: 60px; }

        .inv-topbar {
          background: #fff;
          border-bottom: 1px solid #f3f4f6;
          padding: 0 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 60px;
          position: sticky; top: 0; z-index: 50;
        }
        .inv-title { font-size: 18px; font-weight: 700; color: #111827; letter-spacing: -0.3px; }
        .inv-title span { color: #3b82f6; }

        .range-tabs { display: flex; gap: 2px; background: #f3f4f6; border-radius: 8px; padding: 3px; }
        .range-tab {
          font-size: 12px; font-weight: 600; padding: 5px 14px; border: none;
          background: transparent; color: #6b7280; border-radius: 6px; cursor: pointer;
          transition: all 0.15s; letter-spacing: 0.3px;
        }
        .range-tab:hover { color: #374151; }
        .range-tab.active { background: #fff; color: #111827; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1px;
          background: #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
        }
        .kpi-card {
          background: #fff;
          padding: 18px 22px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: background 0.15s;
        }
        .kpi-card:hover { background: #fafafa; }
        .kpi-icon { font-size: 20px; }
        .kpi-label { font-size: 11px; font-weight: 600; color: #9ca3af; letter-spacing: 0.5px; text-transform: uppercase; }
        .kpi-val { font-size: 22px; font-weight: 700; color: #111827; letter-spacing: -0.5px; line-height: 1; }
        .kpi-val.blue { color: #3b82f6; }
        .kpi-val.green { color: #10b981; }
        .kpi-val.warn { color: #f59e0b; }

        .content-area { padding: 0 28px; }

        .tab-bar {
          display: flex; gap: 0; border-bottom: 1px solid #f3f4f6;
          background: #fff; margin: 0 -28px; padding: 0 28px;
        }
        .tab-btn {
          font-size: 13px; font-weight: 600; padding: 14px 18px;
          border: none; background: transparent; color: #9ca3af; cursor: pointer;
          border-bottom: 2px solid transparent; margin-bottom: -1px;
          transition: all 0.15s;
        }
        .tab-btn:hover { color: #374151; }
        .tab-btn.active { color: #3b82f6; border-bottom-color: #3b82f6; }

        .toolbar {
          display: flex; align-items: center; gap: 10px;
          padding: 16px 0; flex-wrap: wrap;
        }
        .search-wrap {
          flex: 1; min-width: 200px; max-width: 320px;
          position: relative;
        }
        .search-wrap input {
          width: 100%; padding: 8px 12px 8px 36px;
          border: 1px solid #e5e7eb; border-radius: 8px;
          font-size: 13px; font-family: inherit; color: #374151;
          background: #fff; outline: none; transition: border 0.15s;
        }
        .search-wrap input:focus { border-color: #3b82f6; }
        .search-wrap input::placeholder { color: #d1d5db; }
        .search-icon-pos {
          position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
          font-size: 15px; color: #d1d5db; pointer-events: none;
        }

        .filter-chip {
          font-size: 12px; font-weight: 600; padding: 7px 13px;
          border: 1px solid #e5e7eb; border-radius: 8px;
          background: #fff; color: #6b7280; cursor: pointer; transition: all 0.15s;
          display: flex; align-items: center; gap: 5px;
        }
        .filter-chip:hover { border-color: #d1d5db; color: #374151; }
        .filter-chip.on { border-color: #fcd34d; background: #fffbeb; color: #d97706; }

        .count-pill { font-size: 12px; color: #9ca3af; margin-left: auto; }

        .tbl-wrap { overflow-x: auto; background: #fff; border-radius: 12px; border: 1px solid #f3f4f6; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 12px 14px; font-size: 13px; color: #374151; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        tbody tr { transition: background 0.1s; cursor: pointer; }
        tbody tr:hover { background: #f9fafb; }
        tbody tr.sel { background: #eff6ff; }

        .prod-cell { display: flex; align-items: center; gap: 10px; }
        .prod-img { width: 34px; height: 34px; border-radius: 8px; object-fit: cover; border: 1px solid #f3f4f6; flex-shrink: 0; }
        .prod-placeholder { width: 34px; height: 34px; border-radius: 8px; background: #f9fafb; border: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .prod-name { font-weight: 600; color: #111827; font-size: 13px; }
        .prod-ref { font-size: 11px; color: #9ca3af; margin-top: 1px; }

        .stock-badge { display: inline-block; padding: 3px 9px; border-radius: 6px; font-size: 12px; font-weight: 700; }
        .s-ok { background: #f0fdf4; color: #10b981; }
        .s-low { background: #fffbeb; color: #d97706; }
        .s-zero { background: #fef2f2; color: #ef4444; }

        .mono { font-variant-numeric: tabular-nums; }
        .red { color: #ef4444; font-weight: 600; }
        .green { color: #10b981; font-weight: 600; }
        .muted { color: #9ca3af; }

        .badge-sale { display: inline-block; padding: 3px 9px; border-radius: 6px; font-size: 10px; font-weight: 700; background: #fef2f2; color: #ef4444; letter-spacing: 0.5px; }
        .badge-rtn { display: inline-block; padding: 3px 9px; border-radius: 6px; font-size: 10px; font-weight: 700; background: #f0fdf4; color: #10b981; letter-spacing: 0.5px; }

        .chart-card { background: #fff; border: 1px solid #f3f4f6; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
        .chart-label { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 20px; }

        .weekly-tbl td { border-bottom: 1px solid #f9fafb; }
        .weekly-tbl tr:last-child td { border-bottom: none; }
        .weekly-tbl th { background: #fafafa; font-size: 10px; font-weight: 700; color: #9ca3af; letter-spacing: 0.8px; text-transform: uppercase; padding: 10px 14px; border-bottom: 1px solid #f3f4f6; }

        .loading { text-align: center; padding: 56px; color: #9ca3af; font-size: 13px; }
        .empty { text-align: center; padding: 56px; color: #9ca3af; font-size: 13px; }

        .backdrop {
          position: fixed; inset: 0;
          background: rgba(15,15,15,0.25);
          backdrop-filter: blur(1px);
          z-index: 100;
        }

        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .drawer-anim { animation: slideIn 0.2s cubic-bezier(0.16,1,0.3,1); }
      `}</style>

      <div className="inv-page">
        {/* Topbar */}
        <div className="inv-topbar">
          <div className="inv-title">Inventory <span>·</span> POS</div>
          <div className="range-tabs">
            {(["day","week","month"] as InventoryRange[]).map(r => (
              <button key={r} className={`range-tab${range===r?" active":""}`} onClick={() => setRange(r)}>
                {r.charAt(0).toUpperCase()+r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid">
          {kpis.map(k => (
            <div key={k.label} className="kpi-card">
              <div className="kpi-icon">{k.icon}</div>
              <div className="kpi-label">{k.label}</div>
              <div className={`kpi-val${k.highlight?" green":k.warn?" warn":k.blue?" blue":""}`}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="content-area">
          {/* Tabs */}
          <div className="tab-bar">
            {([["products","Products"],["movements","Movements"],["chart","Analytics"]] as [Tab,string][]).map(([t,l]) => (
              <button key={t} className={`tab-btn${tab===t?" active":""}`} onClick={() => setTab(t)}>{l}</button>
            ))}
          </div>

          {/* Products Tab */}
          {tab === "products" && (
            <>
              <div className="toolbar">
                <div className="search-wrap">
                  <span className="search-icon-pos">🔍</span>
                  <input placeholder="Search name, ref, barcode…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button className={`filter-chip${lowOnly?" on":""}`} onClick={() => setLowOnly(v => !v)}>
                  ⚠️ Low stock
                </button>
                <span className="count-pill">{products.length} products</span>
              </div>
              <div className="tbl-wrap">
                {invLoading
                  ? <div className="loading">Loading inventory…</div>
                  : <table>
                      <thead>
                        <tr>
                          <Th col="name" label="Product" />
                          <Th col="stock" label="Stock" />
                          <Th col="price" label="Price" />
                          <Th col="sold" label="Sold" />
                          <Th col="returned" label="Returned" />
                          <Th col="netMovement" label="Net" />
                          <Th col="stockValue" label="Value" />
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(p => {
                          const sc = p.stock === 0 ? "s-zero" : p.stock <= 5 ? "s-low" : "s-ok";
                          const isSel = selected?._id === p._id;
                          return (
                            <tr key={p._id} className={isSel?"sel":""} onClick={() => setSelected(isSel ? null : p)}>
                              <td>
                                <div className="prod-cell">
                                  {p.image
                                    ? <img src={p.image} alt={p.name} className="prod-img" />
                                    : <div className="prod-placeholder">📦</div>}
                                  <div>
                                    <div className="prod-name">{p.name}</div>
                                    <div className="prod-ref">{p.reference}</div>
                                  </div>
                                </div>
                              </td>
                              <td><span className={`stock-badge ${sc}`}>{p.stock}</span></td>
                              <td className="mono">${fmt(p.price)}</td>
                              <td className={`mono${p.sold>0?" red":""}`}>{p.sold>0?`-${p.sold}`:"0"}</td>
                              <td className={`mono${p.returned>0?" green":""}`}>{p.returned>0?`+${p.returned}`:"0"}</td>
                              <td className={`mono${p.netMovement<0?" red":p.netMovement>0?" green":" muted"}`}>
                                {p.netMovement>0?"+":""}{p.netMovement}
                              </td>
                              <td className="mono">${fmt(p.stockValue)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                }
              </div>
            </>
          )}

          {/* Movements Tab */}
          {tab === "movements" && (
            <div style={{ paddingTop: 16 }}>
              {movLoading
                ? <div className="loading">Loading movements…</div>
                : !movData?.movements.length
                ? <div className="empty">No movements in this range</div>
                : <div className="tbl-wrap">
                    <table>
                      <thead>
                        <tr>
                          {["Type","Product","Qty","Price","Cashier","Receipt","Date"].map(h => (
                            <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, color:"#9ca3af", letterSpacing:"0.7px", textTransform:"uppercase", background:"#fafafa", borderBottom:"1px solid #f3f4f6" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {movData.movements.map((m: any) => (
                          <tr key={m._id}>
                            <td><span className={m.type==="sale"?"badge-sale":"badge-rtn"}>{m.type==="sale"?"SALE":"RTN"}</span></td>
                            <td style={{ fontWeight:500, maxWidth:200 }}>{m.productName}</td>
                            <td className={`mono${m.type==="sale"?" red":" green"}`}>{m.type==="sale"?"-":"+"}{m.qty}</td>
                            <td className="mono">${fmt(m.price)}</td>
                            <td className="muted">{m.cashier}</td>
                            <td className="muted mono" style={{ fontSize:12 }}>{m.receiptNumber}</td>
                            <td className="muted" style={{ fontSize:12 }}>{fmtDate(m.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              }
            </div>
          )}

          {/* Analytics Tab */}
          {tab === "chart" && (
            <div style={{ paddingTop: 16 }}>
              {invLoading ? <div className="loading">Loading…</div> : (
                <>
                  <div className="chart-card">
                    <div className="chart-label">Daily units — sold vs returned</div>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={(inv?.daily??[]).map((d: any) => ({ ...d, label: fmtAxis(d.date) }))} barGap={3}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="label" tick={{ fill:"#9ca3af", fontSize:11 }} axisLine={{ stroke:"#e5e7eb" }} tickLine={false} />
                        <YAxis tick={{ fill:"#9ca3af", fontSize:11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background:"#fff", border:"1px solid #f3f4f6", borderRadius:8, fontSize:12, fontFamily:"inherit" }} />
                        <Bar dataKey="sold" name="Sold" fill="#ef4444" radius={[4,4,0,0]} />
                        <Bar dataKey="returned" name="Returned" fill="#10b981" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-card">
                    <div className="chart-label">Daily revenue</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={(inv?.daily??[]).map((d: any) => ({ ...d, label: fmtAxis(d.date) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="label" tick={{ fill:"#9ca3af", fontSize:11 }} axisLine={{ stroke:"#e5e7eb" }} tickLine={false} />
                        <YAxis tick={{ fill:"#9ca3af", fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
                        <Tooltip contentStyle={{ background:"#fff", border:"1px solid #f3f4f6", borderRadius:8, fontSize:12, fontFamily:"inherit" }} formatter={(v:any)=>[`$${fmt(v)}`,"Revenue"]} />
                        <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-card">
                    <div className="chart-label">4-week summary</div>
                    <table className="weekly-tbl" style={{ width:"100%" }}>
                      <thead>
                        <tr>
                          {["Week","Sold","Returned","Net","Revenue"].map(h => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {(inv?.weekly??[]).map((w: any) => (
                          <tr key={w.weekLabel}>
                            <td className="muted" style={{ fontSize:12 }}>{w.weekLabel}</td>
                            <td className="mono red">{w.sold}</td>
                            <td className="mono green">{w.returned}</td>
                            <td className={`mono${w.sold-w.returned>0?" red":" green"}`}>{w.sold-w.returned}</td>
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
      </div>

      {/* Drawer */}
      {selected && (
        <>
          <div className="backdrop" onClick={() => setSelected(null)} />
          <div className="drawer-anim">
            <ProductDrawer product={selected} range={range} onClose={() => setSelected(null)} />
          </div>
        </>
      )}
    </>
  );
}