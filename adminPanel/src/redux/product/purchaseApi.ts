import { apiSlice } from "../api/apiSlice";

export interface POLine {
  productId: number;
  qty: number;
  unitPrice: number;
}

export interface CreatePOPayload {
  supplierId: number;
  lines: POLine[];
  expectedDate?: string;
  notes?: string;
}

export interface PurchaseOrder {
  id: number;
  name: string;
  supplier: string;
  supplierId: number;
  state: "draft" | "sent" | "purchase" | "done" | "cancel";
  total: number;
  date: string;
  notes: string;
  pickingIds: number[];
  lines: {
    productId: number;
    productName: string;
    orderedQty: number;
    receivedQty: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

export const purchaseApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({

    getSuppliers: builder.query<{ id: number; name: string }[], void>({
      query: () => ({ url: "purchase-orders/suppliers", method: "GET", credentials: "include" as const }),
      transformResponse: (res: any) => res.suppliers,
    }),

    getProductsForPO: builder.query<{ id: number; name: string }[], void>({
      query: () => ({ url: "purchase-orders/products", method: "GET", credentials: "include" as const }),
      transformResponse: (res: any) => res.products,
      providesTags: ["Products"], 
    }),

    getPurchaseOrders: builder.query<PurchaseOrder[], { supplierId?: number; state?: string } | void>({
      query: (params) => {
        const qs = new URLSearchParams();
        if (params?.supplierId) qs.set("supplierId", String(params.supplierId));
        if (params?.state) qs.set("state", params.state);
        return { url: `purchase-orders${qs.toString() ? `?${qs}` : ""}`, method: "GET", credentials: "include" as const };
      },
      transformResponse: (res: any) => res.purchaseOrders,
      providesTags: ["PurchaseOrders"],
    }),

    createPurchaseOrder: builder.mutation<any, CreatePOPayload>({
      query: (body) => ({ url: "purchase-orders", method: "POST", credentials: "include" as const, body }),
      invalidatesTags: ["PurchaseOrders"],
    }),

    confirmPurchaseOrder: builder.mutation<any, number>({
      query: (id) => ({ url: `purchase-orders/confirm/${id}`, method: "POST", credentials: "include" as const }),
      invalidatesTags: ["PurchaseOrders"],
    }),

    receivePurchaseOrder: builder.mutation<any, number>({
      query: (pickingId) => ({ url: `purchase-orders/receive/${pickingId}`, method: "POST", credentials: "include" as const }),
      invalidatesTags: ["PurchaseOrders", "Products"],
    }),

  }),
});

export const {
  useGetSuppliersQuery,
  useGetProductsForPOQuery,
  useGetPurchaseOrdersQuery,
  useCreatePurchaseOrderMutation,
  useConfirmPurchaseOrderMutation,
  useReceivePurchaseOrderMutation,
} = purchaseApi;