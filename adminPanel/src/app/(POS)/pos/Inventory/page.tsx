"use client";

import { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  ReceiptText,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
  Target,
  Clock,
  Package,
  Bell,
  Download,
  RefreshCw,
  Store,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { LiveDot } from "@/components/dashboard/LiveDot";
import { CardPad, Divider } from "@/components/dashboard/CardPad";
import { Chip } from "@/components/dashboard/Chip";
import { CustomTooltip } from "@/components/dashboard/CustomTooltip";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { Card } from "@/components/ui/card";
import { fmt } from "@/types/pos";
import { formatDistanceToNow } from "date-fns";
import {
  useGetCategoriesQuery,
  useGetHeatmapQuery,
  useGetKpiSummaryQuery,
  useGetLowStockQuery,
  useGetPaymentMethodsQuery,
  useGetRecentOrdersQuery,
  useGetRevenueChartQuery,
  useGetRevenueTargetQuery,
  useGetSessionInfoQuery,
  useGetStaffPerformanceQuery,
  useGetTopProductsQuery,
  useGetTablesQuery,
  useGetDiscountsQuery,
  useGetCustomerInsightsQuery,
} from "@/redux/analytics/analyticsApi";

type Period = "today" | "week" | "month";
type OrderStatus = "paid" | "refund" | "pending";
type TableStatus = "occupied" | "available" | "reserved";

const PAYMENT_COLORS = ["#1a1a18", "#57534e", "#a8a29e", "#d6d3d1"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = ["8am", "9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm", "6pm", "7pm"];

function safeFmt(val: number | undefined | null): string {
  if (val == null || isNaN(val as number)) return "$0.00";
  return fmt(val);
}

const orderStatusConfig: Record<OrderStatus, { label: string; color: string; bg: string; dot: string }> = {
  paid:    { label: "Paid",      color: "#166534", bg: "rgba(220,252,231,0.8)", dot: "#16a34a" },
  refund:  { label: "Refunded",  color: "#991b1b", bg: "rgba(254,226,226,0.8)", dot: "#dc2626" },
  pending: { label: "Pending",   color: "#92400e", bg: "rgba(254,243,199,0.8)", dot: "#d97706" },
};

const tableStatusConfig: Record<TableStatus, { label: string; color: string; bg: string; border: string }> = {
  occupied:  { label: "In use",    color: "#1e40af", bg: "rgba(239,246,255,1)",   border: "#bfdbfe" },
  available: { label: "Free",      color: "#166534", bg: "rgba(240,253,244,1)",   border: "#bbf7d0" },
  reserved:  { label: "Reserved",  color: "#92400e", bg: "rgba(255,251,235,1)",   border: "#fde68a" },
};

function heatColor(val: number): { bg: string; text: string } {
  if (val === 0)  return { bg: "#f5f5f3", text: "#a8a29e" };
  if (val < 5)   return { bg: "#e7e5e4", text: "#57534e" };
  if (val < 10)  return { bg: "#d6d3d1", text: "#292524" };
  if (val < 20)  return { bg: "#a8a29e", text: "#1c1917" };
  if (val < 35)  return { bg: "#78716c", text: "#fafaf9" };
  return              { bg: "#292524", text: "#fafaf9" };
}

function fmtDelta(delta: number): string {
  return `${delta >= 0 ? "+" : ""}${delta}%`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function fmtNotifTime(dateStr?: string): string {
  if (!dateStr) return "Stock alert";
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }); }
  catch { return "Stock alert"; }
}

function Skeleton({ height = 20, width = "100%", style = {} }: { height?: number; width?: string | number; style?: React.CSSProperties }) {
  return (
    <div style={{ height, width, borderRadius: 6, background: "#f5f5f3", animation: "shimmer 1.4s ease-in-out infinite", ...style }} />
  );
}

function HeatmapSkeleton() {
  return (
    <div style={{ padding: "8px 0" }}>
      {DAYS.map((day) => (
        <div key={day} style={{ display: "flex", gap: 3, marginBottom: 3, alignItems: "center" }}>
          <div style={{ width: 36, fontSize: 11.5, color: "#a8a29e", fontWeight: 500 }}>{day}</div>
          {HOURS.map((_, i) => <Skeleton key={i} height={28} width={36} style={{ flexShrink: 0, borderRadius: 6 }} />)}
        </div>
      ))}
    </div>
  );
}

