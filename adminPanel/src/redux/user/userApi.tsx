import { apiSlice } from "../api/apiSlice";

export type UserRole = "admin" | "user" | "cashier";
type Address = {
  street?: string;
  city?: string;
  country?: string;
  zip?: string;
};
export type User = {
  phone: string;
  
    address?: Address; 
  city: string;
  _id: string;
  name: string;
  email: string;
  avatar?: { url: string };
  role: UserRole;
  isVerified?: boolean;
  createdAt?: string;
};
export type UpdateUserBody = {
  id: string;
  role?: UserRole;
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
};

export const userApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAllUsers: builder.query<User[], void>({
      query: () => ({
        url: "get-users",
        method: "GET",
        credentials: "include" as const,
      }),
      transformResponse: (response: { users: User[] }) => response.users,
      providesTags: ["Users"],
    }),
     updateUser: builder.mutation<void, UpdateUserBody>({
      query: (body) => ({
        url: "update-user",
        method: "PUT",
        credentials: "include" as const,
        body,
      }),
      invalidatesTags: ["Users"],
    }),

    updateUserRole: builder.mutation({
      query: (body: { id: string; role: UserRole }) => ({
        url: "update-user",
        method: "PUT",
        credentials: "include" as const,
        body,
      }),
      invalidatesTags: ["Users"],
    }),

    deleteUser: builder.mutation({
      query: (id: string) => ({
        url: `delete-user/${id}`,
        method: "DELETE",
        credentials: "include" as const,
      }),
      invalidatesTags: ["Users"],
    }),
 getTopSpenders: builder.query<any, void>({
  query: () => ({
    url: "/user/top-spenders",
    method: "GET",
    credentials: "include",
  }),
}),
 getMostActiveUsers: builder.query({
  query: () => ({
    url: "/user/most-active-users",
    method: "GET",
    credentials: "include" as const,
  }),
  transformResponse: (res: any) => res.users,
}),
   getRecentUsers: builder.query({
  query: () => ({
    url: "/user/recent-users",
    method: "GET",
    credentials: "include" as const,
  }),
  transformResponse: (res: any) => res.users,
}),
    getRegistrationsPerMonth: builder.query({
  query: () => ({
    url: "user/registrations-per-month",
    method: "GET",
    credentials: "include" as const,
  }),
  transformResponse: (res: any) => res.data,
}),
getUserActivity: builder.query({
  query: (id: string) => ({
    url: `user/${id}/activity`,
    method: "GET",
    credentials: "include",
  }),
  transformResponse: (res: any) => res.data,
}),
managerRegisterUser: builder.mutation({
  query: (data) => ({
    url: "manager-register-user",
    method: "POST",
    body: data,
  }),
  invalidatesTags: ["Users"],
}),
  }),
});

export const {
  useGetAllUsersQuery,
  useUpdateUserRoleMutation,
  useDeleteUserMutation,
  useGetMostActiveUsersQuery,
  useGetRecentUsersQuery,
  useGetTopSpendersQuery,
  useGetRegistrationsPerMonthQuery,
  useGetUserActivityQuery,
  useUpdateUserMutation,
  useManagerRegisterUserMutation
} = userApi;