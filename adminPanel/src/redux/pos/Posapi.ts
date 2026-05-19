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
    }),

    getProducts: builder.query<ProductsResponse, void>({
      query: () => ({
        url: "products",
        credentials: "include" as const,
      }),
    }),

    getCustomers: builder.query<CustomersResponse, string | void>({
      query: (search = "") => ({
        url: "get-customers",
        params: search ? { search } : undefined,
        credentials: "include" as const,
      }),
    }),

    createCustomer: builder.mutation<APIResponse, CreateCustomerBody>({
      query: (body) => ({
        url: "customers",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
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
  }),
});

export const {
  useOpenSessionMutation,
  useConfirmOpeningBalanceMutation,
  useCloseSessionMutation,
  useGetActiveSessionQuery,
  useGetSessionOrdersQuery,
  useGetSessionReportQuery,

  useStartCashierShiftMutation,
  usePauseCashierShiftMutation,
  useResumeCashierShiftMutation,
  useEndCashierShiftMutation,
  useGetActiveShiftsQuery,

  useCreateOrderMutation,

  useGetProductsQuery,

  useGetCustomersQuery,
  useCreateCustomerMutation,

  useGetPaymentMethodsQuery,

  useGetPOSConfigsQuery,
} = posApi;

export default posApi;
