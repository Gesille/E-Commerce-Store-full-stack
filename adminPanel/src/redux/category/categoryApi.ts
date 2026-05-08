// redux/category/categoryApi.ts
import { apiSlice } from "../api/apiSlice";

export type Category = {
  catTitle: string;
  catDesc?: string;
  odooCategoryId: number;
  source: string;
};

export const categoryApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getCategories: builder.query<Category[], void>({
      query: () => ({
        url: "getcategories",
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (response: { count: number; categories: Category[] }) =>
        response.categories,
    }),
    createCategory: builder.mutation({
      query: (body: { catTitle: string; catDesc: string }) => ({
        url: "create-category",
        method: "POST",
        credentials: "include" as const,
        body,
      }),
      invalidatesTags: ["Categories"], // ✅ auto-refetch after create
    }),
     updateCategory: builder.mutation({
      query: ({ id, ...body }: { id: string; catTitle?: string; catDesc?: string }) => ({
        url: `update-category/${id}`,
        method: "PUT",
        credentials: "include" as const,
        body,
      }),
      invalidatesTags: ["Categories"],
    }),
 
    deleteCategory: builder.mutation({
      query: (id: string) => ({
        url: `delete-category/${id}`,
        method: "DELETE",
        credentials: "include" as const,
      }),
      invalidatesTags: ["Categories"],
    }),
  }),
});

export const { useGetCategoriesQuery,useCreateCategoryMutation,useDeleteCategoryMutation,useUpdateCategoryMutation } = categoryApi;