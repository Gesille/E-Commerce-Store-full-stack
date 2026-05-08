"use client";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useGetMonthlyRevenueQuery } from "@/redux/order/orderApi";
import {
  ComposedChart, Bar, Line,
  CartesianGrid, XAxis, YAxis, Rectangle,
} from "recharts";


const chartConfig = {
  total: { label: "Total Revenue", color: "#6366f1" },
  successful: { label: "Confirmed Revenue", color: "#22c55e" },
} satisfies ChartConfig;

const CustomBar = (props: any) => {
  const { fill, x, y, width, height } = props;
  return (
    <Rectangle
      x={x} y={y} width={width} height={height}
      fill={fill} radius={[8, 8, 0, 0]}
      style={{ transition: "all 0.3s ease", cursor: "pointer" }}
    />
  );
};

const AppComposedChart = () => {
  const { data: chartData = [], isLoading, isError } = useGetMonthlyRevenueQuery();
console.log("chartData:", chartData);
console.log("isLoading:", isLoading);
console.log("isError:", isError);

  const formatMonth = (value: string) => {
    const [month, year] = value.split(" ");
    return `${month.slice(0, 3)} ${year?.slice(2)}`;
  };

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h1 className="text-lg font-semibold mb-6">Total Revenue by Month</h1>

      {isLoading && (
        <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
      )}

      {isError && (
        <p className="text-sm text-red-500 text-center py-8">
          Failed to load revenue data
        </p>
      )}

      {!isLoading && !isError && (
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="successGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                <stop offset="100%" stopColor="#16a34a" stopOpacity={0.7} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} opacity={0.1} />

            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickFormatter={formatMonth}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v.toLocaleString()}`}
            />

            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    `$${Number(value).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}`
                  }
                />
              }
            />
            <ChartLegend content={<ChartLegendContent payload={undefined} />} />

            <Bar
              dataKey="total"
              fill="url(#totalGradient)"
              barSize={38}
              shape={<CustomBar />}
            />

            <Line
              type="monotone"
              dataKey="successful"
              stroke="url(#successGradient)"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 8 }}
            />
          </ComposedChart>
        </ChartContainer>
      )}
    </div>
  );
};

export default AppComposedChart;