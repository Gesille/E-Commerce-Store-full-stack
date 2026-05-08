"use client";

import { useMemo } from "react";
import { Label, Pie, PieChart } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart";
import { TrendingUp } from "lucide-react";

import { Skeleton } from "./ui/skeleton";
import { useGetOrderStatusStatsQuery } from "@/redux/order/orderApi";

const STATE_CONFIG: Record<string, { label: string; color: string }> = {
  draft:     { label: "Draft",     color: "var(--chart-1)" },
  sent:      { label: "Sent",      color: "var(--chart-2)" },
  sale:      { label: "Confirmed", color: "var(--chart-3)" },
  done:      { label: "Done",      color: "var(--chart-4)" },
  cancel:    { label: "Cancelled", color: "var(--chart-5)" },
};

const AppPieChart = () => {
  const { data: statusData, isLoading } = useGetOrderStatusStatsQuery(undefined);

  const chartData = useMemo(() => {
    if (!statusData) return [];
    return statusData.map((item: { state: string; count: number }) => ({
      browser: item.state,
      visitors: item.count,
      fill: STATE_CONFIG[item.state]?.color ?? "var(--chart-1)",
    }));
  }, [statusData]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = { visitors: { label: "Orders" } };
    for (const [key, val] of Object.entries(STATE_CONFIG)) {
      config[key] = { label: val.label, color: val.color };
    }
    return config;
  }, []);

  const totalOrders = useMemo(
    () => chartData.reduce((acc:any, curr:any) => acc + curr.visitors, 0),
    [chartData]
  );

  if (isLoading) {
    return (
      <div>
        <h1 className="text-lg font-medium mb-6">Order Status</h1>
        <Skeleton className="mx-auto w-[250px] h-[250px] rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-medium mb-6">Order Status</h1>
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[250px]"
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={chartData}
            dataKey="visitors"
            nameKey="browser"
            innerRadius={60}
            strokeWidth={5}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-3xl font-bold"
                      >
                        {totalOrders.toLocaleString()}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 24}
                        className="fill-muted-foreground"
                      >
                        Orders
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {chartData.map((item:any) => (
          <div key={item.browser} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: item.fill }}
            />
            {STATE_CONFIG[item.browser]?.label ?? item.browser}
            <span className="font-medium text-foreground">{item.visitors}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-center">
        <div className="flex items-center gap-2 text-sm font-medium leading-none">
          Live order distribution <TrendingUp className="h-4 w-4 text-green-500" />
        </div>
      </div>
    </div>
  );
};

export default AppPieChart;