function EmptyHeatmap({ message }: { message: string }) {
  return <div style={{ textAlign: "center", padding: "40px 0", color: "#a8a29e", fontSize: 13 }}>{message}</div>;
}

export default function POSDashboardPage() {
  const [period, setPeriod] = useState<Period>("today");
  const [liveTime, setLiveTime] = useState(new Date());
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const configId = 1;

  const { data: kpis = [], isFetching: kpisFetching, refetch: refetchKpis } = useGetKpiSummaryQuery({ period, configId });
  const { data: revenueData = [], isFetching: revenueFetching, refetch: refetchRevenue } = useGetRevenueChartQuery({ period, configId });
  const { data: topProducts = [], refetch: refetchTopProducts } = useGetTopProductsQuery({ period, configId, limit: 6 });
  const { data: recentOrders = [], refetch: refetchRecentOrders } = useGetRecentOrdersQuery({ configId, limit: 6 });
  const { data: paymentData = [], refetch: refetchPayments } = useGetPaymentMethodsQuery({ period, configId });
  const { data: categoryData = [], refetch: refetchCategories } = useGetCategoriesQuery({ period, configId });
  const { data: staffData = [], refetch: refetchStaff } = useGetStaffPerformanceQuery({ period, configId });
  const { data: target, refetch: refetchTarget } = useGetRevenueTargetQuery({ period, configId });
  const { data: session, refetch: refetchSession } = useGetSessionInfoQuery(configId);
  const { data: lowStockItems = [], refetch: refetchLowStock } = useGetLowStockQuery({ threshold: 10, limit: 8 });
  const { data: heatmapRaw, isLoading: heatmapLoading, isError: heatmapError, refetch: refetchHeatmap } = useGetHeatmapQuery(configId);
  const { data: tableData = [], isError: tablesError, refetch: refetchTables } = useGetTablesQuery({ configId });
  const { data: discountsResult, refetch: refetchDiscounts } = useGetDiscountsQuery({ period, configId });
  const discountData = discountsResult?.discounts ?? [];
  const discountTotal = discountsResult?.total ?? 0;
  const { data: customerData, refetch: refetchCustomers } = useGetCustomerInsightsQuery({ period, configId });

  const isLoading = kpisFetching || revenueFetching;
  const branch = session?.name ?? session?.branchName ?? "—";
  const targetPct = target?.pct ?? 0;
  const maxStaffSales = Math.max(...staffData.map((s: any) => s.sales), 1);
  const totalCategory = categoryData.reduce((a: number, b: any) => a + b.value, 0);

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    let cleanup: (() => void) | undefined;
    const timeout = setTimeout(() => {
      function handleClickOutside(e: MouseEvent) {
        if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      }
      document.addEventListener("mousedown", handleClickOutside);
      cleanup = () => document.removeEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => { clearTimeout(timeout); cleanup?.(); };
  }, [notifOpen]);

  const handleRefreshAll = () => {
    refetchKpis(); refetchRevenue(); refetchTopProducts(); refetchRecentOrders();
    refetchPayments(); refetchCategories(); refetchStaff(); refetchTarget();
    refetchSession(); refetchLowStock(); refetchHeatmap(); refetchTables();
    refetchDiscounts(); refetchCustomers();
  };

  const timeLabel = liveTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const dateLabel = liveTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        :root {
          --bg: #f5f5f3;
          --bg-card: #ffffff;
          --bg-muted: #f5f5f3;
          --bg-hover: #fafaf9;
          --border: #e7e5e4;
          --border-strong: #d6d3d1;
          --text-primary: #1c1917;
          --text-secondary: #57534e;
          --text-muted: #a8a29e;
          --accent: #1c1917;
          --accent-muted: rgba(28,25,23,0.06);
        }
        * { box-sizing: border-box; }
        body { background: var(--bg); }
        .pos-root { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        div[style*="animation: shimmer"] {
          background: linear-gradient(90deg, #f5f5f3 25%, #fafaf9 50%, #f5f5f3 75%);
          background-size: 800px 100%;
        }
        .row  { display: flex; align-items: center; }
        .col  { display: flex; flex-direction: column; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        @media(max-width: 1100px) {
          .grid4 { grid-template-columns: 1fr 1fr; }
          .grid3 { grid-template-columns: 1fr 1fr; }
          .lg-span2 { grid-column: span 2 !important; }
        }
        @media(max-width: 700px) {
          .grid2, .grid3, .grid4 { grid-template-columns: 1fr; }
          .lg-span2 { grid-column: span 1 !important; }
          .hide-mobile { display: none !important; }
        }
        .hover-row:hover { background: var(--bg-hover); }
        .pill-tab { padding: 6px 14px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; font-family: inherit; }
        .pill-tab.active   { background: var(--accent); color: #fff; }
        .pill-tab.inactive { background: transparent; color: var(--text-muted); }
        .pill-tab.inactive:hover { color: var(--text-primary); background: var(--bg-muted); }
        .progress-bar { height: 5px; border-radius: 10px; background: var(--bg-muted); overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 10px; transition: width 0.6s cubic-bezier(.22,.68,0,1.2); }
        .notif-panel {
          position: absolute; right: 0; top: calc(100% + 8px); width: 320px;
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08); z-index: 100; overflow: hidden;
        }
        .heat-cell {
          border-radius: 6px; text-align: center; padding: 5px 2px; font-size: 11px;
          font-weight: 600; font-family: 'DM Mono', monospace; cursor: default;
          transition: transform 0.1s; min-width: 36px;
        }
        .heat-cell:hover { transform: scale(1.12); z-index: 2; position: relative; }
        select {
          background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border);
          border-radius: 8px; padding: 6px 10px; font-size: 13px; font-weight: 500;
          cursor: pointer; font-family: inherit; outline: none;
        }
        select:focus { border-color: var(--accent); }
      `}</style>

      <div className="pos-root" style={{ minHeight: "100vh", background: "var(--bg)" }}>

        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
          <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

            <div className="row" style={{ gap: 16, flexShrink: 0 }}>
              <div className="row" style={{ gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: "#1c1917", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Store size={16} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1 }}>POS Analytics</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1, lineHeight: 1 }}>Enterprise Dashboard</div>
                </div>
              </div>

              <div style={{ width: 1, height: 24, background: "var(--border)" }} />

              <div className="row hide-mobile" style={{ gap: 6, cursor: "pointer", padding: "4px 8px", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: session ? "#16a34a" : "#a8a29e" }} />
                <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-secondary)" }}>{branch}</span>
              </div>
            </div>

            <div className="row" style={{ gap: 3, padding: "4px", background: "var(--bg-muted)", borderRadius: 10, border: "1px solid var(--border)" }}>
              {(["today", "week", "month"] as Period[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)} className={`pill-tab ${period === p ? "active" : "inactive"}`}>
                  {p === "today" ? "Today" : p === "week" ? "This week" : "This month"}
                </button>
              ))}
            </div>

            <div className="row" style={{ gap: 8 }}>
              <div className="row hide-mobile" style={{ gap: 6, padding: "5px 10px", borderRadius: 8, background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
                <LiveDot />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'DM Mono', monospace" }}>{timeLabel}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{dateLabel}</span>
              </div>

              <div style={{ position: "relative" }} ref={notifRef}>
                <button
                  onClick={() => setNotifOpen((o) => !o)}
                  style={{ position: "relative", padding: "7px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--text-secondary)", transition: "all 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Bell size={15} />
                  {lowStockItems.some((i: any) => i.critical) && (
                    <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, background: "#dc2626", borderRadius: "50%", border: "1.5px solid var(--bg-card)" }} />
                  )}
                </button>

                {notifOpen && (
                  <div className="notif-panel fade-in">
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                      <div className="row" style={{ justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Notifications</span>
                        <span style={{ fontSize: 11, color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}>Mark all read</span>
                      </div>
                    </div>
                    {lowStockItems.filter((i: any) => i.critical).map((item: any, idx: number) => (
                      <div key={`crit-${idx}`} className="hover-row" style={{ padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(254,226,226,0.4)" }}>
                        <div style={{ marginTop: 1, flexShrink: 0 }}><AlertTriangle size={14} color="#dc2626" /></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12.5, color: "var(--text-primary)", fontWeight: 500 }}>{item.name} critically low ({item.stock} {item.unit})</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{fmtNotifTime(item.updatedAt)}</div>
                        </div>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1c1917", marginTop: 4, flexShrink: 0 }} />
                      </div>
                    ))}
                    {lowStockItems.filter((i: any) => !i.critical).slice(0, 2).map((item: any, idx: number) => (
                      <div key={`low-${idx}`} className="hover-row" style={{ padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ marginTop: 1, flexShrink: 0 }}><AlertTriangle size={14} color="#d97706" /></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12.5, color: "var(--text-primary)", fontWeight: 500 }}>{item.name} running low ({item.stock} {item.unit})</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{fmtNotifTime(item.updatedAt)}</div>
                        </div>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1c1917", marginTop: 4, flexShrink: 0 }} />
                      </div>
                    ))}
                    {target && target.pct >= 75 && (
                      <div className="hover-row" style={{ padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ marginTop: 1, flexShrink: 0 }}><CheckCircle2 size={14} color="#16a34a" /></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12.5, color: "var(--text-primary)", fontWeight: 400 }}>{target.label} — {target.pct}% reached</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Revenue target</div>
                        </div>
                      </div>
                    )}
                    {lowStockItems.length === 0 && !target && (
                      <div style={{ padding: "20px 16px", textAlign: "center", fontSize: 12.5, color: "var(--text-muted)" }}>No new notifications</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "20px 24px 40px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Row 1: Session + Stock alerts */}
          <div className="grid2">
            <Card>
              <CardPad style={{ paddingBottom: 14 }}>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <Clock size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Current session</span>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <LiveDot />
                    <Chip color={session ? "#16a34a" : "#a8a29e"}>{session ? "Open" : "No session"}</Chip>
                  </div>
                </div>
                {session ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {[
                      { label: "Started",         value: fmtTime(session.startedAt) },
                      { label: "Cashier",          value: session.cashier ?? "—" },
                      { label: "Duration",         value: session.duration ?? "—" },
                      { label: "Cash in drawer",   value: safeFmt(session.cashInDrawer) },
                      { label: "Expected float",   value: safeFmt(session.expectedFloat) },
                      {
                        label: "Variance",
                        value: `${(session.variance ?? 0) >= 0 ? "+" : ""}${safeFmt(session.variance)}`,
                        accent: (session.variance ?? 0) >= 0 ? "#16a34a" : "#dc2626",
                      },
                    ].map((s) => (
                      <div key={s.label} style={{ background: "var(--bg-muted)", borderRadius: 9, padding: "10px 12px", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 10.5, color: "var(--text-muted)", fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: (s as any).accent || "var(--text-primary)" }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 13 }}>No active session for this terminal</div>
                )}
              </CardPad>
            </Card>

            <Card>
              <CardPad>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <AlertTriangle size={14} color="#d97706" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Stock alerts</span>
                  </div>
                  <Chip color="#d97706">{lowStockItems.length} items</Chip>
                </div>
                {lowStockItems.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 13 }}>All stock levels healthy</div>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 11, maxHeight: 100, overflowY: "auto", paddingRight: 4 }}>
                      {lowStockItems.map((item: any) => {
                        const pct = item.threshold > 0 ? Math.min(100, (item.stock / item.threshold) * 100) : 0;
                        const color = item.critical ? "#dc2626" : "#d97706";
                        return (
                          <div key={item.id ?? item.name} className="row" style={{ gap: 10 }}>
                            <Package size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                            <div className="progress-bar" style={{ width: 80 }}>
                              <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 76, textAlign: "right", fontFamily: "'DM Mono', monospace" }}>{item.stock} {item.unit}</span>
                          </div>
                        );
                      })}
                    </div>
                    {lowStockItems.length > 5 && (
                      <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--text-muted)", textAlign: "center" }}>Showing all {lowStockItems.length} items · scroll to see more</div>
                    )}
                  </>
                )}
              </CardPad>
            </Card>
          </div>

          {/* Row 2: KPI Cards */}
          <div className="fade-in grid4" style={{ opacity: isLoading ? 0.5 : 1, transition: "opacity 0.2s" }}>
            {kpis.map((kpi: any, i: number) => {
              const icons = [<DollarSign size={15} />, <ShoppingBag size={15} />, <ReceiptText size={15} />, <RotateCcw size={15} />];
              const accentColors = ["#1c1917", "#166534", "#92400e", "#991b1b"];
              const accentBgs = ["rgba(28,25,23,0.06)", "rgba(220,252,231,0.8)", "rgba(254,243,199,0.8)", "rgba(254,226,226,0.8)"];
              const col = accentColors[i] ?? "#1c1917";
              const bg = accentBgs[i] ?? "rgba(28,25,23,0.06)";
              const displayValue = kpi.label === "Orders" ? (kpi.value ?? 0).toLocaleString() : safeFmt(kpi.value);
              return (
                <Card key={kpi.label} style={{ position: "relative", overflow: "hidden" }}>
                  <CardPad>
                    <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{kpi.label}</span>
                      <div style={{ padding: "6px", borderRadius: 8, background: bg, color: col }}>{icons[i]}</div>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1 }}>{displayValue}</div>
                    <div className="row" style={{ gap: 5, marginTop: 10 }}>
                      <div className="row" style={{ gap: 3, fontSize: 12, fontWeight: 600, color: kpi.up ? "#166534" : "#991b1b", background: kpi.up ? "rgba(220,252,231,0.8)" : "rgba(254,226,226,0.8)", padding: "3px 7px", borderRadius: 20 }}>
                        {kpi.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {fmtDelta(kpi.delta ?? 0)}
                      </div>
                      <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{kpi.sub}</span>
                    </div>
                  </CardPad>
                </Card>
              );
            })}
          </div>

          {/* Row 3: Revenue Target */}
          {target && (
            <Card>
              <CardPad style={{ padding: "16px 20px" }}>
                <div className="row" style={{ gap: 12, flexWrap: "wrap", justifyContent: "space-between", marginBottom: 10 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <Target size={14} color="var(--text-secondary)" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{target.label}</span>
                  </div>
                  <div className="row" style={{ gap: 10 }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{safeFmt(target.current)}</span>
                      <span style={{ color: "var(--text-muted)", margin: "0 4px" }}>of</span>
                      {safeFmt(target.target)}
                    </span>
                    <Chip color={targetPct >= 85 ? "#16a34a" : "#d97706"}>{targetPct}% reached</Chip>
                  </div>
                </div>
                <div className="progress-bar" style={{ height: 6 }}>
                  <div className="progress-fill" style={{ width: `${targetPct}%`, background: targetPct >= 85 ? "#16a34a" : "#1c1917" }} />
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>{safeFmt((target.target ?? 0) - (target.current ?? 0))} remaining</div>
              </CardPad>
            </Card>
          )}

          {/* Row 4: Revenue chart + Payment methods */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12 }} className="lg-grid-chart">
            <style>{`@media(max-width:1100px){.lg-grid-chart{grid-template-columns:1fr!important}}`}</style>
            <Card>
              <CardPad style={{ paddingBottom: 0 }}>
                <SectionHeader
                  title="Revenue over time"
                  subtitle={period === "today" ? "Hourly breakdown" : period === "week" ? "Daily totals" : "Weekly totals"}
                  action={
                    <div className="row" style={{ gap: 10 }}>
                      <div className="row" style={{ gap: 5, fontSize: 11.5, color: "var(--text-muted)" }}>
                        <div style={{ width: 10, height: 2, borderRadius: 2, background: "#1c1917" }} />
                        <span>Current</span>
                        <div style={{ width: 10, height: 2, borderRadius: 2, background: "#d6d3d1", marginLeft: 6 }} />
                        <span>Prior</span>
                      </div>
                    </div>
                  }
                />
              </CardPad>
              <div style={{ padding: "0 8px 16px" }}>
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#1c1917" stopOpacity={0.08} />
                        <stop offset="95%" stopColor="#1c1917" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#a8a29e" stopOpacity={0.06} />
                        <stop offset="95%" stopColor="#a8a29e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a8a29e" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#a8a29e" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="prev"    stroke="#d6d3d1" strokeWidth={1.5} fill="url(#prevGrad)" dot={false} strokeDasharray="4 3" />
                    <Area type="monotone" dataKey="revenue" stroke="#1c1917" strokeWidth={2}   fill="url(#revGrad)"  dot={false} activeDot={{ r: 4, fill: "#1c1917", strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardPad>
                <SectionHeader title="Payment methods" subtitle="Transaction split" />
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                  <PieChart width={150} height={150}>
                    <Pie data={paymentData} cx={71} cy={71} innerRadius={48} outerRadius={68} paddingAngle={paymentData.length > 1 ? 3 : 0} dataKey="percentage" strokeWidth={0}>
                      {paymentData.map((_: any, i: number) => <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {paymentData.map((p: any, i: number) => (
                    <div key={p.name} className="row" style={{ justifyContent: "space-between" }}>
                      <div className="row" style={{ gap: 8 }}>
                        <div style={{ width: 9, height: 9, borderRadius: 3, background: PAYMENT_COLORS[i % PAYMENT_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{p.name}</span>
                      </div>
                      <div className="row" style={{ gap: 10 }}>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'DM Mono', monospace" }}>{safeFmt(p.amount)}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", minWidth: 40, textAlign: "right" }}>{p.percentage ?? 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardPad>
            </Card>
          </div>

          {/* Row 5: Category breakdown */}
          <Card>
            <CardPad>
              <SectionHeader title="Revenue by category" subtitle="All sales channels" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }} className="cat-grid">
                <style>{`@media(max-width:900px){.cat-grid{grid-template-columns:1fr 1fr!important}}`}</style>
                {categoryData.map((c: any) => {
                  const pct = totalCategory > 0 ? Math.round((c.value / totalCategory) * 100) : 0;
                  return (
                    <div key={c.name} style={{ background: "var(--bg-muted)", borderRadius: 11, padding: "14px 16px", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{c.name}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: 4 }}>${(c.value ?? 0).toLocaleString()}</div>
                      <div className="row" style={{ gap: 6, justifyContent: "space-between" }}>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.orders ?? 0} orders</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", background: "var(--border)", padding: "2px 7px", borderRadius: 20 }}>{pct}%</div>
                      </div>
                      <div className="progress-bar" style={{ marginTop: 10, height: 3 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: "var(--text-primary)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardPad>
          </Card>

          {/* Row 6: Heatmap */}
          <Card>
            <CardPad>
              <SectionHeader
                title="Peak hours heatmap"
                subtitle="Order volume by day and hour (last 4 weeks)"
                action={
                  <div className="row" style={{ gap: 5, fontSize: 11 }}>
                    <span style={{ color: "var(--text-muted)" }}>Low</span>
                    {["#f5f5f3","#e7e5e4","#d6d3d1","#a8a29e","#292524"].map((c, i) => (
                      <div key={i} style={{ width: 20, height: 12, borderRadius: 4, background: c, border: "1px solid var(--border)" }} />
                    ))}
                    <span style={{ color: "var(--text-muted)" }}>High</span>
                  </div>
                }
              />
              {heatmapLoading && <HeatmapSkeleton />}
              {!heatmapLoading && heatmapError && <EmptyHeatmap message="Failed to load heatmap data. Try refreshing." />}
              {!heatmapLoading && !heatmapError && heatmapRaw && (
                heatmapRaw.every((row: number[]) => row.every((v: number) => v === 0))
                  ? <EmptyHeatmap message="No order activity in the last 4 weeks." />
                  : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 3, minWidth: 560 }}>
                        <thead>
                          <tr>
                            <th style={{ width: 36, textAlign: "left", paddingBottom: 6, fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }} />
                            {HOURS.map((h) => (
                              <th key={h} style={{ textAlign: "center", paddingBottom: 6, fontSize: 11, color: "var(--text-muted)", fontWeight: 500, minWidth: 36 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {DAYS.map((day, di) => (
                            <tr key={day}>
                              <td style={{ fontSize: 11.5, color: "var(--text-muted)", paddingRight: 6, fontWeight: 500, whiteSpace: "nowrap" }}>{day}</td>
                              {HOURS.map((_, hi) => {
                                const val = heatmapRaw[di]?.[hi] ?? 0;
                                const { bg, text } = heatColor(val);
                                return <td key={hi} className="heat-cell" style={{ background: bg, color: text }} title={`${day} ${HOURS[hi]}: ${val} orders`}>{val}</td>;
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
              )}
              {!heatmapLoading && !heatmapError && !heatmapRaw && <EmptyHeatmap message="No heatmap data available." />}
            </CardPad>
          </Card>

          {/* Row 7: Top products + Recent orders + Staff */}
          <div className="grid3">
            <Card>
              <CardPad>
                <SectionHeader title="Top products" subtitle="By revenue" />
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {topProducts.map((p: any, i: number) => (
                    <div key={p.name} className="row" style={{ gap: 10 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: i < 3 ? "rgba(28,25,23,0.08)" : "var(--bg-muted)", color: i < 3 ? "var(--text-primary)" : "var(--text-muted)" }}>{p.rank ?? i + 1}</span>
                      <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                      <div className="progress-bar" style={{ width: 50 }}>
                        <div className="progress-fill" style={{ width: `${p.pct ?? 0}%`, background: "var(--text-primary)" }} />
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)", minWidth: 46, textAlign: "right", fontFamily: "'DM Mono', monospace" }}>${(p.revenue ?? 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardPad>
            </Card>

            <Card>
              <CardPad style={{ paddingBottom: 10 }}>
                <SectionHeader title="Recent orders" action={
                  <button style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    View all <ArrowRight size={12} />
                  </button>
                } />
              </CardPad>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {recentOrders.map((o: any, i: number) => {
                  const s = orderStatusConfig[o.status as OrderStatus] ?? orderStatusConfig.paid;
                  return (
                    <div key={o.id} className="hover-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 20px", borderTop: i > 0 ? "1px solid var(--border)" : "none", transition: "background 0.15s" }}>
                      <div>
                        <div className="row" style={{ gap: 7, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "'DM Mono', monospace" }}>{o.id}</span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{o.items} item{o.items !== 1 ? "s" : ""}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{o.time} · {o.channel}</div>
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFamily: "'DM Mono', monospace" }}>{typeof o.amount === "number" ? safeFmt(o.amount) : (o.amount ?? "—")}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 20, color: s.color, background: s.bg }}>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />
                          {s.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <CardPad>
                <SectionHeader title="Cashier performance" subtitle={period === "today" ? "Today" : period === "week" ? "This week" : "This month"} />
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {staffData.map((s: any) => (
                    <div key={s.cashierId ?? s.name} className="row" style={{ gap: 11 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: "var(--bg-muted)", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, border: "1px solid var(--border)" }}>{s.initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row" style={{ justifyContent: "space-between", marginBottom: 5 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1 }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.role}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", fontFamily: "'DM Mono', monospace" }}>${(s.sales ?? 0).toLocaleString()}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 1, color: (s.trend ?? 0) > 0 ? "#16a34a" : "#dc2626" }}>{(s.trend ?? 0) > 0 ? "+" : ""}{s.trend ?? 0}%</div>
                          </div>
                        </div>
                        <div className="row" style={{ gap: 8 }}>
                          <div className="progress-bar" style={{ flex: 1, height: 4 }}>
                            <div className="progress-fill" style={{ width: `${((s.sales ?? 0) / maxStaffSales) * 100}%`, background: "var(--text-primary)" }} />
                          </div>
                          <span style={{ fontSize: 11.5, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{s.txn ?? 0} txn</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardPad>
            </Card>
          </div>

          {/* Row 8: Customer insights + Discounts + Tables */}
          <div className="grid3">
            <Card>
              <CardPad>
                <SectionHeader title="Customer insights" />
                <div className="grid2" style={{ marginBottom: 14 }}>
                  {[
                    { label: "New today",  value: customerData?.newToday  ?? 0, color: "#1c40af", bg: "#eff6ff", border: "#bfdbfe" },
                    { label: "Returning",  value: customerData?.returning ?? 0, color: "#166534", bg: "#f0fdf4", border: "#bbf7d0" },
                  ].map((c) => (
                    <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${c.border}` }}>
                      <div style={{ fontSize: 11, color: c.color, fontWeight: 500, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{c.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: c.color, letterSpacing: "-0.03em" }}>{c.value}</div>
                    </div>
                  ))}
                </div>
                <Divider style={{ marginBottom: 14 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Top spender today", value: customerData?.topSpender ?? "—", mono: false },
                    { label: "Amount spent",       value: customerData ? safeFmt(customerData.topAmount) : "—", mono: true, color: "#166534" },
                    { label: "Avg visits / period", value: customerData ? `${customerData.avgVisits ?? 0}×` : "—", mono: true },
                    ...(customerData?.satisfaction != null ? [{ label: "Satisfaction score", value: `${customerData.satisfaction} ★`, mono: false, color: "#92400e" }] : []),
                  ].map((r) => (
                    <div key={r.label} className="row" style={{ justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{r.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: (r as any).color || "var(--text-primary)", fontFamily: r.mono ? "'DM Mono', monospace" : "inherit" }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </CardPad>
            </Card>

            <Card>
              <CardPad style={{ paddingBottom: 12 }}>
                <SectionHeader title="Discounts & promos" subtitle={period === "today" ? "Applied today" : period === "week" ? "Applied this week" : "Applied this month"} />
              </CardPad>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {discountData.length === 0 ? (
                  <div style={{ padding: "24px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No discounts applied</div>
                ) : (
                  discountData.map((d: any, i: number) => (
                    <div key={d.code} className="hover-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid var(--border)", transition: "background 0.15s" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "'DM Mono', monospace" }}>{d.code}</div>
                        <div className="row" style={{ gap: 6, marginTop: 3 }}>
                          <Chip color="#57534e">{d.type}</Chip>
                          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{d.uses ?? 0} uses</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#991b1b", fontFamily: "'DM Mono', monospace" }}>{safeFmt(d.saved)}</div>
                    </div>
                  ))
                )}
              </div>
              <CardPad style={{ paddingTop: 12, paddingBottom: 14 }}>
                <Divider style={{ marginBottom: 12 }} />
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Total discounts given</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#991b1b", fontFamily: "'DM Mono', monospace" }}>{safeFmt(discountTotal)}</span>
                </div>
              </CardPad>
            </Card>

            <Card>
              <CardPad>
                <SectionHeader title="Floor plan" subtitle={`${(tableData as any[]).filter((t) => t.status === "occupied").length} of ${(tableData as any[]).length} tables in use`} />
                {tablesError ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 13 }}>Unable to load tables — server error</div>
                ) : (tableData as any[]).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 13 }}>No tables configured</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
                    {(tableData as any[]).map((t) => {
                      const s = tableStatusConfig[t.status as TableStatus] ?? tableStatusConfig.available;
                      return (
                        <div key={t.id} style={{ borderRadius: 10, border: `1px solid ${s.border}`, background: s.bg, padding: "10px 6px", textAlign: "center", cursor: "default", transition: "transform 0.15s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        >
                          <div style={{ fontSize: 12.5, fontWeight: 800, color: s.color, marginBottom: 2 }}>{t.id}</div>
                          <div style={{ fontSize: 10, color: s.color, opacity: 0.7, fontWeight: 500 }}>{t.status === "occupied" ? t.duration : t.status === "reserved" ? "resv." : "free"}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Divider style={{ marginBottom: 12 }} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                  {[
                    { label: "Occupied",  count: (tableData as any[]).filter((t) => t.status === "occupied").length,  color: "#1e40af" },
                    { label: "Available", count: (tableData as any[]).filter((t) => t.status === "available").length, color: "#166534" },
                    { label: "Reserved",  count: (tableData as any[]).filter((t) => t.status === "reserved").length,  color: "#92400e" },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: s.color, letterSpacing: "-0.02em" }}>{s.count}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </CardPad>
            </Card>
          </div>

          {/* Footer */}
          <div className="row" style={{ justifyContent: "space-between", padding: "8px 0", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>POS Analytics · Last synced {timeLabel}</span>
            <div className="row" style={{ gap: 12 }}>
              {["Documentation", "Support", "API Status"].map((l) => (
                <span key={l} style={{ fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >{l}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}