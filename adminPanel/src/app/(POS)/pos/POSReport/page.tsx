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
  ArrowLeftRight,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const USD_TO_XCD = 2.7;

// ─── Types ────────────────────────────────────────────────────────────────────

interface DenominationEntry {
  value: number; // always in XCD
  label: string; // e.g. "100", "50", "0.25"
  count: number;
}

interface USDDenominationEntry {
  value: number; // USD face value
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

const DEFAULT_XCD_DENOMS: DenominationEntry[] = [
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

const DEFAULT_USD_DENOMS: USDDenominationEntry[] = [
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

const fmtShort = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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

const addDays = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

const todayISO = () => new Date().toISOString().split("T")[0];

const round2 = (n: number) => Math.round(n * 100) / 100;

// ─── Card config ──────────────────────────────────────────────────────────────

const CARD_TYPES = [
  {
    key: "visa",
    label: "Visa",
    color: "bg-blue-400",
    iconColor: "text-blue-600",
  },
  {
    key: "mastercard",
    label: "Mastercard",
    color: "bg-orange-400",
    iconColor: "text-orange-600",
  },
  {
    key: "amex",
    label: "Amex",
    color: "bg-indigo-400",
    iconColor: "text-indigo-600",
  },
  {
    key: "card",
    label: "Card (other)",
    color: "bg-gray-400",
    iconColor: "text-gray-600",
  },
];

// ─── KpiCard ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  color,
  trend,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
          {label}
        </span>
        <span className={`p-1.5 rounded-lg ${color}`}>{icon}</span>
      </div>
      <div className="text-2xl font-extrabold text-gray-900 tabular-nums tracking-tight">
        EC${fmt(value)}
      </div>
      <div className="flex items-center justify-between">
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
        {trend !== undefined && (
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}
          >
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── PaymentBar ───────────────────────────────────────────────────────────────

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
          <span className="text-gray-400 text-xs w-10 text-right">
            {pct.toFixed(1)}%
          </span>
          <span className="font-bold tabular-nums text-gray-900 w-20 text-right">
            EC${fmt(amount)}
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

// ─── XCD DenominationRow ──────────────────────────────────────────────────────

function XCDDenomRow({
  denom,
  onChange,
  editable,
}: {
  denom: DenominationEntry;
  onChange: (count: number) => void;
  editable: boolean;
}) {
  const total = round2(denom.value * denom.count);
  return (
    <tr className="border-b border-gray-50 hover:bg-emerald-50/40 transition-colors">
      <td className="py-2.5 pl-4 pr-2 text-sm font-medium text-gray-700">
        <span className="inline-flex items-center gap-1 font-mono">
          <span className="text-emerald-500 text-[11px] font-bold">EC$</span>
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
            className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent tabular-nums"
          />
        ) : (
          <span className="text-sm font-semibold text-gray-900 tabular-nums">
            {denom.count}
          </span>
        )}
      </td>
      <td className="py-2.5 pl-2 pr-4 text-right text-sm font-bold tabular-nums text-emerald-700">
        EC${fmt(total)}
      </td>
    </tr>
  );
}

// ─── USD DenominationRow ──────────────────────────────────────────────────────

function USDDenomRow({
  denom,
  onChange,
  editable,
}: {
  denom: USDDenominationEntry;
  onChange: (count: number) => void;
  editable: boolean;
}) {
  const totalUSD = round2(denom.value * denom.count);
  const totalXCD = round2(totalUSD * USD_TO_XCD);
  return (
    <tr className="border-b border-gray-50 hover:bg-indigo-50/40 transition-colors">
      <td className="py-2.5 pl-4 pr-2 text-sm font-medium text-gray-700">
        <span className="inline-flex items-center gap-1 font-mono">
          <span className="text-indigo-500 text-[11px] font-bold">US$</span>
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
            className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent tabular-nums"
          />
        ) : (
          <span className="text-sm font-semibold text-gray-900 tabular-nums">
            {denom.count}
          </span>
        )}
      </td>
      <td className="py-2.5 pl-2 pr-2 text-right text-sm font-bold tabular-nums text-indigo-700">
        US${fmt(totalUSD)}
      </td>
      <td className="py-2.5 pl-1 pr-4 text-right text-xs tabular-nums text-gray-400 font-medium">
        EC${fmt(totalXCD)}
      </td>
    </tr>
  );
}

