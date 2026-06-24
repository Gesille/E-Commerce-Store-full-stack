import { apiSlice } from "../api/apiSlice";

// ── Shared primitives ─────────────────────────────────────────────────────────

export interface DenominationEntry {
  value: number;
  label: string;
  count: number;
}

// ── Payments ──────────────────────────────────────────────────────────────────

export interface CardBreakdownEntry {
  label: string;
  amount: number;
  count: number;
}

export interface PaymentMethod {
  amount: number;
  count: number;
}

export interface CardPaymentMethod extends PaymentMethod {
  breakdown: CardBreakdownEntry[];
}

export interface HouseAccountEntry {
  name: string;
  amount: number;
  count: number;
}

export interface HouseAccountPaymentMethod extends PaymentMethod {
  accounts: HouseAccountEntry[];
}

export interface OtherPaymentMethod {
  amount: number;
}

export interface Payments {
  cash: PaymentMethod;
  card: CardPaymentMethod;
  bank: PaymentMethod;
  cheque: PaymentMethod;
  houseAccount: HouseAccountPaymentMethod;
  other: OtherPaymentMethod;
  total: number;
}

// ── Comps ─────────────────────────────────────────────────────────────────────

export interface CompEntry {
  reason: string;
  base: number;
  tax: number;
}

export interface Comps {
  itemComps: CompEntry[];
  checkComps: CompEntry[];
  totalItemComps: number;
  totalCheckComps: number;
  total: number;
}

// ── Voids ─────────────────────────────────────────────────────────────────────

export interface Voids {
  count: number;
  amount: number;
}

// ── Tips ─────────────────────────────────────────────────────────────────────

export interface TipBreakdownEntry {
  method: string;
  amount: number;
  count: number;
}

export interface Tips {
  total: number;
  avgPct: number;
  breakdown: TipBreakdownEntry[];
}

// ── Payouts ───────────────────────────────────────────────────────────────────

export interface PayoutItem {
  description: string;
  amount: number;
}

export interface Payouts {
  items: PayoutItem[];
  total: number;
}

// ── Top Products / Hourly ─────────────────────────────────────────────────────

export interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

export interface HourlyChartEntry {
  hour: number;
  label: string;
  amount: number;
}

// ── Daily Closing Report ──────────────────────────────────────────────────────

export interface DailyClosingReport {
  success: boolean;
  date: string;

  // Empty-day sentinel
  empty?: boolean;
  message?: string;

  // Session / cashier
  odooSessionId: number | null;
  sessionName: string;
  cashierName: string;
  role: string;
  clockIn: string | null;
  clockOut: string | null;
  paidHours: number | null;
  shiftNumber: number;

  // Sales figures
  ordersCount: number;
  guestsCount: number;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  tax: number;
  avgOrderValue: number;
  salesPerGuest: number;

  // Breakdowns
  comps: Comps;
  voids: Voids;
  tips: Tips;
  payouts: Payouts;
  payments: Payments;

  // Cash reconciliation
  cashOwedToHouse: number;
  openingBalance: number;
  expectedClosingBalance: number;

  // Lists
  topProducts: TopProduct[];
  hourlyChart: HourlyChartEntry[];
}

// ── Submit Cash Count ─────────────────────────────────────────────────────────

export interface SubmitCashCountPayload {
  date: string;
  odooSessionId: number;
  denominations: DenominationEntry[];
  sessionName?: string;
  notes?: string;
  submittedBy?: string;
  role?: "cashier" | "manager";
}

export interface SubmitCashCountResponse {
  success: boolean;
  message?: string;
  warning?: string;
  countedTotal: number;
  shiftId?: string;
  odooSessionId?: number;
}

// ── Monthly Calendar ──────────────────────────────────────────────────────────

export interface DayReport {
  date: string;
  ordersCount: number;
  grossSales: number;
  refunds: number;
  netSales: number;
  tax: number;
  cash: number;
  card: number;
  bank: number;
  cheque: number;
}

export interface MonthlyTotals {
  ordersCount: number;
  grossSales: number;
  netSales: number;
  refunds: number;
  tax: number;
  cash: number;
  card: number;
  bank: number;
  cheque: number;
  activeDays: number;
  avgPerDay: number;
}

export interface MonthlyCalendarReport {
  success: boolean;
  year: number;
  month: number;
  dateRange: { from: string; to: string };
  days: DayReport[];
  totals: MonthlyTotals;
}

// ── Query Param Types ─────────────────────────────────────────────────────────

export interface DailyReportParams {
  date?: string;    // YYYY-MM-DD, defaults to today
  configId?: number;
}

export interface MonthlyReportParams {
  year?: number;
  month?: number;   // 1–12
  configId?: number;
}

// ── API Slice ─────────────────────────────────────────────────────────────────

export const receiptsApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({

    // GET /reports-daily?date=YYYY-MM-DD&configId=1
    getDailyClosingReport: builder.query<DailyClosingReport, DailyReportParams>({
      query: ({ date, configId } = {}) => ({
        url: "reports-daily",
        params: {
          ...(date     && { date }),
          ...(configId && { configId }),
        },
      }),
      providesTags: (_result, _err, { date }) => [
        { type: "DailyReport", id: date ?? "today" },
      ],
    }),

    // POST /daily-cash-count
    submitCashCount: builder.mutation<SubmitCashCountResponse, SubmitCashCountPayload>({
      query: (body) => ({
        url: "daily-cash-count",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _err, { date }) => [
        { type: "DailyReport", id: date },
        { type: "CashCount",   id: date },
      ],
    }),

    // GET /reports-monthly?year=2025&month=6&configId=1
    getMonthlyCalendarReport: builder.query<MonthlyCalendarReport, MonthlyReportParams>({
      query: ({ year, month, configId } = {}) => ({
        url: "reports-monthly",
        params: {
          ...(year     && { year }),
          ...(month    && { month }),
          ...(configId && { configId }),
        },
      }),
      providesTags: (_result, _err, { year, month }) => [
        { type: "MonthlyReport", id: `${year}-${month}` },
      ],
    }),
  }),
});

export const {
  useGetDailyClosingReportQuery,
  useGetMonthlyCalendarReportQuery,
  useSubmitCashCountMutation,
} = receiptsApi;