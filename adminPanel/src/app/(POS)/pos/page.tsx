"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  TrendingUp, TrendingDown, ShoppingBag, DollarSign,
  ReceiptText, RotateCcw, ArrowRight, AlertTriangle,
  Target, Clock, Package, ChevronDown, Bell, Download,
  RefreshCw, Store, CheckCircle2, Zap,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { LiveDot }       from "@/components/dashboard/LiveDot";
import { CardPad, Divider } from "@/components/dashboard/CardPad";
import { Chip }          from "@/components/dashboard/Chip";
import { CustomTooltip } from "@/components/dashboard/CustomTooltip";
import { GhostBtn }      from "@/components/dashboard/GhostBtn";
import { heatColor }     from "@/components/dashboard/heatColor";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { Card }          from "@/components/ui/card";
import { fmt }           from "@/types/pos";

// ─── Config ───────────────────────────────────────────────────────────────────

/** Change this to your Express base URL or use an env var */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

/** Your Odoo POS config ID */
const CONFIG_ID = 1;

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "today" | "week" | "month";
type OrderStatus = "paid" | "refund" | "pending";

interface KpiItem {
  label: string; value: number; delta: number; up: boolean; sub: string;
}
interface ChartPoint   { label: string; revenue: number; prev: number }
interface Product      { name: string; revenue: number; orders: number; pct: number; rank: number }
interface RecentOrder  { id: string; time: string; channel: string; amount: number; status: OrderStatus; items: number }
interface PayMethod    { name: string; amount: number; value: number }
interface Category     { name: string; value: number; orders: number; color: string; pct: number }
interface StaffMember  { cashierId: string; initials: string; name: string; role: string; txn: number; sales: number; color: string; trend: number }
interface TargetData   { target: number; current: number; pct: number; label: string }
interface SessionInfo  { id: number; name: string; duration: string; cashier: string; cashInDrawer: number; expectedFloat: number; variance: number }
interface StockItem    { id: number; name: string; stock: number; unit: string; threshold: number; critical: boolean }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAYMENT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#e11d48", "#06b6d4"];

const orderStatusConfig: Record<OrderStatus, { label: string; color: string; bg: string; dot: string }> = {
  paid:    { label: "Paid",      color: "#059669", bg: "rgba(5,150,105,0.08)",  dot: "#059669" },
  refund:  { label: "Refunded",  color: "#e11d48", bg: "rgba(225,29,72,0.08)", dot: "#e11d48" },
  pending: { label: "Pending",   color: "#d97706", bg: "rgba(217,119,6,0.08)", dot: "#d97706" },
};