// ─── CalendarGrid ─────────────────────────────────────────────────────────────

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
  const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const firstDay = new Date(year, month - 1, 1).getDay();
  const maxSales = Math.max(...days.map((d) => d.netSales), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-bold text-gray-400 py-1.5 uppercase tracking-widest"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div
            key={`e-${i}`}
            className="h-14 border-b border-r border-gray-50"
          />
        ))}
        {days.map((day) => {
          const intensity =
            day.netSales > 0 ? Math.max(0.1, day.netSales / maxSales) : 0;
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
                <div
                  className="absolute inset-0 bg-emerald-400"
                  style={{ opacity: intensity * 0.15 }}
                />
              )}
              <span
                className={`text-[11px] font-bold z-10 ${isSelected ? "text-blue-700" : day.isToday ? "text-amber-700" : "text-gray-600"}`}
              >
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

function QuickRangePicker({
  activeRange,
  onSelect,
}: {
  activeRange: QuickRange;
  onSelect: (r: QuickRange) => void;
}) {
  const ranges: { key: QuickRange; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "last7", label: "Last 7 Days" },
    { key: "last30", label: "Last 30 Days" },
    { key: "thisMonth", label: "This Month" },
    { key: "lastMonth", label: "Last Month" },
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

// ─── PrintableReport ──────────────────────────────────────────────────────────

function PrintableReport({
  report,
  selectedDate,
  xcdDenominations,
  usdDenominations,
  xcdTotal,
  usdTotal,
  usdInXCD,
  combinedXCDTotal,
}: {
  report: any;
  selectedDate: string;
  xcdDenominations: DenominationEntry[];
  usdDenominations: USDDenominationEntry[];
  xcdTotal: number;
  usdTotal: number;
  usdInXCD: number;
  combinedXCDTotal: number;
}) {
  const diff = combinedXCDTotal - report.expectedClosingBalance;

  return (
    <div id="printable-report" className="font-sans text-gray-900 text-sm">
      {/* Header */}
      <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
        <h1 className="text-2xl font-black tracking-tight uppercase">
          Chef's World
        </h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Point of Sale — Daily Closing Report (Z-Report)
        </p>
        <p className="text-xs text-gray-500 mt-1">{fmtDate(selectedDate)}</p>
      </div>

      {/* Session info */}
      <div className="grid grid-cols-2 gap-x-8 mb-4 text-xs border-b border-dashed border-gray-300 pb-4">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Session</span>
            <span className="font-semibold">{report.sessionName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Cashier</span>
            <span className="font-semibold">{report.cashierName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Orders</span>
            <span className="font-semibold">{report.ordersCount}</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Date</span>
            <span className="font-semibold">{selectedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Printed</span>
            <span className="font-semibold">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Avg Order</span>
            <span className="font-semibold">
              EC${fmt(report.avgOrderValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Sales breakdown */}
      <div className="mb-4 border-b border-dashed border-gray-300 pb-4">
        <p className="font-bold uppercase text-[11px] tracking-widest text-gray-500 mb-2">
          Sales Summary
        </p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Gross Sales</span>
            <span className="font-semibold tabular-nums">
              EC${fmt(report.grossSales)}
            </span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Discounts</span>
            <span className="tabular-nums">−EC${fmt(report.discounts)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Refunds</span>
            <span className="tabular-nums">−EC${fmt(report.refunds)}</span>
          </div>
          <div className="flex justify-between font-bold border-t border-gray-300 pt-1 mt-1">
            <span>Net Sales</span>
            <span className="tabular-nums">EC${fmt(report.netSales)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>VAT / Tax</span>
            <span className="tabular-nums">+EC${fmt(report.tax)}</span>
          </div>
          <div className="flex justify-between font-black text-base border-t-2 border-gray-800 pt-1 mt-1">
            <span>TOTAL INCL. TAX</span>
            <span className="tabular-nums">
              EC${fmt(report.netSales + report.tax)}
            </span>
          </div>
        </div>
      </div>

      {/* Payments */}
      <div className="mb-4 border-b border-dashed border-gray-300 pb-4">
        <p className="font-bold uppercase text-[11px] tracking-widest text-gray-500 mb-2">
          Payments Collected
        </p>
        <div className="space-y-1 text-sm">
          {[
            { label: "Cash (EC$)", value: report.payments.cash },
            { label: "Visa", value: report.payments.visa },
            { label: "Mastercard", value: report.payments.mastercard },
            { label: "Amex", value: report.payments.amex },
            ...(report.payments.card > 0
              ? [{ label: "Card (other)", value: report.payments.card }]
              : []),
            { label: "Check", value: report.payments.check },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-700">{label}</span>
              <span className="font-semibold tabular-nums">
                EC${fmt(value)}
              </span>
            </div>
          ))}
          <div className="flex justify-between font-bold border-t border-gray-300 pt-1">
            <span>Total Collected</span>
            <span className="tabular-nums">
              EC${fmt(report.payments.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Cash Register Count — XCD */}
      <div className="mb-4 border-b border-dashed border-gray-300 pb-4">
        <p className="font-bold uppercase text-[11px] tracking-widest text-gray-500 mb-2">
          Cash Count — Eastern Caribbean Dollar (EC$)
        </p>
        <table className="w-full text-xs border border-gray-200 mb-3">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left py-1 px-2 font-semibold">
                Denomination
              </th>
              <th className="text-center py-1 px-2 font-semibold">Count</th>
              <th className="text-right py-1 px-2 font-semibold">
                Amount (EC$)
              </th>
            </tr>
          </thead>
          <tbody>
            {xcdDenominations
              .filter((d) => d.count > 0)
              .map((d) => (
                <tr key={d.label} className="border-t border-gray-100">
                  <td className="py-1 px-2">EC${d.label}</td>
                  <td className="py-1 px-2 text-center">{d.count}</td>
                  <td className="py-1 px-2 text-right tabular-nums">
                    EC${fmt(d.value * d.count)}
                  </td>
                </tr>
              ))}
            {xcdDenominations.every((d) => d.count === 0) && (
              <tr>
                <td
                  colSpan={3}
                  className="py-1 px-2 text-center text-gray-400 italic"
                >
                  No XCD denominations entered
                </td>
              </tr>
            )}
            <tr className="border-t-2 border-gray-800 font-bold">
              <td colSpan={2} className="py-1 px-2">
                TOTAL EC$
              </td>
              <td className="py-1 px-2 text-right tabular-nums">
                EC${fmt(xcdTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Cash Count — USD */}
        <p className="font-bold uppercase text-[11px] tracking-widest text-indigo-600 mb-2 mt-4">
          Cash Count — US Dollar (US$)
        </p>
        <table className="w-full text-xs border border-indigo-200 mb-3">
          <thead>
            <tr className="bg-indigo-50">
              <th className="text-left py-1 px-2 font-semibold text-indigo-700">
                Denomination
              </th>
              <th className="text-center py-1 px-2 font-semibold text-indigo-700">
                Count
              </th>
              <th className="text-right py-1 px-2 font-semibold text-indigo-700">
                Amount (US$)
              </th>
              <th className="text-right py-1 px-2 font-semibold text-indigo-700">
                Equiv. (EC$)
              </th>
            </tr>
          </thead>
          <tbody>
            {usdDenominations
              .filter((d) => d.count > 0)
              .map((d) => (
                <tr key={d.label} className="border-t border-indigo-100">
                  <td className="py-1 px-2">US${d.label}</td>
                  <td className="py-1 px-2 text-center">{d.count}</td>
                  <td className="py-1 px-2 text-right tabular-nums">
                    US${fmt(d.value * d.count)}
                  </td>
                  <td className="py-1 px-2 text-right tabular-nums text-indigo-700">
                    EC${fmt(round2(d.value * d.count * USD_TO_XCD))}
                  </td>
                </tr>
              ))}
            {usdDenominations.every((d) => d.count === 0) && (
              <tr>
                <td
                  colSpan={4}
                  className="py-1 px-2 text-center text-gray-400 italic"
                >
                  No USD denominations entered
                </td>
              </tr>
            )}
            <tr className="border-t-2 border-indigo-800 font-bold">
              <td colSpan={2} className="py-1 px-2 text-indigo-700">
                TOTAL US$
              </td>
              <td className="py-1 px-2 text-right tabular-nums text-indigo-700">
                US${fmt(usdTotal)}
              </td>
              <td className="py-1 px-2 text-right tabular-nums text-indigo-700">
                EC${fmt(usdInXCD)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Exchange rate note */}
        <p className="text-[10px] text-gray-400 mb-3">
          Exchange rate applied: 1 US$ = {USD_TO_XCD.toFixed(2)} EC$
        </p>

        {/* Combined totals */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Opening Balance</span>
            <span className="tabular-nums">
              EC${fmt(report.openingBalance)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Expected Closing</span>
            <span className="tabular-nums font-semibold">
              EC${fmt(report.expectedClosingBalance)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Counted EC$ Cash</span>
            <span className="tabular-nums font-semibold">
              EC${fmt(xcdTotal)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Counted US$ (in EC$)</span>
            <span className="tabular-nums font-semibold">
              EC${fmt(usdInXCD)}
            </span>
          </div>
          <div className="flex justify-between font-bold border-t border-gray-300 pt-1">
            <span>Combined Total (EC$)</span>
            <span className="tabular-nums">EC${fmt(combinedXCDTotal)}</span>
          </div>
          <div
            className={`flex justify-between font-bold border-t border-gray-300 pt-1 ${Math.abs(diff) < 1 ? "text-emerald-700" : "text-red-600"}`}
          >
            <span>Difference</span>
            <span className="tabular-nums">
              {diff >= 0 ? "+" : ""}EC${fmt(diff)}
            </span>
          </div>
        </div>
      </div>

      {/* Sign-off */}
      <div className="mt-6">
        <div className="grid grid-cols-3 gap-8">
          {["Cashier Signature", "Supervisor Signature", "Date & Stamp"].map(
            (label) => (
              <div key={label} className="flex flex-col gap-2">
                <div className="h-10 border-b-2 border-dashed border-gray-400" />
                <span className="text-[10px] text-gray-500 text-center">
                  {label}
                </span>
              </div>
            ),
          )}
        </div>
        <p className="text-[9px] text-gray-400 text-center mt-6">
          Chef's World POS · Generated {new Date().toLocaleString()} · This is
          an official closing document.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function POSClosingReport() {
  const today = todayISO();

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeRange, setActiveRange] = useState<QuickRange>("today");
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [denomEditable, setDenomEditable] = useState(false);
  const [cashCountNotes, setCashCountNotes] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveOdooSuccess, setSaveOdooSuccess] = useState(false);
  const [savingOdoo, setSavingOdoo] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const { user } = useSelector((state: any) => state.auth);

  // ── XCD Denominations ─────────────────────────────────────────────────────
  const [xcdDenominations, setXcdDenominations] = useState<DenominationEntry[]>(
    () => {
      if (typeof window === "undefined") return DEFAULT_XCD_DENOMS;
      try {
        const saved = localStorage.getItem(`cash_count_xcd_${today}`);
        return saved ? JSON.parse(saved) : DEFAULT_XCD_DENOMS;
      } catch {
        return DEFAULT_XCD_DENOMS;
      }
    },
  );

  // ── USD Denominations ─────────────────────────────────────────────────────
  const [usdDenominations, setUsdDenominations] = useState<
    USDDenominationEntry[]
  >(() => {
    if (typeof window === "undefined") return DEFAULT_USD_DENOMS;
    try {
      const saved = localStorage.getItem(`cash_count_usd_${today}`);
      return saved ? JSON.parse(saved) : DEFAULT_USD_DENOMS;
    } catch {
      return DEFAULT_USD_DENOMS;
    }
  });

  // Load both sets when date changes
  useEffect(() => {
    try {
      const savedXCD = localStorage.getItem(`cash_count_xcd_${selectedDate}`);
      setXcdDenominations(savedXCD ? JSON.parse(savedXCD) : DEFAULT_XCD_DENOMS);
      const savedUSD = localStorage.getItem(`cash_count_usd_${selectedDate}`);
      setUsdDenominations(savedUSD ? JSON.parse(savedUSD) : DEFAULT_USD_DENOMS);
    } catch {
      setXcdDenominations(DEFAULT_XCD_DENOMS);
      setUsdDenominations(DEFAULT_USD_DENOMS);
    }
  }, [selectedDate]);

  const updateXCDDenominations = (updated: DenominationEntry[]) => {
    setXcdDenominations(updated);
    try {
      localStorage.setItem(
        `cash_count_xcd_${selectedDate}`,
        JSON.stringify(updated),
      );
    } catch {}
  };

  const updateUSDDenominations = (updated: USDDenominationEntry[]) => {
    setUsdDenominations(updated);
    try {
      localStorage.setItem(
        `cash_count_usd_${selectedDate}`,
        JSON.stringify(updated),
      );
    } catch {}
  };

  // ── Derived totals ─────────────────────────────────────────────────────────
  const xcdTotal = round2(
    xcdDenominations.reduce((s, d) => s + d.value * d.count, 0),
  );
  const usdTotal = round2(
    usdDenominations.reduce((s, d) => s + d.value * d.count, 0),
  );
  const usdInXCD = round2(usdTotal * USD_TO_XCD);
  const combinedXCDTotal = round2(xcdTotal + usdInXCD);

  // ── Quick range handler ────────────────────────────────────────────────────
  const handleRangeSelect = (range: QuickRange) => {
    setActiveRange(range);
    const t = today;
    switch (range) {
      case "today":
        setSelectedDate(t);
        break;
      case "yesterday":
        setSelectedDate(addDays(t, -1));
        break;
      case "last7":
        setSelectedDate(addDays(t, -6));
        break;
      case "last30":
        setSelectedDate(addDays(t, -29));
        break;
      case "thisMonth": {
        const d = new Date();
        setSelectedDate(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
        );
        break;
      }
      case "lastMonth": {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        setSelectedDate(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
        );
        break;
      }
    }
  };

  // ── RTK Query ──────────────────────────────────────────────────────────────
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

  // ── Derived calendar values ────────────────────────────────────────────────
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

  const isLoading = reportLoading || reportFetching;
  const isMonthLoading = monthLoading || monthFetching;

  // ── Month nav ──────────────────────────────────────────────────────────────
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

  // ── Submit cash count (saves both XCD + USD to MongoDB) ───────────────────
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
        // XCD denominations (native)
        denominations: xcdDenominations,
        xcdTotal,
        // USD denominations (with XCD equivalent)
        usdDenominations,
        usdTotal,
        usdInXCD,
        // Combined
        exchangeRate: USD_TO_XCD,
        combinedXCDTotal,
        sessionName: report.sessionName,
        notes: cashCountNotes,
        submittedBy: user?.name ?? "unknown",
        role: user?.role === "admin" ? "manager" : "cashier",
      } as any).unwrap();
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

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const W = 210;
    const margin = 15;
    const lineH = 6;
    let y = margin;

    const setFont = (size: number, style: "normal" | "bold" = "normal") => {
      pdf.setFontSize(size);
      pdf.setFont("helvetica", style);
    };

    const row = (left: string, right: string, bold = false) => {
      setFont(9, bold ? "bold" : "normal");
      pdf.text(left, margin, y);
      pdf.text(right, W - margin, y, { align: "right" });
      y += lineH;
    };

    const dashes = (solid = false) => {
      if (solid) pdf.setLineDashPattern([], 0);
      else pdf.setLineDashPattern([1, 1], 0);
      pdf.line(margin, y, W - margin, y);
      y += 4;
    };

    const sectionHeader = (title: string) => {
      checkPage();
      setFont(8, "bold");
      pdf.text(title, margin, y);
      y += 5;
    };

    const checkPage = () => {
      if (y > 270) {
        pdf.addPage();
        y = margin;
      }
    };

    // ── Header ──
    setFont(16, "bold");
    pdf.text("CHEF'S WORLD", W / 2, y, { align: "center" });
    y += 7;
    setFont(9);
    pdf.text("Point of Sale — Daily Closing Report (Z-Report)", W / 2, y, {
      align: "center",
    });
    y += 5;
    pdf.text(fmtDate(selectedDate), W / 2, y, { align: "center" });
    y += 3;
    pdf.setLineWidth(0.5);
    dashes(true);

    // ── Session ──
    sectionHeader("SESSION");
    [
      ["Session", report.sessionName, "Date", selectedDate],
      [
        "Cashier",
        report.cashierName,
        "Printed",
        new Date().toLocaleTimeString(),
      ],
      [
        "Orders",
        String(report.ordersCount),
        "Avg Order",
        `EC$${fmt(report.avgOrderValue)}`,
      ],
    ].forEach(([l1, v1, l2, v2]) => {
      setFont(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(l1, margin, y);
      pdf.setFont("helvetica", "bold");
      pdf.text(v1, margin + 28, y);
      pdf.setFont("helvetica", "normal");
      pdf.text(l2, W / 2 + 5, y);
      pdf.setFont("helvetica", "bold");
      pdf.text(v2, W / 2 + 33, y);
      y += lineH;
    });
    dashes();

    // ── Sales ──
    sectionHeader("SALES SUMMARY");
    row("Gross Sales", `EC$${fmt(report.grossSales)}`);
    row("Discounts", `-EC$${fmt(report.discounts)}`);
    row("Refunds", `-EC$${fmt(report.refunds)}`);
    row("Net Sales", `EC$${fmt(report.netSales)}`, true);
    row("VAT / Tax", `+EC$${fmt(report.tax)}`);
    row("TOTAL INCL. TAX", `EC$${fmt(report.netSales + report.tax)}`, true);
    dashes();

    // ── Payments ──
    sectionHeader("PAYMENTS COLLECTED");
    const payRows: [string, number, boolean][] = [
      ["Cash (EC$)", report.payments.cash, false],
      ["Visa", report.payments.visa, false],
      ["Mastercard", report.payments.mastercard, false],
      ["Amex", report.payments.amex, false],
      ...(report.payments.card > 0
        ? [
            ["Card (other)", report.payments.card, false] as [
              string,
              number,
              boolean,
            ],
          ]
        : []),
      ["Check", report.payments.check, false],
      ["Total Collected", report.payments.total, true],
    ];
    payRows.forEach(([label, value, bold]) =>
      row(label, `EC$${fmt(Number(value))}`, bold),
    );
    dashes();

    // ── XCD Cash Count Table ──
    sectionHeader("CASH COUNT — EASTERN CARIBBEAN DOLLAR (EC$)");
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, y - 4, W - margin * 2, 6, "F");
    setFont(8, "bold");
    pdf.text("Denomination", margin + 2, y);
    pdf.text("Count", W / 2, y, { align: "center" });
    pdf.text("Amount (EC$)", W - margin - 2, y, { align: "right" });
    y += 5;

    const xcdActive = xcdDenominations.filter((d) => d.count > 0);
    if (xcdActive.length > 0) {
      xcdActive.forEach((d) => {
        checkPage();
        setFont(9);
        pdf.text(`EC$${d.label}`, margin + 2, y);
        pdf.text(String(d.count), W / 2, y, { align: "center" });
        pdf.text(`EC$${fmt(d.value * d.count)}`, W - margin - 2, y, {
          align: "right",
        });
        y += lineH;
      });
    } else {
      setFont(8);
      pdf.setTextColor(150);
      pdf.text("No XCD denominations entered", margin + 2, y);
      pdf.setTextColor(0);
      y += lineH;
    }

    setFont(9, "bold");
    pdf.text("TOTAL EC$", margin + 2, y);
    pdf.text(`EC$${fmt(xcdTotal)}`, W - margin - 2, y, { align: "right" });
    y += lineH;
    dashes(true);
    y += 2;

    // ── USD Cash Count Table ──
    checkPage();
    pdf.setFillColor(237, 233, 254); // indigo-100
    pdf.rect(margin, y - 2, W - margin * 2, 6, "F");
    setFont(8, "bold");
    pdf.setTextColor(79, 70, 229); // indigo
    pdf.text("CASH COUNT — US DOLLAR (US$)", margin, y + 2);
    pdf.setTextColor(0);
    y += 8;

    pdf.setFillColor(245, 243, 255); // indigo-50
    pdf.rect(margin, y - 4, W - margin * 2, 6, "F");
    setFont(8, "bold");
    pdf.text("Denomination", margin + 2, y);
    pdf.text("Count", W / 2 - 20, y, { align: "center" });
    pdf.text("Amount (US$)", W / 2 + 20, y, { align: "right" });
    pdf.text("Equiv. (EC$)", W - margin - 2, y, { align: "right" });
    y += 5;

    const usdActive = usdDenominations.filter((d) => d.count > 0);
    if (usdActive.length > 0) {
      usdActive.forEach((d) => {
        checkPage();
        setFont(9);
        pdf.text(`US$${d.label}`, margin + 2, y);
        pdf.text(String(d.count), W / 2 - 20, y, { align: "center" });
        pdf.text(`US$${fmt(d.value * d.count)}`, W / 2 + 20, y, {
          align: "right",
        });
        pdf.text(
          `EC$${fmt(round2(d.value * d.count * USD_TO_XCD))}`,
          W - margin - 2,
          y,
          { align: "right" },
        );
        y += lineH;
      });
    } else {
      setFont(8);
      pdf.setTextColor(150);
      pdf.text("No USD denominations entered", margin + 2, y);
      pdf.setTextColor(0);
      y += lineH;
    }

    setFont(9, "bold");
    pdf.text("TOTAL US$", margin + 2, y);
    pdf.text(`US$${fmt(usdTotal)}`, W / 2 + 20, y, { align: "right" });
    pdf.text(`EC$${fmt(usdInXCD)}`, W - margin - 2, y, { align: "right" });
    y += lineH;

    setFont(7);
    pdf.setTextColor(120);
    pdf.text(`Exchange rate: 1 US$ = ${USD_TO_XCD.toFixed(2)} EC$`, margin, y);
    pdf.setTextColor(0);
    y += lineH;

    // ── Combined Summary ──
    dashes();
    sectionHeader("COMBINED CASH REGISTER SUMMARY");
    const diff = round2(combinedXCDTotal - report.expectedClosingBalance);
    row("Opening Balance", `EC$${fmt(report.openingBalance)}`);
    row("Expected Closing", `EC$${fmt(report.expectedClosingBalance)}`);
    row("Counted EC$ Cash", `EC$${fmt(xcdTotal)}`);
    row("Counted US$ (in EC$)", `EC$${fmt(usdInXCD)}`);
    row("Combined Total (EC$)", `EC$${fmt(combinedXCDTotal)}`, true);
    // Colour difference
    pdf.setTextColor(
      diff >= 0 ? 5 : 220,
      diff >= 0 ? 150 : 40,
      diff >= 0 ? 105 : 40,
    );
    setFont(9, "bold");
    pdf.text("Difference", margin, y);
    pdf.text(
      `${diff >= 0 ? "+" : "-"}EC$${fmt(Math.abs(diff))}`,
      W - margin,
      y,
      { align: "right" },
    );
    pdf.setTextColor(0);
    y += lineH;
    dashes();

    // ── Sign-off ──
    checkPage();
    y += 4;
    const sigCols = [margin, W / 2 - 20, W - margin - 40];
    const sigLabels = [
      "Cashier Signature",
      "Supervisor Signature",
      "Date & Stamp",
    ];
    pdf.setLineDashPattern([1, 1], 0);
    sigCols.forEach((x, i) => {
      pdf.line(x, y, x + 50, y);
      setFont(7);
      pdf.text(sigLabels[i], x, y + 4);
    });
    y += 12;
    setFont(7);
    pdf.text(
      `Chef's World POS · Generated ${new Date().toLocaleString()} · Confidential`,
      W / 2,
      y,
      { align: "center" },
    );

    pdf.save(`ZReport_${selectedDate}.pdf`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {mounted &&
        report &&
        !report.empty &&
        createPortal(
          <div id="printable-report-portal">
            <PrintableReport
              report={report}
              selectedDate={selectedDate}
              xcdDenominations={xcdDenominations}
              usdDenominations={usdDenominations}
              xcdTotal={xcdTotal}
              usdTotal={usdTotal}
              usdInXCD={usdInXCD}
              combinedXCDTotal={combinedXCDTotal}
            />
          </div>,
          document.body,
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
              <h1 className="text-[15px] font-extrabold text-gray-900 tracking-tight">
                POS Closing Report
              </h1>
              <p className="text-[11px] text-gray-400 font-medium">
                Z-Report · {fmtShort(selectedDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchReport()}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw
                size={14}
                className={isLoading ? "animate-spin" : ""}
              />
            </button>
            {report && !report.empty && (
              <button
                onClick={handleSaveToOdoo}
                disabled={savingOdoo}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {saveOdooSuccess ? (
                  <>
                    <CheckCircle2 size={13} /> Saved to Odoo
                  </>
                ) : (
                  <>
                    <Save size={13} /> {savingOdoo ? "Saving…" : "Save to Odoo"}
                  </>
                )}
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
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">
                  Quick Range
                </span>
              </div>
              <QuickRangePicker
                activeRange={activeRange}
                onSelect={handleRangeSelect}
              />
              <div className="mt-3 pt-3 border-t border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                  Custom Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  max={today}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setActiveRange("custom");
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Month calendar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
                >
                  <ChevronLeft size={14} />
                </button>
                <h2 className="text-[13px] font-bold text-gray-900">
                  {MONTH_NAMES[calMonth]} {calYear}
                </h2>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
                >
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
                  onSelectDate={(d) => {
                    setSelectedDate(d);
                    setActiveRange("custom");
                  }}
                />
              )}
              <div className="flex items-center gap-3 mt-2.5 text-[9px] font-semibold text-gray-400 uppercase tracking-wide">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-300 inline-block" />
                  Today
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-400 inline-block" />
                  Selected
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 inline-block" />
                  Revenue
                </span>
              </div>
            </div>

            {/* Month summary */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={13} className="text-blue-600" />
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">
                  {MONTH_NAMES[calMonth]} Summary
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  {
                    label: "Total Revenue",
                    value: `EC$${fmt(monthTotals.netSales)}`,
                    bold: true,
                  },
                  {
                    label: "Total Orders",
                    value: monthTotals.ordersCount.toLocaleString(),
                  },
                  {
                    label: "Active Days",
                    value: String(monthTotals.activeDays),
                  },
                  {
                    label: "Avg / Day",
                    value: `EC$${fmt(monthTotals.avgPerDay)}`,
                  },
                ].map(({ label, value, bold }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-xs text-gray-500">{label}</span>
                    <span
                      className={`text-xs tabular-nums ${bold ? "font-extrabold text-gray-900" : "font-semibold text-gray-800"}`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active report pill */}
            {report && !report.empty && (
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 text-white shadow-sm">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Calendar size={12} className="opacity-60" />
                  <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">
                    Active Report
                  </span>
                </div>
                <p className="text-sm font-extrabold mb-3 leading-snug">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                    "en-US",
                    { weekday: "long", month: "long", day: "numeric" },
                  )}
                </p>
                <div className="flex flex-col gap-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="opacity-60">Session</span>
                    <span className="font-bold">{report.sessionName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Cashier</span>
                    <span className="font-bold">{report.cashierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Orders</span>
                    <span className="font-bold">{report.ordersCount}</span>
                  </div>
                  <div className="flex justify-between mt-1 pt-1 border-t border-white/20">
                    <span className="opacity-60">Net Sales</span>
                    <span className="font-extrabold text-sm">
                      EC${fmt(report.netSales)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Report area ── */}
          <div className="flex flex-col gap-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 text-gray-400 bg-white rounded-xl border border-gray-100">
                <RefreshCw
                  size={28}
                  className="animate-spin mb-3 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-500">
                  Loading report…
                </span>
              </div>
            ) : report?.empty ? (
              <div className="flex flex-col items-center justify-center py-32 text-gray-400 bg-white rounded-xl border border-gray-100 gap-2">
                <FileText size={36} className="opacity-20" />
                <p className="text-sm font-semibold text-gray-500">
                  No orders found for this date
                </p>
                <p className="text-xs text-gray-400">{report.message}</p>
              </div>
            ) : report ? (
              <>
                {/* Report header */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">
                        {fmtDate(selectedDate)}
                      </h2>
                      <p className="text-[11px] text-gray-400 mt-0.5 font-medium">
                        Session:{" "}
                        <span className="text-gray-600 font-semibold">
                          {report.sessionName}
                        </span>
                        &nbsp;·&nbsp;Cashier:{" "}
                        <span className="text-gray-600 font-semibold">
                          {report.cashierName}
                        </span>
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
                    label="Avg Order"
                    value={report.avgOrderValue}
                    sub="per transaction"
                    icon={<BarChart3 size={14} className="text-violet-600" />}
                    color="bg-violet-50"
                  />
                  <KpiCard
                    label="Tax Collected"
                    value={report.tax}
                    sub="VAT included"
                    icon={<ReceiptText size={14} className="text-amber-600" />}
                    color="bg-amber-50"
                  />
                </div>

                {/* Sales + Payments */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Sales breakdown */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
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
                            {value < 0 ? "−" : ""}EC${fmt(Math.abs(value))}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between py-3 text-sm font-extrabold border-t-2 border-gray-200 mt-1">
                        <span>Net Sales</span>
                        <span className="text-emerald-700 tabular-nums">
                          EC${fmt(report.netSales)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 text-xs">
                        <span className="text-gray-400">VAT / Tax</span>
                        <span className="text-gray-600 tabular-nums">
                          +EC${fmt(report.tax)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2.5 text-sm font-extrabold bg-gray-50 rounded-lg px-3 -mx-1 mt-1">
                        <span className="text-gray-900">Total incl. Tax</span>
                        <span className="tabular-nums text-gray-900">
                          EC${fmt(report.netSales + report.tax)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment methods */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                      Payment Methods
                    </h3>
                    <div className="flex flex-col gap-4">
                      <PaymentBar
                        label="Cash"
                        amount={report.payments.cash}
                        total={report.payments.total}
                        color="bg-emerald-400"
                        icon={
                          <Banknote size={13} className="text-emerald-600" />
                        }
                      />
                      {CARD_TYPES.map(({ key, label, color, iconColor }) => {
                        const amount = report.payments[key] as number;
                        return amount > 0 ? (
                          <PaymentBar
                            key={key}
                            label={label}
                            amount={amount}
                            total={report.payments.total}
                            color={color}
                            icon={
                              <CreditCard size={13} className={iconColor} />
                            }
                          />
                        ) : null;
                      })}
                      <PaymentBar
                        label="Check"
                        amount={report.payments.check}
                        total={report.payments.total}
                        color="bg-amber-400"
                        icon={
                          <ReceiptText size={13} className="text-amber-600" />
                        }
                      />
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-sm font-extrabold">
                      <span>Total Collected</span>
                      <span className="tabular-nums">
                        EC${fmt(report.payments.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top Products */}
                {report.topProducts?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                      Top Products
                    </h3>
                    <div className="grid grid-cols-5 gap-0">
                      {report.topProducts
                        .slice(0, 5)
                        .map((p: any, i: number) => (
                          <div
                            key={p.name}
                            className="flex items-center justify-between py-2.5 border-b border-gray-50 text-sm col-span-5"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-gray-100 text-[11px] font-extrabold text-gray-500 flex items-center justify-center flex-shrink-0">
                                {i + 1}
                              </span>
                              <span className="text-gray-800 font-medium">
                                {p.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-6">
                              <span className="text-gray-400 text-xs tabular-nums">
                                {p.qty} units
                              </span>
                              <span className="font-bold tabular-nums text-gray-900 w-24 text-right">
                                EC${fmt(p.revenue)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* ── Cash Register Count ── */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  {/* Section header */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Cash Register Count
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Rate:{" "}
                        <span className="font-semibold text-gray-600">
                          1 US$ = {USD_TO_XCD.toFixed(2)} EC$
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-2">
                        {submitSuccess && (
                          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 size={11} /> Submitted
                          </span>
                        )}
                        <button
                          onClick={() => setDenomEditable((v) => !v)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                            denomEditable
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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

                  {/* ── Two denomination tables side by side ── */}
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    {/* ── EC$ Table ── */}
                    <div className="border border-emerald-100 rounded-xl overflow-hidden">
                      {/* Table header badge */}
                      <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-emerald-600 flex items-center justify-center">
                          <Banknote size={11} className="text-white" />
                        </div>
                        <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-widest">
                          Eastern Caribbean Dollar
                        </span>
                        <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                          EC$
                        </span>
                      </div>
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest py-2 pl-4">
                              Bill / Coin
                            </th>
                            <th className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-2">
                              Count
                            </th>
                            <th className="text-right text-[10px] font-bold text-emerald-500 uppercase tracking-widest py-2 pr-4">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {xcdDenominations.map((d, i) => (
                            <XCDDenomRow
                              key={d.label}
                              denom={d}
                              editable={denomEditable}
                              onChange={(count) =>
                                updateXCDDenominations(
                                  xcdDenominations.map((item, idx) =>
                                    idx === i ? { ...item, count } : item,
                                  ),
                                )
                              }
                            />
                          ))}
                          <tr className="border-t-2 border-emerald-200 bg-emerald-50">
                            <td
                              colSpan={2}
                              className="py-3 pl-4 text-sm font-extrabold text-emerald-900"
                            >
                              Total EC$
                            </td>
                            <td className="py-3 pr-4 text-right text-sm font-extrabold text-emerald-700 tabular-nums">
                              EC${fmt(xcdTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* ── US$ Table ── */}
                    <div className="border border-indigo-100 rounded-xl overflow-hidden">
                      {/* Table header badge */}
                      <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2.5 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center">
                          <Banknote size={11} className="text-white" />
                        </div>
                        <span className="text-[11px] font-extrabold text-indigo-800 uppercase tracking-widest">
                          US Dollar
                        </span>
                        <span className="ml-auto text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full">
                          US$
                        </span>
                      </div>
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest py-2 pl-4">
                              Bill / Coin
                            </th>
                            <th className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-2">
                              Count
                            </th>
                            <th className="text-right text-[10px] font-bold text-indigo-500 uppercase tracking-widest py-2 pr-2">
                              US$
                            </th>
                            <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest py-2 pr-4">
                              ≈ EC$
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {usdDenominations.map((d, i) => (
                            <USDDenomRow
                              key={d.label}
                              denom={d}
                              editable={denomEditable}
                              onChange={(count) =>
                                updateUSDDenominations(
                                  usdDenominations.map((item, idx) =>
                                    idx === i ? { ...item, count } : item,
                                  ),
                                )
                              }
                            />
                          ))}
                          <tr className="border-t-2 border-indigo-200 bg-indigo-50">
                            <td
                              colSpan={2}
                              className="py-3 pl-4 text-sm font-extrabold text-indigo-900"
                            >
                              Total US$
                            </td>
                            <td className="py-3 pr-2 text-right text-sm font-extrabold text-indigo-700 tabular-nums">
                              US${fmt(usdTotal)}
                            </td>
                            <td className="py-3 pr-4 text-right text-sm font-bold text-gray-500 tabular-nums">
                              EC${fmt(usdInXCD)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ── Conversion bridge ── */}
                  <div className="flex items-center gap-3 mb-4 bg-gradient-to-r from-emerald-50 via-gray-50 to-indigo-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex-1 text-center">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
                        EC$ Counted
                      </p>
                      <p className="text-xl font-extrabold text-emerald-700 tabular-nums">
                        EC${fmt(xcdTotal)}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-gray-300">
                      <ArrowLeftRight size={16} />
                      <span className="text-[10px] font-semibold text-gray-400">
                        + rate {USD_TO_XCD}
                      </span>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
                        US$ in EC$
                      </p>
                      <p className="text-xl font-extrabold text-indigo-700 tabular-nums">
                        EC${fmt(usdInXCD)}
                      </p>
                      <p className="text-[10px] text-indigo-400 font-medium mt-0.5">
                        US${fmt(usdTotal)} × {USD_TO_XCD}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-gray-300">
                      <span className="text-lg font-bold">=</span>
                    </div>
                    <div className="flex-1 text-center bg-white rounded-lg py-2 px-3 border border-gray-200 shadow-sm">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        Combined Total
                      </p>
                      <p className="text-xl font-extrabold text-gray-900 tabular-nums">
                        EC${fmt(combinedXCDTotal)}
                      </p>
                    </div>
                  </div>

                  {/* ── Closing summary + notes ── */}
                  <div className="flex flex-col gap-0">
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      {[
                        {
                          icon: <Clock size={13} className="text-gray-400" />,
                          label: "Opening Balance",
                          value: `EC$${fmt(report.openingBalance)}`,
                          cls: "text-gray-900",
                        },
                        {
                          icon: (
                            <Banknote size={13} className="text-emerald-500" />
                          ),
                          label: "Cash Sales",
                          value: `+EC$${fmt(report.payments.cash)}`,
                          cls: "text-emerald-700 font-semibold",
                        },
                        {
                          icon: <XCircle size={13} className="text-red-400" />,
                          label: "Cash Refunds (est.)",
                          value: `-EC$${fmt(report.refunds * 0.45)}`,
                          cls: "text-red-500",
                        },
                      ].map(({ icon, label, value, cls }) => (
                        <div
                          key={label}
                          className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            {icon}
                            {label}
                          </div>
                          <span
                            className={`font-semibold tabular-nums text-sm ${cls}`}
                          >
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-extrabold text-gray-900">
                          Expected Closing
                        </span>
                        <span className="tabular-nums font-extrabold text-sm">
                          EC${fmt(report.expectedClosingBalance)}
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Combined Counted
                        </span>
                        <span
                          className={`font-extrabold tabular-nums text-sm ${Math.abs(combinedXCDTotal - report.expectedClosingBalance) < 1 ? "text-emerald-700" : "text-red-500"}`}
                        >
                          EC${fmt(combinedXCDTotal)}
                        </span>
                      </div>
                      <div
                        className={`rounded-xl px-4 py-3 flex items-center justify-between ${Math.abs(combinedXCDTotal - report.expectedClosingBalance) < 1 ? "bg-emerald-50" : "bg-red-50"}`}
                      >
                        <span
                          className={`font-semibold text-sm ${Math.abs(combinedXCDTotal - report.expectedClosingBalance) < 1 ? "text-emerald-700" : "text-red-600"}`}
                        >
                          Difference (EC$)
                        </span>
                        <span
                          className={`font-extrabold tabular-nums text-sm ${Math.abs(combinedXCDTotal - report.expectedClosingBalance) < 1 ? "text-emerald-700" : "text-red-600"}`}
                        >
                          {combinedXCDTotal - report.expectedClosingBalance >= 0
                            ? "+"
                            : ""}
                          EC$
                          {fmt(
                            combinedXCDTotal - report.expectedClosingBalance,
                          )}
                        </span>
                      </div>
                    </div>

                    <textarea
                      placeholder="Notes (optional)"
                      value={cashCountNotes}
                      onChange={(e) => setCashCountNotes(e.target.value)}
                      className="mt-3 w-full text-xs border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
