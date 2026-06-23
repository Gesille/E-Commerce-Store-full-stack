"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Building2,
  ReceiptText,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Layers,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DenominationEntry {
  value: number;
  label: string;
  count: number;
}

interface PaymentSummary {
  cash: number;
  card: number;
  bank: number;
  check: number;
  total: number;
}

interface DailyReport {
  date: string;
  ordersCount: number;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  tax: number;
  payments: PaymentSummary;
  denominations: DenominationEntry[];
  openingBalance: number;
  closingBalance: number;
  sessionName: string;
  cashierName: string;
  avgOrderValue: number;
  topProduct: string;
}

interface MonthDay {
  date: string;
  dayNum: number;
  ordersCount: number;
  netSales: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

// ─── Default denominations ────────────────────────────────────────────────────

const DEFAULT_DENOMINATIONS: DenominationEntry[] = [
  { value: 100, label: "100", count: 0 },
  { value: 50, label: "50", count: 0 },
  { value: 20, label: "20", count: 0 },
  { value: 10, label: "10", count: 0 },
  { value: 5, label: "5", count: 0 },
  { value: 1, label: "1", count: 0 },
  { value: 0.25, label: "0.25", count: 0 },
  { value: 0.1, label: "0.10", count: 0 },
  { value: 0.05, label: "0.05", count: 0 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// ─── Mock API (replace with real RTK Query hooks) ─────────────────────────────

async function fetchDailyReport(date: string): Promise<DailyReport> {
  // Replace this with: await getDailyPOSReport(date).unwrap()
  // which should call GET /api/pos/reports/daily?date=YYYY-MM-DD
  await new Promise((r) => setTimeout(r, 600));

  const seed = date.split("-").reduce((a, b) => a + parseInt(b), 0);
  const rng = (min: number, max: number) =>
    min + ((seed * 1234567 + min * 9999) % (max - min));

  const orders = rng(12, 80);
  const gross = rng(800, 6000);
  const disc = rng(0, gross * 0.1);
  const refunds = rng(0, gross * 0.05);
  const net = gross - disc - refunds;
  const tax = net * 0.17;
  const cash = net * 0.45;
  const card = net * 0.35;
  const bank = net * 0.12;
  const check = net * 0.08;

  const denominations: DenominationEntry[] = [
    { value: 100, label: "100", count: Math.floor(rng(0, 20)) },
    { value: 50, label: "50", count: Math.floor(rng(0, 30)) },
    { value: 20, label: "20", count: Math.floor(rng(0, 40)) },
    { value: 10, label: "10", count: Math.floor(rng(0, 50)) },
    { value: 5, label: "5", count: Math.floor(rng(0, 30)) },
    { value: 1, label: "1", count: Math.floor(rng(0, 100)) },
    { value: 0.25, label: "0.25", count: Math.floor(rng(0, 80)) },
    { value: 0.1, label: "0.10", count: Math.floor(rng(0, 60)) },
    { value: 0.05, label: "0.05", count: Math.floor(rng(0, 40)) },
  ];

  return {
    date,
    ordersCount: orders,
    grossSales: gross,
    discounts: disc,
    refunds,
    netSales: net,
    tax,
    payments: { cash, card, bank, check, total: net },
    denominations,
    openingBalance: rng(200, 500),
    closingBalance: cash + rng(200, 500),
    sessionName: `POS/${date.replace(/-/g, "")}`,
    cashierName: ["Ahmed K.", "Sara M.", "Yusuf A."][seed % 3],
    avgOrderValue: net / orders,
    topProduct: ["Grilled Chicken", "Caesar Salad", "Pasta Carbonara", "Beef Burger"][seed % 4],
  };
}

async function fetchMonthSummary(
  year: number,
  month: number
): Promise<{ date: string; ordersCount: number; netSales: number }[]> {
  await new Promise((r) => setTimeout(r, 400));
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const seed = year + month * 31 + d;
    const has = seed % 7 !== 0; // closed Sundays
    return {
      date: dateStr,
      ordersCount: has ? (seed % 60) + 10 : 0,
      netSales: has ? ((seed * 17) % 5000) + 500 : 0,
    };
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  color,
  isAmount = true,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  isAmount?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </span>
        <span className={`p-1.5 rounded-lg ${color}`}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 tabular-nums">
        {isAmount ? `$${fmt(value)}` : value.toLocaleString()}
      </div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

function PaymentBar({
  label,
  amount,
  total,
  color,
  icon,
}: {
  label: string;
  amount: number;
  total: number;
  color: string;
  icon: React.ReactNode;
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          {icon}
          {label}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-xs">{pct.toFixed(1)}%</span>
          <span className="font-semibold tabular-nums text-gray-900">
            ${fmt(amount)}
          </span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function DenominationRow({
  denom,
  onChange,
  editable,
}: {
  denom: DenominationEntry;
  onChange: (count: number) => void;
  editable: boolean;
}) {
  const total = denom.value * denom.count;
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <td className="py-2.5 pl-4 pr-2 text-sm font-medium text-gray-700">
        <span className="inline-flex items-center gap-1">
          <span className="text-gray-400 text-xs">$</span>
          {denom.label}
        </span>
      </td>
      <td className="py-2.5 px-2 text-center">
        {editable ? (
          <input
            type="number"
            min={0}
            value={denom.count}
            onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        ) : (
          <span className="text-sm font-semibold text-gray-900 tabular-nums">
            {denom.count}
          </span>
        )}
      </td>
      <td className="py-2.5 pl-2 pr-4 text-right text-sm font-semibold tabular-nums text-gray-900">
        ${fmt(total)}
      </td>
    </tr>
  );
}

function CalendarGrid({
  year,
  month,
  days,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  days: MonthDay[];
  selectedDate: string;
  onSelectDate: (d: string) => void;
}) {
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const firstDay = new Date(year, month - 1, 1).getDay();
  const maxSales = Math.max(...days.map((d) => d.netSales));

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-semibold text-gray-400 py-2 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-16 border-b border-r border-gray-50" />
        ))}
        {days.map((day) => {
          const intensity =
            day.netSales > 0 ? Math.max(0.08, day.netSales / maxSales) : 0;
          const isSelected = day.date === selectedDate;

          return (
            <button
              key={day.date}
              onClick={() => day.netSales > 0 && onSelectDate(day.date)}
              disabled={day.netSales === 0}
              className={`h-16 border-b border-r border-gray-50 flex flex-col items-start justify-start p-1.5 text-left transition-all relative overflow-hidden
                ${isSelected ? "ring-2 ring-inset ring-blue-500 bg-blue-50" : ""}
                ${day.netSales > 0 ? "cursor-pointer hover:bg-blue-50" : "cursor-default opacity-40"}
                ${day.isToday && !isSelected ? "bg-amber-50" : ""}
              `}
            >
              {day.netSales > 0 && !isSelected && (
                <div
                  className="absolute inset-0 bg-emerald-400 opacity-10"
                  style={{ opacity: intensity * 0.18 }}
                />
              )}
              <span
                className={`text-xs font-semibold z-10 ${
                  isSelected
                    ? "text-blue-700"
                    : day.isToday
                    ? "text-amber-700"
                    : "text-gray-600"
                }`}
              >
                {day.dayNum}
              </span>
              {day.netSales > 0 && (
                <span className="text-[9px] text-emerald-700 font-medium z-10 mt-auto leading-tight">
                  ${(day.netSales / 1000).toFixed(1)}k
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function POSClosingReport() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [monthDays, setMonthDays] = useState<MonthDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [denominations, setDenominations] = useState<DenominationEntry[]>(
    DEFAULT_DENOMINATIONS
  );
  const [denomEditable, setDenomEditable] = useState(false);

  const loadReport = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const data = await fetchDailyReport(date);
      setReport(data);
      // Pre-fill denominations from report
      setDenominations(data.denominations);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMonth = useCallback(async (y: number, m: number) => {
    const summary = await fetchMonthSummary(y, m);
    const todayStr = new Date().toISOString().split("T")[0];
    setMonthDays(
      summary.map((s) => ({
        ...s,
        dayNum: new Date(s.date + "T00:00:00").getDate(),
        isCurrentMonth: true,
        isToday: s.date === todayStr,
        isSelected: s.date === selectedDate,
      }))
    );
  }, [selectedDate]);

  useEffect(() => {
    loadReport(selectedDate);
  }, [selectedDate, loadReport]);

  useEffect(() => {
    loadMonth(calYear, calMonth);
  }, [calYear, calMonth, loadMonth, selectedDate]);

  const handlePrevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };

  const denomTotal = denominations.reduce(
    (sum, d) => sum + d.value * d.count,
    0
  );

  const monthTotal = monthDays.reduce((s, d) => s + d.netSales, 0);
  const monthOrders = monthDays.reduce((s, d) => s + d.ordersCount, 0);

  const MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <div className="min-h-screen bg-[#F6F7FA] font-sans">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <ReceiptText size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-gray-900">
              POS Closing Report
            </h1>
            <p className="text-[11px] text-gray-400">
              Z-Report · Session Summary
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => setViewMode("daily")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewMode === "daily"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewMode === "monthly"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Monthly
            </button>
          </div>

          <button
            onClick={() => loadReport(selectedDate)}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Printer size={13} />
            Print
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 grid grid-cols-[320px_1fr] gap-6">
        {/* ── LEFT: Calendar ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Month nav */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
              >
                <ChevronLeft size={16} />
              </button>
              <h2 className="text-sm font-bold text-gray-900">
                {MONTH_NAMES[calMonth]} {calYear}
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <CalendarGrid
              year={calYear}
              month={calMonth}
              days={monthDays}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-200 inline-block" />
                Today
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-300 inline-block" />
                Selected
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-gray-100 inline-block" />
                Closed
              </span>
            </div>
          </div>

          {/* Month totals */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-blue-600" />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                {MONTH_NAMES[calMonth]} Summary
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Revenue</span>
                <span className="font-bold text-gray-900 tabular-nums">
                  ${fmt(monthTotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Orders</span>
                <span className="font-bold text-gray-900 tabular-nums">
                  {monthOrders.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Active Days</span>
                <span className="font-bold text-gray-900">
                  {monthDays.filter((d) => d.ordersCount > 0).length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Avg / Day</span>
                <span className="font-bold text-gray-900 tabular-nums">
                  ${fmt(monthTotal / Math.max(1, monthDays.filter((d) => d.ordersCount > 0).length))}
                </span>
              </div>
            </div>
          </div>

          {/* Selected date quick info */}
          {report && (
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={13} className="opacity-70" />
                <span className="text-[11px] font-semibold opacity-70 uppercase tracking-wide">
                  Selected Day
                </span>
              </div>
              <p className="text-[13px] font-bold leading-snug mb-3">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short", month: "short", day: "numeric",
                })}
              </p>
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="opacity-70">Session</span>
                  <span className="font-semibold">{report.sessionName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Cashier</span>
                  <span className="font-semibold">{report.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Orders</span>
                  <span className="font-semibold">{report.ordersCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Report ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white rounded-xl border border-gray-100">
              <RefreshCw size={24} className="animate-spin mb-3" />
              <span className="text-sm">Loading report…</span>
            </div>
          ) : report ? (
            <>
              {/* Report header */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      {fmtDate(selectedDate)}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Session: {report.sessionName} · Cashier: {report.cashierName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                      <CheckCircle2 size={11} />
                      Closed
                    </span>
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-4 gap-3">
                <KpiCard
                  label="Net Sales"
                  value={report.netSales}
                  sub={`${report.ordersCount} orders`}
                  icon={<TrendingUp size={14} className="text-emerald-600" />}
                  color="bg-emerald-50"
                />
                <KpiCard
                  label="Gross Sales"
                  value={report.grossSales}
                  sub={`Before discounts`}
                  icon={<Layers size={14} className="text-blue-600" />}
                  color="bg-blue-50"
                />
                <KpiCard
                  label="Avg Order"
                  value={report.avgOrderValue}
                  sub={`per transaction`}
                  icon={<BarChart3 size={14} className="text-violet-600" />}
                  color="bg-violet-50"
                />
                <KpiCard
                  label="Tax Collected"
                  value={report.tax}
                  sub="17% VAT"
                  icon={<ReceiptText size={14} className="text-amber-600" />}
                  color="bg-amber-50"
                />
              </div>

              {/* Sales Breakdown + Payment Methods */}
              <div className="grid grid-cols-2 gap-4">
                {/* Sales breakdown */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">
                    Sales Breakdown
                  </h3>
                  <div className="flex flex-col gap-0">
                    {[
                      {
                        label: "Gross Sales",
                        value: report.grossSales,
                        cls: "text-gray-900 font-semibold",
                      },
                      {
                        label: "Discounts",
                        value: -report.discounts,
                        cls: "text-red-500 font-medium",
                      },
                      {
                        label: "Refunds / Returns",
                        value: -report.refunds,
                        cls: "text-red-500 font-medium",
                      },
                    ].map(({ label, value, cls }) => (
                      <div
                        key={label}
                        className="flex justify-between py-2.5 border-b border-gray-50 text-sm"
                      >
                        <span className="text-gray-600">{label}</span>
                        <span className={`tabular-nums ${cls}`}>
                          {value < 0 ? "-" : ""}${fmt(Math.abs(value))}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 text-sm font-bold border-t-2 border-gray-200 mt-1">
                      <span className="text-gray-900">Net Sales</span>
                      <span className="text-emerald-700 tabular-nums">
                        ${fmt(report.netSales)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 text-xs">
                      <span className="text-gray-400">VAT (17%)</span>
                      <span className="text-gray-600 tabular-nums">
                        +${fmt(report.tax)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 text-sm font-bold border-t border-gray-100">
                      <span className="text-gray-900">Total incl. Tax</span>
                      <span className="text-gray-900 tabular-nums">
                        ${fmt(report.netSales + report.tax)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment methods */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">
                    Payment Methods
                  </h3>
                  <div className="flex flex-col gap-4">
                    <PaymentBar
                      label="Cash"
                      amount={report.payments.cash}
                      total={report.payments.total}
                      color="bg-emerald-400"
                      icon={<Banknote size={14} className="text-emerald-600" />}
                    />
                    <PaymentBar
                      label="Credit / Debit Card"
                      amount={report.payments.card}
                      total={report.payments.total}
                      color="bg-blue-400"
                      icon={<CreditCard size={14} className="text-blue-600" />}
                    />
                    <PaymentBar
                      label="Bank Transfer"
                      amount={report.payments.bank}
                      total={report.payments.total}
                      color="bg-violet-400"
                      icon={<Building2 size={14} className="text-violet-600" />}
                    />
                    <PaymentBar
                      label="Check"
                      amount={report.payments.check}
                      total={report.payments.total}
                      color="bg-amber-400"
                      icon={<ReceiptText size={14} className="text-amber-600" />}
                    />
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-sm font-bold">
                    <span className="text-gray-900">Total Collected</span>
                    <span className="tabular-nums text-gray-900">
                      ${fmt(report.payments.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cash register: opening / closing + denominations */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Cash Register Count
                  </h3>
                  <button
                    onClick={() => setDenomEditable((v) => !v)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                      denomEditable
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {denomEditable ? "✓ Done" : "Edit Counts"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Opening / Closing */}
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-50 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock size={13} className="text-gray-400" />
                        Opening Balance
                      </div>
                      <span className="font-semibold tabular-nums text-gray-900">
                        ${fmt(report.openingBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-50 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Banknote size={13} className="text-emerald-500" />
                        Cash Sales
                      </div>
                      <span className="font-semibold tabular-nums text-emerald-700">
                        +${fmt(report.payments.cash)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-50 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <XCircle size={13} className="text-red-400" />
                        Cash Refunds
                      </div>
                      <span className="font-semibold tabular-nums text-red-500">
                        -${fmt(report.refunds * 0.45)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 font-bold text-sm border-t-2 border-gray-200">
                      <span className="text-gray-900">Expected Closing</span>
                      <span className="tabular-nums text-gray-900">
                        ${fmt(report.closingBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 text-sm">
                      <span className="text-gray-600">Counted (below)</span>
                      <span
                        className={`font-bold tabular-nums ${
                          Math.abs(denomTotal - report.closingBalance) < 1
                            ? "text-emerald-700"
                            : "text-red-500"
                        }`}
                      >
                        ${fmt(denomTotal)}
                      </span>
                    </div>
                    <div
                      className={`flex justify-between items-center py-2 rounded-lg px-3 text-sm ${
                        Math.abs(denomTotal - report.closingBalance) < 1
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      <span className="font-medium">Difference</span>
                      <span className="font-bold tabular-nums">
                        {denomTotal - report.closingBalance >= 0 ? "+" : ""}
                        ${fmt(denomTotal - report.closingBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Denomination table */}
                  <div>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide pb-2 pl-4">
                            Bill / Coin
                          </th>
                          <th className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide pb-2">
                            Count
                          </th>
                          <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-wide pb-2 pr-4">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {denominations.map((d, i) => (
                          <DenominationRow
                            key={d.label}
                            denom={d}
                            editable={denomEditable}
                            onChange={(count) => {
                              setDenominations((prev) =>
                                prev.map((item, idx) =>
                                  idx === i ? { ...item, count } : item
                                )
                              );
                            }}
                          />
                        ))}
                        <tr className="border-t-2 border-gray-200">
                          <td
                            colSpan={2}
                            className="py-3 pl-4 text-sm font-bold text-gray-900"
                          >
                            Total Cash
                          </td>
                          <td className="py-3 pr-4 text-right text-sm font-bold text-emerald-700 tabular-nums">
                            ${fmt(denomTotal)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer signature line */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">
                  Cashier Sign-Off
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  {["Cashier Signature", "Supervisor Signature", "Date & Stamp"].map(
                    (label) => (
                      <div key={label} className="flex flex-col gap-2">
                        <div className="h-10 border-b-2 border-dashed border-gray-200" />
                        <span className="text-[10px] text-gray-400 text-center">
                          {label}
                        </span>
                      </div>
                    )
                  )}
                </div>
                <p className="text-[10px] text-gray-300 text-center mt-4">
                  Generated by Chef's World POS · {new Date().toLocaleString()}
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <style>{`
        @media print {
          .sticky { position: static !important; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
}