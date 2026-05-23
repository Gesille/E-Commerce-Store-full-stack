/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { userLoggedIn } from "../auth/authSlice";


export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_SERVER_URL,
    credentials: 'include',
    
  }),
  tagTypes:["Products","Users","Orders","Categories","Customers","Returns","Inventory"],
  endpoints: (builder) => ({
    refreshToken: builder.query({
      query: (data) => ({
        url: "refresh-token",
        method: "GET",
        credentials: "include",
      }),
    }),
    loadUser: builder.query({
        query: (token) =>({
            url:"get-user-info",
            method:"GET",
            headers:{
              Authorization:`Bearer ${token}`
            },
            credentials: "include" ,
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
    })
  }),
});

export const { useRefreshTokenQuery,useLoadUserQuery } = apiSlice;
