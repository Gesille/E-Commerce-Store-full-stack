// src/store/api/posApi.ts

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface Session {
  id: number;
  name: string;
  state: string;
  config_id?: [number, string];
  user_id?: [number, string];
  start_at?: string;
  cash_register_balance_start?: number;
}

export interface ShiftStateHistory {
  toState: "active" | "paused" | "closed";
  at: string;
  reason?: string;
}
export interface Shift {
  _id: string;
  odooSessionId: number;

  cashierId:
    | string
    | {
        _id: string;
        name: string;
        email?: string;
        role?: string;
      };

  odooPartnerId: number;
  state: "active" | "paused" | "closed";
  startTime: string;
  endTime?: string;
  totalOrders?: number;
  totalSales?: number;
  stateHistory: ShiftStateHistory[];
}

export interface CartItem {
  productId: number;
  qty: number;
  price: number;
  discount?: number;
}

export interface PaymentLine {
  method: "cash" | "card" | "wallet";
  amount: number;
}

export interface Product {
  id: number;
  name: string;
  list_price: number;
  barcode?: string;
  categ_id?: [number, string];
  uom_id?: [number, string];
  image_128?: string;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  street?: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  is_cash_count: boolean;
}

export interface POSConfig {
  id: number;
  name: string;
  currency_id?: [number, string];
}

export interface POSOrder {
  id?: string;
  sessionId?: number;
  shiftId?: string;
  cashierId?: string;
  customerId?: number;
  cart: CartItem[];
  paymentLines: PaymentLine[];
  subtotal: number;
  total: number;
  amountPaid: number;
  change: number;
  note?: string;
  status?: string;
  receiptNumber?: string;
}

// ─────────────────────────────────────────────────────────────
// REQUEST BODIES
// ─────────────────────────────────────────────────────────────

export interface OpenSessionBody {
  configId: number;
  cashierId: string;
}

export interface ConfirmOpeningBalanceBody {
  sessionId: number;
  cashierId: string;
  openingBalance: number;
}

export interface CloseSessionBody {
  sessionId: number;
}

export interface CashierShiftBody {
  cashierId: string;
  reason?: string;
}

export interface CreateOrderBody {
  cart: CartItem[];
  paymentLines: PaymentLine[];
  cashierId: string;
  customerId?: number;
  note?: string;
}

export interface CreateCustomerBody {
  name: string;
  phone?: string;
  email?: string;
}

// ─────────────────────────────────────────────────────────────
// RESPONSE TYPES
// ─────────────────────────────────────────────────────────────

export interface APIResponse {
  status?: string;
  success?: boolean;
  message?: string;
}

export interface ActiveSessionResponse extends APIResponse {
  session: Session | null;
  stats: {
    orderCount: number;
    totalRevenue: number;
  } | null;
  activeShifts: Shift[];
}

export interface OpenSessionResponse extends APIResponse {
  requiresOpeningBalance: boolean;
  session?: Session;
  sessionId?: number;
  activeShift?: Shift;
  state?: string;
}

export interface ConfirmOpeningBalanceResponse extends APIResponse {
  session: Session;
  activeShift: Shift;
  openingBalance: number;
}

export interface ActiveShiftsResponse extends APIResponse {
  count: number;
  shifts: Shift[];
}

export interface ProductsResponse extends APIResponse {
  count: number;
  products: Product[];
}

export interface CustomersResponse extends APIResponse {
  count: number;
  customers: Customer[];
}

export interface PaymentMethodsResponse extends APIResponse {
  methods: PaymentMethod[];
}

export interface POSConfigsResponse extends APIResponse {
  configs: POSConfig[];
}

export interface CreateOrderResponse extends APIResponse {
  orderId: number;
  mongoOrderId?: string | null;
  cashierShiftId: string;
}

export interface SessionOrdersResponse extends APIResponse {
  count: number;
  orders: any[];
}

export interface SessionReportResponse extends APIResponse {
  odooSessionId: number;
  summary: {
    totalOrders: number;
    totalSales: number;
    cashierCount: number;
  };
  cashierBreakdown: any[];
}

// ─────────────────────────────────────────────────────────────
// API SLICE
// ─────────────────────────────────────────────────────────────

