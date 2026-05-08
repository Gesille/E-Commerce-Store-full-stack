/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { FC, useEffect, useState } from "react";
import { ArrowRight, Mail, User, Lock } from "lucide-react";
import * as Yup from "yup";
import { useRegisterUserMutation } from "@/redux/auth/authApi";
import { toast } from "react-hot-toast"; // ← use react-hot-toast consistently
import { useFormik } from "formik";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/redux/auth/authSlice";

type Props = {
  setRoute: (route: string) => void;
};

const schema = Yup.object().shape({
  name: Yup.string().required("Please enter your name!"),
  email: Yup.string().email("Invalid Email!").required("Please enter your email!"),
  password: Yup.string().min(6, "Min 6 characters").required("Please enter your password!"),
});

const Signup: FC<Props> = ({ setRoute }) => {
  const [show, setShow] = useState(false);
   const dispatch = useDispatch();
  const [register, { data, error, isSuccess }] = useRegisterUserMutation();

  useEffect(() => {
   if (isSuccess) {
    dispatch(setCredentials({ token: data?.activationToken })); // ✅ matches backend response
    toast.success(data?.message || "Registration successful!");
    setRoute("Verification");
  }
    if (error && "data" in error) {
      toast.error((error as any).data.message);
    }
  }, [isSuccess, error]);

  const formik = useFormik({
    initialValues: { name: "", email: "", password: "" },
    validationSchema: schema,
    onSubmit: async (values) => {
      await register(values);
    },
  });

  const { errors, touched, values, handleChange, handleSubmit, isSubmitting } = formik;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block" htmlFor="name">
          Your Name
        </label>
        <div className="relative group">
          <User
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-colors"
            size={18}
          />
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Your Name"
            value={values.name}
            onChange={handleChange}
            className={`w-full bg-gray-50 border px-12 py-3.5 rounded-2xl outline-none transition-all text-sm font-medium
              ${errors.name && touched.name ? "border-red-400" : "border-gray-200 focus:border-pink-300"}`}
          />
        </div>
        {errors.name && touched.name && (
          <span className="text-red-500 text-xs pt-1 block">{errors.name}</span>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block" htmlFor="email">
          Email Address
        </label>
        <div className="relative group">
          <Mail
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-colors"
            size={18}
          />
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={values.email}
            onChange={handleChange}
            className={`w-full bg-gray-50 border px-12 py-3.5 rounded-2xl outline-none transition-all text-sm font-medium
              ${errors.email && touched.email ? "border-red-400" : "border-gray-200 focus:border-pink-300"}`}
          />
        </div>
        {errors.email && touched.email && (
          <span className="text-red-500 text-xs pt-1 block">{errors.email}</span>
        )}
      </div>

      {/* Password — ✅ relative wrapper added so eye icon positions correctly */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block" htmlFor="password">
          Password
        </label>
        <div className="relative group">
          <Lock
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-violet-500 transition-colors"
            size={18}
          />
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            placeholder="Min. 6 characters"
            value={values.password}
            onChange={handleChange}
            className={`w-full bg-gray-50 border px-12 py-3.5 rounded-2xl outline-none transition-all text-sm font-medium
              ${errors.password && touched.password ? "border-red-400" : "border-gray-200 focus:border-violet-300"}`}
          />
          {/* ✅ eye icon now inside the relative div */}
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-violet-500 transition-colors"
          >
            {show ? <AiOutlineEye size={20} /> : <AiOutlineEyeInvisible size={20} />}
          </button>
        </div>
        {errors.password && touched.password && (
          <span className="text-red-500 text-xs pt-1 block">{errors.password}</span>
        )}
      </div>

      {/* Submit — ✅ removed duplicate footer toggle (it lives in the modal) */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full mt-2 bg-gradient-to-r from-pink-500 to-violet-500 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-pink-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {isSubmitting ? "Creating account..." : "Get Started"}
        <ArrowRight size={18} />
      </button>
    </form>
  );
};

export default Signup;