// src/redux/pos/posApi.ts

import { apiSlice } from "../api/apiSlice";

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
  configId: number;
  reason?: string;
}

export interface CreateOrderBody {
  cart: CartItem[];
  paymentLines: PaymentLine[];

  cashierId: string;
  configId: number;

  customerId?: number;
  note?: string;
}

export interface CreateCustomerBody {
  name: string;
  phone?: string;
  email?: string;
}

// ─────────────────────────────────────────────────────────────
// RESPONSES
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
// API
// ─────────────────────────────────────────────────────────────

export const posApi = apiSlice.injectEndpoints({
  overrideExisting: true,

  endpoints: (builder) => ({
    // ─────────────────────────────────────────
    // SESSION
    // ─────────────────────────────────────────

    openSession: builder.mutation<OpenSessionResponse, OpenSessionBody>({
      query: (body) => ({
        url: "/session/open",
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
        url: "/session/confirm-opening",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
    }),

    closeSession: builder.mutation<APIResponse, CloseSessionBody>({
      query: (body) => ({
        url: "/session/close",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
    }),

    getActiveSession: builder.query<ActiveSessionResponse, number>({
      query: (configId) => ({
        url: "/session/active",
        method: "GET",
        params: { configId },
        credentials: "include" as const,
      }),
    }),

    getSessionOrders: builder.query<SessionOrdersResponse, number>({
      query: (sessionId) => ({
        url: `/orders/${sessionId}`,
        method: "GET",
        credentials: "include" as const,
      }),
    }),

    getSessionReport: builder.query<SessionReportResponse, number>({
      query: (sessionId) => ({
        url: `/session/${sessionId}/report`,
        method: "GET",
        credentials: "include" as const,
      }),
    }),

    // ─────────────────────────────────────────
    // SHIFTS
    // ─────────────────────────────────────────

    startCashierShift: builder.mutation<APIResponse, CashierShiftBody>({
      query: (body) => ({
        url: "pos/shift/start",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
    }),

    pauseCashierShift: builder.mutation<APIResponse, CashierShiftBody>({
      query: (body) => ({
        url: "pos/shift/pause",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
    }),

    resumeCashierShift: builder.mutation<APIResponse, CashierShiftBody>({
      query: (body) => ({
        url: "pos/shift/resume",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
    }),

    endCashierShift: builder.mutation<APIResponse, CashierShiftBody>({
      query: (body) => ({
        url: "pos/shift/end",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
    }),

    getActiveShifts: builder.query<ActiveShiftsResponse, number>({
      query: (configId) => ({
        url: "pos/shift/active",
        method: "GET",
        params: { configId },
        credentials: "include" as const,
      }),
    }),

    // ─────────────────────────────────────────
    // ORDERS
    // ─────────────────────────────────────────

    createOrder: builder.mutation<CreateOrderResponse, CreateOrderBody>({
      query: (body) => ({
        url: "pos/order",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
    }),

    // ─────────────────────────────────────────
    // PRODUCTS
    // ─────────────────────────────────────────

    getProducts: builder.query<ProductsResponse, void>({
      query: () => ({
        url: "pos/products",
        method: "GET",
        credentials: "include" as const,
      }),
    }),

    // ─────────────────────────────────────────
    // CUSTOMERS
    // ─────────────────────────────────────────

    getCustomers: builder.query<CustomersResponse, string | void>({
      query: (search = "") => ({
        url: "pos/customers",
        method: "GET",
        params: search ? { search } : undefined,
        credentials: "include" as const,
      }),
    }),

    createCustomer: builder.mutation<APIResponse, CreateCustomerBody>({
      query: (body) => ({
        url: "pos/customers",
        method: "POST",
        body,
        credentials: "include" as const,
      }),
    }),

    // ─────────────────────────────────────────
    // PAYMENT METHODS
    // ─────────────────────────────────────────

    getPaymentMethods: builder.query<PaymentMethodsResponse, void>({
      query: () => ({
        url: "pos/payment-methods",
        method: "GET",
        credentials: "include" as const,
      }),
    }),

    // ─────────────────────────────────────────
    // POS CONFIGS
    // ─────────────────────────────────────────

    getPOSConfigs: builder.query<POSConfigsResponse, void>({
      query: () => ({
        url: "/configs",
        method: "GET",
        credentials: "include" as const,
      }),
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