export const posApi = createApi({
  reducerPath: "posApi",

  baseQuery: fetchBaseQuery({
    baseUrl: "/api/pos",

    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth?.token;

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),

  tagTypes: [
    "Session",
    "Shift",
    "Order",
    "Product",
    "Customer",
    "PaymentMethod",
    "POSConfig",
  ],

  endpoints: (builder) => ({
    // ─────────────────────────────────────────
    // SESSION
    // ─────────────────────────────────────────

    openSession: builder.mutation<
      OpenSessionResponse,
      OpenSessionBody
    >({
      query: (body) => ({
        url: "/session/open",
        method: "POST",
        body,
      }),

      invalidatesTags: ["Session", "Shift"],
    }),

    confirmOpeningBalance: builder.mutation<
      ConfirmOpeningBalanceResponse,
      ConfirmOpeningBalanceBody
    >({
      query: (body) => ({
        url: "/session/confirm-opening",
        method: "POST",
        body,
      }),

      invalidatesTags: ["Session", "Shift"],
    }),

    closeSession: builder.mutation<
      APIResponse,
      CloseSessionBody
    >({
      query: (body) => ({
        url: "/session/close",
        method: "POST",
        body,
      }),

      invalidatesTags: ["Session", "Shift", "Order"],
    }),

   getActiveSession: builder.query<
  ActiveSessionResponse,
  number
>({
  query: (configId) => ({
    url: "/session/active",
    params: { configId },
  }),

  providesTags: ["Session"],
}),
    // ─────────────────────────────────────────
    // SHIFTS
    // ─────────────────────────────────────────

    startCashierShift: builder.mutation<
      APIResponse,
      CashierShiftBody
    >({
      query: (body) => ({
        url: "/shift/start",
        method: "POST",
        body,
      }),

      invalidatesTags: ["Shift"],
    }),

    pauseCashierShift: builder.mutation<
      APIResponse,
      CashierShiftBody
    >({
      query: (body) => ({
        url: "/shift/pause",
        method: "POST",
        body,
      }),

      invalidatesTags: ["Shift"],
    }),

    resumeCashierShift: builder.mutation<
      APIResponse,
      CashierShiftBody
    >({
      query: (body) => ({
        url: "/shift/resume",
        method: "POST",
        body,
      }),

      invalidatesTags: ["Shift"],
    }),

    endCashierShift: builder.mutation<
      APIResponse,
      CashierShiftBody
    >({
      query: (body) => ({
        url: "/shift/end",
        method: "POST",
        body,
      }),

      invalidatesTags: ["Shift"],
    }),

    getActiveShifts: builder.query<
      ActiveShiftsResponse,
      void
    >({
      query: () => "/shift/active",

      providesTags: ["Shift"],
    }),

    // ─────────────────────────────────────────
    // ORDERS
    // ─────────────────────────────────────────

    createOrder: builder.mutation<
      CreateOrderResponse,
      CreateOrderBody
    >({
      query: (body) => ({
        url: "/order",
        method: "POST",
        body,
      }),

      invalidatesTags: ["Order", "Session"],
    }),

    getSessionOrders: builder.query<
      SessionOrdersResponse,
      number
    >({
      query: (sessionId) => `/orders/${sessionId}`,

      providesTags: (_result, _err, sessionId) => [
        { type: "Order", id: sessionId },
      ],
    }),

    getSessionReport: builder.query<
      SessionReportResponse,
      number
    >({
      query: (sessionId) =>
        `/session/${sessionId}/report`,

      providesTags: (_result, _err, sessionId) => [
        { type: "Session", id: `report-${sessionId}` },
      ],
    }),

    // ─────────────────────────────────────────
    // PRODUCTS
    // ─────────────────────────────────────────

    getProducts: builder.query<
      ProductsResponse,
      void
    >({
      query: () => "/products",

      providesTags: ["Product"],
    }),

    // ─────────────────────────────────────────
    // CUSTOMERS
    // ─────────────────────────────────────────

    getCustomers: builder.query<
      CustomersResponse,
      string | void
    >({
      query: (search = "") => ({
        url: "/customers",
        params: search ? { search } : undefined,
      }),

      providesTags: ["Customer"],
    }),

    createCustomer: builder.mutation<
      APIResponse,
      CreateCustomerBody
    >({
      query: (body) => ({
        url: "/customers",
        method: "POST",
        body,
      }),

      invalidatesTags: ["Customer"],
    }),

    // ─────────────────────────────────────────
    // PAYMENT METHODS
    // ─────────────────────────────────────────

    getPaymentMethods: builder.query<
      PaymentMethodsResponse,
      void
    >({
      query: () => "/payment-methods",

      providesTags: ["PaymentMethod"],
    }),

    // ─────────────────────────────────────────
    // POS CONFIGS
    // ─────────────────────────────────────────

    getPOSConfigs: builder.query<
      POSConfigsResponse,
      void
    >({
      query: () => "/configs",

      providesTags: ["POSConfig"],
    }),
  }),
});

// ─────────────────────────────────────────────────────────────
// EXPORT HOOKS
// ─────────────────────────────────────────────────────────────

export const {
  // SESSION
  useOpenSessionMutation,
  useConfirmOpeningBalanceMutation,
  useCloseSessionMutation,
  useGetActiveSessionQuery,
  useGetSessionOrdersQuery,
  useGetSessionReportQuery,

  // SHIFTS
  useStartCashierShiftMutation,
  usePauseCashierShiftMutation,
  useResumeCashierShiftMutation,
  useEndCashierShiftMutation,
  useGetActiveShiftsQuery,

  // ORDERS
  useCreateOrderMutation,

  // PRODUCTS
  useGetProductsQuery,

  // CUSTOMERS
  useGetCustomersQuery,
  useCreateCustomerMutation,

  // PAYMENT METHODS
  useGetPaymentMethodsQuery,

  // CONFIGS
  useGetPOSConfigsQuery,
} = posApi;

export default posApi;