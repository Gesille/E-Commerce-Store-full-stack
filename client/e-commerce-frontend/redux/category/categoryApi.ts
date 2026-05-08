/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiSlice } from "../api/apiSlice";

export const categoryApi  = apiSlice.injectEndpoints({
 
  endpoints: (builder) => ({
getCategories: builder.query<any, void>({
  query: () => ({
    url: "getcategories",
    method: "GET",
    credentials: "include",
  }),
}),
  }),
});

export const { useGetCategoriesQuery } = categoryApi ;