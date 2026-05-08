/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiSlice } from "../api/apiSlice";

export const orderApi = apiSlice.injectEndpoints({
      overrideExisting: true,
  endpoints: (builder) => ({
getPurchasedProducts: builder.query<any[], void>({
      query: () => ({
        url: "/purchased-products",
        method: "GET",
        credentials:"include" as const
      }),
     
    }),
    createOrder: builder.mutation({
      query: (body) => ({
        url: "create-order",
        method: "POST",
        body,
        credentials: "include",
      }),
    }),
  }),
});

export const { useGetPurchasedProductsQuery ,useCreateOrderMutation} = orderApi;