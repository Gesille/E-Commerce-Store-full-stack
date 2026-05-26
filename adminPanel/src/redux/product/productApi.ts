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
          sizes: p.sizes ?? [],
          colors: p.colors ?? [],
          materials: p.materials ?? [],
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
        image?: string | null;
        colors: string[];
        sizes: string[];
        materials: string[];
      }) => ({
        url: `update-product/${id}`,
        method: "POST",
        credentials: "include" as const,
        body,
      }),
      invalidatesTags: ["Products"], // ✅ forces refetch after update
    }),

    deleteProduct: builder.mutation({
      query: (id: string | number) => ({
        url: `delete-product/${id}`,
        method: "DELETE",
        credentials: "include" as const,
      }),
      invalidatesTags: ["Products"], // ✅ forces refetch after delete
    }),
    createProduct: builder.mutation({
      query: (body: {
        name: string;
        reference: string;
        price: number;
        stock: number;
        categoryId: number;
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

    // productApi.ts
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
  }),
});

export const {
  useGetAllProductsQuery,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCreateProductMutation,
  useGetLowStockAlertsQuery,
  useGetTopSellingProductsQuery,
  useLazyGetProductByBarcodeQuery
} = productApi;
