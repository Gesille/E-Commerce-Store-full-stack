import { apiSlice } from "../api/apiSlice";

export interface InventoryProduct {
  id: number;
  name: string;
  default_code: string | false;
  qty_available: number;
  virtual_available: number;
  list_price: number;
  standard_price: number;
}

export interface InventoryReportResponse {
  success: boolean;
  count: number;
  inventory: InventoryProduct[];
}

export const inventoryApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getInventoryReport: builder.query<InventoryProduct[], void>({
      query: () => ({
        url: "get-inventory",
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (response: InventoryReportResponse) =>
        response.inventory,
      providesTags: ["Products"],
    }),

    exportInventory: builder.query<Blob, "pdf" | "excel">({
      query: (format) => ({
        url: `inventory/export?format=${format}`,
        method: "GET",
        credentials: "include" as const,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const { useGetInventoryReportQuery, useLazyExportInventoryQuery } =
  inventoryApi;