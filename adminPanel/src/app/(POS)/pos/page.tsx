"use client";

import { useState } from "react";
import {
  TrendingUp, TrendingDown, ShoppingBag, DollarSign,
  ReceiptText, RotateCcw, ArrowRight, AlertTriangle,
  Target, Clock, Users, Tag, Table2, Package,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// ─── Types ──────────────────────────────────────────────────────────────────

type Period = "today" | "week" | "month";

type Order = {
  id: string; time: string; channel: string;
  amount: string; status: "paid" | "refund" | "pending";
};

// ─── Static mock data (swap with Odoo API calls later) ───────────────────────

const PAYMENT_COLORS = ["#2563eb", "#059669", "#d97706"];

const paymentData = [
  { name: "Card", value: 58 },
  { name: "Cash", value: 24 },
  { name: "Mobile Pay", value: 18 },
];

const topProducts = [
  { name: "Espresso",     revenue: 1240, pct: 100 },
  { name: "Latte",        revenue: 1017, pct: 82  },
  { name: "Croissant",    revenue: 793,  pct: 64  },
  { name: "Cappuccino",   revenue: 632,  pct: 51  },
  { name: "Sandwich",     revenue: 484,  pct: 39  },
  { name: "Matcha Latte", revenue: 347,  pct: 28  },
];

const categoryData = [
  { name: "Coffee",     value: 4820, color: "#2563eb" },
  { name: "Food",       value: 1870, color: "#059669" },
  { name: "Cold drinks",value: 980,  color: "#d97706" },
  { name: "Desserts",   value: 620,  color: "#9333ea" },
  { name: "Other",      value: 130,  color: "#6b7280" },
];

const recentOrders: Order[] = [
  { id: "#0089", time: "2 min ago",  channel: "Table 4",  amount: "$54.00", status: "paid"    },
  { id: "#0088", time: "11 min ago", channel: "Takeaway", amount: "$12.50", status: "paid"    },
  { id: "#0087", time: "18 min ago", channel: "Table 2",  amount: "$7.80",  status: "refund"  },
  { id: "#0086", time: "26 min ago", channel: "Table 7",  amount: "$31.20", status: "paid"    },
  { id: "#0085", time: "41 min ago", channel: "Takeaway", amount: "$19.40", status: "pending" },
];

const staffData = [
  { initials: "SR", name: "Sarah R.",  txn: 74, sales: 2890, color: "bg-blue-100 text-blue-700"    },
  { initials: "MK", name: "Mike K.",   txn: 61, sales: 2210, color: "bg-emerald-100 text-emerald-700" },
  { initials: "JL", name: "Jin L.",    txn: 48, sales: 1950, color: "bg-amber-100 text-amber-700"   },
  { initials: "DP", name: "Diana P.",  txn: 30, sales: 1370, color: "bg-rose-100 text-rose-700"     },
];

const lowStockItems = [
  { name: "Oat Milk",      stock: 2,  unit: "cartons", threshold: 5  },
  { name: "Croissant",     stock: 4,  unit: "pcs",     threshold: 10 },
  { name: "Matcha Powder", stock: 1,  unit: "bags",    threshold: 3  },
  { name: "Paper Cups (M)",stock: 15, unit: "pcs",     threshold: 50 },
];

const tableData = [
  { id: "T1", status: "occupied",  duration: "48 min" },
  { id: "T2", status: "available", duration: "—"      },
  { id: "T3", status: "occupied",  duration: "12 min" },
  { id: "T4", status: "occupied",  duration: "1h 22m" },
  { id: "T5", status: "available", duration: "—"      },
  { id: "T6", status: "reserved",  duration: "—"      },
  { id: "T7", status: "occupied",  duration: "5 min"  },
  { id: "T8", status: "available", duration: "—"      },
];

const discountData = [
  { code: "STAFF10", uses: 28, saved: "$84.00"  },
  { code: "HAPPY20", uses: 17, saved: "$142.00" },
  { code: "LOYALTY", uses: 9,  saved: "$63.00"  },
];

const customerData = {
  newToday: 34, returning: 179,
  topSpender: "Maria G.", topAmount: "$187.50", avgVisits: 2.4,
};

// ─── Period-gated data ───────────────────────────────────────────────────────

const revenueByPeriod: Record<Period, { label: string; revenue: number }[]> = {
  today: [
    { label: "8am",  revenue: 180  }, { label: "9am",  revenue: 420  },
    { label: "10am", revenue: 610  }, { label: "11am", revenue: 890  },
    { label: "12pm", revenue: 1240 }, { label: "1pm",  revenue: 980  },
    { label: "2pm",  revenue: 760  }, { label: "3pm",  revenue: 640  },
    { label: "4pm",  revenue: 530  }, { label: "5pm",  revenue: 480  },
    { label: "6pm",  revenue: 690  },
  ],
  week: [
    { label: "Mon", revenue: 6200  }, { label: "Tue", revenue: 7400  },
    { label: "Wed", revenue: 8100  }, { label: "Thu", revenue: 7800  },
    { label: "Fri", revenue: 9200  }, { label: "Sat", revenue: 11400 },
    { label: "Sun", revenue: 4680  },
  ],
  month: [
    { label: "W1", revenue: 48000 }, { label: "W2", revenue: 57000 },
    { label: "W3", revenue: 62000 }, { label: "W4", revenue: 51400 },
  ],
};

const kpiByPeriod: Record<Period, {
  label: string; value: string; delta: string; up: boolean;
  icon: React.ReactNode; color: string;
}[]> = {
  today: [
    { label: "Total Revenue",   value: "$8,420",   delta: "+12.4%", up: true,  icon: <DollarSign size={15} />,  color: "text-emerald-600" },
    { label: "Orders",          value: "213",       delta: "+8.1%",  up: true,  icon: <ShoppingBag size={15} />, color: "text-blue-600"    },
    { label: "Avg Order Value", value: "$39.50",    delta: "-2.3%",  up: false, icon: <ReceiptText size={15} />, color: "text-amber-600"   },
    { label: "Refunds",         value: "$310",      delta: "+1.2%",  up: false, icon: <RotateCcw size={15} />,   color: "text-rose-600"    },
  ],
  week: [
    { label: "Total Revenue",   value: "$54,780",   delta: "+9.1%",  up: true,  icon: <DollarSign size={15} />,  color: "text-emerald-600" },
    { label: "Orders",          value: "1,342",     delta: "+5.4%",  up: true,  icon: <ShoppingBag size={15} />, color: "text-blue-600"    },
    { label: "Avg Order Value", value: "$40.80",    delta: "+1.1%",  up: true,  icon: <ReceiptText size={15} />, color: "text-amber-600"   },
    { label: "Refunds",         value: "$1,920",    delta: "-0.6%",  up: true,  icon: <RotateCcw size={15} />,   color: "text-rose-600"    },
  ],
  month: [
    { label: "Total Revenue",   value: "$218,400",  delta: "+14.2%", up: true,  icon: <DollarSign size={15} />,  color: "text-emerald-600" },
    { label: "Orders",          value: "5,610",     delta: "+11.0%", up: true,  icon: <ShoppingBag size={15} />, color: "text-blue-600"    },
    { label: "Avg Order Value", value: "$38.90",    delta: "-0.8%",  up: false, icon: <ReceiptText size={15} />, color: "text-amber-600"   },
    { label: "Refunds",         value: "$7,240",    delta: "+2.1%",  up: false, icon: <RotateCcw size={15} />,   color: "text-rose-600"    },
  ],
};

const targetByPeriod: Record<Period, { target: number; current: number; label: string }> = {
  today: { target: 10000,  current: 8420,   label: "Daily target"   },
  week:  { target: 60000,  current: 54780,  label: "Weekly target"  },
  month: { target: 240000, current: 218400, label: "Monthly target" },
};

// ─── Heatmap ─────────────────────────────────────────────────────────────────

const DAYS  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const HOURS = ["8am","9am","10am","11am","12pm","1pm","2pm","3pm","4pm","5pm","6pm","7pm"];
const heatmapRaw = [
  [8,22,31,40,55,50,38,28,20,15,18,10],
  [6,18,28,35,48,44,32,25,18,12,14,8 ],
  [9,24,34,44,60,54,40,30,22,16,20,12],
  [7,20,29,38,52,47,35,26,19,13,16,9 ],
  [10,28,38,50,68,62,48,36,26,20,24,15],
  [14,36,52,68,88,80,62,48,34,26,32,20],
  [5,14,20,26,36,32,24,18,12,8,10,6  ],
];

function heatColor(val: number) {
  if (val < 15) return "bg-blue-50  text-blue-300";
  if (val < 30) return "bg-blue-100 text-blue-400";
  if (val < 50) return "bg-blue-200 text-blue-600";
  if (val < 70) return "bg-blue-400 text-white";
  return               "bg-blue-600 text-white";
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const statusStyle: Record<Order["status"], string> = {
  paid:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  refund:  "bg-rose-50    text-rose-700    border-rose-200",
  pending: "bg-amber-50   text-amber-700   border-amber-200",
};

const tableStatusStyle: Record<string, string> = {
  occupied:  "bg-blue-50    text-blue-700    border-blue-200",
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  reserved:  "bg-amber-50   text-amber-700   border-amber-200",
};

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <p className="text-muted-foreground">
        Revenue:{" "}
        <span className="font-medium text-foreground">
          ${payload[0].value.toLocaleString()}
        </span>
      </p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function POSDashboardPage() {
  const [period, setPeriod] = useState<Period>("today");

  const kpis   = kpiByPeriod[period];
  const target = targetByPeriod[period];
  const targetPct   = Math.min(100, Math.round((target.current / target.target) * 100));
  const periodLabel = period === "today" ? "yesterday" : period === "week" ? "last week" : "last month";
  const maxStaffSales = Math.max(...staffData.map((s) => s.sales));

  return (
    <div className="flex flex-col gap-5 p-6 max-w-[1400px] mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
          {(["today", "week", "month"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p === "today" ? "Today" : p === "week" ? "This week" : "This month"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Session tracker + Low stock ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Session tracker */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock size={15} className="text-muted-foreground" />
                Current session
              </CardTitle>
              <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 text-[11px]">
                Open
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Started",        value: "08:00 AM" },
                { label: "Cashier",        value: "Sarah R." },
                { label: "Duration",       value: "6h 24m"   },
                { label: "Cash in drawer", value: "$1,240"   },
                { label: "Expected float", value: "$1,200"   },
                { label: "Variance",       value: "+$40"     },
              ].map((s) => (
                <div key={s.label} className="rounded-md bg-muted/50 px-3 py-2">
                  <p className="text-[11px] text-muted-foreground mb-0.5">{s.label}</p>
                  <p className={cn("text-sm font-medium", s.label === "Variance" ? "text-emerald-600" : "")}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" />
                Low stock alerts
              </CardTitle>
              <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 text-[11px]">
                {lowStockItems.length} items
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {lowStockItems.map((item) => {
              const pct = Math.min(100, (item.stock / item.threshold) * 100);
              const critical = pct < 30;
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <Package size={13} className="text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 text-sm">{item.name}</span>
                  <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", critical ? "bg-rose-500" : "bg-amber-400")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={cn("text-xs font-medium w-20 text-right", critical ? "text-rose-600" : "text-amber-600")}>
                    {item.stock} {item.unit} left
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
                <span className={cn("rounded-md p-1.5 bg-muted", kpi.color)}>{kpi.icon}</span>
              </div>
              <p className="text-2xl font-semibold tracking-tight">{kpi.value}</p>
              <div className={cn("mt-2 flex items-center gap-1 text-xs font-medium", kpi.up ? "text-emerald-600" : "text-rose-600")}>
                {kpi.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {kpi.delta} vs {periodLabel}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Sales vs target ── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Target size={15} className="text-muted-foreground" />
              <span className="text-sm font-medium">{target.label}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                ${target.current.toLocaleString()}{" "}
                <span className="text-xs">of</span>{" "}
                ${target.target.toLocaleString()}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[11px]",
                  targetPct >= 90
                    ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                    : "text-amber-700 border-amber-200 bg-amber-50",
                )}
              >
                {targetPct}% reached
              </Badge>
            </div>
          </div>
          <Progress value={targetPct} className="h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            ${(target.target - target.current).toLocaleString()} remaining to hit target
          </p>
        </CardContent>
      </Card>

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
              <AreaChart data={revenueByPeriod[period]} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2}
                  fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: "#2563eb" }} />
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
              <Pie data={paymentData} cx={75} cy={75} innerRadius={50} outerRadius={72}
                paddingAngle={3} dataKey="value" strokeWidth={0}>
                {paymentData.map((_, i) => <Cell key={i} fill={PAYMENT_COLORS[i]} />)}
              </Pie>
            </PieChart>
            <div className="w-full flex flex-col gap-2">
              {paymentData.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: PAYMENT_COLORS[i] }} />
                    <span className="text-muted-foreground">{p.name}</span>
                  </div>
                  <span className="font-medium">{p.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Category breakdown ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Revenue by category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {categoryData.map((c) => {
              const total = categoryData.reduce((a, b) => a + b.value, 0);
              const pct   = Math.round((c.value / total) * 100);
              return (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-muted-foreground truncate">{c.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                  <span className="w-10 text-right text-xs font-medium text-muted-foreground">{pct}%</span>
                  <span className="w-16 text-right text-sm font-medium">${c.value.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Peak hours heatmap ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Peak hours heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="w-10 text-left text-muted-foreground font-normal pb-1" />
                  {HOURS.map((h) => (
                    <th key={h} className="text-center text-muted-foreground font-normal pb-1 min-w-[40px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, di) => (
                  <tr key={day}>
                    <td className="text-muted-foreground pr-2 py-0.5">{day}</td>
                    {HOURS.map((_, hi) => {
                      const val = heatmapRaw[di][hi];
                      return (
                        <td key={hi}
                          className={cn("text-center rounded py-1.5 font-medium cursor-default", heatColor(val))}
                          title={`${day} ${HOURS[hi]}: ${val} orders`}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Low</span>
              {["bg-blue-50","bg-blue-100","bg-blue-200","bg-blue-400","bg-blue-600"].map((c, i) => (
                <div key={i} className={cn("h-3 w-6 rounded", c)} />
              ))}
              <span>High</span>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${p.pct}%` }} />
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
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize", statusStyle[o.status])}>
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
              <span className="text-xs text-muted-foreground capitalize">
                {period === "today" ? "Today" : period === "week" ? "This week" : "This month"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {staffData.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0", s.color)}>
                  {s.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium leading-none">{s.name}</p>
                    <span className="text-sm font-semibold">${s.sales.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${(s.sales / maxStaffSales) * 100}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right">{s.txn} orders</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Customer insights + Discounts + Table status ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Customer insights */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users size={14} className="text-muted-foreground" /> Customer insights
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-[11px] text-muted-foreground mb-0.5">New today</p>
                <p className="text-lg font-semibold text-blue-600">{customerData.newToday}</p>
              </div>
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-[11px] text-muted-foreground mb-0.5">Returning</p>
                <p className="text-lg font-semibold text-emerald-600">{customerData.returning}</p>
              </div>
            </div>
            <div className="border-t pt-3 flex flex-col gap-2">
              {[
                { label: "Top spender",      value: customerData.topSpender, color: "" },
                { label: "Spent today",      value: customerData.topAmount, color: "text-emerald-600" },
                { label: "Avg visits / week",value: `${customerData.avgVisits}x`, color: "" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={cn("font-medium", row.color)}>{row.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Discounts & promos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Tag size={14} className="text-muted-foreground" /> Discounts & promos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col divide-y divide-border">
              {discountData.map((d) => (
                <div key={d.code} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium font-mono">{d.code}</p>
                    <p className="text-xs text-muted-foreground">{d.uses} uses</p>
                  </div>
                  <span className="text-sm font-semibold text-rose-600">{d.saved}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t flex justify-between text-sm">
              <span className="text-muted-foreground">Total discounts given</span>
              <span className="font-semibold text-rose-600">$289.00</span>
            </div>
          </CardContent>
        </Card>

        {/* Table status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Table2 size={14} className="text-muted-foreground" /> Table status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {tableData.map((t) => (
                <div key={t.id}
                  className={cn("rounded-md border text-center py-2 px-1 cursor-default", tableStatusStyle[t.status])}>
                  <p className="text-xs font-semibold">{t.id}</p>
                  <p className="text-[10px] mt-0.5">{t.status === "occupied" ? t.duration : t.status}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
              <div>
                <p className="font-medium text-foreground text-sm">
                  {tableData.filter((t) => t.status === "occupied").length}
                </p>
                Occupied
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  {tableData.filter((t) => t.status === "available").length}
                </p>
                Available
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  {tableData.filter((t) => t.status === "reserved").length}
                </p>
                Reserved
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}