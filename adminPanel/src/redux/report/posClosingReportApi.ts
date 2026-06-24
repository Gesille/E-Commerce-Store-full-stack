import { apiSlice } from "../api/apiSlice";

// ── Types ───────────────────────────────────────────────────────────────
export interface HourlyChartEntry {
  hour: number;
  label: string;
  amount: number;
}

export interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

export interface PaymentBreakdownEntry {
  method: string;
  amount: number;
}

export interface Payments {
  cash: number;
  card: number;
  bank: number;
  check: number;
  other: number;
  breakdown: PaymentBreakdownEntry[];
  total: number;
}

export interface DailyClosingReport {
  success: boolean;
  date: string;
  empty?: boolean;
  message?: string;
  sessionName: string;
  cashierName: string;
  ordersCount: number;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  tax: number;
  avgOrderValue: number;
  payments: Payments;
  openingBalance: number;
  expectedClosingBalance: number;
  topProducts: TopProduct[];
  hourlyChart: HourlyChartEntry[];
}

export interface DenominationEntry {
  value: number;
  label: string;
  count: number;
}

export interface SubmitCashCountPayload {
  date: string;
  cashierId: string;
  denominations: DenominationEntry[];
  sessionName?: string;
  notes?: string;
}

export interface SubmitCashCountResponse {
  success: boolean;
  message?: string;
  warning?: string;
  countedTotal: number;
  shiftId?: string;
  denominations?: DenominationEntry[];
}

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
  check: number;
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
  check: number;
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

// ─── Query Params ─────────────────────────────────────────────────────────────

export interface DailyReportParams {
  date?: string;       // YYYY-MM-DD, defaults to today
  configId?: number;
}

export interface MonthlyReportParams {
  year?: number;
  month?: number;      // 1–12
  configId?: number;
}


export const receiptsApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    // GET /reports-daily?date=YYYY-MM-DD&configId=1
    getDailyClosingReport: builder.query<DailyClosingReport, DailyReportParams>(
      {
        query: ({ date, configId } = {}) => ({
          url: "reports-daily",
          params: {
            ...(date && { date }),
            ...(configId && { configId }),
          },
        }),
        providesTags: (_result, _err, { date }) => [
          { type: "DailyReport", id: date ?? "today" },
        ],
      },
    ),
      // POST /daily-cash-count
    submitCashCount: builder.mutation<
      SubmitCashCountResponse,
      SubmitCashCountPayload
    >({
      query: (body) => ({
        url: "daily-cash-count",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _err, { date }) => [
        { type: "DailyReport", id: date },
        { type: "CashCount", id: date },
      ],
    }),
      // GET /reports-monthly?year=2025&month=6&configId=1
    getMonthlyCalendarReport: builder.query<
      MonthlyCalendarReport,
      MonthlyReportParams
    >({
      query: ({ year, month, configId } = {}) => ({
        url: "reports-monthly",
        params: {
          ...(year && { year }),
          ...(month && { month }),
          ...(configId && { configId }),
        },
      }),
      providesTags: (_result, _err, { year, month }) => [
        { type: "MonthlyReport", id: `${year}-${month}` },
      ],
    }),
  }),
});

export const {useGetDailyClosingReportQuery,useGetMonthlyCalendarReportQuery,useSubmitCashCountMutation} = receiptsApi;
