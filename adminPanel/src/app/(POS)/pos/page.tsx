"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  ReceiptText,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ─── Types ─────────────────────────────────────────────────────────────────

type Period = "today" | "week" | "month";

type KPI = {
  label: string;
  value: string;
  delta: string;
  up: boolean;
  icon: React.ReactNode;
  color: string;
};

type Order = {
  id: string;
  time: string;
  channel: string;
  amount: string;
  status: "paid" | "refund" | "pending";
};

type Staff = {
  initials: string;
  name: string;
  txn: number;
  sales: string;
  color: string;
};

// ─── Mock data ──────────────────────────────────────────────────────────────

const revenueData: Record<Period, { label: string; revenue: number }[]> = {
  today: [
    { label: "8am", revenue: 180 },
    { label: "9am", revenue: 420 },
    { label: "10am", revenue: 610 },
    { label: "11am", revenue: 890 },
    { label: "12pm", revenue: 1240 },
    { label: "1pm", revenue: 980 },
    { label: "2pm", revenue: 760 },
    { label: "3pm", revenue: 640 },
    { label: "4pm", revenue: 530 },
    { label: "5pm", revenue: 480 },
    { label: "6pm", revenue: 690 },
  ],
  week: [
    { label: "Mon", revenue: 6200 },
    { label: "Tue", revenue: 7400 },
    { label: "Wed", revenue: 8100 },
    { label: "Thu", revenue: 7800 },
    { label: "Fri", revenue: 9200 },
    { label: "Sat", revenue: 11400 },
    { label: "Sun", revenue: 4680 },
  ],
  month: [
    { label: "Week 1", revenue: 48000 },
    { label: "Week 2", revenue: 57000 },
    { label: "Week 3", revenue: 62000 },
    { label: "Week 4", revenue: 51400 },
  ],
};

const kpiData: Record<Period, KPI[]> = {
  today: [
    { label: "Total Revenue", value: "$8,420", delta: "+12.4%", up: true, icon: <DollarSign size={15} />, color: "text-emerald-600" },
    { label: "Orders", value: "213", delta: "+8.1%", up: true, icon: <ShoppingBag size={15} />, color: "text-blue-600" },
    { label: "Avg Order Value", value: "$39.50", delta: "-2.3%", up: false, icon: <ReceiptText size={15} />, color: "text-amber-600" },
    { label: "Refunds", value: "$310", delta: "+1.2%", up: false, icon: <RotateCcw size={15} />, color: "text-rose-600" },
  ],
  week: [
    { label: "Total Revenue", value: "$54,780", delta: "+9.1%", up: true, icon: <DollarSign size={15} />, color: "text-emerald-600" },
    { label: "Orders", value: "1,342", delta: "+5.4%", up: true, icon: <ShoppingBag size={15} />, color: "text-blue-600" },
    { label: "Avg Order Value", value: "$40.80", delta: "+1.1%", up: true, icon: <ReceiptText size={15} />, color: "text-amber-600" },
    { label: "Refunds", value: "$1,920", delta: "-0.6%", up: true, icon: <RotateCcw size={15} />, color: "text-rose-600" },
  ],
  month: [
    { label: "Total Revenue", value: "$218,400", delta: "+14.2%", up: true, icon: <DollarSign size={15} />, color: "text-emerald-600" },
    { label: "Orders", value: "5,610", delta: "+11.0%", up: true, icon: <ShoppingBag size={15} />, color: "text-blue-600" },
    { label: "Avg Order Value", value: "$38.90", delta: "-0.8%", up: false, icon: <ReceiptText size={15} />, color: "text-amber-600" },
    { label: "Refunds", value: "$7,240", delta: "+2.1%", up: false, icon: <RotateCcw size={15} />, color: "text-rose-600" },
  ],
};

const topProducts = [
  { name: "Espresso", revenue: 1240, pct: 100 },
  { name: "Latte", revenue: 1017, pct: 82 },
  { name: "Croissant", revenue: 793, pct: 64 },
  { name: "Cappuccino", revenue: 632, pct: 51 },
  { name: "Sandwich", revenue: 484, pct: 39 },
  { name: "Matcha Latte", revenue: 347, pct: 28 },
];

