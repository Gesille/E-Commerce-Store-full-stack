"use client";

import { useState } from "react";
import {
  useGetDailyTaxReportQuery,
  useGetMonthlyTaxReportQuery,
  downloadTaxReportExcel,
} from "@/redux/tax/taxApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download,
  TrendingUp,
  Receipt,
  ShieldOff,
  DollarSign,
  CalendarDays,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const fmt = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ─── Summary cards ───────────────────────────────────────────────────────────
function SummaryCards({
  summary,
}: {
  summary: {
    totalOrders: number;
    normalOrders: number;
    exemptOrders: number;
    totalSubtotal: number;
    totalTax: number;
    totalRevenue: number;
  };
}) {
  const cards = [
    {
      label: "Total Revenue",
      value: `XCD ${fmt(summary.totalRevenue)}`,
      icon: DollarSign,
      color: "from-indigo-500 to-purple-500",
    },
    {
      label: "ABCT Tax Collected",
      value: `XCD ${fmt(summary.totalTax)}`,
      icon: Receipt,
      color: "from-emerald-500 to-teal-500",
    },
    {
      label: "Total Orders",
      value: `${summary.totalOrders} (${summary.normalOrders} taxed)`,
      icon: TrendingUp,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "Exempt Orders",
      value: `${summary.exemptOrders}`,
      icon: ShieldOff,
      color: "from-amber-500 to-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div
            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center mb-2`}
          >
            <c.icon size={15} className="text-white" />
          </div>
          <p className="text-[11px] text-slate-400">{c.label}</p>
          <p className="text-sm font-bold text-slate-800 mt-0.5">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Daily view ──────────────────────────────────────────────────────────────
function DailyView({ date }: { date: string }) {
  const { data, isLoading } = useGetDailyTaxReportQuery({ date });

  if (isLoading)
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );

  if (!data) return null;

  const chartData = data.timeline.filter((h) => h.orders > 0 || true);

  return (
    <div className="space-y-4">
      <SummaryCards summary={data.summary} />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Hourly Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" fontSize={10} stroke="#94a3b8" />
            <YAxis fontSize={10} stroke="#94a3b8" />
            <Tooltip
              formatter={(v) => `XCD ${fmt(Number(v ?? 0))}`}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <OrdersTable orders={data.orders} />
    </div>
  );
}

// ─── Monthly view ────────────────────────────────────────────────────────────
function MonthlyView({ year, month }: { year: number; month: number }) {
  const { data, isLoading } = useGetMonthlyTaxReportQuery({ year, month });

  if (isLoading)
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );

  if (!data) return null;

  return (
    <div className="space-y-4">
      <SummaryCards summary={data.summary} />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Daily Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.breakdown}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              fontSize={9}
              stroke="#94a3b8"
              tickFormatter={(d: string) => d.slice(8, 10)}
            />
            <YAxis fontSize={10} stroke="#94a3b8" />
            <Tooltip
               formatter={(v) => `XCD ${fmt(Number(v ?? 0))}`}
              labelFormatter={(l) => `Date: ${l}`}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Bar dataKey="total" fill="#6366f1" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <OrdersTable orders={data.orders} />
    </div>
  );
}

// ─── Orders table (shared) ───────────────────────────────────────────────────
function OrdersTable({
  orders,
}: {
  orders: {
    id: number;
    ref: string;
    date: string;
    customer: string;
    subtotal: number;
    taxAmount: number;
    total: number;
    isExempt: boolean;
    taxReason: string;
  }[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <h3 className="text-sm font-semibold text-slate-700 px-4 py-3 border-b border-slate-100">
        Transactions ({orders.length})
      </h3>
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 sticky top-0">
            <tr className="text-left text-slate-400">
              <th className="px-4 py-2 font-medium">Order</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium text-right">Subtotal</th>
              <th className="px-4 py-2 font-medium text-right">Tax</th>
              <th className="px-4 py-2 font-medium text-right">Total</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-2 font-mono text-slate-600">{o.ref}</td>
                <td className="px-4 py-2 text-slate-500">
                  {new Date(o.date).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-slate-700">{o.customer}</td>
                <td className="px-4 py-2 text-right text-slate-600 tabular-nums">
                  {fmt(o.subtotal)}
                </td>
                <td className="px-4 py-2 text-right text-slate-600 tabular-nums">
                  {fmt(o.taxAmount)}
                </td>
                <td className="px-4 py-2 text-right font-semibold text-slate-800 tabular-nums">
                  {fmt(o.total)}
                </td>
                <td className="px-4 py-2">
                  {o.isExempt ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {o.taxReason}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      ABCT 17%
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No orders in this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function TaxAnalyticsPage() {
  const today = new Date();
  const [mode, setMode] = useState<"daily" | "monthly">("daily");
  const [date, setDate] = useState(today.toISOString().slice(0, 10));
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const handleExport = () => {
    if (mode === "daily") downloadTaxReportExcel({ date });
    else downloadTaxReportExcel({ year, month });
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tax Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            ABCT tax collected, exemptions, and holiday impact — sourced
            directly from Odoo POS orders.
          </p>
        </div>
        <Button onClick={handleExport} className="gap-1.5 text-xs">
          <Download size={13} /> Export Excel
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setMode("daily")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === "daily"
                ? "bg-white shadow-sm text-indigo-700"
                : "text-slate-500"
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setMode("monthly")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === "monthly"
                ? "bg-white shadow-sm text-indigo-700"
                : "text-slate-500"
            }`}
          >
            Monthly
          </button>
        </div>

        {mode === "daily" ? (
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-slate-400" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40 h-9 text-xs"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Select
              value={String(month)}
              onValueChange={(v) => setMonth(Number(v))}
            >
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-24 h-9 text-xs"
            />
          </div>
        )}
      </div>

      {mode === "daily" ? (
        <DailyView date={date} />
      ) : (
        <MonthlyView year={year} month={month} />
      )}
    </div>
  );
}
