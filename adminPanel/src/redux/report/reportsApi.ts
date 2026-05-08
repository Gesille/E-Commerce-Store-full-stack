import { apiSlice } from "../api/apiSlice";

// ── Blob download helper (runs client-side only) ───────────────────────────

function saveBlob(blob: Blob, fileName: string) {
  const a = document.createElement("a");
  a.href = window.URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(a.href);
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface MonthlyRow {
  month: number;
  label: string;
  orders: number;
  revenue: number;
  revenue_untaxed: number;
}

export interface MonthlyReportResponse {
  success: boolean;
  year: number;
  total_orders: number;
  total_revenue: number;
  months: MonthlyRow[];
}

export interface DailyRow {
  date: string;
  orders: number;
  revenue: number;
  revenue_untaxed: number;
}

export interface DailyReportResponse {
  success: boolean;
  year: number;
  month: number;
  date_range: { from: string; to: string };
  total_orders: number;
  total_revenue: number;
  days: DailyRow[];
}

export interface ProductSalesRow {
  product_id: number;
  product_name: string;
  qty_sold: number;
  revenue: number;
  order_count: number;
}

export interface ProductSalesResponse {
  success: boolean;
  date_from: string;
  date_to: string;
  total_products_sold: number;
  total_revenue: number;
  products: ProductSalesRow[];
}

export interface MovementRow {
  product_id: number;
  product_name: string;
  qty_in: number;
  qty_out: number;
}

export interface MovementReportResponse {
  success: boolean;
  date_from: string;
  date_to: string;
  movements: MovementRow[];
}

// ── Export arg types ───────────────────────────────────────────────────────

export interface ExportMonthlyArgs {
  year: number;
  format: "pdf" | "excel";
}

export interface ExportDailyArgs {
  year: number;
  month: number;
  format: "pdf" | "excel";
}

export interface ExportProductArgs {
  date_from: string;
  date_to: string;
  format: "pdf" | "excel";
}

export interface ExportInventoryArgs {
  date_from: string;
  date_to: string;
  format: "pdf" | "excel";
}

// ── API slice ──────────────────────────────────────────────────────────────

export const reportsApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({

    // ── Read queries ───────────────────────────────────────────────────────

    getMonthlySalesReport: builder.query<MonthlyReportResponse, { year: number }>({
      query: ({ year }) => ({
        url: `/sales/monthly?year=${year}`,
        method: "GET",
        credentials: "include" as const,
      }),
    }),

    getDailySalesReport: builder.query<DailyReportResponse, { year: number; month: number }>({
      query: ({ year, month }) => ({
        url: `/sales/daily?year=${year}&month=${month}`,
        method: "GET",
        credentials: "include" as const,
      }),
    }),

    getProductSalesReport: builder.query<ProductSalesResponse, { date_from: string; date_to: string }>({
      query: ({ date_from, date_to }) => ({
        url: `/sales/products?date_from=${date_from}&date_to=${date_to}`,
        method: "GET",
        credentials: "include" as const,
      }),
    }),

    getInventoryMovements: builder.query<MovementReportResponse, { date_from: string; date_to: string }>({
      query: ({ date_from, date_to }) => ({
        url: `/inventory/movements?date_from=${date_from}&date_to=${date_to}`,
        method: "GET",
        credentials: "include" as const,
      }),
    }),

    // ── Export mutations ───────────────────────────────────────────────────
    // Using mutations + queryFn so Blobs are never stored in Redux state,
    // which avoids the "non-serializable value" middleware warnings.
exportMonthlySalesReport: builder.mutation<void, ExportMonthlyArgs>({
  query: ({ year, format }) => ({
    url: `/sales/monthly/export`,
    method: "GET",
    params: { year, format },
    responseHandler: async (response) => {
      const blob = await response.blob();
      const ext = format === "pdf" ? "pdf" : "xlsx";
      saveBlob(blob, `monthly-sales-${year}.${ext}`);
      return { data: undefined };
    },
  }),
}),

  exportDailySalesReport: builder.mutation<void, ExportDailyArgs>({
  query: ({ year, month, format }) => ({
    url: `/sales/daily/export`,
    method: "GET",
    params: { year, month, format },
    responseHandler: async (response) => {
      const blob = await response.blob();
      const ext = format === "pdf" ? "pdf" : "xlsx";
      saveBlob(blob, `daily-sales-${year}-${String(month).padStart(2, "0")}.${ext}`);
      return { data: undefined };
    },
  }),
}),
exportProductSalesReport: builder.mutation<void, ExportProductArgs>({
  query: ({ date_from, date_to, format }) => ({
    url: `/sales/products/export`,
    method: "GET",
    params: { date_from, date_to, format },
    responseHandler: async (response) => {
      const blob = await response.blob();
      const ext = format === "pdf" ? "pdf" : "xlsx";
      saveBlob(blob, `product-sales-${date_from}-to-${date_to}.${ext}`);
      return { data: undefined };
    },
  }),
}),
   exportInventoryReport: builder.mutation<void, ExportInventoryArgs>({
  query: ({ date_from, date_to, format }) => ({
    url: `/inventory/export`,
    method: "GET",
    params: { date_from, date_to, format },
    responseHandler: async (response) => {
      const blob = await response.blob();
      const ext = format === "pdf" ? "pdf" : "xlsx";
      saveBlob(blob, `inventory-${date_from}-to-${date_to}.${ext}`);
      return { data: undefined };
    },
  }),
}),
  }),
});

export const {
  // read
  useGetMonthlySalesReportQuery,
  useGetDailySalesReportQuery,
  useGetProductSalesReportQuery,
  useGetInventoryMovementsQuery,
  // export (mutations — fire-and-forget, no Redux caching)
  useExportMonthlySalesReportMutation,
  useExportDailySalesReportMutation,
  useExportProductSalesReportMutation,
  useExportInventoryReportMutation,
} = reportsApi;