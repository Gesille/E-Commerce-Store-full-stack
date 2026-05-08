import { apiSlice } from "../api/apiSlice";

export const productApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: (categoryId?: string | number) => ({
        url: categoryId
          ? `get-all-product?categoryId=${categoryId}`
          : "get-all-product",
        method: "GET",
        credentials: "include",
      }),
    }),
     getProductById: builder.query({
      query: (id) => ({
        url: `get-product/${id}`,
        method: "GET",
        credentials: "include",
      }),
    }),
    
  }),
});

export const { useGetProductsQuery,useGetProductByIdQuery } = productApi;