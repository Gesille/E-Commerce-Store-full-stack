// redux/message/messageApi.ts
import { apiSlice } from "../api/apiSlice";

export const messageApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAllMessages: builder.query({
      query: () => ({
        url: "get-messages",
        method: "GET",
        credentials: "include" as const,
      }),
    }),
    markAsRead: builder.mutation({
      query: (id) => ({
        url: `mark-read/${id}`,
        method: "PUT",
        credentials: "include" as const,
      }),
    }),
    deleteMessage: builder.mutation({
      query: (id) => ({
        url: `delete-message/${id}`,
        method: "DELETE",
        credentials: "include" as const,
      }),
    }),
  }),
});

export const {
  useGetAllMessagesQuery,
  useMarkAsReadMutation,
  useDeleteMessageMutation,
} = messageApi;