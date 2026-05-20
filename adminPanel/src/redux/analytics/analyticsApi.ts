import { apiSlice } from "../api/apiSlice";

export type Period = "today" | "week" | "month";

export const analyticsApi = apiSlice.injectEndpoints({
  overrideExisting: true,

  endpoints: (builder) => ({
    // KPI Summary
    getKpiSummary: builder.query({
      query: ({
        period = "today",
        configId,
      }: {
        period?: Period;
        configId?: number;
      }) => ({
        url: `summary?period=${period}&configId=${configId}`,
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => res.kpis,
    }),

    // Revenue Chart
    getRevenueChart: builder.query({
      query: ({
        period = "today",
        configId,
      }: {
        period?: Period;
        configId?: number;
      }) => ({
        url: `revenue-chart?period=${period}&configId=${configId}`,
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => res.data,
    }),

    // Top Products
    getTopProducts: builder.query({
      query: ({
        period = "today",
        configId,
        limit = 6,
      }: {
        period?: Period;
        configId?: number;
        limit?: number;
      }) => ({
        url: `top-products?period=${period}&configId=${configId}&limit=${limit}`,
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => res.products,
    }),

    // Recent Orders
    getRecentOrders: builder.query({
      query: ({
        configId,
        limit = 10,
      }: {
        configId?: number;
        limit?: number;
      }) => ({
        url: `recent-orders?configId=${configId}&limit=${limit}`,
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => res.orders,
    }),

    // Payment Methods
    getPaymentMethods: builder.query({
      query: ({
        period = "today",
        configId,
      }: {
        period?: Period;
        configId?: number;
      }) => ({
        url: `payment-methods?period=${period}&configId=${configId}`,
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => res.methods,
    }),

    // Categories
    getCategories: builder.query({
      query: ({
        period = "today",
        configId,
      }: {
        period?: Period;
        configId?: number;
      }) => ({
        url: `categories?period=${period}&configId=${configId}`,
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => res.categories,
    }),

    // Staff Performance
    getStaffPerformance: builder.query({
      query: ({
        period = "today",
        configId,
      }: {
        period?: Period;
        configId?: number;
      }) => ({
        url: `staff?period=${period}&configId=${configId}`,
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => res.staff,
    }),

    // Revenue Target
    getRevenueTarget: builder.query({
      query: ({
        period = "today",
        configId,
      }: {
        period?: Period;
        configId?: number;
      }) => ({
        url: `target?period=${period}&configId=${configId}`,
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => res.target,
    }),

    // Session Info
    getSessionInfo: builder.query({
      query: (configId?: number) => ({
        url: `session-info?configId=${configId}`,
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => res.session,
    }),

    // Low Stock
    getLowStock: builder.query({
      query: ({
        threshold = 10,
        limit = 8,
      }: {
        threshold?: number;
        limit?: number;
      }) => ({
        url: `low-stock?threshold=${threshold}&limit=${limit}`,
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => res.items,
    }),

    // Heatmap
    getHeatmap: builder.query({
      query: (configId?: number) => ({
        url: `heatmap?configId=${configId}`,
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => res.heatmap,
    }),

    // Tables
    getTables: builder.query({
      query: ({ configId }: { configId?: number }) => ({
        url: `tables?configId=${configId}`,
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => res.tables,
    }),

    // Discounts
    getDiscounts: builder.query({
      query: ({
        period = "today",
        configId,
      }: {
        period?: Period;
        configId?: number;
      }) => ({
        url: `discounts?period=${period}&configId=${configId}`,
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => ({
        discounts: res.discounts,
        total: res.total,
      }),
    }),

    // Customer Insights
    getCustomerInsights: builder.query({
      query: ({
        period = "today",
        configId,
      }: {
        period?: Period;
        configId?: number;
      }) => ({
        url: `customers?period=${period}&configId=${configId}`,
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => res.customers,
    }),
  }),
});

export const {
  useGetKpiSummaryQuery,
  useGetRevenueChartQuery,
  useGetTopProductsQuery,
  useGetRecentOrdersQuery,
  useGetPaymentMethodsQuery,
  useGetCategoriesQuery,
  useGetStaffPerformanceQuery,
  useGetRevenueTargetQuery,
  useGetSessionInfoQuery,
  useGetLowStockQuery,
  useGetHeatmapQuery,
  useGetTablesQuery,
  useGetDiscountsQuery,
  useGetCustomerInsightsQuery,
} = analyticsApi;