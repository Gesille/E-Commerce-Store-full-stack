"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useParams } from "next/navigation";
import { useGetUserActivityQuery } from "@/redux/user/userApi";

const AppLineChart = () => {
  const { id } = useParams();
  const { data, isLoading } = useGetUserActivityQuery(id as string);

  if (isLoading) {
    return (
      <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
        Loading analytics...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
        No activity available
      </div>
    );
  }

  const totalOrders = data.reduce((a: number, b: any) => a + (b.orders || 0), 0);
  const totalSpent = data.reduce((a: number, b: any) => a + (b.spent || 0), 0);

  return (
    <div className="w-full rounded-2xl border bg-white shadow-sm p-5">

      {/* HEADER */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-800">
          User Activity Overview
        </h2>
        <p className="text-xs text-muted-foreground">
          Orders & spending trend over time
        </p>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-3 gap-3 mb-4">

        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
          <p className="text-xs text-muted-foreground">Orders</p>
          <p className="text-lg font-semibold text-indigo-600">
            {totalOrders}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
          <p className="text-xs text-muted-foreground">Spent</p>
          <p className="text-lg font-semibold text-emerald-600">
            ${totalSpent.toLocaleString()}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border">
          <p className="text-xs text-muted-foreground">Avg / Month</p>
          <p className="text-lg font-semibold text-slate-700">
            {Math.round(totalOrders / data.length)}
          </p>
        </div>

      </div>

      {/* CHART */}
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">

          <LineChart data={data}>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f1f5f9"
              vertical={false}
            />

            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                fontSize: "12px",
              }}
            />

            {/* ORDERS */}
            <Line
              type="monotone"
              dataKey="orders"
              stroke="#6366f1"
              strokeWidth={3}
              dot={false}
            />

            {/* SPENT */}
            <Line
              type="monotone"
              dataKey="spent"
              stroke="#10b981"
              strokeWidth={3}
              dot={false}
            />

          </LineChart>

        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AppLineChart;