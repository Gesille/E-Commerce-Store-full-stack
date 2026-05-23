import { apiSlice } from "../api/apiSlice";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InventoryRange = "day" | "week" | "month";

export interface ProductRow {
  _id: string;
  name: string;
  reference: string;
  barcode?: string;
  price: number;
  stock: number;
  image?: string;
  odooProductId: number;
  sold: number;
  returned: number;
  netMovement: number;
  stockValue: number;
}

export interface DailyMovement {
  date: string;
  sold: number;
  returned: number;
  netQty: number;
  revenue: number;
}

export interface WeeklySummary {
  weekLabel: string;
  sold: number;
  returned: number;
  revenue: number;
}

export interface InventorySummary {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  soldToday: number;
  returnedToday: number;
  revenueToday: number;
}

export interface Movement {
  _id: string;
  type: "sale" | "return";
  productName: string;
  qty: number;
  price: number;
  cashier: string;
  receiptNumber: string;
  date: string;
}

// ─── Query param shapes ───────────────────────────────────────────────────────

export interface GetInventoryParams {
  range?: InventoryRange;
}

export interface GetMovementsParams {
  range?: InventoryRange;
  limit?: number;
}

export interface GetProductMovementsParams {
  productId: string;
  range?: InventoryRange;
}

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface GetInventoryResponse {
  products: ProductRow[];
  daily: DailyMovement[];
  weekly: WeeklySummary[];
}

export interface GetInventorySummaryResponse extends InventorySummary {}

export interface GetMovementsResponse {
  movements: Movement[];
}

export interface GetProductMovementsResponse {
  movements: Movement[];
}

// ─── API slice ────────────────────────────────────────────────────────────────

export const inventoryApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({

    // GET /inventory?range=
    getInventory: builder.query<GetInventoryResponse, GetInventoryParams>({
      query: ({ range = "week" } = {}) => ({
        url: "inventory",
        method: "GET",
        credentials: "include" as const,
        params: { range },
      }),
      providesTags: ["Inventory"],
    }),

    // GET /inventory/summary
    getInventorySummary: builder.query<GetInventorySummaryResponse, void>({
      query: () => ({
        url: "inventory/summary",
        method: "GET",
        credentials: "include" as const,
      }),
      providesTags: ["Inventory"],
    }),

    // GET /inventory/movements?range=&limit=
    getInventoryMovements: builder.query<GetMovementsResponse, GetMovementsParams>({
      query: ({ range = "week", limit = 50 } = {}) => ({
        url: "inventory/movements",
        method: "GET",
        credentials: "include" as const,
        params: { range, limit },
      }),
      providesTags: ["Inventory"],
    }),

    // GET /inventory/product/:productId/movements?range=
    getProductMovements: builder.query<GetProductMovementsResponse, GetProductMovementsParams>({
      query: ({ productId, range = "week" }) => ({
        url: `inventory/product/${productId}/movements`,
        method: "GET",
        credentials: "include" as const,
        params: { range },
      }),
      providesTags: (_result, _error, { productId }) => [
        { type: "Inventory", id: productId },
      ],
    }),
  }),
});

export const {
  useGetInventoryQuery,
  useGetInventorySummaryQuery,
  useGetInventoryMovementsQuery,
  useGetProductMovementsQuery,
  useLazyGetProductMovementsQuery,
} = inventoryApi;