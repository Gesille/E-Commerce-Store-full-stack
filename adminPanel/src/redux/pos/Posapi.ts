import {
  OpenSessionResponse,
  OpenSessionBody,
  ConfirmOpeningBalanceResponse,
  ConfirmOpeningBalanceBody,
  APIResponse,
  CloseSessionBody,
  ActiveSessionResponse,
  SessionOrdersResponse,
  SessionReportResponse,
  CashierShiftBody,
  ActiveShiftsResponse,
  CreateOrderResponse,
  CreateOrderBody,
  ProductsResponse,
  CustomersResponse,
  CreateCustomerBody,
  PaymentMethodsResponse,
  POSConfigsResponse,
} from "@/types/session";
import { apiSlice } from "../api/apiSlice";
import { CreateCustomerResponse, CreateOrGetCustomerResponse } from "@/types/pos";
import { Sacramento } from "next/font/google";

export const posApi = apiSlice.injectEndpoints({
  overrideExisting: true,

  endpoints: (builder) => ({
    openSession: builder.mutation<OpenSessionResponse, OpenSessionBody>({
      query: (body) => ({
        url: "session/open",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
    }),

    confirmOpeningBalance: builder.mutation<
      ConfirmOpeningBalanceResponse,
      ConfirmOpeningBalanceBody
    >({
      query: (body) => ({
        url: "session/confirm-opening",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
    }),

    closeSession: builder.mutation<APIResponse, CloseSessionBody>({
      query: (body) => ({
        url: "session-close",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
    }),

    getActiveSession: builder.query<ActiveSessionResponse, number>({
      query: (configId) => ({
        url: "session/active",
        params: { configId },
        credentials: "include" as const,
      }),
    }),
    getSessionOrders: builder.query<SessionOrdersResponse, number>({
      query: (sessionId) => ({
        url: `orders/${sessionId}`,
        credentials: "include" as const,
      }),
    }),

    getSessionReport: builder.query<SessionReportResponse, number>({
      query: (sessionId) => ({
        url: `session/${sessionId}/report`,
        credentials: "include" as const,
      }),
    }),

    startCashierShift: builder.mutation<APIResponse, CashierShiftBody>({
      query: (body) => ({
        url: "shift/start",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
    }),

    pauseCashierShift: builder.mutation<APIResponse, CashierShiftBody>({
      query: (body) => ({
        url: "shift/pause",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
    }),

    resumeCashierShift: builder.mutation<APIResponse, CashierShiftBody>({
      query: (body) => ({
        url: "shift/resume",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
    }),

    endCashierShift: builder.mutation<APIResponse, CashierShiftBody>({
      query: (body) => ({
        url: "shift/end",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
    }),

    getActiveShifts: builder.query<ActiveShiftsResponse, number>({
      query: (configId) => ({
        url: "shift/active",
        params: { configId },
        credentials: "include" as const,
      }),
    }),

    createOrder: builder.mutation<CreateOrderResponse, CreateOrderBody>({
      query: (body) => ({
        url: "order",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
      invalidatesTags: ["Products"],
    }),

    getProducts: builder.query<ProductsResponse, void>({
      query: () => ({
        url: "products",
        credentials: "include" as const,
      }),
      providesTags: ["Products"],
    }),

    getCustomers: builder.query<CustomersResponse, string | void>({
      query: (search = "") => ({
        url: "get-customers",
        params: search ? { search } : undefined,
        credentials: "include" as const,
      }),
      providesTags: ["Customers"],
    }),

    

    getPaymentMethods: builder.query<PaymentMethodsResponse, void>({
      query: () => ({
        url: "payment-methods",
        credentials: "include" as const,
      }),
    }),

    getPOSConfigs: builder.query<POSConfigsResponse, void>({
      query: () => ({
        url: "configs",
        credentials: "include" as const,
      }),
    }),
    getOrderReceiptPdf: builder.query<Blob, number>({
      query: (orderId) => ({
        url: `order/${orderId}/receipt-pdf`,
        credentials: "include" as const,
        responseHandler: (response) => response.blob(),
      }),
    }),
    createOdooInvoice: builder.mutation({
      query: (body: { odooOrderId: number }) => ({
        url: "order/invoice",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
    }),
    getPosOrders: builder.query({
      query: ({
        page = 1,
        limit = 20,
        status,
        search,
        date_from,
        date_to,
      }: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
        date_from?: string;
        date_to?: string;
      }) => {
        const params = new URLSearchParams();

        params.set("page", String(page));
        params.set("limit", String(limit));

        if (status) params.set("status", status);
        if (search) params.set("search", search);
        if (date_from) params.set("date_from", date_from);
        if (date_to) params.set("date_to", date_to);

        return {
          url: `pos-orders?${params.toString()}`,
          method: "GET",
          credentials: "include" as const,
        };
      },

      serializeQueryArgs: ({ endpointName }) => endpointName,

      forceRefetch({ currentArg, previousArg }) {
        return JSON.stringify(currentArg) !== JSON.stringify(previousArg);
      },

      transformResponse: (res: any) => res,
    }),

    getPosOrderById: builder.query({
      query: (id: number) => ({
        url: `pos-orders/${id}`,
        method: "GET",
        credentials: "include" as const,
      }),

      transformResponse: (res: any) => res.order,
    }),
getHeldOrders: builder.query<any, void>({
  query: () => ({
    url: "pos-held-orders",
    method: "GET",
    credentials: "include" as const,
  }),
  providesTags: ["HeldOrders"],
}),
holdOrder: builder.mutation({
  query: (body: {
    cart: {
      productId: number;
      qty: number;
      price: number;
      discount?: number;
      note?: string;
      name?: string;
    }[];
    customerId: number;
    orderName: string;
  }) => ({
    url: "pos-hold-order",
    method: "POST",
    body,
    credentials: "include" as const,
  }),
  invalidatesTags: ["HeldOrders"],
}),

createOrGetCustomer: builder.mutation<
  CreateOrGetCustomerResponse,
  {
    name: string;
    email?: string;
    phone?: string;
    street?: string;
    city?: string;
    country?: string;
    company?: string;
  }
>({
  query: (body) => ({
    url: "pos-customer",
    method: "POST",
    body,
    credentials: "include" as const,
  }),
  invalidatesTags: ["Customers"],
}),
  }),
});

export const {
  useOpenSessionMutation,
  useConfirmOpeningBalanceMutation,
  useCloseSessionMutation,
  useGetActiveSessionQuery,
  useGetSessionOrdersQuery,
  useGetSessionReportQuery,
  useLazyGetOrderReceiptPdfQuery,
  useStartCashierShiftMutation,
  usePauseCashierShiftMutation,
  useResumeCashierShiftMutation,
  useEndCashierShiftMutation,
  useGetActiveShiftsQuery,
  useCreateOdooInvoiceMutation,
  useCreateOrderMutation,
  useGetPosOrdersQuery,
  useGetPosOrderByIdQuery,
  useGetProductsQuery,
useGetHeldOrdersQuery,
  useGetCustomersQuery,

useCreateOrGetCustomerMutation,
  useGetPaymentMethodsQuery,
useHoldOrderMutation,
  useGetPOSConfigsQuery,
  useLazyGetHeldOrdersQuery
} = posApi;

export default posApi;