function formatMoney(v: number) {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDelta(d: number) {
  return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;
}

const DAYS  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const HOURS = ["8am","9am","10am","11am","12pm","1pm","2pm","3pm","4pm","5pm","6pm","7pm"];

// ─── Data fetcher hook ────────────────────────────────────────────────────────

function useFetch<T>(
  url: string | null,
  deps: any[] = [],
  fallback: T | null = null
): { data: T | null; loading: boolean; error: string | null } {
  const [data,    setData]    = useState<T | null>(fallback);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!url) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    fetch(url, { signal: ctrl.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((json) => { setData(json); setLoading(false); })
      .catch((e) => { if (e.name !== "AbortError") { setError(e.message); setLoading(false); } });
    return () => ctrl.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  return { data, loading, error };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ h = 14, w = "100%", style = {} }: { h?: number; w?: string | number; style?: React.CSSProperties }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: 6,
      background: "var(--bg-muted)",
      animation: "shimmer 1.4s ease-in-out infinite",
      ...style,
    }} />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function POSDashboardPage() {
  const [period,     setPeriod]     = useState<Period>("today");
  const [liveTime,   setLiveTime]   = useState(new Date());
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const qs  = `configId=${CONFIG_ID}&period=${period}`;
  const bqs = `configId=${CONFIG_ID}`;

  // ── All data fetches ──
  const kpiResult     = useFetch<any>(`${API_BASE}/pos/analytics/kpi?${qs}`,                [period, refreshKey]);
  const chartResult   = useFetch<any>(`${API_BASE}/pos/analytics/revenue-chart?${qs}`,      [period, refreshKey]);
  const productsResult= useFetch<any>(`${API_BASE}/pos/analytics/top-products?${qs}&limit=6`,[period, refreshKey]);
  const ordersResult  = useFetch<any>(`${API_BASE}/pos/analytics/recent-orders?${bqs}&limit=8`,[refreshKey]);
  const payResult     = useFetch<any>(`${API_BASE}/pos/analytics/payment-methods?${qs}`,    [period, refreshKey]);
  const catResult     = useFetch<any>(`${API_BASE}/pos/analytics/categories?${qs}`,         [period, refreshKey]);
  const staffResult   = useFetch<any>(`${API_BASE}/pos/analytics/staff?${qs}`,              [period, refreshKey]);
  const targetResult  = useFetch<any>(`${API_BASE}/pos/analytics/target?${qs}`,             [period, refreshKey]);
  const sessionResult = useFetch<any>(`${API_BASE}/pos/analytics/session-info?${bqs}`,      [refreshKey]);
  const stockResult   = useFetch<any>(`${API_BASE}/pos/analytics/low-stock?threshold=10`,   [refreshKey]);
  const heatResult    = useFetch<any>(`${API_BASE}/pos/analytics/heatmap?${bqs}`,           [refreshKey]);

  const isAnyLoading = [kpiResult, chartResult, productsResult].some((r) => r.loading);

  // ── Derived data with safe fallbacks ──
  const kpis:    KpiItem[]    = kpiResult.data?.kpis         ?? [];
  const chart:   ChartPoint[] = chartResult.data?.data        ?? [];
  const products:Product[]    = productsResult.data?.products  ?? [];
  const orders:  RecentOrder[]= ordersResult.data?.orders      ?? [];
  const methods: PayMethod[]  = payResult.data?.methods        ?? [];
  const cats:    Category[]   = catResult.data?.categories     ?? [];
  const staff:   StaffMember[]= staffResult.data?.staff        ?? [];
  const target:  TargetData | null = targetResult.data?.target ?? null;
  const session: SessionInfo | null = sessionResult.data?.session ?? null;
  const stock:   StockItem[]  = stockResult.data?.items        ?? [];
  const heatmap: number[][]   = heatResult.data?.heatmap       ?? Array.from({ length: 7 }, () => Array(12).fill(0));

  const maxStaffSales   = Math.max(...staff.map((s) => s.sales), 1);
  const totalCatRevenue = cats.reduce((s, c) => s + c.value, 0);

  const timeLabel = liveTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const dateLabel = liveTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <>
      <style>{`
        :root {
          --bg: #f5f6f8; --bg-card: #ffffff; --bg-muted: #f1f3f6;
          --bg-hover: #f8f9fb; --border: #e8eaed; --border-strong: #d0d5dd;
          --text-primary: #0f1117; --text-secondary: #4a5568; --text-muted: #8a94a6;
          --accent: #3b82f6; --accent-muted: rgba(59,130,246,0.09);
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --bg: #0e1117; --bg-card: #161b27; --bg-muted: #1e2535;
            --bg-hover: #1a2030; --border: #262e3d; --border-strong: #3a4560;
            --text-primary: #f0f3f9; --text-secondary: #8892a4; --text-muted: #4a5568;
          }
        }
        * { box-sizing: border-box; }
        body { background: var(--bg); }
        .pos-root { font-family: 'DM Sans', system-ui, sans-serif; }
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%,100%{opacity:.45} 50%{opacity:.9} }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        .row   { display: flex; align-items: center; }
        .col   { display: flex; flex-direction: column; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .grid4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
        @media(max-width:1100px){
          .grid4{grid-template-columns:1fr 1fr}
          .grid3{grid-template-columns:1fr 1fr}
          .lg-span2{grid-column:span 2!important}
        }
        @media(max-width:700px){
          .grid2,.grid3,.grid4{grid-template-columns:1fr}
          .lg-span2{grid-column:span 1!important}
          .hide-mobile{display:none!important}
        }
        .hover-row:hover{background:var(--bg-hover)}
        .pill-tab{padding:6px 14px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:500;transition:all .15s;font-family:inherit}
        .pill-tab.active{background:var(--accent);color:#fff;box-shadow:0 1px 4px rgba(59,130,246,.35)}
        .pill-tab.inactive{background:transparent;color:var(--text-muted)}
        .pill-tab.inactive:hover{color:var(--text-primary);background:var(--bg-muted)}
        .progress-bar{height:5px;border-radius:10px;background:var(--bg-muted);overflow:hidden}
        .progress-fill{height:100%;border-radius:10px;transition:width .6s cubic-bezier(.22,.68,0,1.2)}
        .notif-panel{position:absolute;right:0;top:calc(100% + 8px);width:320px;background:var(--bg-card);border:1px solid var(--border);border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.12);z-index:100;overflow:hidden}
        .heat-cell{border-radius:6px;text-align:center;padding:5px 2px;font-size:11px;font-weight:600;font-family:'DM Mono',monospace;cursor:default;transition:transform .1s;min-width:36px}
        .heat-cell:hover{transform:scale(1.12);z-index:2;position:relative}
      `}</style>

      <div className="pos-root" style={{ minHeight: "100vh", background: "var(--bg)" }}>

        {/* ── Sticky Header ── */}
        <div style={{ position:"sticky", top:0, zIndex:50, background:"var(--bg-card)", borderBottom:"1px solid var(--border)" }}>
          <div style={{ maxWidth:1440, margin:"0 auto", padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>

            {/* Brand */}
            <div className="row" style={{ gap:16, flexShrink:0 }}>
              <div className="row" style={{ gap:8 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#3b82f6,#2563eb)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 6px rgba(59,130,246,.35)" }}>
                  <Store size={16} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"var(--text-primary)", letterSpacing:"-0.02em", lineHeight:1 }}>POS Analytics</div>
                  <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:1, lineHeight:1 }}>Enterprise Dashboard</div>
                </div>
              </div>
              <div style={{ width:1, height:24, background:"var(--border)" }} />
              {session && (
                <div className="row hide-mobile" style={{ gap:6, padding:"4px 8px", borderRadius:8, border:"1px solid var(--border)" }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:"#10b981" }} />
                  <span style={{ fontSize:12.5, fontWeight:500, color:"var(--text-secondary)" }}>{session.name}</span>
                </div>
              )}
            </div>

            {/* Period tabs */}
            <div className="row" style={{ gap:3, padding:"4px", background:"var(--bg-muted)", borderRadius:10, border:"1px solid var(--border)" }}>
              {(["today","week","month"] as Period[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)} className={`pill-tab ${period === p ? "active" : "inactive"}`}>
                  {p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="row" style={{ gap:8 }}>
              <div className="row hide-mobile" style={{ gap:6, padding:"5px 10px", borderRadius:8, background:"var(--bg-muted)", border:"1px solid var(--border)" }}>
                <LiveDot />
                <span style={{ fontSize:12, fontWeight:600, color:"var(--text-secondary)", fontFamily:"'DM Mono',monospace" }}>{timeLabel}</span>
                <span style={{ fontSize:12, color:"var(--text-muted)" }}>{dateLabel}</span>
              </div>
              <GhostBtn onClick={() => setRefreshKey((k) => k + 1)}>
                <RefreshCw size={13} style={{ animation: isAnyLoading ? "spin 1s linear infinite" : "none" }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                <span className="hide-mobile">Refresh</span>
              </GhostBtn>
              <GhostBtn><Download size={13} /><span className="hide-mobile">Export</span></GhostBtn>

              {/* Bell */}
              <div style={{ position:"relative" }}>
                <button onClick={() => setNotifOpen((o) => !o)} style={{ position:"relative", padding:"7px", borderRadius:8, border:"1px solid var(--border)", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", color:"var(--text-secondary)", transition:"all .15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <Bell size={15} />
                  {stock.some((s) => s.critical) && (
                    <span style={{ position:"absolute", top:4, right:4, width:7, height:7, background:"#e11d48", borderRadius:"50%", border:"1.5px solid var(--bg-card)" }} />
                  )}
                </button>
                {notifOpen && (
                  <div className="notif-panel fade-in">
                    <div style={{ padding:"14px 16px", borderBottom:"1px solid var(--border)" }}>
                      <div className="row" style={{ justifyContent:"space-between" }}>
                        <span style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)" }}>Notifications</span>
                        <span style={{ fontSize:11, color:"var(--accent)", cursor:"pointer", fontWeight:500 }} onClick={() => setNotifOpen(false)}>Dismiss</span>
                      </div>
                    </div>
                    {stock.filter((s) => s.critical).map((s, i) => (
                      <div key={i} className="hover-row" style={{ padding:"12px 16px", display:"flex", gap:10, alignItems:"flex-start", background:"rgba(59,130,246,0.04)" }}>
                        <AlertTriangle size={14} color="#e11d48" style={{ marginTop:1, flexShrink:0 }} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12.5, color:"var(--text-primary)", fontWeight:500 }}>{s.name} critically low ({s.stock} {s.unit})</div>
                          <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>Stock alert</div>
                        </div>
                        <div style={{ width:6, height:6, borderRadius:"50%", background:"#3b82f6", marginTop:4, flexShrink:0 }} />
                      </div>
                    ))}
                    {stock.filter((s) => !s.critical).map((s, i) => (
                      <div key={i} className="hover-row" style={{ padding:"12px 16px", display:"flex", gap:10, alignItems:"flex-start" }}>
                        <AlertTriangle size={14} color="#f59e0b" style={{ marginTop:1, flexShrink:0 }} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12.5, color:"var(--text-primary)", fontWeight:400 }}>{s.name} low ({s.stock} {s.unit})</div>
                          <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>Stock alert</div>
                        </div>
                      </div>
                    ))}
                    {stock.length === 0 && (
                      <div style={{ padding:"20px 16px", textAlign:"center", fontSize:12.5, color:"var(--text-muted)" }}>No stock alerts</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div style={{ maxWidth:1440, margin:"0 auto", padding:"20px 24px 40px", display:"flex", flexDirection:"column", gap:16 }}>

          {/* ── Row 1: Session + Stock alerts ── */}
          <div className="grid2">
            {/* Session */}
            <Card>
              <CardPad style={{ paddingBottom:14 }}>
                <div className="row" style={{ justifyContent:"space-between", marginBottom:14 }}>
                  <div className="row" style={{ gap:8 }}>
                    <Clock size={14} color="var(--text-muted)" />
                    <span style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)" }}>Current Session</span>
                  </div>
                  <div className="row" style={{ gap:6 }}>
                    <LiveDot />
                    <Chip color={session ? "#10b981" : "#94a3b8"}>{session ? "Open" : "No Session"}</Chip>
                  </div>
                </div>
                {sessionResult.loading ? (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                    {Array(6).fill(0).map((_,i)=>(
                      <div key={i} style={{ background:"var(--bg-muted)", borderRadius:9, padding:"10px 12px", border:"1px solid var(--border)" }}>
                        <Skeleton h={10} w="60%" style={{ marginBottom:6 }} />
                        <Skeleton h={14} w="80%" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                    {[
                      { label:"Started",        value: session ? new Date(session.id).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}) : "—" },
                      { label:"Cashier",         value: session?.cashier ?? "—" },
                      { label:"Duration",        value: session?.duration ?? "—" },
                      { label:"Cash in Drawer",  value: session ? formatMoney(session.cashInDrawer) : "—" },
                      { label:"Expected Float",  value: session ? formatMoney(session.expectedFloat) : "—" },
                      { label:"Variance",        value: session ? `${session.variance >= 0 ? "+" : ""}${formatMoney(session.variance)}` : "—", accent: session ? (session.variance >= 0 ? "#10b981" : "#e11d48") : undefined },
                    ].map((s) => (
                      <div key={s.label} style={{ background:"var(--bg-muted)", borderRadius:9, padding:"10px 12px", border:"1px solid var(--border)" }}>
                        <div style={{ fontSize:10.5, color:"var(--text-muted)", fontWeight:500, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>{s.label}</div>
                        <div style={{ fontSize:13.5, fontWeight:700, color:(s as any).accent || "var(--text-primary)" }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardPad>
            </Card>

            {/* Low stock */}
            <Card>
              <CardPad>
                <div className="row" style={{ justifyContent:"space-between", marginBottom:14 }}>
                  <div className="row" style={{ gap:8 }}>
                    <AlertTriangle size={14} color="#f59e0b" />
                    <span style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)" }}>Stock Alerts</span>
                  </div>
                  <Chip color="#f59e0b">{stock.length} items</Chip>
                </div>
                {stockResult.loading ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                    {Array(4).fill(0).map((_,i)=><Skeleton key={i} h={12} />)}
                  </div>
                ) : stock.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"20px 0", fontSize:13, color:"var(--text-muted)" }}>All stock levels are healthy ✓</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                    {stock.map((item) => {
                      const pct   = Math.min(100, (item.stock / item.threshold) * 100);
                      const color = item.critical ? "#e11d48" : "#f59e0b";
                      return (
                        <div key={item.id} className="row" style={{ gap:10 }}>
                          <Package size={13} color="var(--text-muted)" style={{ flexShrink:0 }} />
                          <span style={{ flex:1, fontSize:13, color:"var(--text-primary)", fontWeight:500 }}>{item.name}</span>
                          <div className="progress-bar" style={{ width:80 }}>
                            <div className="progress-fill" style={{ width:`${pct}%`, background:color }} />
                          </div>
                          <span style={{ fontSize:12, fontWeight:600, color, minWidth:76, textAlign:"right", fontFamily:"'DM Mono',monospace" }}>
                            {item.stock} {item.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardPad>
            </Card>
          </div>

          {/* ── Row 2: KPI Cards ── */}
          <div className="grid4 fade-in" style={{ opacity: kpiResult.loading ? 0.6 : 1, transition:"opacity .2s" }}>
            {kpiResult.loading ? (
              Array(4).fill(0).map((_,i) => (
                <Card key={i}>
                  <CardPad>
                    <Skeleton h={10} w="50%" style={{ marginBottom:12 }} />
                    <Skeleton h={28} w="70%" style={{ marginBottom:10 }} />
                    <Skeleton h={10} w="40%" />
                  </CardPad>
                </Card>
              ))
            ) : (
              kpis.map((kpi, i) => {
                const icons  = [<DollarSign size={15}/>,<ShoppingBag size={15}/>,<ReceiptText size={15}/>,<RotateCcw size={15}/>];
                const colors = ["#3b82f6","#10b981","#f59e0b","#e11d48"];
                const col    = colors[i];
                const displayVal = i === 0 || i === 2 || i === 3 ? formatMoney(kpi.value) : String(Math.round(kpi.value));
                return (
                  <Card key={kpi.label} style={{ position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", right:-15, top:-15, width:80, height:80, borderRadius:"50%", background:`${col}08` }} />
                    <CardPad>
                      <div className="row" style={{ justifyContent:"space-between", marginBottom:14 }}>
                        <span style={{ fontSize:12, fontWeight:500, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{kpi.label}</span>
                        <div style={{ padding:"6px", borderRadius:8, background:`${col}12`, color:col }}>{icons[i]}</div>
                      </div>
                      <div style={{ fontSize:26, fontWeight:800, color:"var(--text-primary)", letterSpacing:"-0.03em", lineHeight:1 }}>{displayVal}</div>
                      <div className="row" style={{ gap:5, marginTop:10 }}>
                        <div className="row" style={{ gap:3, fontSize:12, fontWeight:600, color:kpi.up?"#10b981":"#e11d48", background:kpi.up?"rgba(16,185,129,0.08)":"rgba(225,29,72,0.08)", padding:"3px 7px", borderRadius:20 }}>
                          {kpi.up ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                          {formatDelta(kpi.delta)}
                        </div>
                        <span style={{ fontSize:11.5, color:"var(--text-muted)" }}>{kpi.sub}</span>
                      </div>
                    </CardPad>
                  </Card>
                );
              })
            )}
          </div>

          {/* ── Row 3: Revenue Target ── */}
          {(targetResult.loading || target) && (
            <Card>
              <CardPad style={{ padding:"16px 20px" }}>
                {targetResult.loading ? (
                  <Skeleton h={8} />
                ) : target && (
                  <>
                    <div className="row" style={{ gap:12, flexWrap:"wrap", justifyContent:"space-between", marginBottom:10 }}>
                      <div className="row" style={{ gap:8 }}>
                        <Target size={14} color="var(--accent)" />
                        <span style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)" }}>{target.label}</span>
                      </div>
                      <div className="row" style={{ gap:10 }}>
                        <span style={{ fontSize:13, color:"var(--text-secondary)" }}>
                          <span style={{ fontWeight:700, color:"var(--text-primary)" }}>{formatMoney(target.current)}</span>
                          <span style={{ color:"var(--text-muted)", margin:"0 4px" }}>of</span>
                          {formatMoney(target.target)}
                        </span>
                        <Chip color={target.pct >= 85 ? "#10b981" : "#f59e0b"}>{target.pct}% reached</Chip>
                      </div>
                    </div>
                    <div className="progress-bar" style={{ height:8 }}>
                      <div className="progress-fill" style={{ width:`${target.pct}%`, background:`linear-gradient(90deg,#3b82f6,${target.pct>=85?"#10b981":"#60a5fa"})` }} />
                    </div>
                    <div style={{ marginTop:8, fontSize:12, color:"var(--text-muted)" }}>
                      {formatMoney(target.target - target.current)} remaining
                    </div>
                  </>
                )}
              </CardPad>
            </Card>
          )}

          {/* ── Row 4: Revenue Chart + Payment Methods ── */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:12 }} className="lg-grid-chart">
            <style>{`@media(max-width:1100px){.lg-grid-chart{grid-template-columns:1fr!important}}`}</style>

            <Card>
              <CardPad style={{ paddingBottom:0 }}>
                <SectionHeader
                  title="Revenue Over Time"
                  subtitle={period === "today" ? "Hourly breakdown" : period === "week" ? "Daily totals" : "Weekly totals"}
                  action={
                    <div className="row" style={{ gap:5, fontSize:11.5, color:"var(--text-muted)" }}>
                      <div style={{ width:10, height:2, borderRadius:2, background:"#3b82f6" }} /><span>Current</span>
                      <div style={{ width:10, height:2, borderRadius:2, background:"#e2e8f0", marginLeft:6 }} /><span>Prior</span>
                    </div>
                  }
                />
              </CardPad>
              <div style={{ padding:"0 8px 16px" }}>
                {chartResult.loading ? (
                  <div style={{ height:230, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Skeleton h={160} style={{ width:"95%" }} />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={230}>
                    <AreaChart data={chart} margin={{ top:4, right:4, left:-16, bottom:0 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#94a3b8" stopOpacity={0.08}/>
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                      <XAxis dataKey="label" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => v>=1000?`$${(v/1000).toFixed(0)}k`:`$${v}`}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Area type="monotone" dataKey="prev"    stroke="#cbd5e1" strokeWidth={1.5} fill="url(#prevGrad)" dot={false} strokeDasharray="4 3"/>
                      <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revGrad)"  dot={false} activeDot={{ r:5, fill:"#3b82f6", strokeWidth:0 }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card>
              <CardPad>
                <SectionHeader title="Payment Methods" subtitle="Transaction split"/>
                {payResult.loading ? (
                  <>
                    <Skeleton h={150} style={{ borderRadius:"50%", margin:"0 auto 8px", width:150 }} />
                    {Array(3).fill(0).map((_,i)=><Skeleton key={i} h={12} style={{ marginBottom:10 }} />)}
                  </>
                ) : (
                  <>
                    <div style={{ display:"flex", justifyContent:"center", marginBottom:4 }}>
                      <PieChart width={150} height={150}>
                        <Pie data={methods} cx={71} cy={71} innerRadius={48} outerRadius={68} paddingAngle={3} dataKey="value" strokeWidth={0}>
                          {methods.map((_,i) => <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]}/>)}
                        </Pie>
                      </PieChart>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {methods.map((m, i) => (
                        <div key={m.name} className="row" style={{ justifyContent:"space-between" }}>
                          <div className="row" style={{ gap:8 }}>
                            <div style={{ width:9, height:9, borderRadius:3, background:PAYMENT_COLORS[i%PAYMENT_COLORS.length], flexShrink:0 }}/>
                            <span style={{ fontSize:13, color:"var(--text-secondary)" }}>{m.name}</span>
                          </div>
                          <div className="row" style={{ gap:10 }}>
                            <span style={{ fontSize:12, color:"var(--text-muted)", fontFamily:"'DM Mono',monospace" }}>{formatMoney(m.amount)}</span>
                            <span style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", minWidth:30, textAlign:"right" }}>{m.value}%</span>
                          </div>
                        </div>
                      ))}
                      {methods.length === 0 && <div style={{ fontSize:13, color:"var(--text-muted)", textAlign:"center", padding:"12px 0" }}>No data</div>}
                    </div>
                  </>
                )}
              </CardPad>
            </Card>
          </div>

          {/* ── Row 5: Category breakdown ── */}
          <Card>
            <CardPad>
              <SectionHeader title="Revenue by Category" subtitle="All sales channels"/>
              {catResult.loading ? (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
                  {Array(5).fill(0).map((_,i)=><Skeleton key={i} h={100} style={{ borderRadius:11 }} />)}
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }} className="cat-grid">
                  <style>{`@media(max-width:900px){.cat-grid{grid-template-columns:1fr 1fr!important}}`}</style>
                  {cats.map((c) => (
                    <div key={c.name} style={{ background:"var(--bg-muted)", borderRadius:11, padding:"14px 16px", border:"1px solid var(--border)", position:"relative", overflow:"hidden" }}>
                      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:`${c.pct * 0.7}%`, background:`${c.color}0a` }}/>
                      <div style={{ fontSize:11, fontWeight:500, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>{c.name}</div>
                      <div style={{ fontSize:20, fontWeight:800, color:"var(--text-primary)", letterSpacing:"-0.02em", marginBottom:4 }}>{formatMoney(c.value)}</div>
                      <div className="row" style={{ gap:6, justifyContent:"space-between" }}>
                        <div style={{ fontSize:12, color:"var(--text-muted)" }}>{c.orders} orders</div>
                        <div style={{ fontSize:12, fontWeight:700, color:c.color, background:`${c.color}12`, padding:"2px 7px", borderRadius:20 }}>{c.pct}%</div>
                      </div>
                      <div className="progress-bar" style={{ marginTop:10, height:3 }}>
                        <div className="progress-fill" style={{ width:`${c.pct}%`, background:c.color }}/>
                      </div>
                    </div>
                  ))}
                  {cats.length === 0 && <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"20px 0", fontSize:13, color:"var(--text-muted)" }}>No category data</div>}
                </div>
              )}
            </CardPad>
          </Card>

          {/* ── Row 6: Peak Hours Heatmap ── */}
          <Card>
            <CardPad>
              <SectionHeader
                title="Peak Hours Heatmap"
                subtitle="Order volume by day & hour (last 4 weeks)"
                action={
                  <div className="row" style={{ gap:5, fontSize:11 }}>
                    <span style={{ color:"var(--text-muted)" }}>Low</span>
                    {["rgba(59,130,246,0.07)","rgba(59,130,246,0.15)","rgba(59,130,246,0.30)","rgba(59,130,246,0.55)","rgba(59,130,246,0.85)"].map((c,i)=>(
                      <div key={i} style={{ width:20, height:12, borderRadius:4, background:c, border:"1px solid var(--border)" }}/>
                    ))}
                    <span style={{ color:"var(--text-muted)" }}>High</span>
                  </div>
                }
              />
              {heatResult.loading ? (
                <Skeleton h={130} />
              ) : (
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:3, minWidth:560 }}>
                    <thead>
                      <tr>
                        <th style={{ width:36, textAlign:"left", paddingBottom:6, fontSize:11, color:"var(--text-muted)", fontWeight:400 }}/>
                        {HOURS.map((h) => <th key={h} style={{ textAlign:"center", paddingBottom:6, fontSize:11, color:"var(--text-muted)", fontWeight:500, minWidth:36 }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map((day, di) => (
                        <tr key={day}>
                          <td style={{ fontSize:11.5, color:"var(--text-muted)", paddingRight:6, fontWeight:500, whiteSpace:"nowrap" }}>{day}</td>
                          {HOURS.map((_, hi) => {
                            const val = heatmap[di]?.[hi] ?? 0;
                            const { bg, text } = heatColor(val);
                            return <td key={hi} className="heat-cell" style={{ background:bg, color:text }} title={`${day} ${HOURS[hi]}: ${val} orders`}>{val}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardPad>
          </Card>

          {/* ── Row 7: Top Products + Recent Orders + Staff ── */}
          <div className="grid3">
            {/* Top products */}
            <Card>
              <CardPad>
                <SectionHeader title="Top Products" subtitle="By revenue"/>
                {productsResult.loading ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {Array(6).fill(0).map((_,i)=><Skeleton key={i} h={14} />)}
                  </div>
                ) : products.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"20px 0", fontSize:13, color:"var(--text-muted)" }}>No data</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {products.map((p) => (
                      <div key={p.name} className="row" style={{ gap:10 }}>
                        <span style={{ width:22, height:22, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0, background: p.rank <= 3 ? "rgba(59,130,246,0.1)" : "var(--bg-muted)", color: p.rank <= 3 ? "#3b82f6" : "var(--text-muted)" }}>{p.rank}</span>
                        <span style={{ flex:1, fontSize:13, color:"var(--text-primary)", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</span>
                        <div className="progress-bar" style={{ width:50 }}>
                          <div className="progress-fill" style={{ width:`${p.pct}%`, background:"#3b82f6" }}/>
                        </div>
                        <span style={{ fontSize:12.5, fontWeight:700, color:"var(--text-primary)", minWidth:56, textAlign:"right", fontFamily:"'DM Mono',monospace" }}>{formatMoney(p.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardPad>
            </Card>

            {/* Recent orders */}
            <Card>
              <CardPad style={{ paddingBottom:10 }}>
                <SectionHeader title="Recent Orders" action={
                  <button style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, fontWeight:500, color:"var(--accent)", background:"none", border:"none", cursor:"pointer", padding:0 }}>
                    View all <ArrowRight size={12}/>
                  </button>
                }/>
              </CardPad>
              {ordersResult.loading ? (
                <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                  {Array(6).fill(0).map((_,i)=>(
                    <div key={i} style={{ padding:"12px 20px", borderTop: i>0?"1px solid var(--border)":"none" }}>
                      <Skeleton h={12} w="60%" style={{ marginBottom:6 }} />
                      <Skeleton h={10} w="40%" />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column" }}>
                  {orders.map((o, i) => {
                    const s = orderStatusConfig[o.status];
                    return (
                      <div key={o.id} className="hover-row" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 20px", borderTop: i>0?"1px solid var(--border)":"none", transition:"background .15s" }}>
                        <div>
                          <div className="row" style={{ gap:7, marginBottom:3 }}>
                            <span style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", fontFamily:"'DM Mono',monospace" }}>{o.id}</span>
                            <span style={{ fontSize:11, color:"var(--text-muted)" }}>{o.items} item{o.items!==1?"s":""}</span>
                          </div>
                          <div style={{ fontSize:11.5, color:"var(--text-muted)" }}>{o.time} · {o.channel}</div>
                        </div>
                        <div className="row" style={{ gap:8 }}>
                          <span style={{ fontSize:14, fontWeight:700, color:"var(--text-primary)", fontFamily:"'DM Mono',monospace" }}>{formatMoney(o.amount)}</span>
                          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11.5, fontWeight:600, padding:"3px 9px", borderRadius:20, color:s.color, background:s.bg }}>
                            <div style={{ width:5, height:5, borderRadius:"50%", background:s.dot }}/>
                            {s.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {orders.length === 0 && <div style={{ padding:"20px", textAlign:"center", fontSize:13, color:"var(--text-muted)" }}>No recent orders</div>}
                </div>
              )}
            </Card>

            {/* Staff performance */}
            <Card>
              <CardPad>
                <SectionHeader title="Cashier Performance" subtitle={period === "today" ? "Today" : period === "week" ? "This week" : "This month"}/>
                {staffResult.loading ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    {Array(4).fill(0).map((_,i)=>(
                      <div key={i} className="row" style={{ gap:11 }}>
                        <Skeleton h={34} w={34} style={{ borderRadius:10, flexShrink:0 }} />
                        <div style={{ flex:1 }}>
                          <Skeleton h={12} w="60%" style={{ marginBottom:6 }} />
                          <Skeleton h={4} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : staff.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"20px 0", fontSize:13, color:"var(--text-muted)" }}>No cashier data</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    {staff.map((s) => (
                      <div key={s.cashierId} className="row" style={{ gap:11 }}>
                        <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, background:`${s.color}18`, color:s.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, letterSpacing:"-0.02em", border:`1.5px solid ${s.color}30` }}>
                          {s.initials}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div className="row" style={{ justifyContent:"space-between", marginBottom:5 }}>
                            <div>
                              <div style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)", lineHeight:1 }}>{s.name}</div>
                              <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>{s.role}</div>
                            </div>
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontSize:14, fontWeight:800, color:"var(--text-primary)", fontFamily:"'DM Mono',monospace" }}>{formatMoney(s.sales)}</div>
                              <div style={{ fontSize:11, fontWeight:600, marginTop:1, color: s.trend>0?"#10b981":"#e11d48" }}>{s.trend>0?"+":""}{s.trend}%</div>
                            </div>
                          </div>
                          <div className="row" style={{ gap:8 }}>
                            <div className="progress-bar" style={{ flex:1, height:4 }}>
                              <div className="progress-fill" style={{ width:`${(s.sales/maxStaffSales)*100}%`, background:s.color }}/>
                            </div>
                            <span style={{ fontSize:11.5, color:"var(--text-muted)", whiteSpace:"nowrap" }}>{s.txn} txn</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardPad>
            </Card>
          </div>

          {/* ── Footer ── */}
          <div className="row" style={{ justifyContent:"space-between", padding:"8px 0", flexWrap:"wrap", gap:8 }}>
            <span style={{ fontSize:12, color:"var(--text-muted)" }}>
              POS Analytics · Last synced {timeLabel}
              {isAnyLoading && <span style={{ marginLeft:8, color:"var(--accent)" }}>Fetching…</span>}
            </span>
            <div className="row" style={{ gap:12 }}>
              {["Documentation","Support","API Status"].map((l) => (
                <span key={l} style={{ fontSize:12, color:"var(--text-muted)", cursor:"pointer" }}
                  onMouseEnter={(e)=>(e.currentTarget.style.color="var(--accent)")}
                  onMouseLeave={(e)=>(e.currentTarget.style.color="var(--text-muted)")}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}