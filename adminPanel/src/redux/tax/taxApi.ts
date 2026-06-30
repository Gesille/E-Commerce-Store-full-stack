import { apiSlice } from "../api/apiSlice";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaxHoliday {
  _id: string;
  type: "holiday";
  label: string;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExemptCustomer {
  id: number;
  name: string;
  email: string | false;
  phone: string | false;
  is_company: boolean;
  x_tax_exempt: boolean;
}

export interface TaxStatus {
  odoo: {
    abctTax: { id: number | null; status: string };
    taxExemptFiscalPosition: { id: number | null; status: string };
    taxHolidayFiscalPosition: { id: number | null; status: string };
  };
  today: {
    isHoliday: boolean;
    activeHoliday: TaxHoliday | null;
  };
}

// ─── Report Types ─────────────────────────────────────────────────────────────

export interface TaxReportOrder {
  id: number;
  ref: string;
  date: string;
  customer: string;
  session: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  isExempt: boolean;
  taxReason: string;
}

export interface TaxReportSummary {
  totalOrders: number;
  normalOrders: number;
  exemptOrders: number;
  totalSubtotal: number;
  totalTax: number;
  totalRevenue: number;
}

export interface DailyTaxReport {
  date: string;
  summary: TaxReportSummary;
  timeline: {
    hour: number;
    label: string;
    orders: number;
    tax: number;
    total: number;
  }[];
  orders: TaxReportOrder[];
}

export interface MonthlyTaxReport {
  year: number;
  month: number;
  dateFrom: string;
  dateTo: string;
  summary: TaxReportSummary;
  breakdown: {
    date: string;
    orders: number;
    tax: number;
    total: number;
  }[];
  orders: TaxReportOrder[];
}
export interface EffectiveTaxRate {
  rate: number;        // 0 or 0.17
  reason: string;       // "normal" | "customer_exempt" | "holiday:<label>"
  isExempt: boolean;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const taxApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({

    // ── Diagnostics ────────────────────────────────────────────────────────
    getTaxStatus: builder.query<TaxStatus, void>({
      query: () => ({
        url: "status",
        method: "GET",
        credentials: "include" as const,
      }),
      providesTags: ["TaxSettings"],
    }),

    clearTaxCache: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: "clear-cache",
        method: "POST",
        credentials: "include" as const,
      }),
    }),

    // ── Tax Holidays ───────────────────────────────────────────────────────
    getHolidays: builder.query<TaxHoliday[], void>({
      query: () => ({
        url: "get-holidays",
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: { success: boolean; holidays: TaxHoliday[] }) =>
        res.holidays,
      providesTags: ["TaxHolidays"],
    }),

    createHoliday: builder.mutation<
      { success: boolean; holiday: TaxHoliday },
      { label: string; startDate: string; endDate: string }
    >({
      query: (body) => ({
        url: "create-holidays",
        method: "POST",
        credentials: "include" as const,
        body,
      }),
      invalidatesTags: ["TaxHolidays", "TaxSettings"],
    }),

    updateHoliday: builder.mutation<
      { success: boolean; holiday: TaxHoliday },
      { id: string; label?: string; startDate?: string; endDate?: string; active?: boolean }
    >({
      query: ({ id, ...body }) => ({
        url: `update-holidays/${id}`,
        method: "PATCH",
        credentials: "include" as const,
        body,
      }),
      invalidatesTags: ["TaxHolidays", "TaxSettings"],
    }),

    deleteHoliday: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `delete-holidays/${id}`,
        method: "DELETE",
        credentials: "include" as const,
      }),
      invalidatesTags: ["TaxHolidays", "TaxSettings"],
    }),

    // ── Customer Exemptions ────────────────────────────────────────────────
    getExemptCustomers: builder.query<ExemptCustomer[], void>({
      query: () => ({
        url: "get-exempt-customers",
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: { success: boolean; customers: ExemptCustomer[] }) =>
        res.customers,
      providesTags: ["TaxExemptCustomers"],
    }),

    setCustomerExemption: builder.mutation<
      { success: boolean; message: string; odooPartnerId: number; exempt: boolean },
      { odooPartnerId: number; exempt: boolean }
    >({
      query: ({ odooPartnerId, exempt }) => ({
        url: `exempt-customers/${odooPartnerId}`,
        method: "PATCH",
        credentials: "include" as const,
        body: { exempt },
      }),
      invalidatesTags: ["TaxExemptCustomers"],
    }),

    // ── Tax Reports ────────────────────────────────────────────────────────
    getDailyTaxReport: builder.query<DailyTaxReport, { date?: string }>({
      query: ({ date } = {}) => ({
        url: date
          ? `taxes-daily?date=${date}`
          : "reports/taxes/daily",
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: DailyTaxReport & { success: boolean }) => res,
      providesTags: ["TaxReports"],
    }),

    getMonthlyTaxReport: builder.query<
      MonthlyTaxReport,
      { year?: number; month?: number }
    >({
      query: ({ year, month } = {}) => {
        const params = new URLSearchParams();
        if (year)  params.set("year",  String(year));
        if (month) params.set("month", String(month));
        const qs = params.toString();
        return {
          url: `taxes-monthly${qs ? `?${qs}` : ""}`,
          method: "GET",
          credentials: "include" as const,
        };
      },
      transformResponse: (res: MonthlyTaxReport & { success: boolean }) => res,
      providesTags: ["TaxReports"],
    }),

    getTaxReportByRange: builder.query<
      { summary: TaxReportSummary; orders: TaxReportOrder[]; dateFrom: string; dateTo: string },
      { dateFrom: string; dateTo: string }
    >({
      query: ({ dateFrom, dateTo }) => ({
        url: `taxes-range?dateFrom=${dateFrom}&dateTo=${dateTo}`,
        method: "GET",
        credentials: "include" as const,
      }),
      providesTags: ["TaxReports"],
    }),

   getEffectiveTaxRate: builder.query<EffectiveTaxRate, { customerId?: number } | void>({
  query: (params) => {
    const qs = params?.customerId ? `?customerId=${params.customerId}` : "";
    return {
      url: `effective-rate${qs}`, 
      method: "GET",
      credentials: "include" as const,
    };
  },
  providesTags: ["TaxSettings"],
}),
  }),
});

export const {
  // Diagnostics
  useGetTaxStatusQuery,
  useClearTaxCacheMutation,
  // Holidays
  useGetHolidaysQuery,
  useCreateHolidayMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
  useGetEffectiveTaxRateQuery,
  // Exemptions
  useGetExemptCustomersQuery,
  useSetCustomerExemptionMutation,
  // Reports
  useGetDailyTaxReportQuery,
  useGetMonthlyTaxReportQuery,
  useGetTaxReportByRangeQuery,
} = taxApi;
export const downloadTaxReportPDF = (
  params:
    | { date: string }
    | { year: number; month: number }
    | { dateFrom: string; dateTo: string },
) => {
  const base = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/reports/taxes/export`;
  const qs   = new URLSearchParams(
    params as Record<string, string>,
  ).toString();
  window.open(`${base}?${qs}`, "_blank");
};