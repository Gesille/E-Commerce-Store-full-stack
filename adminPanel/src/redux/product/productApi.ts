import { Product } from "@/app/(dashboard)/products/columns";
import { apiSlice } from "../api/apiSlice";

export const productApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAllProducts: builder.query<Product[], { categoryId?: number } | void>({
      query: (params) => ({
        url: params?.categoryId
          ? `get-all-product?categoryId=${params.categoryId}`
          : "get-all-product",
        method: "GET",
        credentials: "include" as const,
      }),
      providesTags: ["Products"],
      transformResponse: (response: { success: boolean; products: any[] }) =>
        response.products.map((p) => ({
          id: p.id,
          name: p.name,
          shortDescription: p.reference ?? "",
          description: p.name ?? "",
          price: p.price ?? 0,
          qty_available: p.stock ?? 0,
          image_1920: p.image ?? false,
          category: p.category ?? "",
          sizes: p.attributes?.sizes ?? [],
          colors: p.attributes?.colors ?? [],
          materials: p.attributes?.materials ?? [],
          barcode: p.barcode ?? "",
          supplierPrice: p.supplierPrice ?? 0,
          shippingCost: p.shippingCost ?? 0,
          currency: p.currency ?? "USD",
          finalPriceXCD: p.finalPriceXCD ?? 0,
         supplier: p.supplierName ?? "",
         supplierInvoiceNumber: p.supplierInvoiceNumber ?? "", 
supplierId: p.supplierId ?? "",
          location: p.location ?? null,
        })),
    }),

   updateProduct: builder.mutation({
  query: ({
    id,
    ...body
  }: {
    id: string | number;
    name: string;
    price: number;
    stock: number;
    reference?: string;
    barcode?: string;
    itemNumber?: string;          
    supplierPrice?: number;      
    shippingCost?: number;        
    currency?: string;            
    supplierId?: string;         
    supplierName?: string;         
    warehouseName?: string;      
    shelfName?: string;           
    image?: string | null;
    attributes: {
      colors: string[];
      sizes: string[];
      materials: string[];
    };
  }) => ({
    url: `update-product/${id}`,
    method: "POST",
    credentials: "include" as const,
    body,
  }),
  invalidatesTags: ["Products"],
}),

    deleteProduct: builder.mutation({
      query: (id: string | number) => ({
        url: `delete-product/${id}`,
        method: "DELETE",
        credentials: "include" as const,
      }),
      invalidatesTags: ["Products"],
    }),

    createProduct: builder.mutation({
      query: (body: {
        // Core identity
        name: string;
        reference: string;
        itemNumber?: string;
        barcode?: string;

        // Pricing
        price: number;
        supplierPrice?: number;
        shippingCost?: number;
        currency?: "USD" | "EUR";

        // Inventory
        stock: number;
        categoryId: number;

        // Location
        locationId?: number;
        warehouseId?: number;
        warehouseName?: string;
        shelfName?: string;

        // Supplier
        supplierId?: string;
        supplierName?: string;
supplier?: string;
        // Media & attributes
        image?: string;
        attributes: {
          colors: string[];
          sizes: string[];
          materials: string[];
        };
      }) => ({
        url: "create-product",
        method: "POST",
        credentials: "include" as const,
        body,
      }),
      invalidatesTags: ["Products"],
    }),

    getTopSellingProducts: builder.query({
      query: () => ({
        url: "dashboard/top-products",
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => res.topProducts,
    }),

    getLowStockAlerts: builder.query({
      query: (threshold = 5) => ({
        url: `low-stock?threshold=${threshold}`,
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (res: any) => res.products,
    }),

    getProductByBarcode: builder.query<any, string>({
      query: (code) => ({
        url: `barcode/${code}`,
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (response: { success: boolean; product: any }) =>
        response.product,
    }),
    // In productApi
getOdooLocations: builder.query<{ id: number; name: string; complete_name: string }[], void>({
  query: () => ({
    url: "location",
    method: "GET",
    credentials: "include" as const,
  }),
  transformResponse: (res: any) => res.locations,
}),
getProductHistory: builder.query<
  {
    lastRestock: { date: string; qty: number } | null;
    stockMoves: {
      date: string;
      qty: number;
      type: "restock" | "sale" | "return" | "adjustment";
      reference: string;
      from: string;
      to: string;
    }[];
    salesHistory: {
      date: string;
      orderId: string;
      qty: number;
      total: number;
    }[];
  },
  string | number
>({
  query: (id) => ({
    url: `product-history/${id}`,
    method: "GET",
    credentials: "include" as const,
  }),
}),
getLastRestockBatch: builder.query<
  Record<string, {date:string; qty:number}>,
  void
>({
  query: () => ({
    url: "last-restock-batch",
    method: "GET",
    credentials: "include" as const,
  }),
  transformResponse: (res:any) => res.data,
}),
  }),
});

export const {
  useGetAllProductsQuery,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCreateProductMutation,
  useGetLowStockAlertsQuery,
  useGetTopSellingProductsQuery,
  useLazyGetProductByBarcodeQuery,
  useGetOdooLocationsQuery,
  useLazyGetProductHistoryQuery
} = productApi;