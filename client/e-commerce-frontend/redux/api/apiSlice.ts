/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { userLoggedIn } from "../auth/authSlice";


// apiSlice.ts
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_SERVER_URL,
    credentials: "include",
  }),
   tagTypes:["Products","Users","Orders","Categories","Customers","Returns","Inventory","HeldOrders",
    "CashCount","MonthlyReport","DailyReport","Taxes","PurchaseOrders","Suppliers","TaxReports","TaxExemptCustomers","TaxSettings",
  "TaxHolidays"],
  endpoints: (builder) => ({
    refreshToken: builder.query({
      query: () => ({
        url: "refresh-token",
        method: "GET",
      }),
    }),

    loadUser: builder.query({
      query: () => ({          // ✅ no token argument needed
        url: "get-user-info",
        method: "GET",         // cookie is sent automatically via credentials: "include"
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        try {
          const result = await queryFulfilled;
          dispatch(
            userLoggedIn({
              accessToken: result.data.accessToken,
              user: result.data.user,
            })
          );
        } catch (error: any) {
          console.log(error);
        }
      },
    }),
  }),
});

export const { useRefreshTokenQuery, useLoadUserQuery } = apiSlice;