const paymentData = [
  { name: "Card", value: 58 },
  { name: "Cash", value: 24 },
  { name: "Mobile Pay", value: 18 },
];
const paymentColors = ["#2563eb", "#059669", "#d97706"];

const recentOrders: Order[] = [
  { id: "#0089", time: "2 min ago", channel: "Table 4", amount: "$54.00", status: "paid" },
  { id: "#0088", time: "11 min ago", channel: "Takeaway", amount: "$12.50", status: "paid" },
  { id: "#0087", time: "18 min ago", channel: "Table 2", amount: "$7.80", status: "refund" },
  { id: "#0086", time: "26 min ago", channel: "Table 7", amount: "$31.20", status: "paid" },
  { id: "#0085", time: "41 min ago", channel: "Takeaway", amount: "$19.40", status: "pending" },
];

const staffData: Staff[] = [
  { initials: "SR", name: "Sarah R.", txn: 74, sales: "$2,890", color: "bg-blue-100 text-blue-700" },
  { initials: "MK", name: "Mike K.", txn: 61, sales: "$2,210", color: "bg-emerald-100 text-emerald-700" },
  { initials: "JL", name: "Jin L.", txn: 48, sales: "$1,950", color: "bg-amber-100 text-amber-700" },
  { initials: "DP", name: "Diana P.", txn: 30, sales: "$1,370", color: "bg-rose-100 text-rose-700" },
];

const statusStyles: Record<Order["status"], string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  refund: "bg-rose-50 text-rose-700 border-rose-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
};

// ─── Tooltip ────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">
        Revenue: <span className="font-medium text-foreground">${payload[0].value.toLocaleString()}</span>
      </p>
    </div>
  );
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function POSDashboardPage() {
  const [period, setPeriod] = useState<Period>("today");

  const periods: { key: Period; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This week" },
    { key: "month", label: "This month" },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1400px] mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            POS performance overview · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
          {periods.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                period === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiData[period].map((kpi) => (
          <Card key={kpi.label} className="relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
                <span className={cn("rounded-md p-1.5 bg-muted", kpi.color)}>
                  {kpi.icon}
                </span>
              </div>
              <p className="text-2xl font-semibold tracking-tight">{kpi.value}</p>
              <div className={cn("mt-2 flex items-center gap-1 text-xs font-medium", kpi.up ? "text-emerald-600" : "text-rose-600")}>
                {kpi.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {kpi.delta} vs {period === "today" ? "yesterday" : period === "week" ? "last week" : "last month"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Revenue chart + Payment methods ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Revenue over time</CardTitle>
              <span className="text-xs text-muted-foreground">
                {period === "today" ? "Hourly" : period === "week" ? "Daily" : "Weekly"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData[period]} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: "#2563eb" }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Payment methods</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <PieChart width={160} height={160}>
              <Pie
                data={paymentData}
                cx={75}
                cy={75}
                innerRadius={50}
                outerRadius={72}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {paymentData.map((_, i) => (
                  <Cell key={i} fill={paymentColors[i]} />
                ))}
              </Pie>
            </PieChart>
            <div className="w-full flex flex-col gap-2">
              {paymentData.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: paymentColors[i] }} />
                    <span className="text-muted-foreground">{p.name}</span>
                  </div>
                  <span className="font-medium">{p.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Top products + Recent orders + Cashier performance ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Top products */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Top products</CardTitle>
              <span className="text-xs text-muted-foreground">By revenue</span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="w-4 text-xs text-muted-foreground font-medium">{i + 1}</span>
                <span className="flex-1 text-sm truncate">{p.name}</span>
                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
                <span className="w-12 text-right text-xs text-muted-foreground">${p.revenue.toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent orders */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Recent orders</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
                View all <ArrowRight size={12} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{o.id}</p>
                  <p className="text-xs text-muted-foreground">{o.time} · {o.channel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{o.amount}</span>
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize", statusStyles[o.status])}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Cashier performance */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Cashier performance</CardTitle>
              <span className="text-xs text-muted-foreground capitalize">{period === "today" ? "Today" : period === "week" ? "This week" : "This month"}</span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {staffData.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0", s.color)}>
                  {s.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.txn} transactions</p>
                </div>
                <span className="text-sm font-semibold">{s.sales}</span>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}