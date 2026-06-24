"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Banknote,
  Building2,
  ReceiptText,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Layers,
  FileText,
  CalendarRange,
  ChevronDown,
  Save,
  AlertCircle,
} from "lucide-react";
import {
  useGetDailyClosingReportQuery,
  useGetMonthlyCalendarReportQuery,
  useSubmitCashCountMutation,
} from "@/redux/report/posClosingReportApi";
import { useSelector } from "react-redux";
import { createPortal } from "react-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DenominationEntry {
  value: number;
  label: string;
  count: number;
}

interface MonthDay {
  date: string;
  dayNum: number;
  ordersCount: number;
  netSales: number;
  isToday: boolean;
  isSelected: boolean;
}

type QuickRange =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

// ─── Default denominations ────────────────────────────────────────────────────

const DEFAULT_DENOMINATIONS: DenominationEntry[] = [
  { value: 100,  label: "100",  count: 0 },
  { value: 50,   label: "50",   count: 0 },
  { value: 20,   label: "20",   count: 0 },
  { value: 10,   label: "10",   count: 0 },
  { value: 5,    label: "5",    count: 0 },
  { value: 1,    label: "1",    count: 0 },
  { value: 0.25, label: "0.25", count: 0 },
  { value: 0.10, label: "0.10", count: 0 },
  { value: 0.05, label: "0.05", count: 0 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const fmtShort = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const addDays = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

const todayISO = () => new Date().toISOString().split("T")[0];

// ─── Card config — defines display order, label, color for each card type ────

const CARD_TYPES = [
  { key: "visa",       label: "Visa",         color: "bg-blue-400",   iconColor: "text-blue-600"   },
  { key: "mastercard", label: "Mastercard",   color: "bg-orange-400", iconColor: "text-orange-600" },
  { key: "amex",       label: "Amex",         color: "bg-indigo-400", iconColor: "text-indigo-600" },
  { key: "card",       label: "Card (other)", color: "bg-gray-400",   iconColor: "text-gray-600"   },
];

// ─── KpiCard ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon, color, trend,
}: {
  label: string; value: number; sub?: string; icon: React.ReactNode; color: string; trend?: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</span>
        <span className={`p-1.5 rounded-lg ${color}`}>{icon}</span>
      </div>
      <div className="text-2xl font-extrabold text-gray-900 tabular-nums tracking-tight">${fmt(value)}</div>
      <div className="flex items-center justify-between">
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
        {trend !== undefined && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── PaymentBar ───────────────────────────────────────────────────────────────

function PaymentBar({ label, amount, total, color, icon }: {
  label: string; amount: number; total: number; color: string; icon: React.ReactNode;
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-700 font-medium">{icon}{label}</div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-xs w-10 text-right">{pct.toFixed(1)}%</span>
          <span className="font-bold tabular-nums text-gray-900 w-20 text-right">${fmt(amount)}</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── DenominationRow ──────────────────────────────────────────────────────────

function DenominationRow({ denom, onChange, editable }: {
  denom: DenominationEntry; onChange: (count: number) => void; editable: boolean;
}) {
  const total = denom.value * denom.count;
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <td className="py-2.5 pl-4 pr-2 text-sm font-medium text-gray-700">
        <span className="inline-flex items-center gap-1 font-mono">
          <span className="text-gray-400 text-xs">$</span>{denom.label}
        </span>
      </td>
      <td className="py-2.5 px-2 text-center">
        {editable ? (
          <input
            type="number"
            min={0}
            value={denom.count}
            onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tabular-nums"
          />
        ) : (
          <span className="text-sm font-semibold text-gray-900 tabular-nums">{denom.count}</span>
        )}
      </td>
      <td className="py-2.5 pl-2 pr-4 text-right text-sm font-bold tabular-nums text-gray-900">
        ${fmt(total)}
      </td>
    </tr>
  );
}

// ─── CalendarGrid ─────────────────────────────────────────────────────────────

function CalendarGrid({ year, month, days, selectedDate, onSelectDate }: {
  year: number; month: number; days: MonthDay[]; selectedDate: string; onSelectDate: (d: string) => void;
}) {
  const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const firstDay = new Date(year, month - 1, 1).getDay();
  const maxSales = Math.max(...days.map((d) => d.netSales), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1.5 uppercase tracking-widest">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e-${i}`} className="h-14 border-b border-r border-gray-50" />
        ))}
        {days.map((day) => {
          const intensity = day.netSales > 0 ? Math.max(0.1, day.netSales / maxSales) : 0;
          const isSelected = day.date === selectedDate;
          return (
            <button
              key={day.date}
              onClick={() => day.netSales > 0 && onSelectDate(day.date)}
              disabled={day.netSales === 0}
              className={`h-14 border-b border-r border-gray-50 flex flex-col items-start justify-start p-1.5 text-left transition-all relative overflow-hidden
                ${isSelected ? "ring-2 ring-inset ring-blue-500 bg-blue-50" : ""}
                ${day.netSales > 0 ? "cursor-pointer hover:bg-blue-50" : "cursor-default opacity-40"}
                ${day.isToday && !isSelected ? "bg-amber-50" : ""}
              `}
            >
              {day.netSales > 0 && !isSelected && (
                <div className="absolute inset-0 bg-emerald-400" style={{ opacity: intensity * 0.15 }} />
              )}
              <span className={`text-[11px] font-bold z-10 ${isSelected ? "text-blue-700" : day.isToday ? "text-amber-700" : "text-gray-600"}`}>
                {day.dayNum}
              </span>
              {day.netSales > 0 && (
                <span className="text-[9px] text-emerald-700 font-semibold z-10 mt-auto leading-tight">
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

// ─── QuickRangePicker ─────────────────────────────────────────────────────────

function QuickRangePicker({ activeRange, onSelect }: {
  activeRange: QuickRange; onSelect: (r: QuickRange, date?: string) => void;
}) {
  const ranges: { key: QuickRange; label: string }[] = [
    { key: "today",     label: "Today"        },
    { key: "yesterday", label: "Yesterday"    },
    { key: "last7",     label: "Last 7 Days"  },
    { key: "last30",    label: "Last 30 Days" },
    { key: "thisMonth", label: "This Month"   },
    { key: "lastMonth", label: "Last Month"   },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {ranges.map((r) => (
        <button
          key={r.key}
          onClick={() => onSelect(r.key)}
          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
            activeRange === r.key
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

// ─── PrintableReport component ────────────────────────────────────────────────

function PrintableReport({ report, selectedDate, denominations, denomTotal }: {
  report: any; selectedDate: string; denominations: DenominationEntry[]; denomTotal: number;
}) {
  return (
    <div id="printable-report" className="font-sans text-gray-900 text-sm">
      {/* Header */}
      <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
        <h1 className="text-2xl font-black tracking-tight uppercase">Chef's World</h1>
        <p className="text-sm text-gray-600 mt-0.5">Point of Sale — Daily Closing Report (Z-Report)</p>
        <p className="text-xs text-gray-500 mt-1">{fmtDate(selectedDate)}</p>
      </div>

      {/* Session info */}
      <div className="grid grid-cols-2 gap-x-8 mb-4 text-xs border-b border-dashed border-gray-300 pb-4">
        <div className="space-y-1">
          <div className="flex justify-between"><span className="text-gray-500">Session</span><span className="font-semibold">{report.sessionName}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Cashier</span><span className="font-semibold">{report.cashierName}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Orders</span><span className="font-semibold">{report.ordersCount}</span></div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-semibold">{selectedDate}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Printed</span><span className="font-semibold">{new Date().toLocaleTimeString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Avg Order</span><span className="font-semibold">${fmt(report.avgOrderValue)}</span></div>
        </div>
      </div>

      {/* Sales breakdown */}
      <div className="mb-4 border-b border-dashed border-gray-300 pb-4">
        <p className="font-bold uppercase text-[11px] tracking-widest text-gray-500 mb-2">Sales Summary</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Gross Sales</span><span className="font-semibold tabular-nums">${fmt(report.grossSales)}</span></div>
          <div className="flex justify-between text-red-600"><span>Discounts</span><span className="tabular-nums">-${fmt(report.discounts)}</span></div>
          <div className="flex justify-between text-red-600"><span>Refunds</span><span className="tabular-nums">-${fmt(report.refunds)}</span></div>
          <div className="flex justify-between font-bold border-t border-gray-300 pt-1 mt-1"><span>Net Sales</span><span className="tabular-nums">${fmt(report.netSales)}</span></div>
          <div className="flex justify-between text-gray-600"><span>VAT / Tax</span><span className="tabular-nums">+${fmt(report.tax)}</span></div>
          <div className="flex justify-between font-black text-base border-t-2 border-gray-800 pt-1 mt-1"><span>TOTAL INCL. TAX</span><span className="tabular-nums">${fmt(report.netSales + report.tax)}</span></div>
        </div>
      </div>

      {/* Payments */}
      <div className="mb-4 border-b border-dashed border-gray-300 pb-4">
        <p className="font-bold uppercase text-[11px] tracking-widest text-gray-500 mb-2">Payments Collected</p>
        <div className="space-y-1 text-sm">
        
{[
  { label: "Cash", value: report.payments.cash },
  ...report.payments.breakdown.map((e: { method: string; amount: number }) => ({
    label: e.method,
    value: e.amount,
  })),
  { label: "Check / Cheque", value: report.payments.check },
].map(({ label, value }) => (
  <div key={label} className="flex justify-between">
    <span className="text-gray-700">{label}</span>
    <span className="font-semibold tabular-nums">${fmt(value)}</span>
  </div>
))}
          <div className="flex justify-between font-bold border-t border-gray-300 pt-1">
            <span>Total Collected</span>
            <span className="tabular-nums">${fmt(report.payments.total)}</span>
          </div>
        </div>
      </div>

      {/* Cash count */}
      <div className="mb-4 border-b border-dashed border-gray-300 pb-4">
        <p className="font-bold uppercase text-[11px] tracking-widest text-gray-500 mb-2">Cash Register Count</p>
        <div className="space-y-1 text-sm mb-3">
          <div className="flex justify-between"><span>Opening Balance</span><span className="tabular-nums">${fmt(report.openingBalance)}</span></div>
          <div className="flex justify-between"><span>Expected Closing</span><span className="tabular-nums font-semibold">${fmt(report.expectedClosingBalance)}</span></div>
          <div className="flex justify-between"><span>Counted Cash</span><span className="tabular-nums font-semibold">${fmt(denomTotal)}</span></div>
          <div className={`flex justify-between font-bold border-t border-gray-300 pt-1 ${Math.abs(denomTotal - report.expectedClosingBalance) < 1 ? "text-emerald-700" : "text-red-600"}`}>
            <span>Difference</span>
            <span className="tabular-nums">{denomTotal - report.expectedClosingBalance >= 0 ? "+" : ""}${fmt(denomTotal - report.expectedClosingBalance)}</span>
          </div>
        </div>
        <table className="w-full text-xs border border-gray-200">
          <thead><tr className="bg-gray-100">
            <th className="text-left py-1 px-2 font-semibold">Denomination</th>
            <th className="text-center py-1 px-2 font-semibold">Count</th>
            <th className="text-right py-1 px-2 font-semibold">Amount</th>
          </tr></thead>
          <tbody>
            {denominations.filter(d => d.count > 0).map(d => (
              <tr key={d.label} className="border-t border-gray-100">
                <td className="py-1 px-2">${d.label}</td>
                <td className="py-1 px-2 text-center">{d.count}</td>
                <td className="py-1 px-2 text-right tabular-nums">${fmt(d.value * d.count)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-800 font-bold">
              <td colSpan={2} className="py-1 px-2">TOTAL CASH</td>
              <td className="py-1 px-2 text-right tabular-nums">${fmt(denomTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Sign-off */}
      <div className="mt-6">
        <div className="grid grid-cols-3 gap-8">
          {["Cashier Signature", "Supervisor Signature", "Date & Stamp"].map((label) => (
            <div key={label} className="flex flex-col gap-2">
              <div className="h-10 border-b-2 border-dashed border-gray-400" />
              <span className="text-[10px] text-gray-500 text-center">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-gray-400 text-center mt-6">
          Chef's World POS · Generated {new Date().toLocaleString()} · This is an official closing document.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function POSClosingReport() {
  const today = todayISO();

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate]       = useState(today);
  const [activeRange, setActiveRange]         = useState<QuickRange>("today");
  const [calMonth, setCalMonth]               = useState(new Date().getMonth() + 1);
  const [calYear, setCalYear]                 = useState(new Date().getFullYear());
  const [denomEditable, setDenomEditable]     = useState(false);
  const [cashCountNotes, setCashCountNotes]   = useState("");
  const [submitSuccess, setSubmitSuccess]     = useState(false);
  const [submitError, setSubmitError]         = useState<string | null>(null);
  const [saveOdooSuccess, setSaveOdooSuccess] = useState(false);
  const [savingOdoo, setSavingOdoo]           = useState(false);
  const [mounted, setMounted]                 = useState(false);

  useEffect(() => setMounted(true), []);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const { user } = useSelector((state: any) => state.auth);

  // ── Denominations persisted per date ──────────────────────────────────────
  const [denominations, setDenominations] = useState<DenominationEntry[]>(() => {
    if (typeof window === "undefined") return DEFAULT_DENOMINATIONS;
    try {
      const saved = localStorage.getItem(`cash_count_${today}`);
      return saved ? JSON.parse(saved) : DEFAULT_DENOMINATIONS;
    } catch { return DEFAULT_DENOMINATIONS; }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`cash_count_${selectedDate}`);
      setDenominations(saved ? JSON.parse(saved) : DEFAULT_DENOMINATIONS);
    } catch { setDenominations(DEFAULT_DENOMINATIONS); }
  }, [selectedDate]);

  const updateDenominations = (updated: DenominationEntry[]) => {
    setDenominations(updated);
    try { localStorage.setItem(`cash_count_${selectedDate}`, JSON.stringify(updated)); } catch {}
  };

  // ── Quick range handler ────────────────────────────────────────────────────
  const handleRangeSelect = (range: QuickRange) => {
    setActiveRange(range);
    const t = today;
    switch (range) {
      case "today":     setSelectedDate(t); break;
      case "yesterday": setSelectedDate(addDays(t, -1)); break;
      case "last7":     setSelectedDate(addDays(t, -6)); break;
      case "last30":    setSelectedDate(addDays(t, -29)); break;
      case "thisMonth": {
        const d = new Date();
        setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
        break;
      }
      case "lastMonth": {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
        break;
      }
    }
  };

  // ── RTK Query ──────────────────────────────────────────────────────────────
  const { data: report, isLoading: reportLoading, isFetching: reportFetching, refetch: refetchReport } =
    useGetDailyClosingReportQuery({ date: selectedDate });

  const { data: monthlyData, isLoading: monthLoading, isFetching: monthFetching } =
    useGetMonthlyCalendarReportQuery({ year: calYear, month: calMonth });

  const [submitCashCount, { isLoading: submitting }] = useSubmitCashCountMutation();

  // ── Derived values ─────────────────────────────────────────────────────────
  const monthDays = useMemo<MonthDay[]>(() => {
    if (!monthlyData?.days) return [];
    return monthlyData.days.map((d: any) => ({
      date:        d.date,
      dayNum:      new Date(d.date + "T00:00:00").getDate(),
      ordersCount: d.ordersCount,
      netSales:    d.netSales,
      isToday:     d.date === today,
      isSelected:  d.date === selectedDate,
    }));
  }, [monthlyData, today, selectedDate]);

  const monthTotals = monthlyData?.totals ?? {
    netSales: 0, ordersCount: 0, activeDays: 0, avgPerDay: 0,
  };

  const denomTotal     = denominations.reduce((s, d) => s + d.value * d.count, 0);
  const isLoading      = reportLoading || reportFetching;
  const isMonthLoading = monthLoading || monthFetching;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handlePrevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };

  const handleSubmitCashCount = async () => {
    setSubmitError(null);
    if (!report?.odooSessionId) { setSubmitError("No Odoo session found for this date"); return; }
    try {
      await submitCashCount({
        date: selectedDate,
        odooSessionId: report.odooSessionId,
        denominations,
        sessionName:   report.sessionName,
        notes:         cashCountNotes,
        submittedBy:   user?.name ?? "unknown",
        role:          user?.role === "admin" ? "manager" : "cashier",
      }).unwrap();
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err: any) {
      setSubmitError(err?.data?.message ?? err?.message ?? "Submit failed. Please try again.");
    }
  };

  const handleSaveToOdoo = async () => {
    setSavingOdoo(true);
    setSaveOdooSuccess(false);
    try {
      await handleSubmitCashCount();
      setSaveOdooSuccess(true);
      setTimeout(() => setSaveOdooSuccess(false), 3000);
    } finally {
      setSavingOdoo(false);
    }
  };

  // ── PDF Export ─────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!report || report.empty) return;

    const pdf    = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W      = 210;
    const margin = 15;
    const lineH  = 6;
    let y        = margin;

    const text = (str: string, x: number, size = 10, style: "normal" | "bold" = "normal") => {
      pdf.setFontSize(size);
      pdf.setFont("helvetica", style);
      pdf.text(str, x, y);
    };

    const line = (x1: number, x2: number, dashed = false) => {
      if (dashed) pdf.setLineDashPattern([1, 1], 0);
      else pdf.setLineDashPattern([], 0);
      pdf.line(x1, y, x2, y);
    };

    const newLine = (n = 1) => { y += lineH * n; };

    const checkPage = () => {
      if (y > 270) { pdf.addPage(); y = margin; }
    };

    // ── Header ──
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("CHEF'S WORLD", W / 2, y, { align: "center" });
    y += 7;
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text("Point of Sale — Daily Closing Report (Z-Report)", W / 2, y, { align: "center" });
    y += 5;
    pdf.text(fmtDate(selectedDate), W / 2, y, { align: "center" });
    y += 3;
    pdf.setLineWidth(0.5);
    line(margin, W - margin);
    y += 6;

    // ── Session Info ──
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text("SESSION", margin, y);
    pdf.text("DETAILS", W / 2 + 5, y);
    y += 5;

    const sessionRows = [
      ["Session", report.sessionName,                         "Date",      selectedDate],
      ["Cashier", report.cashierName,                         "Printed",   new Date().toLocaleTimeString()],
      ["Orders",  String(report.ordersCount),                  "Avg Order", `$${fmt(report.avgOrderValue)}`],
    ];
    pdf.setFontSize(9);
    sessionRows.forEach(([l1, v1, l2, v2]) => {
      pdf.setFont("helvetica", "normal"); pdf.text(l1, margin, y);
      pdf.setFont("helvetica", "bold");   pdf.text(v1, margin + 28, y);
      pdf.setFont("helvetica", "normal"); pdf.text(l2, W / 2 + 5, y);
      pdf.setFont("helvetica", "bold");   pdf.text(v2, W / 2 + 33, y);
      y += lineH;
    });
    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(margin, y, W - margin, y);
    y += 6;

    // ── Sales Summary ──
    checkPage();
    pdf.setFontSize(8); pdf.setFont("helvetica", "bold");
    pdf.text("SALES SUMMARY", margin, y); y += 5;

    const salesRows: [string, string, boolean][] = [
      ["Gross Sales",     `$${fmt(report.grossSales)}`,              false],
      ["Discounts",       `-$${fmt(report.discounts)}`,              false],
      ["Refunds",         `-$${fmt(report.refunds)}`,                false],
      ["Net Sales",       `$${fmt(report.netSales)}`,                true ],
      ["VAT / Tax",       `+$${fmt(report.tax)}`,                    false],
      ["TOTAL INCL. TAX", `$${fmt(report.netSales + report.tax)}`,   true ],
    ];
    salesRows.forEach(([label, value, bold]) => {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.text(label, margin, y);
      pdf.text(value, W - margin, y, { align: "right" });
      y += lineH;
    });
    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(margin, y, W - margin, y); y += 6;

    // ── Payments ──
    checkPage();
    pdf.setFontSize(8); pdf.setFont("helvetica", "bold");
    pdf.text("PAYMENTS COLLECTED", margin, y); y += 5;

    const payRows: [string, number, boolean][] = [
  ["Cash", report.payments.cash, false],
  ...report.payments.breakdown.map((e: { method: string; amount: number }) =>
    [e.method, e.amount, false] as [string, number, boolean]
  ),
  ["Check / Cheque", report.payments.check, false],
  ["Total Collected", report.payments.total, true],
];
    payRows.forEach(([label, value, bold]) => {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.text(label, margin, y);
      pdf.text(`$${fmt(Number(value))}`, W - margin, y, { align: "right" });
      y += lineH;
    });
    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(margin, y, W - margin, y); y += 6;

    // ── Cash Register Count ──
    checkPage();
    pdf.setFontSize(8); pdf.setFont("helvetica", "bold");
    pdf.text("CASH REGISTER COUNT", margin, y); y += 5;

    const diff = denomTotal - report.expectedClosingBalance;
    const cashRows: [string, string, boolean][] = [
      ["Opening Balance",  `$${fmt(report.openingBalance)}`,         false],
      ["Expected Closing", `$${fmt(report.expectedClosingBalance)}`, false],
      ["Counted Cash",     `$${fmt(denomTotal)}`,                    false],
      ["Difference",       `${diff >= 0 ? "+" : ""}$${fmt(diff)}`,  true ],
    ];
    cashRows.forEach(([label, value, bold]) => {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.text(label, margin, y);
      pdf.text(value, W - margin, y, { align: "right" });
      y += lineH;
    });

    // Denomination table
    y += 2;
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, y - 4, W - margin * 2, 6, "F");
    pdf.setFontSize(8); pdf.setFont("helvetica", "bold");
    pdf.text("Denomination", margin + 2, y);
    pdf.text("Count", W / 2, y, { align: "center" });
    pdf.text("Amount", W - margin - 2, y, { align: "right" });
    y += 5;

    denominations.filter(d => d.count > 0).forEach(d => {
      checkPage();
      pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
      pdf.text(`$${d.label}`, margin + 2, y);
      pdf.text(String(d.count), W / 2, y, { align: "center" });
      pdf.text(`$${fmt(d.value * d.count)}`, W - margin - 2, y, { align: "right" });
      y += lineH;
    });
    pdf.setFont("helvetica", "bold");
    pdf.text("TOTAL CASH", margin + 2, y);
    pdf.text(`$${fmt(denomTotal)}`, W - margin - 2, y, { align: "right" });
    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(margin, y + 2, W - margin, y + 2); y += 8;

    // ── Top Products ──
    if (report.topProducts?.length > 0) {
      checkPage();
      pdf.setFontSize(8); pdf.setFont("helvetica", "bold");
      pdf.text("TOP PRODUCTS", margin, y); y += 5;

      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, y - 4, W - margin * 2, 6, "F");
      pdf.text("#", margin + 2, y);
      pdf.text("Product", margin + 10, y);
      pdf.text("Qty", W - margin - 30, y, { align: "right" });
      pdf.text("Revenue", W - margin - 2, y, { align: "right" });
      y += 5;

      report.topProducts.slice(0, 5).forEach((p: any, i: number) => {
        checkPage();
        pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
        pdf.text(String(i + 1), margin + 2, y);
        pdf.text(p.name, margin + 10, y);
        pdf.text(String(p.qty), W - margin - 30, y, { align: "right" });
        pdf.text(`$${fmt(p.revenue)}`, W - margin - 2, y, { align: "right" });
        y += lineH;
      });
      pdf.setLineDashPattern([1, 1], 0);
      pdf.line(margin, y, W - margin, y); y += 6;
    }

    // ── Sign-off ──
    checkPage();
    y += 4;
    const sigCols   = [margin, W / 2 - 20, W - margin - 40];
    const sigLabels = ["Cashier Signature", "Supervisor Signature", "Date & Stamp"];
    sigCols.forEach((x, i) => {
      pdf.setLineDashPattern([1, 1], 0);
      pdf.line(x, y, x + 50, y);
      pdf.setFontSize(7); pdf.setFont("helvetica", "normal");
      pdf.text(sigLabels[i], x, y + 4);
    });
    y += 12;
    pdf.setFontSize(7);
    pdf.text(
      `Chef's World POS · Generated ${new Date().toLocaleString()} · Confidential`,
      W / 2, y, { align: "center" }
    );

    pdf.save(`ZReport_${selectedDate}.pdf`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {mounted && report && !report.empty && createPortal(
        <div id="printable-report-portal">
          <PrintableReport
            report={report}
            selectedDate={selectedDate}
            denominations={denominations}
            denomTotal={denomTotal}
          />
        </div>,
        document.body
      )}

      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body > *:not(#printable-report-portal) { display: none !important; }
          #printable-report-portal { display: block !important; position: static !important; }
          #printable-report-portal { font-size: 11pt; max-width: 80mm; margin: 0 auto; }
          @page { size: A4; margin: 15mm; }
        }
        @media screen {
          #printable-report-portal { display: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-white font-sans print:hidden">

        {/* ── Header ── */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
              <ReceiptText size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-extrabold text-gray-900 tracking-tight">POS Closing Report</h1>
              <p className="text-[11px] text-gray-400 font-medium">Z-Report · {fmtShort(selectedDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchReport()}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh data"
              aria-label="Refresh data"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
            {report && !report.empty && (
              <button
                onClick={handleSaveToOdoo}
                disabled={savingOdoo}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {saveOdooSuccess
                  ? <><CheckCircle2 size={13} /> Saved to Odoo</>
                  : <><Save size={13} /> {savingOdoo ? "Saving…" : "Save to Odoo"}</>
                }
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Printer size={13} /> Print
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Download size={13} /> Export PDF
            </button>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-6 py-5 grid grid-cols-[300px_1fr] gap-5">

          {/* ── LEFT SIDEBAR ── */}
          <div className="flex flex-col gap-4">

            {/* Quick ranges */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarRange size={13} className="text-blue-600" />
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Quick Range</span>
              </div>
              <QuickRangePicker activeRange={activeRange} onSelect={handleRangeSelect} />
              <div className="mt-3 pt-3 border-t border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                  Custom Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  max={today}
                  onChange={(e) => { setSelectedDate(e.target.value); setActiveRange("custom"); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Month calendar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <button onClick={handlePrevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700">
                  <ChevronLeft size={14} />
                </button>
                <h2 className="text-[13px] font-bold text-gray-900">{MONTH_NAMES[calMonth]} {calYear}</h2>
                <button onClick={handleNextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700">
                  <ChevronRight size={14} />
                </button>
              </div>

              {isMonthLoading ? (
                <div className="h-44 flex items-center justify-center text-gray-400">
                  <RefreshCw size={16} className="animate-spin" />
                </div>
              ) : (
                <CalendarGrid
                  year={calYear}
                  month={calMonth}
                  days={monthDays}
                  selectedDate={selectedDate}
                  onSelectDate={(d) => { setSelectedDate(d); setActiveRange("custom"); }}
                />
              )}

              <div className="flex items-center gap-3 mt-2.5 text-[9px] font-semibold text-gray-400 uppercase tracking-wide">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-300 inline-block" />Today</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-400 inline-block" />Selected</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 inline-block" />Revenue</span>
              </div>
            </div>

            {/* Month summary */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={13} className="text-blue-600" />
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">{MONTH_NAMES[calMonth]} Summary</span>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Total Revenue", value: `$${fmt(monthTotals.netSales)}`,          bold: true },
                  { label: "Total Orders",  value: monthTotals.ordersCount.toLocaleString() },
                  { label: "Active Days",   value: String(monthTotals.activeDays)            },
                  { label: "Avg / Day",     value: `$${fmt(monthTotals.avgPerDay)}`          },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className={`text-xs tabular-nums ${bold ? "font-extrabold text-gray-900" : "font-semibold text-gray-800"}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active report pill */}
            {report && !report.empty && (
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 text-white shadow-sm">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Calendar size={12} className="opacity-60" />
                  <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Active Report</span>
                </div>
                <p className="text-sm font-extrabold mb-3 leading-snug">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
                <div className="flex flex-col gap-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="opacity-60">Session</span><span className="font-bold">{report.sessionName}</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Cashier</span><span className="font-bold">{report.cashierName}</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Orders</span><span className="font-bold">{report.ordersCount}</span></div>
                  <div className="flex justify-between mt-1 pt-1 border-t border-white/20">
                    <span className="opacity-60">Net Sales</span>
                    <span className="font-extrabold text-sm">${fmt(report.netSales)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Report area ── */}
          <div className="flex flex-col gap-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 text-gray-400 bg-white rounded-xl border border-gray-100">
                <RefreshCw size={28} className="animate-spin mb-3 text-blue-600" />
                <span className="text-sm font-medium text-gray-500">Loading report…</span>
              </div>

            ) : report?.empty ? (
              <div className="flex flex-col items-center justify-center py-32 text-gray-400 bg-white rounded-xl border border-gray-100 gap-2">
                <FileText size={36} className="opacity-20" />
                <p className="text-sm font-semibold text-gray-500">No orders found for this date</p>
                <p className="text-xs text-gray-400">{report.message}</p>
              </div>

            ) : report ? (
              <>
                {/* Report header */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">{fmtDate(selectedDate)}</h2>
                      <p className="text-[11px] text-gray-400 mt-0.5 font-medium">
                        Session: <span className="text-gray-600 font-semibold">{report.sessionName}</span>
                        &nbsp;·&nbsp;Cashier: <span className="text-gray-600 font-semibold">{report.cashierName}</span>
                        &nbsp;·&nbsp;{report.ordersCount} orders
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                      <CheckCircle2 size={11} /> Session Closed
                    </span>
                  </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-4 gap-3">
                  <KpiCard label="Net Sales"     value={report.netSales}      sub={`${report.ordersCount} orders`} icon={<TrendingUp  size={14} className="text-emerald-600" />} color="bg-emerald-50" />
                  <KpiCard label="Gross Sales"   value={report.grossSales}    sub="Before discounts"               icon={<Layers      size={14} className="text-blue-600"    />} color="bg-blue-50"    />
                  <KpiCard label="Avg Order"     value={report.avgOrderValue} sub="per transaction"                icon={<BarChart3   size={14} className="text-violet-600"  />} color="bg-violet-50"  />
                  <KpiCard label="Tax Collected" value={report.tax}           sub="VAT included"                   icon={<ReceiptText size={14} className="text-amber-600"   />} color="bg-amber-50"   />
                </div>

                {/* Sales + Payments */}
                <div className="grid grid-cols-2 gap-4">

                  {/* Sales breakdown */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Sales Breakdown</h3>
                    <div className="flex flex-col gap-0">
                      {[
                        { label: "Gross Sales",       value: report.grossSales,  cls: "text-gray-900 font-semibold" },
                        { label: "Discounts",          value: -report.discounts,  cls: "text-red-500 font-medium"    },
                        { label: "Refunds / Returns",  value: -report.refunds,    cls: "text-red-500 font-medium"    },
                      ].map(({ label, value, cls }) => (
                        <div key={label} className="flex justify-between py-2.5 border-b border-gray-50 text-sm">
                          <span className="text-gray-600">{label}</span>
                          <span className={`tabular-nums ${cls}`}>{value < 0 ? "−" : ""}${fmt(Math.abs(value))}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-3 text-sm font-extrabold border-t-2 border-gray-200 mt-1">
                        <span>Net Sales</span>
                        <span className="text-emerald-700 tabular-nums">${fmt(report.netSales)}</span>
                      </div>
                      <div className="flex justify-between py-2 text-xs">
                        <span className="text-gray-400">VAT / Tax</span>
                        <span className="text-gray-600 tabular-nums">+${fmt(report.tax)}</span>
                      </div>
                      <div className="flex justify-between py-2.5 text-sm font-extrabold bg-gray-50 rounded-lg px-3 -mx-1 mt-1">
                        <span className="text-gray-900">Total incl. Tax</span>
                        <span className="tabular-nums text-gray-900">${fmt(report.netSales + report.tax)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment methods — individual card types */}
                {/* Payment methods — driven by actual Odoo data */}
<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Payment Methods</h3>
  <div className="flex flex-col gap-4">
    <PaymentBar
      label="Cash"
      amount={report.payments.cash}
      total={report.payments.total}
      color="bg-emerald-400"
      icon={<Banknote size={13} className="text-emerald-600" />}
    />
    {/* Render every non-cash, non-check method from the breakdown array */}
    {report.payments.breakdown.map((entry: { method: string; amount: number }) => (
      <PaymentBar
        key={entry.method}
        label={entry.method}
        amount={entry.amount}
        total={report.payments.total}
        color="bg-blue-400"
        icon={<CreditCard size={13} className="text-blue-600" />}
      />
    ))}
    <PaymentBar
      label="Check / Cheque"
      amount={report.payments.check}
      total={report.payments.total}
      color="bg-amber-400"
      icon={<ReceiptText size={13} className="text-amber-600" />}
    />
  </div>
  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-sm font-extrabold">
    <span>Total Collected</span>
    <span className="tabular-nums">${fmt(report.payments.total)}</span>
  </div>
</div>
                </div>

                {/* Top Products */}
                {report.topProducts?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Top Products</h3>
                    <div className="grid grid-cols-5 gap-0">
                      {report.topProducts.slice(0, 5).map((p: any, i: number) => (
                        <div key={p.name} className="flex items-center justify-between py-2.5 border-b border-gray-50 text-sm col-span-5">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-gray-100 text-[11px] font-extrabold text-gray-500 flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-gray-800 font-medium">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-6">
                            <span className="text-gray-400 text-xs tabular-nums">{p.qty} units</span>
                            <span className="font-bold tabular-nums text-gray-900 w-20 text-right">${fmt(p.revenue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cash Register Count */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cash Register Count</h3>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        {submitSuccess && (
                          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 size={11} /> Submitted
                          </span>
                        )}
                        <button
                          onClick={() => setDenomEditable((v) => !v)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                            denomEditable ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {denomEditable ? "✓ Done Editing" : "Edit Counts"}
                        </button>
                        <button
                          onClick={handleSubmitCashCount}
                          disabled={submitting}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {submitting ? "Saving…" : "Submit Count"}
                        </button>
                      </div>
                      {submitError && (
                        <div className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
                          <AlertCircle size={11} /> {submitError}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Closing summary */}
                    <div className="flex flex-col gap-0">
                      {[
                        { icon: <Clock size={13} className="text-gray-400" />,          label: "Opening Balance",      value: `$${fmt(report.openingBalance)}`,         cls: "text-gray-900" },
                        { icon: <Banknote size={13} className="text-emerald-500" />,    label: "Cash Sales",            value: `+$${fmt(report.payments.cash)}`,          cls: "text-emerald-700 font-semibold" },
                        { icon: <XCircle size={13} className="text-red-400" />,         label: "Cash Refunds (est.)",   value: `-$${fmt(report.refunds * 0.45)}`,         cls: "text-red-500" },
                      ].map(({ icon, label, value, cls }) => (
                        <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-50 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">{icon}{label}</div>
                          <span className={`font-semibold tabular-nums ${cls}`}>{value}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center py-3 font-extrabold text-sm border-t-2 border-gray-200 mt-1">
                        <span>Expected Closing</span>
                        <span className="tabular-nums">${fmt(report.expectedClosingBalance)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 text-sm">
                        <span className="text-gray-600">Counted (right →)</span>
                        <span className={`font-extrabold tabular-nums ${Math.abs(denomTotal - report.expectedClosingBalance) < 1 ? "text-emerald-700" : "text-red-500"}`}>
                          ${fmt(denomTotal)}
                        </span>
                      </div>
                      <div className={`flex justify-between items-center py-2.5 rounded-xl px-3 text-sm mt-1 ${Math.abs(denomTotal - report.expectedClosingBalance) < 1 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                        <span className="font-semibold">Difference</span>
                        <span className="font-extrabold tabular-nums">
                          {denomTotal - report.expectedClosingBalance >= 0 ? "+" : ""}
                          ${fmt(denomTotal - report.expectedClosingBalance)}
                        </span>
                      </div>
                      <textarea
                        placeholder="Notes (optional)"
                        value={cashCountNotes}
                        onChange={(e) => setCashCountNotes(e.target.value)}
                        className="mt-3 w-full text-xs border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={2}
                      />
                    </div>

                    {/* Denomination table */}
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest py-2 pl-4">Bill / Coin</th>
                            <th className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-2">Count</th>
                            <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest py-2 pr-4">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {denominations.map((d, i) => (
                            <DenominationRow
                              key={d.label}
                              denom={d}
                              editable={denomEditable}
                              onChange={(count) =>
                                updateDenominations(denominations.map((item, idx) => idx === i ? { ...item, count } : item))
                              }
                            />
                          ))}
                          <tr className="border-t-2 border-gray-200 bg-gray-50">
                            <td colSpan={2} className="py-3 pl-4 text-sm font-extrabold text-gray-900">Total Cash</td>
                            <td className="py-3 pr-4 text-right text-sm font-extrabold text-emerald-700 tabular-nums">${fmt(denomTotal)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Cashier Sign-Off */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5">Cashier Sign-Off</h3>
                  <div className="grid grid-cols-3 gap-8">
                    {["Cashier Signature", "Supervisor Signature", "Date & Stamp"].map((label) => (
                      <div key={label} className="flex flex-col gap-2">
                        <div className="h-12 border-b-2 border-dashed border-gray-200" />
                        <span className="text-[10px] text-gray-400 text-center font-medium uppercase tracking-wide">{label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-300 text-center mt-5">
                    Chef's World POS · Report generated {new Date().toLocaleString()} · Confidential
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}