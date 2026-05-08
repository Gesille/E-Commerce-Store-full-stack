/* eslint-disable @typescript-eslint/no-explicit-any */
import { act } from "react";
import { apiSlice } from "../api/apiSlice";
import { userLoggedIn, userLoggedOut, userRegistration } from "./authSlice";
import { log } from "console";

type RegistrationResponse = {
  message: string;
  activationToken: string;
};

type RegistrationData = {
  name: string;
  email: string;
  password: string;
};
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  const baseQuery = apiSlice.injectEndpoints; // not needed, handled in apiSlice

  let result = await (apiSlice as any).baseQuery(args, api, extraOptions);

  if (result?.error?.status === 401) {
    // try to get a new access token
    const refreshResult = await (apiSlice as any).baseQuery(
      { url: "refresh-token", method: "GET" },
      api,
      extraOptions
    );

    if (refreshResult?.data) {
      const newToken = (refreshResult.data as any).accessToken;
      api.dispatch(userLoggedIn({ accessToken: newToken, user: api.getState().auth.user }));
      // retry original request with new token
      result = await (apiSlice as any).baseQuery(args, api, extraOptions);
    } else {
      api.dispatch(userLoggedOut());
    }
  }

  return result;
};
export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    registerUser: builder.mutation<RegistrationResponse, RegistrationData>({
      query: (data) => ({
        url: "registration",
        method: "POST",
        body: data,
        credentials: "include" as const,
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        try {
          const result = await queryFulfilled;
          dispatch(
            userRegistration({
              token: result.data.activationToken,
            }),
          );
        } catch (error: any) {
          console.log(error);
        }
      },
    }),
    activateUser: builder.mutation({
      query: ({activation_code, activation_token}) => ({
        url: "activation",
        method: "POST",
        body: { activation_code, activation_token  },
      }),
    }),

    loginUser: builder.mutation({
      query: (data) => ({
        url: "login",
        method: "POST",
        body: {
          email: data.email,
          password: data.password,
        },
        credentials: "include" as const,
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        try {
          const result = await queryFulfilled;
          dispatch(
            userLoggedIn({
              accessToken: result.data.accessToken,
              user: result.data.user,
            }),
          );
        } catch (error: any) {
          console.log(error);
        }
      },
    }),
    socialAuth: builder.mutation({
      query: ({ email, name, avatar }) => ({
        url: "social-auth",
        method: "POST",
        body: {
          email,
          name,
          avatar,
        },
        credentials: "include" as const,
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
        } catch (error) {
          console.log(error);
        }
      },
    }),
       logOut: builder.query({
      query: () => ({
        url: "logout",
        method: "GET",
        credentials: "include" as const,
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        try {
          dispatch(
            userLoggedOut()
          );
        } catch (error) {
          console.log(error);
        }
      },
    }),
  }),
});

export const { useLogOutQuery,useSocialAuthMutation,useRegisterUserMutation, useActivateUserMutation, useLoginUserMutation } =authApi;
