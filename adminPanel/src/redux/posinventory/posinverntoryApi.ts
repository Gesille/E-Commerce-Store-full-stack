import { apiSlice } from "../api/apiSlice";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InventoryRange = "day" | "week" | "month";

export interface ProductRow {
  _id: string;
  name: string;
  reference: string;
  barcode: string;
  price: number;
  stock: number;
  image: string;
  odooProductId: number | null;
  sold: number;
  returned: number;
  netMovement: number;
  stockValue: number;
}

export interface DailyPoint {
  date: string;
  sold: number;
  returned: number;
  netQty: number;
  revenue: number;
}

export interface WeeklyRow {
  weekLabel: string;
  sold: number;
  returned: number;
  revenue: number;
}

export interface InventoryResponse {
  products: ProductRow[];
  daily: DailyPoint[];
  weekly: WeeklyRow[];
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

export interface MovementsResponse {
  movements: Movement[];
}

// ─── API slice ────────────────────────────────────────────────────────────────

export const posInventoryApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({

    // GET /api/pos/inventory?range=...
    getInventory: builder.query<InventoryResponse, { range: InventoryRange }>({
      query: ({ range }) => ({
        url: `pos/inventory?range=${range}`,
        method: "GET",
        credentials: "include" as const,
      }),
      providesTags: ["Inventory"],
    }),

    // GET /api/pos/inventory/summary
    getInventorySummary: builder.query<InventorySummary, void>({
      query: () => ({
        url: "pos/inventory/summary",
        method: "GET",
        credentials: "include" as const,
      }),
      providesTags: ["Inventory"],
    }),

    // GET /api/pos/inventory/movements?range=...&limit=...
    getInventoryMovements: builder.query<
      MovementsResponse,
      { range: InventoryRange; limit?: number }
    >({
      query: ({ range, limit = 100 }) => ({
        url: `pos/inventory/movements?range=${range}&limit=${limit}`,
        method: "GET",
        credentials: "include" as const,
      }),
      providesTags: ["Inventory"],
    }),

    // GET /api/pos/inventory/product/:productId/movements?range=...
    getProductMovements: builder.query<
      MovementsResponse,
      { productId: string; range: InventoryRange }
    >({
      query: ({ productId, range }) => ({
        url: `pos/inventory/product/${productId}/movements?range=${range}`,
        method: "GET",
        credentials: "include" as const,
      }),
    }),
  }),
});

export const {
  useGetInventoryQuery,
  useGetInventorySummaryQuery,
  useGetInventoryMovementsQuery,
  useLazyGetProductMovementsQuery,
} = posInventoryApi;