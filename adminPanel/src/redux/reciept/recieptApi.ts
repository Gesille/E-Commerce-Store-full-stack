import { apiSlice } from "../api/apiSlice";

// ── Types ───────────────────────────────────────────────────────────────

export interface Receipt {
  id: number;
  name: string;
  pos_reference: string;
  date_order: string;
  partner_id: [number, string] | false;
  user_id: [number, string];
  config_id: [number, string];
  session_id: [number, string];
  amount_total: number;
  amount_tax: number;
  amount_paid: number;
  amount_return: number;
  state: string;
  payment_ids?: number[];
}

export interface ReceiptLine {
  product_id: [number, string];
  qty: number;
  price_unit: number;
  price_subtotal: number;
  price_subtotal_incl: number;
  discount: number;
  tax_ids: number[];
  note?: string;
}

export interface ReceiptPayment {
  payment_method_id: [number, string];
  amount: number;
  payment_date: string;
}

export interface ReceiptsResponse {
  success: boolean;
  receipts: Receipt[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReceiptDetailsResponse {
  success: boolean;
  receipt: {
    order: Receipt & {
      amount_untaxed: number;
      lines: number[];
      note?: string;
    };
    lines: ReceiptLine[];
    payments: ReceiptPayment[];
  };
}

// ── Query Params ───────────────────────────────────────────────────────

export interface GetReceiptsParams {
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  state?: string;
}

export const receiptsApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getReceipts: builder.query<ReceiptsResponse, GetReceiptsParams>({
      query: ({
        page = 1,
        limit = 20,
        search = "",
        dateFrom = "",
        dateTo = "",
        state = "",
      }) => ({
        url: "/get-all-receipts-all",
        method: "GET",
        credentials: "include" as const,
        params: {
          page,
          limit,
          search,
          dateFrom,
          dateTo,
          state,
        },
      }),
    }),

    getReceiptById: builder.query<ReceiptDetailsResponse, number>({
      query: (receiptId) => ({
        url: `/get-receipt/${receiptId}`,
        method: "GET",
        credentials: "include" as const,
      }),
    }),
  }),
});


export const { useGetReceiptsQuery, useGetReceiptByIdQuery } = receiptsApi;
