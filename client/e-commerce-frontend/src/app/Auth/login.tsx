/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { FC, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Mail, Lock, ArrowRight } from "lucide-react";

import { useLoginUserMutation } from "@/redux/auth/authApi";
import { toast } from "react-toastify";
import { getSession } from "next-auth/react";

type Props = {
  setRoute: (route: string) => void;
  setOpen: (open: boolean) => void;
  refetch?: any;
};

const schema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid Email!")
    .required("Please enter your email!"),
  password: Yup.string()
    .required("Please enter your password!")
    .min(6),
});

const Login: FC<Props> = ({ setRoute, setOpen, refetch }) => {
  const [login, { isSuccess, error, isLoading }] = useLoginUserMutation();

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema: schema,
    onSubmit: async ({ email, password }) => {
      await login({email,password})
    },
  });

useEffect(() => {
  if (isSuccess) {
    toast.success("Login Successfully");
    setOpen(false);
    refetch?.();
  }
  if (error && "data" in error) {
    toast.error((error as any).data?.message || "Login failed");
  }
}, [isSuccess, error]);
const { errors, touched, values, handleChange, handleSubmit } = formik;
  return (
    
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* EMAIL */}
        <div>
          <span className="text-xs font-semibold text-gray-400 ml-1">
            Email Address
          </span>

          <div className="relative">
            <Mail
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />

            <input
              name="email"
              className="w-full bg-gray-50 border px-12 py-3.5 rounded-2xl"
              placeholder="Enter your email"
              value={values.email}
              onChange={handleChange}
            />
          </div>

          {formik.touched.email && formik.errors.email && (
            <p className="text-red-500 text-xs mt-1">
              {errors.email}
            </p>
          )}
        </div>

        {/* PASSWORD */}
        <div>
          <span className="text-xs font-semibold text-gray-400 ml-1">
            Password
          </span>

          <div className="relative">
            <Lock
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />

            <input
              name="password"
              type="password"
              className="w-full bg-gray-50 border px-12 py-3.5 rounded-2xl"
              placeholder="••••••••"
              value={values.password}
              onChange={handleChange}
            />
          </div>

          {touched.password && errors.password && (
            <p className="text-red-500 text-xs mt-1">
              {errors.password}
            </p>
          )}
        </div>

        {/* BUTTON */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-linear-to-r from-pink-500 to-violet-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
        >
          {isLoading ? "Loading..." : "Sign In"}
          <ArrowRight size={18} />
        </button>
      </form>
  
  );
};

export default Login;