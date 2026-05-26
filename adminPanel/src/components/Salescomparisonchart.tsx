"use client";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useGetMonthlyRevenueQuery } from "@/redux/order/orderApi";
import { useGetRevenueChartQuery } from "@/redux/analytics/analyticsApi";
import type { Period } from "@/redux/analytics/analyticsApi";

type Props = {
  configId?: number;
};

const PERIOD_OPTIONS: { label: string; value: Period | "alltime" }[] = [
  { label: "This week", value: "week" },
  { label: "This month", value: "month" },
  { label: "All time", value: "alltime" },
];

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

const fmtK = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;

// ─────────────────────────────────────────────────────────────────────────────

export default function SalesComparisonChart({ configId }: Props) {
  const [period, setPeriod] = useState<Period | "alltime">("month");

  // Online revenue (sale.order) — monthly buckets, all time
  const { data: onlineMonthly = [], isFetching: loadingOnline } =
    useGetMonthlyRevenueQuery();

  // POS revenue — bucketed by the selected period (week / month)
  const posPeriod: Period = period === "alltime" ? "month" : period;
  const { data: posChart = [], isFetching: loadingPOS } = useGetRevenueChartQuery(
    { period: posPeriod, configId },
    { skip: period === "alltime" },
  );

  // Merge both sources into a common { label, online, pos } shape
  const chartData = useMemo(() => {
    if (period === "alltime") {
      // Use monthly online data as spine; POS monthly not available in this hook
      return onlineMonthly.map((d) => ({
        label: d.month,
        online: Math.round(d.successful ?? d.total ?? 0),
        pos: 0, // POS monthly aggregate is not fetched in "all time" view
      }));
    }

    if (period === "week" || period === "month") {
      // POS chart has { label, revenue, prev }
      // Online data is monthly; for week/month views we can't align per-slot
      // so we spread the current-month online total evenly across POS slots
      const onlineTotal = onlineMonthly.reduce(
        (s: number, d: any) => s + (d.successful ?? d.total ?? 0),
        0,
      );
      const posTotal = posChart.reduce((s: number, d: any) => s + (d.revenue ?? 0), 0);
      const onlineShare = posTotal > 0 ? onlineTotal / posChart.length : 0;

      return posChart.map((d:any) => ({
        label: d.label,
        online: Math.round(onlineShare),
        pos: Math.round(d.revenue ?? 0),
      }));
    }

    return [];
  }, [period, onlineMonthly, posChart]);

  // Aggregate KPIs
  const onlineTotal = useMemo(
    () => chartData.reduce((s: number, d: any) => s + d.online, 0),
    [chartData],
  );
  const posTotal = useMemo(
    () => chartData.reduce((s: number, d: any) => s + d.pos, 0),
    [chartData],
  );
  const combined = onlineTotal + posTotal;
  const posShare = combined > 0 ? Math.round((posTotal / combined) * 100) : 0;
  const dominates = posTotal > onlineTotal ? "POS leads" : "Online leads";

  const isLoading = loadingOnline || loadingPOS;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h3 className="text-base font-medium">Online vs POS revenue</h3>
        <div className="flex gap-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`text-xs px-3 py-1 rounded-md border transition-colors ${
                period === opt.value
                  ? "bg-blue-50 text-blue-700 border-transparent dark:bg-blue-900/30 dark:text-blue-300"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {[
          { label: "Online total", value: fmt(onlineTotal), sub: "sale.order" },
          { label: "POS total", value: fmt(posTotal), sub: "pos.order" },
          { label: "Combined", value: fmt(combined), sub: "all channels" },
          {
            label: "POS share",
            value: `${posShare}%`,
            sub: dominates,
          },
        ].map((k) => (
          <div
            key={k.label}
            className="bg-muted/50 rounded-lg px-4 py-3"
          >
            <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
            <p className="text-xl font-medium">{k.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(136,135,128,0.15)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#888780" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtK}
              tick={{ fontSize: 11, fill: "#888780" }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip
              formatter={(value, name) => [
                fmt(Number(value ?? 0)),
                name === "online" ? "Online sales" : "POS sales",
              ]}
              labelStyle={{ fontWeight: 500 }}
              contentStyle={{
                borderRadius: 8,
                border: "0.5px solid rgba(0,0,0,.1)",
                fontSize: 13,
              }}
            />
            <Legend
              formatter={(value) =>
                value === "online" ? "Online sales" : "POS sales"
              }
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar dataKey="online" fill="#378ADD" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pos" fill="#1D9E75" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}