"use client";
import { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import {
  useGetMonthlySalesReportQuery,
  useGetDailySalesReportQuery,
  useGetProductSalesReportQuery,
  useGetInventoryMovementsQuery,
  useExportMonthlySalesReportMutation,
  useExportDailySalesReportMutation,
  useExportProductSalesReportMutation,
  useExportInventoryReportMutation,
  MonthlyRow,
  DailyRow,
  ProductSalesRow,
  MovementRow,
} from "@/redux/report/reportsApi";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ── helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtK(n: number) {
  return n >= 1000 ? "$" + (n / 1000).toFixed(1) + "k" : fmt(n);
}

function toIso(d: Date) {
  return d.toISOString().split("T")[0];
}

// ── sub-components ────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value" style={valueColor ? { color: valueColor } : {}}>
        {value}
      </p>
      {sub && <p className="metric-sub">{sub}</p>}
    </div>
  );
}

function Spinner() {
  return <div className="spinner" />;
}

function ErrorMsg({ msg }: { msg: string }) {
  return <p className="error-msg">{msg}</p>;
}

function MiniBar({ pct }: { pct: number }) {
  return (
    <div className="mini-bar-wrap">
      <div className="mini-bar" style={{ width: `${pct}%` }} />
      <span className="mini-bar-label">{pct.toFixed(1)}%</span>
    </div>
  );
}

// ── ExportButtons ─────────────────────────────────────────────────────────────
// Each button calls its mutation trigger directly — no blob ever touches Redux.

function ExportButtons({
  onPdf,
  onExcel,
}: {
  onPdf: () => Promise<any>;
  onExcel: () => Promise<any>;
}) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (
    trigger: () => Promise<any>,
    setLoading: (v: boolean) => void
  ) => {
    setError(null);
    setLoading(true);
    try {
      const result = await trigger();
      if (result.error) throw new Error(result.error.error ?? "Export failed");
    } catch (e: any) {
      setError(e.message ?? "Download failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-row">
      <span className="export-label">Export:</span>
      <button
        className="export-btn"
        disabled={loadingPdf}
        onClick={() => handle(onPdf, setLoadingPdf)}
      >
        {loadingPdf ? "…" : "↓ PDF"}
      </button>
      <button
        className="export-btn"
        disabled={loadingExcel}
        onClick={() => handle(onExcel, setLoadingExcel)}
      >
        {loadingExcel ? "…" : "↓ Excel"}
      </button>
      {error && <span className="export-error">{error}</span>}
    </div>
  );
}

// ── chart defaults ────────────────────────────────────────────────────────────

const baseBarOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { font: { size: 11 } } },
    y: {
      ticks: { callback: (v) => fmtK(Number(v)), font: { size: 11 } },
      grid: { color: "rgba(128,128,128,0.12)" },
    },
  },
};

// ── Monthly tab ───────────────────────────────────────────────────────────────

