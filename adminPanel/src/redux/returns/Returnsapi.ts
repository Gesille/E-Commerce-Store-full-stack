import { apiSlice } from "../api/apiSlice";


export interface ReturnItem {
  productId: number;
  name: string;
  sku: string;
  unitPrice: number;
  taxRate: number;
  qtyReturned: number;
  refundSubtotal: number;
  refundTax: number;
  refundTotal: number;
}

export interface ReturnRecord {
  _id: string;
  returnNumber: string;
  receiptNumber: string;
  odooOrderId?: number;
  cashier: string;
  cashierId?: string;
  reason: string;
  items: ReturnItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  paymentMethod: string;
  status: "completed" | "pending" | "voided";
  voidedBy?: string;
  voidedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnStats {
  totalRefunded: number;
  totalReturns: number;
  totalItems: number;
  avgRefund: number;
  byReason: { _id: string; count: number; total: number }[];
  daily: { _id: string; count: number; total: number }[];
}


export interface ReceiptLookupItem {
  productId: number;
  name: string;
  sku: string;
  unitPrice: number;
  taxRate: number;
  qty: number;
  discount: number;
  subtotal: number;
}

export interface ReceiptLookup {
  odooOrderId: number;
  receiptNumber: string;
  date: string;
  cashier: string;
  session: string;
  paymentMethod: string;
  originalTotal: number;
  items: ReceiptLookupItem[];
}


export interface GetReturnsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "completed" | "pending" | "voided" | "";
  date_from?: string;
  date_to?: string;
}

export interface CreateReturnPayload {
  receiptNumber: string;
  odooOrderId?: number;
  cashier: string;
  cashierId?: string;
  reason: string;
  paymentMethod: string;
  notes?: string;
  items: {
    productId: number;
    name: string;
    sku?: string;
    unitPrice: number;
    taxRate?: number;
    qtyReturned: number;
  }[];
}

export interface VoidReturnPayload {
  id: string;
  voidedBy?: string;
  notes?: string;
}


export interface GetReturnsResponse {
  success: boolean;
  total: number;
  page: number;
  pages: number;
  stats: Pick<ReturnStats, "totalRefunded" | "totalReturns" | "totalItems">;
  returns: ReturnRecord[];
}

export interface GetReturnByIdResponse {
  success: boolean;
  return: ReturnRecord;
}

export interface GetReturnStatsResponse {
  success: boolean;
  stats: ReturnStats;
}

export interface ReceiptLookupResponse {
  success: boolean;
  receipt: ReceiptLookup;
}

export interface CreateReturnResponse {
  success: boolean;
  message: string;
  return: ReturnRecord;
}

export interface VoidReturnResponse {
  success: boolean;
  message: string;
  return: ReturnRecord;
}


export const returnsApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
  
    lookupReceipt: builder.query<ReceiptLookupResponse, string>({
      query: (receiptNumber) => ({
        url: "receipt-lookup",
        method: "GET",
        credentials: "include" as const,
        params: { receiptNumber },
      }),
    }),

    
    getReturns: builder.query<GetReturnsResponse, GetReturnsParams>({
      query: ({
        page = 1,
        limit = 20,
        search = "",
        status = "",
        date_from = "",
        date_to = "",
      }) => ({
        url: "returns",
        method: "GET",
        credentials: "include" as const,
        params: { page, limit, search, status, date_from, date_to },
      }),
      providesTags: ["Returns"],
    }),

  
    getReturnStats: builder.query<
      GetReturnStatsResponse,
      { date_from?: string; date_to?: string }
    >({
      query: ({ date_from = "", date_to = "" } = {}) => ({
        url: "returns/stats",
        method: "GET",
        credentials: "include" as const,
        params: { date_from, date_to },
      }),
      providesTags: ["Returns"],
    }),

  
    getReturnById: builder.query<GetReturnByIdResponse, string>({
      query: (id) => ({
        url: `returns/${id}`,
        method: "GET",
        credentials: "include" as const,
      }),
      providesTags: (_result, _error, id) => [{ type: "Returns", id }],
    }),


    createReturn: builder.mutation<CreateReturnResponse, CreateReturnPayload>({
      query: (body) => ({
        url: "returns",
        method: "POST",
        credentials: "include" as const,
        body,
      }),
      invalidatesTags: ["Returns"],
    }),

   
    voidReturn: builder.mutation<VoidReturnResponse, VoidReturnPayload>({
      query: ({ id, ...body }) => ({
        url: `returns/${id}/void`,
        method: "PATCH",
        credentials: "include" as const,
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "Returns",
        { type: "Returns", id },
      ],
    }),
  }),
});

export const {
  useLookupReceiptQuery,
  useLazyLookupReceiptQuery,
  useGetReturnsQuery,
  useGetReturnStatsQuery,
  useGetReturnByIdQuery,
  useCreateReturnMutation,
  useVoidReturnMutation,
} = returnsApi;
