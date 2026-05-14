"use client";

import { useState, useEffect } from "react";
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
  ChevronDown,
  Bell,
  Download,
  RefreshCw,
  Store,
  CheckCircle2,
  Zap,
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
import { GhostBtn } from "@/components/dashboard/GhostBtn";
import { heatColor } from "@/components/dashboard/heatColor";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { Card } from "@/components/ui/card";
import { fmt } from "@/types/pos";

// ─── Types ───────────────────────────────────────────────────────────────────

type Period = "today" | "week" | "month";
type OrderStatus = "paid" | "refund" | "pending";
type TableStatus = "occupied" | "available" | "reserved";

type Order = {
  id: string;
  time: string;
  channel: string;
  amount: string;
  status: OrderStatus;
  items: number;
};

type StaffMember = {
  initials: string;
  name: string;
  role: string;
  txn: number;
  sales: number;
  color: string;
  trend: number;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PAYMENT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

const paymentData = [
  { name: "Card", value: 58, amount: "$4,883" },
  { name: "Cash", value: 24, amount: "$2,021" },
  { name: "Mobile Pay", value: 18, amount: "$1,516" },
];

const topProducts = [
  { name: "Espresso", revenue: 1240, orders: 248, pct: 100 },
  { name: "Latte", revenue: 1017, orders: 194, pct: 82 },
  { name: "Croissant", revenue: 793, orders: 211, pct: 64 },
  { name: "Cappuccino", revenue: 632, orders: 120, pct: 51 },
  { name: "Sandwich", revenue: 484, orders: 88, pct: 39 },
  { name: "Matcha Latte", revenue: 347, orders: 66, pct: 28 },
];

const categoryData = [
  { name: "Coffee", value: 4820, color: "#3b82f6", orders: 892 },
  { name: "Food", value: 1870, color: "#10b981", orders: 341 },
  { name: "Cold drinks", value: 980, color: "#f59e0b", orders: 187 },
  { name: "Desserts", value: 620, color: "#8b5cf6", orders: 124 },
  { name: "Other", value: 130, color: "#94a3b8", orders: 31 },
];

const recentOrders: Order[] = [
  {
    id: "#0089",
    time: "2 min ago",
    channel: "Table 4",
    amount: "$54.00",
    status: "paid",
    items: 3,
  },
  {
    id: "#0088",
    time: "11 min ago",
    channel: "Takeaway",
    amount: "$12.50",
    status: "paid",
    items: 1,
  },
  {
    id: "#0087",
    time: "18 min ago",
    channel: "Table 2",
    amount: "$7.80",
    status: "refund",
    items: 1,
  },
  {
    id: "#0086",
    time: "26 min ago",
    channel: "Table 7",
    amount: "$31.20",
    status: "paid",
    items: 4,
  },
  {
    id: "#0085",
    time: "41 min ago",
    channel: "Takeaway",
    amount: "$19.40",
    status: "pending",
    items: 2,
  },
  {
    id: "#0084",
    time: "58 min ago",
    channel: "Table 1",
    amount: "$68.90",
    status: "paid",
    items: 5,
  },
];

const staffData: StaffMember[] = [
  {
    initials: "SR",
    name: "Sarah R.",
    role: "Head Cashier",
    txn: 74,
    sales: 2890,
    color: "#3b82f6",
    trend: 12,
  },
  {
    initials: "MK",
    name: "Mike K.",
    role: "Cashier",
    txn: 61,
    sales: 2210,
    color: "#10b981",
    trend: 5,
  },
  {
    initials: "JL",
    name: "Jin L.",
    role: "Cashier",
    txn: 48,
    sales: 1950,
    color: "#f59e0b",
    trend: -2,
  },
  {
    initials: "DP",
    name: "Diana P.",
    role: "Cashier",
    txn: 30,
    sales: 1370,
    color: "#8b5cf6",
    trend: 8,
  },
];

const lowStockItems = [
  { name: "Oat Milk", stock: 2, unit: "cartons", threshold: 5, critical: true },
  { name: "Croissant", stock: 4, unit: "pcs", threshold: 10, critical: false },
  {
    name: "Matcha Powder",
    stock: 1,
    unit: "bags",
    threshold: 3,
    critical: true,
  },
  {
    name: "Paper Cups (M)",
    stock: 15,
    unit: "pcs",
    threshold: 50,
    critical: false,
  },
];

const tableData = [
  { id: "T1", status: "occupied" as TableStatus, duration: "48m", guests: 3 },
  { id: "T2", status: "available" as TableStatus, duration: "—", guests: 0 },
  { id: "T3", status: "occupied" as TableStatus, duration: "12m", guests: 2 },
  {
    id: "T4",
    status: "occupied" as TableStatus,
    duration: "1h 22m",
    guests: 4,
  },
  { id: "T5", status: "available" as TableStatus, duration: "—", guests: 0 },
  {
    id: "T6",
    status: "reserved" as TableStatus,
    duration: "7:30 PM",
    guests: 6,
  },
  { id: "T7", status: "occupied" as TableStatus, duration: "5m", guests: 1 },
  { id: "T8", status: "available" as TableStatus, duration: "—", guests: 0 },
];

const discountData = [
  { code: "STAFF10", uses: 28, saved: "$84.00", type: "Staff" },
  { code: "HAPPY20", uses: 17, saved: "$142.00", type: "Happy Hour" },
  { code: "LOYALTY", uses: 9, saved: "$63.00", type: "Loyalty" },
];

const customerData = {
  newToday: 34,
  returning: 179,
  topSpender: "Maria G.",
  topAmount: "$187.50",
  avgVisits: 2.4,
  satisfaction: 4.8,
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = [
  "8am",
  "9am",
  "10am",
  "11am",
  "12pm",
  "1pm",
  "2pm",
  "3pm",
  "4pm",
  "5pm",
  "6pm",
  "7pm",
];
const heatmapRaw = [
  [8, 22, 31, 40, 55, 50, 38, 28, 20, 15, 18, 10],
  [6, 18, 28, 35, 48, 44, 32, 25, 18, 12, 14, 8],
  [9, 24, 34, 44, 60, 54, 40, 30, 22, 16, 20, 12],
  [7, 20, 29, 38, 52, 47, 35, 26, 19, 13, 16, 9],
  [10, 28, 38, 50, 68, 62, 48, 36, 26, 20, 24, 15],
  [14, 36, 52, 68, 88, 80, 62, 48, 34, 26, 32, 20],
  [5, 14, 20, 26, 36, 32, 24, 18, 12, 8, 10, 6],
];

const revenueByPeriod: Record<
  Period,
  { label: string; revenue: number; prev: number }[]
> = {
  today: [
    { label: "8am", revenue: 180, prev: 160 },
    { label: "9am", revenue: 420, prev: 380 },
    { label: "10am", revenue: 610, prev: 540 },
    { label: "11am", revenue: 890, prev: 810 },
    { label: "12pm", revenue: 1240, prev: 1100 },
    { label: "1pm", revenue: 980, prev: 900 },
    { label: "2pm", revenue: 760, prev: 690 },
    { label: "3pm", revenue: 640, prev: 580 },
    { label: "4pm", revenue: 530, prev: 490 },
    { label: "5pm", revenue: 480, prev: 440 },
    { label: "6pm", revenue: 690, prev: 610 },
  ],
  week: [
    { label: "Mon", revenue: 6200, prev: 5800 },
    { label: "Tue", revenue: 7400, prev: 6900 },
    { label: "Wed", revenue: 8100, prev: 7400 },
    { label: "Thu", revenue: 7800, prev: 7200 },
    { label: "Fri", revenue: 9200, prev: 8600 },
    { label: "Sat", revenue: 11400, prev: 10200 },
    { label: "Sun", revenue: 4680, prev: 4200 },
  ],
  month: [
    { label: "W1", revenue: 48000, prev: 43000 },
    { label: "W2", revenue: 57000, prev: 51000 },
    { label: "W3", revenue: 62000, prev: 56000 },
    { label: "W4", revenue: 51400, prev: 47000 },
  ],
};

const kpiByPeriod: Record<
  Period,
  { label: string; value: string; delta: string; up: boolean; sub: string }[]
> = {
  today: [
    {
      label: "Total Revenue",
      value: "$8,420",
      delta: "+12.4%",
      up: true,
      sub: "vs yesterday",
    },
    {
      label: "Orders",
      value: "213",
      delta: "+8.1%",
      up: true,
      sub: "vs yesterday",
    },
    {
      label: "Avg Order Value",
      value: "$39.50",
      delta: "-2.3%",
      up: false,
      sub: "vs yesterday",
    },
    {
      label: "Refunds",
      value: "$310",
      delta: "+1.2%",
      up: false,
      sub: "vs yesterday",
    },
  ],
  week: [
    {
      label: "Total Revenue",
      value: "$54,780",
      delta: "+9.1%",
      up: true,
      sub: "vs last week",
    },
    {
      label: "Orders",
      value: "1,342",
      delta: "+5.4%",
      up: true,
      sub: "vs last week",
    },
    {
      label: "Avg Order Value",
      value: "$40.80",
      delta: "+1.1%",
      up: true,
      sub: "vs last week",
    },
    {
      label: "Refunds",
      value: "$1,920",
      delta: "-0.6%",
      up: true,
      sub: "vs last week",
    },
  ],
  month: [
    {
      label: "Total Revenue",
      value: "$218,400",
      delta: "+14.2%",
      up: true,
      sub: "vs last month",
    },
    {
      label: "Orders",
      value: "5,610",
      delta: "+11.0%",
      up: true,
      sub: "vs last month",
    },
    {
      label: "Avg Order Value",
      value: "$38.90",
      delta: "-0.8%",
      up: false,
      sub: "vs last month",
    },
    {
      label: "Refunds",
      value: "$7,240",
      delta: "+2.1%",
      up: false,
      sub: "vs last month",
    },
  ],
};

const targetByPeriod: Record<
  Period,
  { target: number; current: number; label: string }
> = {
  today: { target: 10000, current: 8420, label: "Daily revenue target" },
  week: { target: 60000, current: 54780, label: "Weekly revenue target" },
  month: { target: 240000, current: 218400, label: "Monthly revenue target" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const orderStatusConfig: Record<
  OrderStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  paid: {
    label: "Paid",
    color: "#059669",
    bg: "rgba(5,150,105,0.08)",
    dot: "#059669",
  },
  refund: {
    label: "Refunded",
    color: "#e11d48",
    bg: "rgba(225,29,72,0.08)",
    dot: "#e11d48",
  },
  pending: {
    label: "Pending",
    color: "#d97706",
    bg: "rgba(217,119,6,0.08)",
    dot: "#d97706",
  },
};

const tableStatusConfig: Record<
  TableStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  occupied: {
    label: "In Use",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.25)",
  },
  available: {
    label: "Free",
    color: "#059669",
    bg: "rgba(5,150,105,0.08)",
    border: "rgba(5,150,105,0.25)",
  },
  reserved: {
    label: "Reserved",
    color: "#d97706",
    bg: "rgba(217,119,6,0.08)",
    border: "rgba(217,119,6,0.25)",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

// function SkeletonLoader() {
//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "20px" }}>
//       {[100, 80, 90, 70].map((w, i) => (
//         <div key={i} style={{
//           height: 12, borderRadius: 6, background: "var(--bg-muted)",
//           width: `${w}%`, animation: "shimmer 1.5s ease-in-out infinite",
//           animationDelay: `${i * 0.1}s`,
//         }} />
//       ))}
//       <style>{`@keyframes shimmer{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
//     </div>
//   );
// }

// ─── Main Component ───────────────────────────────────────────────────────────

export default function POSDashboardPage() {
  const [period, setPeriod] = useState<Period>("today");
  const [liveTime, setLiveTime] = useState(new Date());
  const [notifOpen, setNotifOpen] = useState(false);
  const [branch, setBranch] = useState("Main Branch — Downtown");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const handlePeriodChange = (p: Period) => {
    setIsLoading(true);
    setTimeout(() => {
      setPeriod(p);
      setIsLoading(false);
    }, 350);
  };

  const kpis = kpiByPeriod[period];
  const target = targetByPeriod[period];
  const targetPct = Math.min(
    100,
    Math.round((target.current / target.target) * 100),
  );
  const maxStaffSales = Math.max(...staffData.map((s) => s.sales));
  const totalCategory = categoryData.reduce((a, b) => a + b.value, 0);

  const timeLabel = liveTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateLabel = liveTime.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <>
      {/* ─ CSS Variables & Global Styles ─ */}
      <style>{`
        :root {
          --bg: #f5f6f8;
          --bg-card: #ffffff;
          --bg-muted: #f1f3f6;
          --bg-hover: #f8f9fb;
          --border: #e8eaed;
          --border-strong: #d0d5dd;
          --text-primary: #0f1117;
          --text-secondary: #4a5568;
          --text-muted: #8a94a6;
          --accent: #3b82f6;
          --accent-muted: rgba(59,130,246,0.09);
          --sidebar-w: 0px;
          --header-h: 60px;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --bg: #0e1117;
            --bg-card: #161b27;
            --bg-muted: #1e2535;
            --bg-hover: #1a2030;
            --border: #262e3d;
            --border-strong: #3a4560;
            --text-primary: #f0f3f9;
            --text-secondary: #8892a4;
            --text-muted: #4a5568;
          }
        }
        * { box-sizing: border-box; }
        body { background: var(--bg); }
        .pos-root { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; }
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .row { display: flex; align-items: center; }
        .col { display: flex; flex-direction: column; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        @media(max-width: 1100px) {
          .grid4 { grid-template-columns: 1fr 1fr; }
          .grid3 { grid-template-columns: 1fr 1fr; }
          .lg-span2 { grid-column: span 2 !important; }
        }
        @media(max-width: 700px) {
          .grid2 { grid-template-columns: 1fr; }
          .grid3 { grid-template-columns: 1fr; }
          .grid4 { grid-template-columns: 1fr; }
          .lg-span2 { grid-column: span 1 !important; }
          .hide-mobile { display: none !important; }
        }
        .hover-row:hover { background: var(--bg-hover); }
        .pill-tab { padding: 6px 14px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; font-family: inherit; }
        .pill-tab.active { background: var(--accent); color: #fff; box-shadow: 0 1px 4px rgba(59,130,246,0.35); }
        .pill-tab.inactive { background: transparent; color: var(--text-muted); }
        .pill-tab.inactive:hover { color: var(--text-primary); background: var(--bg-muted); }
        .progress-bar { height: 5px; border-radius: 10px; background: var(--bg-muted); overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 10px; transition: width 0.6s cubic-bezier(.22,.68,0,1.2); }
        .notif-panel { position: absolute; right: 0; top: calc(100% + 8px); width: 320px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,0.12); z-index: 100; overflow: hidden; }
        .heat-cell { border-radius: 6px; text-align: center; padding: 5px 2px; font-size: 11px; font-weight: 600; font-family: 'DM Mono', monospace; cursor: default; transition: transform 0.1s; min-width: 36px; }
        .heat-cell:hover { transform: scale(1.12); z-index: 2; position: relative; }
        select { background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; outline: none; }
        select:focus { border-color: var(--accent); }
      `}</style>

      <div
        className="pos-root"
        style={{ minHeight: "100vh", background: "var(--bg)" }}
      >
        {/* ── Sticky Top Header ────────────────────────────────────── */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "var(--bg-card)",
            borderBottom: "1px solid var(--border)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              maxWidth: 1440,
              margin: "0 auto",
              padding: "0 24px",
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            {/* Left: Brand + branch selector */}
            <div className="row" style={{ gap: 16, flexShrink: 0 }}>
              <div className="row" style={{ gap: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: "linear-gradient(135deg,#3b82f6,#2563eb)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 6px rgba(59,130,246,0.35)",
                  }}
                >
                  <Store size={16} color="#fff" />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    POS Analytics
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 1,
                      lineHeight: 1,
                    }}
                  >
                    Enterprise Dashboard
                  </div>
                </div>
              </div>

              <div
                style={{ width: 1, height: 24, background: "var(--border)" }}
              />

              <div
                className="row hide-mobile"
                style={{
                  gap: 6,
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
                onClick={() => {}}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#10b981",
                  }}
                />
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                  }}
                >
                  {branch}
                </span>
                <ChevronDown size={13} color="var(--text-muted)" />
              </div>
            </div>

            {/* Center: Period tabs */}
            <div
              className="row"
              style={{
                gap: 3,
                padding: "4px",
                background: "var(--bg-muted)",
                borderRadius: 10,
                border: "1px solid var(--border)",
              }}
            >
              {(["today", "week", "month"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`pill-tab ${period === p ? "active" : "inactive"}`}
                >
                  {p === "today"
                    ? "Today"
                    : p === "week"
                      ? "This Week"
                      : "This Month"}
                </button>
              ))}
            </div>

            {/* Right: Actions */}
            <div className="row" style={{ gap: 8 }}>
              <div
                className="row hide-mobile"
                style={{
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 8,
                  background: "var(--bg-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                <LiveDot />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {timeLabel}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {dateLabel}
                </span>
              </div>

              <GhostBtn>
                <RefreshCw size={13} />
                <span className="hide-mobile">Refresh</span>
              </GhostBtn>

              <GhostBtn>
                <Download size={13} />
                <span className="hide-mobile">Export</span>
              </GhostBtn>

              {/* Notification bell */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setNotifOpen((o) => !o)}
                  style={{
                    position: "relative",
                    padding: "7px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    color: "var(--text-secondary)",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-muted)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <Bell size={15} />
                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 7,
                      height: 7,
                      background: "#e11d48",
                      borderRadius: "50%",
                      border: "1.5px solid var(--bg-card)",
                    }}
                  />
                </button>
                {notifOpen && (
                  <div className="notif-panel fade-in">
                    <div
                      style={{
                        padding: "14px 16px",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div
                        className="row"
                        style={{ justifyContent: "space-between" }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          Notifications
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--accent)",
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                        >
                          Mark all read
                        </span>
                      </div>
                    </div>
                    {[
                      {
                        icon: <AlertTriangle size={14} color="#f59e0b" />,
                        text: "Oat Milk critically low (2 cartons)",
                        time: "3 min ago",
                        unread: true,
                      },
                      {
                        icon: <AlertTriangle size={14} color="#e11d48" />,
                        text: "Matcha Powder nearly depleted",
                        time: "12 min ago",
                        unread: true,
                      },
                      {
                        icon: <CheckCircle2 size={14} color="#10b981" />,
                        text: "Daily target 84% reached",
                        time: "30 min ago",
                        unread: false,
                      },
                      {
                        icon: <Zap size={14} color="#3b82f6" />,
                        text: "Peak hour started — 12pm traffic",
                        time: "1 hr ago",
                        unread: false,
                      },
                    ].map((n, i) => (
                      <div
                        key={i}
                        className="hover-row"
                        style={{
                          padding: "12px 16px",
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                          background: n.unread
                            ? "rgba(59,130,246,0.04)"
                            : "transparent",
                        }}
                      >
                        <div style={{ marginTop: 1, flexShrink: 0 }}>
                          {n.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 12.5,
                              color: "var(--text-primary)",
                              fontWeight: n.unread ? 500 : 400,
                            }}
                          >
                            {n.text}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              marginTop: 2,
                            }}
                          >
                            {n.time}
                          </div>
                        </div>
                        {n.unread && (
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "#3b82f6",
                              marginTop: 4,
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content ─────────────────────────────────────────── */}
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            padding: "20px 24px 40px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* ── Row 1: Session + Stock alerts ── */}
          <div className="grid2">
            {/* Session widget */}
            <Card>
              <CardPad style={{ paddingBottom: 14 }}>
                <div
                  className="row"
                  style={{ justifyContent: "space-between", marginBottom: 14 }}
                >
                  <div className="row" style={{ gap: 8 }}>
                    <Clock size={14} color="var(--text-muted)" />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      Current Session
                    </span>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <LiveDot />
                    <Chip color="#10b981">Open</Chip>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: 8,
                  }}
                >
                  {[
                    { label: "Started", value: "08:00 AM" },
                    { label: "Cashier", value: "Sarah R." },
                    { label: "Duration", value: "6h 24m" },
                    { label: "Cash in Drawer", value: "$1,240" },
                    { label: "Expected Float", value: "$1,200" },
                    { label: "Variance", value: "+$40", accent: "#10b981" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
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
                          marginBottom: 4,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {s.label}
                      </div>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: s.accent || "var(--text-primary)",
                        }}
                      >
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>
              </CardPad>
            </Card>

            {/* Low stock */}
            <Card>
              <CardPad>
                <div
                  className="row"
                  style={{ justifyContent: "space-between", marginBottom: 14 }}
                >
                  <div className="row" style={{ gap: 8 }}>
                    <AlertTriangle size={14} color="#f59e0b" />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      Stock Alerts
                    </span>
                  </div>
                  <Chip color="#f59e0b">{lowStockItems.length} items</Chip>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 11 }}
                >
                  {lowStockItems.map((item) => {
                    const pct = Math.min(
                      100,
                      (item.stock / item.threshold) * 100,
                    );
                    const color = item.critical ? "#e11d48" : "#f59e0b";
                    return (
                      <div key={item.name} className="row" style={{ gap: 10 }}>
                        <Package
                          size={13}
                          color="var(--text-muted)"
                          style={{ flexShrink: 0 }}
                        />
                        <span
                          style={{
                            flex: 1,
                            fontSize: 13,
                            color: "var(--text-primary)",
                            fontWeight: 500,
                          }}
                        >
                          {item.name}
                        </span>
                        <div className="progress-bar" style={{ width: 80 }}>
                          <div
                            className="progress-fill"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color,
                            minWidth: 76,
                            textAlign: "right",
                            fontFamily: "'DM Mono', monospace",
                          }}
                        >
                          {item.stock} {item.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardPad>
            </Card>
          </div>

          {/* ── Row 2: KPI Cards ── */}
          <div
            className={`fade-in grid4`}
            style={{ opacity: isLoading ? 0.5 : 1, transition: "opacity 0.2s" }}
          >
            {kpis.map((kpi, i) => {
              const icons = [
                <DollarSign size={15} />,
                <ShoppingBag size={15} />,
                <ReceiptText size={15} />,
                <RotateCcw size={15} />,
              ];
              const colors = ["#3b82f6", "#10b981", "#f59e0b", "#e11d48"];
              const col = colors[i];
              return (
                <Card
                  key={kpi.label}
                  style={{ position: "relative", overflow: "hidden" }}
                >
                  <div
                    style={{
                      position: "absolute",
                      right: -15,
                      top: -15,
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      background: `${col}08`,
                    }}
                  />
                  <CardPad>
                    <div
                      className="row"
                      style={{
                        justifyContent: "space-between",
                        marginBottom: 14,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {kpi.label}
                      </span>
                      <div
                        style={{
                          padding: "6px",
                          borderRadius: 8,
                          background: `${col}12`,
                          color: col,
                        }}
                      >
                        {icons[i]}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                      }}
                    >
                      {kpi.value}
                    </div>
                    <div className="row" style={{ gap: 5, marginTop: 10 }}>
                      <div
                        className="row"
                        style={{
                          gap: 3,
                          fontSize: 12,
                          fontWeight: 600,
                          color: kpi.up ? "#10b981" : "#e11d48",
                          background: kpi.up
                            ? "rgba(16,185,129,0.08)"
                            : "rgba(225,29,72,0.08)",
                          padding: "3px 7px",
                          borderRadius: 20,
                        }}
                      >
                        {kpi.up ? (
                          <TrendingUp size={12} />
                        ) : (
                          <TrendingDown size={12} />
                        )}
                        {kpi.delta}
                      </div>
                      <span
                        style={{ fontSize: 11.5, color: "var(--text-muted)" }}
                      >
                        {kpi.sub}
                      </span>
                    </div>
                  </CardPad>
                </Card>
              );
            })}
          </div>

          {/* ── Row 3: Revenue Target bar ── */}
          <Card>
            <CardPad style={{ padding: "16px 20px" }}>
              <div
                className="row"
                style={{
                  gap: 12,
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div className="row" style={{ gap: 8 }}>
                  <Target size={14} color="var(--accent)" />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {target.label}
                  </span>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <span
                    style={{ fontSize: 13, color: "var(--text-secondary)" }}
                  >
                    <span
                      style={{ fontWeight: 700, color: "var(--text-primary)" }}
                    >
                      {fmt(target.current)}
                    </span>
                    <span
                      style={{ color: "var(--text-muted)", margin: "0 4px" }}
                    >
                      of
                    </span>
                    {fmt(target.target)}
                  </span>
                  <Chip color={targetPct >= 85 ? "#10b981" : "#f59e0b"}>
                    {targetPct}% reached
                  </Chip>
                </div>
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${targetPct}%`,
                    background: `linear-gradient(90deg, #3b82f6, ${targetPct >= 85 ? "#10b981" : "#60a5fa"})`,
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                {fmt(target.target - target.current)} remaining · On track to
                hit target by{" "}
                <span
                  style={{ fontWeight: 600, color: "var(--text-secondary)" }}
                >
                  8:00 PM
                </span>
              </div>
            </CardPad>
          </Card>

          {/* ── Row 4: Revenue chart + Payment methods ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 320px",
              gap: 12,
            }}
            className="lg-grid-chart"
          >
            <style>{`@media(max-width:1100px){.lg-grid-chart{grid-template-columns:1fr!important}}`}</style>

            <Card>
              <CardPad style={{ paddingBottom: 0 }}>
                <SectionHeader
                  title="Revenue Over Time"
                  subtitle={
                    period === "today"
                      ? "Hourly breakdown"
                      : period === "week"
                        ? "Daily totals"
                        : "Weekly totals"
                  }
                  action={
                    <div className="row" style={{ gap: 10 }}>
                      <div
                        className="row"
                        style={{
                          gap: 5,
                          fontSize: 11.5,
                          color: "var(--text-muted)",
                        }}
                      >
                        <div
                          style={{
                            width: 10,
                            height: 2,
                            borderRadius: 2,
                            background: "#3b82f6",
                          }}
                        />
                        <span>Current</span>
                        <div
                          style={{
                            width: 10,
                            height: 2,
                            borderRadius: 2,
                            background: "#e2e8f0",
                            marginLeft: 6,
                          }}
                        />
                        <span>Prior</span>
                      </div>
                    </div>
                  }
                />
              </CardPad>
              <div style={{ padding: "0 8px 16px" }}>
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart
                    data={revenueByPeriod[period]}
                    margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#94a3b8"
                          stopOpacity={0.08}
                        />
                        <stop
                          offset="95%"
                          stopColor="#94a3b8"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                      }
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="prev"
                      stroke="#cbd5e1"
                      strokeWidth={1.5}
                      fill="url(#prevGrad)"
                      dot={false}
                      strokeDasharray="4 3"
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fill="url(#revGrad)"
                      dot={false}
                      activeDot={{ r: 5, fill: "#3b82f6", strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardPad>
                <SectionHeader
                  title="Payment Methods"
                  subtitle="Transaction split"
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: 4,
                  }}
                >
                  <PieChart width={150} height={150}>
                    <Pie
                      data={paymentData}
                      cx={71}
                      cy={71}
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {paymentData.map((_, i) => (
                        <Cell key={i} fill={PAYMENT_COLORS[i]} />
                      ))}
                    </Pie>
                  </PieChart>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {paymentData.map((p, i) => (
                    <div
                      key={p.name}
                      className="row"
                      style={{ justifyContent: "space-between" }}
                    >
                      <div className="row" style={{ gap: 8 }}>
                        <div
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: 3,
                            background: PAYMENT_COLORS[i],
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {p.name}
                        </span>
                      </div>
                      <div className="row" style={{ gap: 10 }}>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            fontFamily: "'DM Mono', monospace",
                          }}
                        >
                          {p.amount}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            minWidth: 30,
                            textAlign: "right",
                          }}
                        >
                          {p.value}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardPad>
            </Card>
          </div>

          {/* ── Row 5: Category breakdown ── */}
          <Card>
            <CardPad>
              <SectionHeader
                title="Revenue by Category"
                subtitle="All sales channels"
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5,1fr)",
                  gap: 12,
                }}
                className="cat-grid"
              >
                <style>{`@media(max-width:900px){.cat-grid{grid-template-columns:1fr 1fr!important}}`}</style>
                {categoryData.map((c) => {
                  const pct = Math.round((c.value / totalCategory) * 100);
                  return (
                    <div
                      key={c.name}
                      style={{
                        background: "var(--bg-muted)",
                        borderRadius: 11,
                        padding: "14px 16px",
                        border: "1px solid var(--border)",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: `${pct * 0.7}%`,
                          background: `${c.color}0a`,
                        }}
                      />
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: 8,
                        }}
                      >
                        {c.name}
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color: "var(--text-primary)",
                          letterSpacing: "-0.02em",
                          marginBottom: 4,
                        }}
                      >
                        ${c.value.toLocaleString()}
                      </div>
                      <div
                        className="row"
                        style={{ gap: 6, justifyContent: "space-between" }}
                      >
                        <div
                          style={{ fontSize: 12, color: "var(--text-muted)" }}
                        >
                          {c.orders} orders
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: c.color,
                            background: `${c.color}12`,
                            padding: "2px 7px",
                            borderRadius: 20,
                          }}
                        >
                          {pct}%
                        </div>
                      </div>
                      <div
                        className="progress-bar"
                        style={{ marginTop: 10, height: 3 }}
                      >
                        <div
                          className="progress-fill"
                          style={{ width: `${pct}%`, background: c.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardPad>
          </Card>

          {/* ── Row 6: Peak hours heatmap ── */}
          <Card>
            <CardPad>
              <SectionHeader
                title="Peak Hours Heatmap"
                subtitle="Order volume by day and hour"
                action={
                  <div className="row" style={{ gap: 5, fontSize: 11 }}>
                    <span style={{ color: "var(--text-muted)" }}>Low</span>
                    {[
                      "rgba(59,130,246,0.07)",
                      "rgba(59,130,246,0.15)",
                      "rgba(59,130,246,0.30)",
                      "rgba(59,130,246,0.55)",
                      "rgba(59,130,246,0.85)",
                    ].map((c, i) => (
                      <div
                        key={i}
                        style={{
                          width: 20,
                          height: 12,
                          borderRadius: 4,
                          background: c,
                          border: "1px solid var(--border)",
                        }}
                      />
                    ))}
                    <span style={{ color: "var(--text-muted)" }}>High</span>
                  </div>
                }
              />
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "separate",
                    borderSpacing: 3,
                    minWidth: 560,
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          width: 36,
                          textAlign: "left",
                          paddingBottom: 6,
                          fontSize: 11,
                          color: "var(--text-muted)",
                          fontWeight: 400,
                        }}
                      />
                      {HOURS.map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "center",
                            paddingBottom: 6,
                            fontSize: 11,
                            color: "var(--text-muted)",
                            fontWeight: 500,
                            minWidth: 36,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day, di) => (
                      <tr key={day}>
                        <td
                          style={{
                            fontSize: 11.5,
                            color: "var(--text-muted)",
                            paddingRight: 6,
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {day}
                        </td>
                        {HOURS.map((_, hi) => {
                          const val = heatmapRaw[di][hi];
                          const { bg, text } = heatColor(val);
                          return (
                            <td
                              key={hi}
                              className="heat-cell"
                              style={{ background: bg, color: text }}
                              title={`${day} ${HOURS[hi]}: ${val} orders`}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardPad>
          </Card>

          {/* ── Row 7: Top products + Recent orders + Staff ── */}
          <div className="grid3">
            {/* Top products */}
            <Card>
              <CardPad>
                <SectionHeader title="Top Products" subtitle="By revenue" />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {topProducts.map((p, i) => (
                    <div key={p.name} className="row" style={{ gap: 10 }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 7,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                          background:
                            i < 3 ? "rgba(59,130,246,0.1)" : "var(--bg-muted)",
                          color: i < 3 ? "#3b82f6" : "var(--text-muted)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13,
                          color: "var(--text-primary)",
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.name}
                      </span>
                      <div className="progress-bar" style={{ width: 50 }}>
                        <div
                          className="progress-fill"
                          style={{ width: `${p.pct}%`, background: "#3b82f6" }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          minWidth: 46,
                          textAlign: "right",
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        ${p.revenue.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardPad>
            </Card>

            {/* Recent orders */}
            <Card>
              <CardPad style={{ paddingBottom: 10 }}>
                <SectionHeader
                  title="Recent Orders"
                  action={
                    <button
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--accent)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      View all <ArrowRight size={12} />
                    </button>
                  }
                />
              </CardPad>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {recentOrders.map((o, i) => {
                  const s = orderStatusConfig[o.status];
                  return (
                    <div
                      key={o.id}
                      className="hover-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "11px 20px",
                        borderTop: i > 0 ? "1px solid var(--border)" : "none",
                        transition: "background 0.15s",
                      }}
                    >
                      <div>
                        <div
                          className="row"
                          style={{ gap: 7, marginBottom: 3 }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "var(--text-primary)",
                              fontFamily: "'DM Mono', monospace",
                            }}
                          >
                            {o.id}
                          </span>
                          <span
                            style={{ fontSize: 11, color: "var(--text-muted)" }}
                          >
                            {o.items} item{o.items !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div
                          style={{ fontSize: 11.5, color: "var(--text-muted)" }}
                        >
                          {o.time} · {o.channel}
                        </div>
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            fontFamily: "'DM Mono', monospace",
                          }}
                        >
                          {o.amount}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11.5,
                            fontWeight: 600,
                            padding: "3px 9px",
                            borderRadius: 20,
                            color: s.color,
                            background: s.bg,
                          }}
                        >
                          <div
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: s.dot,
                            }}
                          />
                          {s.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Staff performance */}
            <Card>
              <CardPad>
                <SectionHeader
                  title="Cashier Performance"
                  subtitle={
                    period === "today"
                      ? "Today"
                      : period === "week"
                        ? "This week"
                        : "This month"
                  }
                />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  {staffData.map((s, i) => (
                    <div key={s.name} className="row" style={{ gap: 11 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          flexShrink: 0,
                          background: `${s.color}18`,
                          color: s.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 800,
                          letterSpacing: "-0.02em",
                          border: `1.5px solid ${s.color}30`,
                        }}
                      >
                        {s.initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="row"
                          style={{
                            justifyContent: "space-between",
                            marginBottom: 5,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "var(--text-primary)",
                                lineHeight: 1,
                              }}
                            >
                              {s.name}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                                marginTop: 2,
                              }}
                            >
                              {s.role}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 800,
                                color: "var(--text-primary)",
                                fontFamily: "'DM Mono', monospace",
                              }}
                            >
                              ${s.sales.toLocaleString()}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                marginTop: 1,
                                color: s.trend > 0 ? "#10b981" : "#e11d48",
                              }}
                            >
                              {s.trend > 0 ? "+" : ""}
                              {s.trend}%
                            </div>
                          </div>
                        </div>
                        <div className="row" style={{ gap: 8 }}>
                          <div
                            className="progress-bar"
                            style={{ flex: 1, height: 4 }}
                          >
                            <div
                              className="progress-fill"
                              style={{
                                width: `${(s.sales / maxStaffSales) * 100}%`,
                                background: s.color,
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 11.5,
                              color: "var(--text-muted)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.txn} txn
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardPad>
            </Card>
          </div>

          {/* ── Row 8: Customer insights + Discounts + Table status ── */}
          <div className="grid3">
            {/* Customer insights */}
            <Card>
              <CardPad>
                <SectionHeader title="Customer Insights" />
                <div className="grid2" style={{ marginBottom: 14 }}>
                  {[
                    {
                      label: "New Today",
                      value: customerData.newToday,
                      color: "#3b82f6",
                    },
                    {
                      label: "Returning",
                      value: customerData.returning,
                      color: "#10b981",
                    },
                  ].map((c) => (
                    <div
                      key={c.label}
                      style={{
                        background: `${c.color}09`,
                        borderRadius: 10,
                        padding: "12px 14px",
                        border: `1px solid ${c.color}20`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: 6,
                        }}
                      >
                        {c.label}
                      </div>
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 800,
                          color: c.color,
                          letterSpacing: "-0.03em",
                        }}
                      >
                        {c.value}
                      </div>
                    </div>
                  ))}
                </div>
                <Divider style={{ marginBottom: 14 }} />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {[
                    {
                      label: "Top spender today",
                      value: customerData.topSpender,
                      mono: false,
                    },
                    {
                      label: "Amount spent",
                      value: customerData.topAmount,
                      mono: true,
                      color: "#10b981",
                    },
                    {
                      label: "Avg visits / week",
                      value: `${customerData.avgVisits}×`,
                      mono: true,
                    },
                    {
                      label: "Satisfaction score",
                      value: `${customerData.satisfaction} ★`,
                      mono: false,
                      color: "#f59e0b",
                    },
                  ].map((r) => (
                    <div
                      key={r.label}
                      className="row"
                      style={{ justifyContent: "space-between" }}
                    >
                      <span
                        style={{ fontSize: 12.5, color: "var(--text-muted)" }}
                      >
                        {r.label}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: r.color || "var(--text-primary)",
                          fontFamily: r.mono
                            ? "'DM Mono', monospace"
                            : "inherit",
                        }}
                      >
                        {r.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardPad>
            </Card>

            {/* Discounts */}
            <Card>
              <CardPad style={{ paddingBottom: 12 }}>
                <SectionHeader
                  title="Discounts & Promos"
                  subtitle="Applied today"
                />
              </CardPad>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {discountData.map((d, i) => (
                  <div
                    key={d.code}
                    className="hover-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 20px",
                      borderTop: "1px solid var(--border)",
                      transition: "background 0.15s",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        {d.code}
                      </div>
                      <div className="row" style={{ gap: 6, marginTop: 3 }}>
                        <Chip color="#8b5cf6">{d.type}</Chip>
                        <span
                          style={{ fontSize: 11.5, color: "var(--text-muted)" }}
                        >
                          {d.uses} uses
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#e11d48",
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {d.saved}
                    </div>
                  </div>
                ))}
              </div>
              <CardPad style={{ paddingTop: 12, paddingBottom: 14 }}>
                <Divider style={{ marginBottom: 12 }} />
                <div
                  className="row"
                  style={{ justifyContent: "space-between" }}
                >
                  <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                    Total discounts given
                  </span>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#e11d48",
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    $289.00
                  </span>
                </div>
              </CardPad>
            </Card>

            {/* Table status */}
            <Card>
              <CardPad>
                <SectionHeader
                  title="Floor Plan"
                  subtitle={`${tableData.filter((t) => t.status === "occupied").length} of ${tableData.length} tables in use`}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  {tableData.map((t) => {
                    const s = tableStatusConfig[t.status];
                    return (
                      <div
                        key={t.id}
                        style={{
                          borderRadius: 10,
                          border: `1.5px solid ${s.border}`,
                          background: s.bg,
                          padding: "10px 6px",
                          textAlign: "center",
                          cursor: "default",
                          transition: "transform 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.transform = "scale(1.04)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.transform = "scale(1)")
                        }
                      >
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: 800,
                            color: s.color,
                            marginBottom: 2,
                          }}
                        >
                          {t.id}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: s.color,
                            opacity: 0.75,
                            fontWeight: 500,
                          }}
                        >
                          {t.status === "occupied"
                            ? t.duration
                            : t.status === "reserved"
                              ? "resv."
                              : "free"}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Divider style={{ marginBottom: 12 }} />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: 6,
                  }}
                >
                  {[
                    {
                      label: "Occupied",
                      count: tableData.filter((t) => t.status === "occupied")
                        .length,
                      color: "#3b82f6",
                    },
                    {
                      label: "Available",
                      count: tableData.filter((t) => t.status === "available")
                        .length,
                      color: "#10b981",
                    },
                    {
                      label: "Reserved",
                      count: tableData.filter((t) => t.status === "reserved")
                        .length,
                      color: "#f59e0b",
                    },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color: s.color,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {s.count}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </CardPad>
            </Card>
          </div>

          {/* ── Footer ── */}
          <div
            className="row"
            style={{
              justifyContent: "space-between",
              padding: "8px 0",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              POS Analytics · Last synced {timeLabel}
            </span>
            <div className="row" style={{ gap: 12 }}>
              {["Documentation", "Support", "API Status"].map((l) => (
                <span
                  key={l}
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--accent)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-muted)")
                  }
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