function MonthlyTab() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data, isFetching, isError } = useGetMonthlySalesReportQuery({ year });

  // Each call to the hook gives an independent trigger function
  const [exportPdf]   = useExportMonthlySalesReportMutation();
  const [exportExcel] = useExportMonthlySalesReportMutation();

  const years = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i);

  const chartData = data
    ? {
        labels: data.months.map((m) => m.label.slice(0, 3)),
        datasets: [
          {
            label: "Revenue",
            data: data.months.map((m) => m.revenue),
            backgroundColor: "#3266ad",
            borderRadius: 4,
            yAxisID: "y",
          },
          {
            label: "Orders",
            data: data.months.map((m) => m.orders),
            backgroundColor: "#73726c",
            borderRadius: 4,
            yAxisID: "y2",
          },
        ],
      }
    : null;

  const chartOptions: ChartOptions<"bar"> = {
    ...baseBarOptions,
    scales: {
      ...baseBarOptions.scales,
      y: {
        ticks: { callback: (v) => fmtK(Number(v)), font: { size: 11 } },
        grid: { color: "rgba(128,128,128,0.12)" },
      },
      y2: {
        position: "right",
        ticks: { font: { size: 11 } },
        grid: { display: false },
      },
      x: { ticks: { font: { size: 11 }, autoSkip: false, maxRotation: 0 } },
    },
  };

  const best = data?.months.reduce((a, b) => (b.revenue > a.revenue ? b : a));

  return (
    <div>
      <div className="controls-row">
        <div className="controls">
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
        <ExportButtons
          onPdf={()   => exportPdf({ year, format: "pdf" })}
          onExcel={() => exportExcel({ year, format: "excel" })}
        />
      </div>

      {isFetching && <Spinner />}
      {isError && <ErrorMsg msg="Failed to load monthly report." />}

      {data && (
        <>
          <div className="metric-row">
            <MetricCard label="Total revenue" value={fmt(data.total_revenue)} sub={String(year)} />
            <MetricCard label="Total orders"  value={data.total_orders.toLocaleString()} sub="confirmed" />
            <MetricCard label="Avg / month"   value={fmt(Math.round(data.total_revenue / 12))} sub="revenue" />
            {best && <MetricCard label="Best month" value={best.label} sub={fmt(best.revenue)} />}
          </div>

          <div className="legend-row">
            <span><span className="legend-dot" style={{ background: "#3266ad" }} />Revenue</span>
            <span><span className="legend-dot" style={{ background: "#73726c" }} />Orders</span>
          </div>

          <div className="chart-wrap" style={{ height: 260 }}>
            <Bar data={chartData!} options={chartOptions} />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Month</th><th>Orders</th><th>Revenue</th><th>Untaxed</th><th>Share</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((m: MonthlyRow) => (
                  <tr key={m.month}>
                    <td>{m.label}</td>
                    <td>{m.orders}</td>
                    <td>{fmt(m.revenue)}</td>
                    <td>{fmt(m.revenue_untaxed)}</td>
                    <td>
                      <MiniBar pct={data.total_revenue ? (m.revenue / data.total_revenue) * 100 : 0} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Daily tab ─────────────────────────────────────────────────────────────────

function DailyTab() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isFetching, isError } = useGetDailySalesReportQuery({ year, month });

  const [exportPdf]   = useExportDailySalesReportMutation();
  const [exportExcel] = useExportDailySalesReportMutation();

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  const chartData = data
    ? {
        labels: data.days.map((d) => d.date.slice(8)),
        datasets: [
          {
            label: "Revenue",
            data: data.days.map((d) => d.revenue),
            borderColor: "#3266ad",
            backgroundColor: "rgba(50,102,173,0.08)",
            fill: true,
            tension: 0.35,
            pointRadius: 2,
          },
        ],
      }
    : null;

  const lineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        ticks: { callback: (v) => fmtK(Number(v)), font: { size: 11 } },
        grid: { color: "rgba(128,128,128,0.12)" },
      },
      x: { ticks: { font: { size: 11 }, autoSkip: true, maxTicksLimit: 15 } },
    },
  };

  const best       = data?.days.reduce((a, b) => (b.revenue > a.revenue ? b : a));
  const activeDays = data?.days.filter((d) => d.orders > 0).length ?? 0;
  const monthPad   = String(month).padStart(2, "0");

  return (
    <div>
      <div className="controls-row">
        <div className="controls">
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y}>{y}</option>)}
          </select>
          <label>Month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <ExportButtons
          onPdf={()   => exportPdf({ year, month, format: "pdf" })}
          onExcel={() => exportExcel({ year, month, format: "excel" })}
        />
      </div>

      {isFetching && <Spinner />}
      {isError && <ErrorMsg msg="Failed to load daily report." />}

      {data && (
        <>
          <div className="metric-row">
            <MetricCard label="Month revenue" value={fmt(data.total_revenue)} />
            <MetricCard label="Total orders"  value={String(data.total_orders)} />
            <MetricCard label="Active days"   value={String(activeDays)} sub={`of ${data.days.length}`} />
            {best && <MetricCard label="Peak day" value={best.date.slice(8)} sub={fmt(best.revenue)} />}
          </div>

          <div className="chart-wrap" style={{ height: 240 }}>
            <Line data={chartData!} options={lineOptions} />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Orders</th><th>Revenue</th></tr>
              </thead>
              <tbody>
                {data.days
                  .filter((d: DailyRow) => d.orders > 0)
                  .map((d: DailyRow) => (
                    <tr key={d.date}>
                      <td>{d.date}</td>
                      <td>{d.orders}</td>
                      <td>{fmt(d.revenue)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Products tab ──────────────────────────────────────────────────────────────

function ProductsTab() {
  const now          = new Date();
  const firstOfYear  = toIso(new Date(now.getFullYear(), 0, 1));
  const [dateFrom, setDateFrom] = useState(firstOfYear);
  const [dateTo,   setDateTo]   = useState(toIso(now));

  const { data, isFetching, isError } = useGetProductSalesReportQuery({
    date_from: dateFrom,
    date_to:   dateTo,
  });

  const [exportPdf]   = useExportProductSalesReportMutation();
  const [exportExcel] = useExportProductSalesReportMutation();

  const top = data?.products.slice(0, 8) ?? [];

  const chartData = {
    labels: top.map((p) => p.product_name),
    datasets: [
      {
        label: "Revenue",
        data: top.map((p) => p.revenue),
        backgroundColor: "#3266ad",
        borderRadius: 4,
      },
    ],
  };

  const hBarOptions: ChartOptions<"bar"> = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { callback: (v) => fmtK(Number(v)), font: { size: 11 } },
        grid: { color: "rgba(128,128,128,0.12)" },
      },
      y: { ticks: { font: { size: 11 } } },
    },
  };

  const hBarHeight = Math.max(200, top.length * 42 + 60);

  return (
    <div>
      <div className="controls-row">
        <div className="controls">
          <label>From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <label>To</label>
          <input type="date" value={dateTo}   onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <ExportButtons
          onPdf={()   => exportPdf({ date_from: dateFrom, date_to: dateTo, format: "pdf" })}
          onExcel={() => exportExcel({ date_from: dateFrom, date_to: dateTo, format: "excel" })}
        />
      </div>

      {isFetching && <Spinner />}
      {isError && <ErrorMsg msg="Failed to load product report." />}

      {data && (
        <>
          <div className="metric-row">
            <MetricCard label="Total revenue"  value={fmt(data.total_revenue)} />
            <MetricCard label="Products"        value={String(data.total_products_sold)} />
            <MetricCard
              label="Total units"
              value={data.products.reduce((s, p) => s + p.qty_sold, 0).toLocaleString()}
            />
            {data.products[0] && (
              <MetricCard
                label="Top product"
                value={data.products[0].product_name}
                sub={fmt(data.products[0].revenue)}
              />
            )}
          </div>

          <div className="chart-wrap" style={{ height: hBarHeight }}>
            <Bar data={chartData} options={hBarOptions} />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Product</th><th>Units</th><th>Orders</th><th>Revenue</th><th>Share</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((p: ProductSalesRow, i: number) => (
                  <tr key={p.product_id}>
                    <td className="muted">{i + 1}</td>
                    <td>{p.product_name}</td>
                    <td>{p.qty_sold.toLocaleString()}</td>
                    <td>{p.order_count}</td>
                    <td>{fmt(p.revenue)}</td>
                    <td>
                      <MiniBar
                        pct={data.total_revenue ? (p.revenue / data.total_revenue) * 100 : 0}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Inventory tab ─────────────────────────────────────────────────────────────

function InventoryTab() {
  const now         = new Date();
  const firstOfYear = toIso(new Date(now.getFullYear(), 0, 1));
  const [dateFrom, setDateFrom] = useState(firstOfYear);
  const [dateTo,   setDateTo]   = useState(toIso(now));

  const { data, isFetching, isError } = useGetInventoryMovementsQuery({
    date_from: dateFrom,
    date_to:   dateTo,
  });

  const [exportPdf]   = useExportInventoryReportMutation();
  const [exportExcel] = useExportInventoryReportMutation();

  const movements = data?.movements ?? [];

  const chartData = {
    labels: movements.map((m) => m.product_name),
    datasets: [
      {
        label: "In",
        data: movements.map((m) => m.qty_in),
        backgroundColor: "#639922",
        borderRadius: 4,
      },
      {
        label: "Out",
        data: movements.map((m) => m.qty_out),
        backgroundColor: "#D85A30",
        borderRadius: 4,
      },
    ],
  };

  const hBarOptions: ChartOptions<"bar"> = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { font: { size: 11 } },
        grid: { color: "rgba(128,128,128,0.12)" },
      },
      y: { ticks: { font: { size: 11 } } },
    },
  };

  const hBarHeight = Math.max(200, movements.length * 42 + 60);
  const totalIn    = movements.reduce((s, m) => s + m.qty_in,  0);
  const totalOut   = movements.reduce((s, m) => s + m.qty_out, 0);
  const net        = totalIn - totalOut;

  return (
    <div>
      <div className="controls-row">
        <div className="controls">
          <label>From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <label>To</label>
          <input type="date" value={dateTo}   onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <ExportButtons
          onPdf={()   => exportPdf({ date_from: dateFrom, date_to: dateTo, format: "pdf" })}
          onExcel={() => exportExcel({ date_from: dateFrom, date_to: dateTo, format: "excel" })}
        />
      </div>

      {isFetching && <Spinner />}
      {isError && <ErrorMsg msg="Failed to load inventory report." />}

      {data && (
        <>
          <div className="metric-row">
            <MetricCard
              label="Total in"
              value={totalIn.toLocaleString()}
              sub="units received"
              valueColor="#3B6D11"
            />
            <MetricCard
              label="Total out"
              value={totalOut.toLocaleString()}
              sub="units shipped"
              valueColor="#993C1D"
            />
            <MetricCard
              label="Net movement"
              value={(net >= 0 ? "+" : "") + net.toLocaleString()}
            />
            <MetricCard label="SKUs moved" value={String(movements.length)} />
          </div>

          <div className="legend-row">
            <span><span className="legend-dot" style={{ background: "#639922" }} />In</span>
            <span><span className="legend-dot" style={{ background: "#D85A30" }} />Out</span>
          </div>

          <div className="chart-wrap" style={{ height: hBarHeight }}>
            <Bar data={chartData} options={hBarOptions} />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Product</th><th>In</th><th>Out</th><th>Net</th></tr>
              </thead>
              <tbody>
                {movements.map((m: MovementRow) => {
                  const n = m.qty_in - m.qty_out;
                  return (
                    <tr key={m.product_id}>
                      <td>{m.product_name}</td>
                      <td style={{ color: "#3B6D11" }}>+{m.qty_in}</td>
                      <td style={{ color: "#993C1D" }}>-{m.qty_out}</td>
                      <td style={{ color: n >= 0 ? "#3B6D11" : "#993C1D" }}>
                        {n >= 0 ? "+" : ""}{n}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

type Tab = "monthly" | "daily" | "products" | "inventory";

const TABS: { id: Tab; label: string }[] = [
  { id: "monthly",   label: "Monthly sales" },
  { id: "daily",     label: "Daily sales" },
  { id: "products",  label: "By product" },
  { id: "inventory", label: "Inventory" },
];

export default function ReportsDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("monthly");

  return (
    <div className="reports-root">
      <style>{`
        .reports-root {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #1a1a1a;
          max-width: 960px;
          margin: 0 auto;
          padding: 24px 20px;
        }
        .reports-root h1 {
          font-size: 20px; font-weight: 600;
          margin-bottom: 20px; letter-spacing: -0.02em;
        }
        .tab-bar {
          display: flex; gap: 2px;
          border-bottom: 1px solid #e5e5e5;
          margin-bottom: 24px;
        }
        .tab-btn {
          background: none; border: none;
          font-size: 13px; padding: 8px 16px;
          cursor: pointer; color: #666;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px; font-family: inherit;
          transition: color 0.15s;
        }
        .tab-btn:hover { color: #1a1a1a; }
        .tab-btn.active { color: #1a1a1a; font-weight: 500; border-bottom-color: #1a1a1a; }
        .controls-row {
          display: flex; align-items: center;
          justify-content: space-between;
          flex-wrap: wrap; gap: 10px; margin-bottom: 20px;
        }
        .controls {
          display: flex; align-items: center;
          gap: 10px; flex-wrap: wrap;
        }
        .controls label { font-size: 12px; color: #666; }
        .controls select,
        .controls input[type="date"] {
          font-size: 13px; padding: 5px 10px;
          border: 1px solid #d5d5d5; border-radius: 6px;
          background: #fff; color: #1a1a1a;
          font-family: inherit; outline: none;
        }
        .controls select:focus,
        .controls input[type="date"]:focus { border-color: #999; }
        .export-row {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .export-label { font-size: 12px; color: #888; }
        .export-btn {
          font-size: 12px; font-family: inherit;
          padding: 5px 12px; border-radius: 6px;
          border: 1px solid #d5d5d5; background: #fff;
          color: #1a1a1a; cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          white-space: nowrap;
        }
        .export-btn:hover:not(:disabled) { background: #f2f2f0; border-color: #bbb; }
        .export-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .export-error { font-size: 12px; color: #993C1D; }
        .metric-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px; margin-bottom: 20px;
        }
        .metric-card { background: #f7f7f5; border-radius: 8px; padding: 14px 16px; }
        .metric-label {
          font-size: 11px; color: #888;
          text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;
        }
        .metric-value { font-size: 22px; font-weight: 600; color: #1a1a1a; line-height: 1.1; }
        .metric-sub   { font-size: 12px; color: #999; margin-top: 4px; }
        .chart-wrap   { position: relative; width: 100%; margin-bottom: 24px; }
        .table-wrap   { overflow-x: auto; border: 1px solid #e8e8e8; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th {
          text-align: left; font-size: 11px; font-weight: 600;
          color: #888; text-transform: uppercase; letter-spacing: 0.04em;
          padding: 10px 14px; background: #fafaf8; border-bottom: 1px solid #e8e8e8;
        }
        td { padding: 10px 14px; border-bottom: 1px solid #f0f0f0; color: #1a1a1a; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #fafaf8; }
        .muted { color: #aaa; }
        .mini-bar-wrap { display: flex; align-items: center; gap: 8px; }
        .mini-bar {
          height: 6px; border-radius: 3px; background: #3266ad;
          min-width: 2px; max-width: 120px;
        }
        .mini-bar-label { font-size: 12px; color: #666; white-space: nowrap; }
        .legend-row {
          display: flex; gap: 16px; margin-bottom: 10px;
          font-size: 12px; color: #666;
        }
        .legend-row span { display: flex; align-items: center; gap: 5px; }
        .legend-dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
        .spinner {
          width: 24px; height: 24px;
          border: 2px solid #e5e5e5; border-top-color: #3266ad;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin: 40px auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error-msg {
          color: #993C1D; font-size: 13px; padding: 12px;
          background: #FAECE7; border-radius: 6px; margin-bottom: 16px;
        }
      `}</style>

      <h1>Reports</h1>

      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "monthly"   && <MonthlyTab />}
      {activeTab === "daily"     && <DailyTab />}
      {activeTab === "products"  && <ProductsTab />}
      {activeTab === "inventory" && <InventoryTab />}
    </div>
  );
}