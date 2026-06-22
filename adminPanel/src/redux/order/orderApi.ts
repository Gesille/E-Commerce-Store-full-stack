// redux/order/orderApi.ts
import { apiSlice } from "../api/apiSlice";
type MonthData = {
  month: string;
  total: number;
  successful: number;
};
export const orderApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAdminOrders: builder.query({
      query: () => ({
        url: "admin-orders",
        method: "GET",
        credentials: "include" as const,
      }),
    }),
    getAdminOrderDetail: builder.query({
      query: (id: number) => ({
        url: `admin-orders/${id}`,
        method: "GET",
        credentials: "include" as const,
      }),
    }),

    getMonthlyRevenue: builder.query<MonthData[], void>({
      query: () => ({
        url: "revenue/monthly",
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (response: { chartData: MonthData[] }) =>
        response.chartData,
    }),
    // RTK Query
    getOrderStatusStats: builder.query({
      query: () => ({
        url: "dashboard/order-status",
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => res.statusData,
    }),
    getLatestTransactions: builder.query({
      query: () => ({
        url: "dashboard/latest-transactions",
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => res.transactions,
    }),
    returnOrder: builder.mutation({
      query: (body) => ({
        url: "/order-return",
        method: "POST",
        body,
        credentials: "include",
      }),
    }),
    managerCreateOrder: builder.mutation({
      query: (data) => ({
        url: "manager-create-order",
        method: "POST",
        body: data,
      }),
    }),
    getOrdersByStatus: builder.query<{ orders: any[] }, string>({
  query: (status) => ({
    url: `orders/by-status?status=${status}`,
    method: "GET",
  }),
}),
confirmOrder: builder.mutation({
  query: (orderId: string) => ({
    url: `manager-confirm/${orderId}`,
    method: "GET", // keep GET since your route is GET
    credentials: "include" as const,
  }),
}),
cancelOrder: builder.mutation({
  query: (orderId: string) => ({
    url: `manager-cancel/${orderId}`,
    method: "GET",
    credentials: "include" as const,
  }),
}),
removeHeldOrder: builder.mutation<void, number>({
  query: (odooOrderId) => ({
    url: `/held-order/${odooOrderId}`,
    method: "DELETE",
  }),
}),
  }),
});

export const {
  useGetAdminOrdersQuery,
  useGetLatestTransactionsQuery,
  useGetOrderStatusStatsQuery,
  useGetAdminOrderDetailQuery,
  useGetMonthlyRevenueQuery,
  useReturnOrderMutation,
  useManagerCreateOrderMutation,
  useGetOrdersByStatusQuery,
   useConfirmOrderMutation,
  useCancelOrderMutation,
  useRemoveHeldOrderMutation
} = orderApi;
