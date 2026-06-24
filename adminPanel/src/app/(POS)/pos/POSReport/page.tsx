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
  UserCheck,
  Users,
  Receipt,
  AlertTriangle,
  ArrowDownLeft,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  useGetDailyClosingReportQuery,
  useGetMonthlyCalendarReportQuery,
  useSubmitCashCountMutation,
} from "@/redux/report/posClosingReportApi";
import { useSelector } from "react-redux";

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
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
const fmtTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

const MONTH_NAMES = [
  "",
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

// ─── Subcomponents ────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
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
        ${fmt(value)}
      </div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-gray-50 rounded-lg px-4 py-2.5 text-center">
      <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
        {label}
      </span>
      <span className="text-sm font-bold text-gray-900 tabular-nums">
        {value}
      </span>
    </div>
  );
}

function PaymentRow({
  label,
  amount,
  count,
  children,
}: {
  label: string;
  amount: number;
  count?: number;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div
        className={`flex items-center justify-between py-2 text-sm ${children ? "cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1 transition-colors" : ""}`}
        onClick={() => children && setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          {label}
          {count !== undefined && (
            <span className="text-xs text-gray-400 font-normal">({count})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold tabular-nums text-gray-900">
            ${fmt(amount)}
          </span>
          {children &&
            (open ? (
              <ChevronUp size={12} className="text-gray-400" />
            ) : (
              <ChevronDown size={12} className="text-gray-400" />
            ))}
        </div>
      </div>
      {open && children && (
        <div className="pl-4 pb-1 flex flex-col gap-0.5">{children}</div>
      )}
    </div>
  );
}

function SubRow({
  label,
  amount,
  count,
}: {
  label: string;
  amount: number;
  count?: number;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-xs text-gray-500">
      <span>
        {label}
        {count !== undefined ? ` (${count})` : ""}
      </span>
      <span className="tabular-nums">${fmt(amount)}</span>
    </div>
  );
}

function SectionHeader({
  title,
  icon,
}: {
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-blue-600">{icon}</span>
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
        {title}
      </h3>
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
            onChange={(e) =>
              onChange(Math.max(0, parseInt(e.target.value) || 0))
            }
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
  const maxSales = Math.max(...days.map((d) => d.netSales), 1);
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
          <div
            key={`empty-${i}`}
            className="h-16 border-b border-r border-gray-50"
          />
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
                ${day.isToday && !isSelected ? "bg-amber-50" : ""}`}
            >
              {day.netSales > 0 && !isSelected && (
                <div
                  className="absolute inset-0 bg-emerald-400"
                  style={{ opacity: intensity * 0.18 }}
                />
              )}
              <span
                className={`text-xs font-semibold z-10 ${isSelected ? "text-blue-700" : day.isToday ? "text-amber-700" : "text-gray-600"}`}
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
  const reportRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState(today);
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [denomEditable, setDenomEditable] = useState(false);
  const [cashCountNotes, setCashCountNotes] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { user } = useSelector((state: any) => state.auth);

  const [denominations, setDenominations] = useState<DenominationEntry[]>(
    () => {
      if (typeof window === "undefined") return DEFAULT_DENOMINATIONS;
      try {
        const saved = localStorage.getItem(`cash_count_${today}`);
        return saved ? JSON.parse(saved) : DEFAULT_DENOMINATIONS;
      } catch {
        return DEFAULT_DENOMINATIONS;
      }
    },
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`cash_count_${selectedDate}`);
      setDenominations(saved ? JSON.parse(saved) : DEFAULT_DENOMINATIONS);
    } catch {
      setDenominations(DEFAULT_DENOMINATIONS);
    }
  }, [selectedDate]);

  const updateDenominations = (updated: DenominationEntry[]) => {
    setDenominations(updated);
    try {
      localStorage.setItem(
        `cash_count_${selectedDate}`,
        JSON.stringify(updated),
      );
    } catch {}
  };

  const {
    data: report,
    isLoading: reportLoading,
    isFetching: reportFetching,
    refetch: refetchReport,
  } = useGetDailyClosingReportQuery({ date: selectedDate });
  const {
    data: monthlyData,
    isLoading: monthLoading,
    isFetching: monthFetching,
  } = useGetMonthlyCalendarReportQuery({ year: calYear, month: calMonth });
  const [submitCashCount, { isLoading: submitting }] =
    useSubmitCashCountMutation();

  const monthDays = useMemo<MonthDay[]>(() => {
    if (!monthlyData?.days) return [];
    return monthlyData.days.map((d: any) => ({
      date: d.date,
      dayNum: new Date(d.date + "T00:00:00").getDate(),
      ordersCount: d.ordersCount,
      netSales: d.netSales,
      isToday: d.date === today,
      isSelected: d.date === selectedDate,
    }));
  }, [monthlyData, today, selectedDate]);

  const monthTotals = monthlyData?.totals ?? {
    netSales: 0,
    ordersCount: 0,
    activeDays: 0,
    avgPerDay: 0,
  };
  const denomTotal = denominations.reduce((s, d) => s + d.value * d.count, 0);
  const isLoading = reportLoading || reportFetching;
  const isMonthLoading = monthLoading || monthFetching;

  const handlePrevMonth = () => {
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      // Dynamic import to avoid SSR issues
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#F6F7FA",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      const pdfW = pageWidth;
      const pdfH = pdfW / ratio;
      const pages = Math.ceil(pdfH / pageHeight);

      for (let i = 0; i < pages; i++) {
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -i * pageHeight, pdfW, pdfH);
      }

      pdf.save(`POS_Report_${selectedDate}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      // Fallback: print to PDF
      window.print();
    } finally {
      setExporting(false);
    }
  };

  const handleSubmitCashCount = async () => {
    setSubmitError(null);
    if (!report?.odooSessionId) {
      setSubmitError("No Odoo session found for this date");
      return;
    }
    try {
      await submitCashCount({
        date: selectedDate,
        odooSessionId: report.odooSessionId,
        denominations,
        sessionName: report.sessionName,
        notes: cashCountNotes,
        submittedBy: user?.name ?? "unknown",
        role: user?.role === "admin" ? "manager" : "cashier",
      }).unwrap();
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err: any) {
      setSubmitError(
        err?.data?.message ??
          err?.message ??
          "Submit failed. Please try again.",
      );
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F6F7FA] font-sans">
      {/* ── Header ── */}
      <div className="no-print bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
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
          <button
            onClick={() => refetchReport()}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Printer size={13} /> Print
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
          >
            {exporting ? (
              <>
                <RefreshCw size={13} className="animate-spin" /> Exporting…
              </>
            ) : (
              <>
                <Download size={13} /> Export PDF
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 grid grid-cols-[320px_1fr] gap-6">
        {/* ── LEFT: Calendar ── */}
        <div className="flex flex-col gap-4 no-print">
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
            {isMonthLoading ? (
              <div className="h-48 flex items-center justify-center text-gray-400">
                <RefreshCw size={18} className="animate-spin" />
              </div>
            ) : (
              <CalendarGrid
                year={calYear}
                month={calMonth}
                days={monthDays}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            )}
            <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-200 inline-block" />{" "}
                Today
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-300 inline-block" />{" "}
                Selected
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-gray-100 inline-block" />{" "}
                No sales
              </span>
            </div>
          </div>

          {/* Month summary */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-blue-600" />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                {MONTH_NAMES[calMonth]} Summary
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                ["Total Revenue", `$${fmt(monthTotals.netSales)}`],
                [
                  "Total Orders",
                  (monthTotals.ordersCount || 0).toLocaleString(),
                ],
                ["Active Days", String(monthTotals.activeDays || 0)],
                ["Avg / Day", `$${fmt(monthTotals.avgPerDay || 0)}`],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-gray-500">{l}</span>
                  <span className="font-bold text-gray-900 tabular-nums">
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick nav: yesterday / last week */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <History size={14} className="text-blue-600" />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Quick Navigation
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {[
                { label: "Today", days: 0 },
                { label: "Yesterday", days: 1 },
                { label: "2 days ago", days: 2 },
                { label: "Last week", days: 7 },
                { label: "2 weeks ago", days: 14 },
              ].map(({ label, days }) => {
                const d = new Date();
                d.setDate(d.getDate() - days);
                const iso = d.toISOString().split("T")[0];
                return (
                  <button
                    key={label}
                    onClick={() => {
                      setSelectedDate(iso);
                      setCalMonth(d.getMonth() + 1);
                      setCalYear(d.getFullYear());
                    }}
                    className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors
                      ${selectedDate === iso ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
                  >
                    {label}
                    <span className="float-right text-gray-400 font-normal">
                      {d.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected date quick info */}
          {report && !report.empty && (
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={13} className="opacity-70" />
                <span className="text-[11px] font-semibold opacity-70 uppercase tracking-wide">
                  Selected Day
                </span>
              </div>
              <p className="text-[13px] font-bold leading-snug mb-3">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                  "en-US",
                  { weekday: "short", month: "short", day: "numeric" },
                )}
              </p>
              <div className="flex flex-col gap-1.5 text-xs">
                {[
                  ["Session", report.sessionName],
                  ["Cashier", report.cashierName],
                  ["Shift", `#${report.shiftNumber ?? 1}`],
                  ["Role", report.role ?? "Cashier"],
                  ["Orders", String(report.ordersCount)],
                  ["Guests", String(report.guestsCount ?? "—")],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="opacity-70">{k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Report ── */}
        <div className="flex flex-col gap-4" ref={reportRef}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white rounded-xl border border-gray-100">
              <RefreshCw size={24} className="animate-spin mb-3" />
              <span className="text-sm">Loading report…</span>
            </div>
          ) : report?.empty ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white rounded-xl border border-gray-100">
              <BarChart3 size={32} className="mb-3 opacity-30" />
              <p className="text-sm font-medium text-gray-500">
                No orders found
              </p>
              <p className="text-xs text-gray-400 mt-1">{report.message}</p>
            </div>
          ) : report ? (
            <>
              {/* ── Report header ── */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      {fmtDate(selectedDate)}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Session: {report.sessionName} · Cashier:{" "}
                      {report.cashierName}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={11} /> Closed
                  </span>
                </div>

                {/* Shift details row */}
                <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-5 gap-3">
                  <StatPill label="Role" value={report.role ?? "Cashier"} />
                  <StatPill
                    label="Shift"
                    value={`#${report.shiftNumber ?? 1}`}
                  />
                  <StatPill label="Clock In" value={fmtTime(report.clockIn)} />
                  <StatPill
                    label="Clock Out"
                    value={fmtTime(report.clockOut)}
                  />
                  <StatPill
                    label="Paid Hours"
                    value={
                      report.paidHours != null ? `${report.paidHours}h` : "—"
                    }
                  />
                </div>
              </div>

              {/* ── Cash owed banner ── */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl px-6 py-4 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">
                    Cash Owed to House
                  </p>
                  <p className="text-white text-2xl font-bold tabular-nums mt-0.5">
                    ${fmt(report.cashOwedToHouse ?? 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">
                    Total Tips
                  </p>
                  <p className="text-emerald-400 text-2xl font-bold tabular-nums mt-0.5">
                    ${fmt(report.tips?.total ?? 0)}
                  </p>
                </div>
              </div>

              {/* ── KPIs ── */}
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
                  sub="Before discounts"
                  icon={<Layers size={14} className="text-blue-600" />}
                  color="bg-blue-50"
                />
                <KpiCard
                  label="Sales / Guest"
                  value={report.salesPerGuest ?? 0}
                  sub={`${report.guestsCount ?? "?"} guests`}
                  icon={<Users size={14} className="text-violet-600" />}
                  color="bg-violet-50"
                />
                <KpiCard
                  label="Sales / Check"
                  value={report.avgOrderValue}
                  sub="per check"
                  icon={<BarChart3 size={14} className="text-amber-600" />}
                  color="bg-amber-50"
                />
              </div>

              {/* ── Stats row ── */}
              <div className="grid grid-cols-4 gap-3">
                <StatPill label="Checks" value={String(report.ordersCount)} />
                <StatPill
                  label="Guests"
                  value={String(report.guestsCount ?? "—")}
                />
                <StatPill
                  label="Avg Tip %"
                  value={`${report.tips?.avgPct ?? 0}%`}
                />
                <StatPill label="Tax Collected" value={`$${fmt(report.tax)}`} />
              </div>

              {/* ── Sales breakdown + Comps ── */}
              <div className="grid grid-cols-2 gap-4">
                {/* Sales breakdown */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <SectionHeader
                    title="Sales Breakdown"
                    icon={<ReceiptText size={13} />}
                  />
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
                      {
                        label: "Comps",
                        value: -(report.comps?.total ?? 0),
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
                      <span className="text-gray-400">VAT</span>
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

                {/* Comps */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <SectionHeader title="Comps" icon={<XCircle size={13} />} />
                  {/* Item comps */}
                  {(report.comps?.itemComps?.length ?? 0) > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">
                        Item Comps
                      </p>
                      {report.comps!.itemComps.map((c: any, i: number) => (
                        <div
                          key={i}
                          className="flex justify-between py-1.5 border-b border-gray-50 text-xs"
                        >
                          <span className="text-gray-600">{c.reason}</span>
                          <div className="flex gap-3">
                            <span className="text-gray-400">
                              ${fmt(c.base)}
                            </span>
                            <span className="text-gray-400">${fmt(c.tax)}</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between py-1.5 text-xs font-semibold text-gray-700">
                        <span>Total Item Comps</span>
                        <span className="tabular-nums">
                          ${fmt(report.comps!.totalItemComps)}
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Check comps */}
                  {(report.comps?.checkComps?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">
                        Check Comps
                      </p>
                      {report.comps!.checkComps.map((c: any, i: number) => (
                        <div
                          key={i}
                          className="flex justify-between py-1.5 border-b border-gray-50 text-xs"
                        >
                          <span className="text-gray-600">{c.reason}</span>
                          <div className="flex gap-3">
                            <span className="text-gray-400">
                              ${fmt(c.base)}
                            </span>
                            <span className="text-gray-400">${fmt(c.tax)}</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between py-1.5 text-xs font-semibold text-gray-700">
                        <span>Total Check Comps</span>
                        <span className="tabular-nums">
                          ${fmt(report.comps!.totalCheckComps)}
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Grand total comps */}
                  <div className="flex justify-between py-2.5 text-sm font-bold border-t-2 border-gray-200 mt-2">
                    <span>Total Comps</span>
                    <span className="text-red-600 tabular-nums">
                      ${fmt(report.comps?.total ?? 0)}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 text-right">
                    Base &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Tax
                  </div>
                </div>
              </div>

              {/* ── Payments + Tips ── */}
              <div className="grid grid-cols-2 gap-4">
                {/* Payments */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <SectionHeader
                    title="Payments"
                    icon={<CreditCard size={13} />}
                  />
                  <div className="flex flex-col gap-1 divide-y divide-gray-50">
                    <PaymentRow
                      label="Cash"
                      amount={report.payments?.cash?.amount ?? 0}
                      count={report.payments?.cash?.count ?? 0}
                    />

                    <PaymentRow label="Credit" amount={0} count={0} />

                    <PaymentRow
                      label="Credit Card"
                      amount={report.payments?.card?.amount ?? 0}
                      count={report.payments?.card?.count ?? 0}
                    >
                      {report.payments?.card?.breakdown?.map((b: any) => (
                        <SubRow
                          key={b.label}
                          label={b.label}
                          amount={b.amount ?? 0}
                          count={b.count}
                        />
                      ))}
                    </PaymentRow>

                    <PaymentRow
                      label="Cheque"
                      amount={report.payments?.cheque?.amount ?? 0}
                      count={report.payments?.cheque?.count ?? 0}
                    />

                    <PaymentRow
                      label="Bank Transfer"
                      amount={report.payments?.bank?.amount ?? 0}
                      count={report.payments?.bank?.count ?? 0}
                    />

                    {(report.payments?.houseAccount?.amount ?? 0) > 0 && (
                      <PaymentRow
                        label="House Account"
                        amount={report.payments?.houseAccount?.amount ?? 0}
                        count={report.payments?.houseAccount?.count ?? 0}
                      >
                        {report.payments?.houseAccount?.accounts?.map(
                          (a: any) => (
                            <SubRow
                              key={a.name}
                              label={a.name}
                              amount={a.amount ?? 0}
                              count={a.count}
                            />
                          ),
                        )}
                      </PaymentRow>
                    )}

                    {(report.payments?.other?.amount ?? 0) > 0 && (
                      <PaymentRow
                        label="Other"
                        amount={report.payments?.other?.amount ?? 0}
                      />
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t-2 border-gray-200 flex justify-between text-sm font-bold">
                    <span className="text-gray-900">Total Payments</span>
                    <span className="tabular-nums text-gray-900">
                      ${fmt(report.payments?.total ?? 0)}
                    </span>
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <SectionHeader title="Tips" icon={<TrendingUp size={13} />} />
                  <div className="flex flex-col gap-1 divide-y divide-gray-50">
                    {report.tips?.breakdown?.length > 0 ? (
                      report.tips.breakdown.map((t: any) => (
                        <div
                          key={t.method}
                          className="flex justify-between py-2 text-sm"
                        >
                          <div className="text-gray-700 font-medium capitalize flex items-center gap-2">
                            {t.method}
                            <span className="text-xs text-gray-400 font-normal">
                              ({t.count})
                            </span>
                          </div>
                          <span className="font-semibold tabular-nums text-gray-900">
                            ${fmt(t.amount)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 py-3">
                        No tips recorded
                      </p>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t-2 border-gray-200 flex justify-between text-sm font-bold">
                    <span className="text-gray-900">Total Tips</span>
                    <span className="tabular-nums text-emerald-700">
                      ${fmt(report.tips?.total ?? 0)}
                    </span>
                  </div>

                  {/* Voids */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <SectionHeader
                      title="Voids"
                      icon={<AlertTriangle size={13} />}
                    />
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">Void Count</span>
                      <span className="font-semibold text-gray-900">
                        {report.voids?.count ?? 0} voids
                      </span>
                    </div>
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">Void Amount</span>
                      <span className="font-semibold text-red-500">
                        ${fmt(report.voids?.amount ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Payouts ── */}
              {(report.payouts?.items?.length ?? 0) > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <SectionHeader
                    title="Payouts"
                    icon={<ArrowDownLeft size={13} />}
                  />
                  <div className="flex flex-col gap-0">
                    {report.payouts.items.map((p: any, i: number) => (
                      <div
                        key={i}
                        className="flex justify-between py-2.5 border-b border-gray-50 text-sm"
                      >
                        <span className="text-gray-600">
                          Cash to {report.cashierName} — {p.description}
                        </span>
                        <span className="font-semibold tabular-nums text-gray-900">
                          ${fmt(p.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 text-sm font-bold border-t-2 border-gray-200 mt-1">
                      <span className="text-gray-900">
                        Total Cashier Payouts
                      </span>
                      <span className="text-red-500 tabular-nums">
                        ${fmt(report.payouts.total)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            {/* Cash Owed Reconciliation */}
<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
  <SectionHeader title="Cash Owed Reconciliation" icon={<Banknote size={13} />} />
  <div className="flex flex-col gap-0 max-w-sm">
    <div className="flex justify-between py-2.5 border-b border-gray-50 text-sm">
      <span className="text-gray-600">Cash Payments</span>
      <span className="font-semibold text-gray-900 tabular-nums">
        + ${fmt(report.payments?.cash?.amount ?? 0)}
      </span>
    </div>
    <div className="flex justify-between py-2.5 border-b border-gray-50 text-sm">
      <span className="text-gray-600">Pay-outs</span>
      <span className="font-semibold text-red-500 tabular-nums">
        - ${fmt(report.payouts?.total ?? 0)}
      </span>
    </div>
    <div className="border-t border-dashed border-gray-200 my-1" />
    <div className="flex justify-between py-3 text-sm font-bold">
      <span className="text-gray-900">Cash Owed</span>
      <span className="text-gray-900 tabular-nums">
        ${fmt(report.cashOwedToHouse ?? 0)}
      </span>
    </div>
  </div>
</div>

              {/* ── Top Products ── */}
              {report.topProducts?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <SectionHeader
                    title="Top Products"
                    icon={<Layers size={13} />}
                  />
                  <div className="flex flex-col gap-0">
                    {report.topProducts.slice(0, 8).map((p: any, i: number) => (
                      <div
                        key={p.name}
                        className="flex items-center justify-between py-2.5 border-b border-gray-50 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="text-gray-800 font-medium">
                            {p.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <span className="text-gray-400 text-xs">
                            qty: {p.qty}
                          </span>
                          <span className="font-semibold tabular-nums text-gray-900">
                            ${fmt(p.revenue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Cash Register Count ── */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Cash Register Count
                  </h3>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      {submitSuccess && (
                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 size={12} /> Submitted
                        </span>
                      )}
                      <button
                        onClick={() => setDenomEditable((v) => !v)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors
                          ${denomEditable ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      >
                        {denomEditable ? "✓ Done" : "Edit Counts"}
                      </button>
                      <button
                        onClick={handleSubmitCashCount}
                        disabled={submitting}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {submitting ? "Saving..." : "Submit Count"}
                      </button>
                    </div>
                    {submitError && (
                      <p className="text-[11px] text-red-500 font-medium">
                        {submitError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Opening / Closing summary */}
                  <div className="flex flex-col gap-3">
                    {[
                      {
                        icon: <Clock size={13} className="text-gray-400" />,
                        label: "Opening Balance",
                        value: `$${fmt(report.openingBalance)}`,
                        cls: "",
                      },
                      {
                        icon: (
                          <Banknote size={13} className="text-emerald-500" />
                        ),
                        label: "Cash Sales",
                        value: `+$${fmt(report.payments?.cash?.amount ?? 0)}`,
                        cls: "text-emerald-700",
                      },
                      {
                        icon: <XCircle size={13} className="text-red-400" />,
                        label: "Cash Refunds (est.)",
                        value: `-$${fmt(report.refunds * 0.45)}`,
                        cls: "text-red-500",
                      },
                      {
                        icon: (
                          <ArrowDownLeft
                            size={13}
                            className="text-orange-400"
                          />
                        ),
                        label: "Payouts",
                        value: `-$${fmt(report.payouts?.total ?? 0)}`,
                        cls: "text-orange-600",
                      },
                    ].map(({ icon, label, value, cls }) => (
                      <div
                        key={label}
                        className="flex justify-between items-center py-2.5 border-b border-gray-50 text-sm"
                      >
                        <div className="flex items-center gap-2 text-gray-600">
                          {icon} {label}
                        </div>
                        <span
                          className={`font-semibold tabular-nums ${cls || "text-gray-900"}`}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-3 font-bold text-sm border-t-2 border-gray-200">
                      <span className="text-gray-900">Expected Closing</span>
                      <span className="tabular-nums text-gray-900">
                        ${fmt(report.expectedClosingBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 text-sm">
                      <span className="text-gray-600">Counted (below)</span>
                      <span
                        className={`font-bold tabular-nums ${Math.abs(denomTotal - report.expectedClosingBalance) < 1 ? "text-emerald-700" : "text-red-500"}`}
                      >
                        ${fmt(denomTotal)}
                      </span>
                    </div>
                    <div
                      className={`flex justify-between items-center py-2 rounded-lg px-3 text-sm ${Math.abs(denomTotal - report.expectedClosingBalance) < 1 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}
                    >
                      <span className="font-medium">Difference</span>
                      <span className="font-bold tabular-nums">
                        {denomTotal - report.expectedClosingBalance >= 0
                          ? "+"
                          : ""}
                        ${fmt(denomTotal - report.expectedClosingBalance)}
                      </span>
                    </div>
                    <textarea
                      placeholder="Notes (optional)"
                      value={cashCountNotes}
                      onChange={(e) => setCashCountNotes(e.target.value)}
                      className="mt-2 w-full text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={2}
                    />
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
                            onChange={(count) =>
                              updateDenominations(
                                denominations.map((item, idx) =>
                                  idx === i ? { ...item, count } : item,
                                ),
                              )
                            }
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

              {/* ── Cashier Sign-Off ── */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">
                  Cashier Sign-Off
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  {[
                    "Cashier Signature",
                    "Supervisor Signature",
                    "Date & Stamp",
                  ].map((label) => (
                    <div key={label} className="flex flex-col gap-2">
                      <div className="h-10 border-b-2 border-dashed border-gray-200" />
                      <span className="text-[10px] text-gray-400 text-center">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-300 text-center mt-4">
                  Generated by POS System · {new Date().toLocaleString()}
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* ── Print styles ── */}
      <style>{`
        @media print {
          @page { margin: 12mm; size: A4 portrait; }

          .no-print { display: none !important; }

          body { background: white !important; }

          /* Show only the report column */
          .max-w-\\[1400px\\] {
            display: block !important;
            max-width: 100% !important;
            padding: 0 !important;
          }

          /* Hide left sidebar entirely */
          .max-w-\\[1400px\\] > div:first-child { display: none !important; }

          /* Report column takes full width */
          .max-w-\\[1400px\\] > div:last-child {
            grid-column: 1 / -1 !important;
            width: 100% !important;
          }

          /* Avoid page breaks inside cards */
          .rounded-xl { break-inside: avoid; page-break-inside: avoid; }

          /* Remove shadows and border-radius for print */
          * { box-shadow: none !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          /* Hide interactive elements */
          button, input[type="number"], textarea { display: none !important; }

          /* Show cash count values (not inputs) */
          td span.tabular-nums { display: block !important; }

          /* Remove sticky header */
          .sticky { position: static !important; }
        }
      `}</style>
    </div>
  );
}
