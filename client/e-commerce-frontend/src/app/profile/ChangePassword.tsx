/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useUpdatePasswordMutation } from "@/redux/user/userApi";
import React, { useEffect, useState } from "react";

import { ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [updatePassword, { isSuccess, error ,isLoading}] = useUpdatePasswordMutation();


const passwordChangeHandler = async (e: any) => {
  e.preventDefault();

  if (newPassword !== confirmPassword) {
    toast.error("Passwords do not match");
    return;
  }

  try {
    console.log({ oldPassword, newPassword }); // 👈 DEBUG

    const res = await updatePassword({
      oldPassword,
      newPassword,
    }).unwrap();

    console.log("SUCCESS:", res);

    toast.success("Password changed successfully 🔐");

    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  } catch (err: any) {
    console.log("ERROR:", err);

    toast.error(err?.data?.message || "Something went wrong");
  }
};
   useEffect(() =>{
    if(isSuccess){
        toast.success("Password changed successfully");
    }
    if(error){
        if("data" in error){
            const errorData = error as any;
            toast.error(errorData.data.message);
        }
    }
  },[isSuccess,error])
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-10 bg-gradient-to-b from-gray-50 to-white">

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* LEFT SIDE */}
        <div className="lg:col-span-5 space-y-8">

          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">
              Secure your
              <span className="block text-blue-600">Account Access</span>
            </h1>

            <p className="text-gray-500 mt-4 leading-relaxed">
              Updating your password regularly helps protect your account and personal data from unauthorized access.
            </p>
          </div>

          {/* Tips Cards */}
          <div className="space-y-3">
            {[
              { title: "Use strong passwords", desc: "At least 12 characters recommended." },
              { title: "Avoid reuse", desc: "Don't use the same password elsewhere." },
              { title: "Mix characters", desc: "Use symbols, numbers, uppercase & lowercase." },
            ].map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-gray-100 hover:border-blue-200 transition shadow-sm"
              >
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-800">{tip.title}</h4>
                  <p className="text-sm text-gray-400">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* RIGHT SIDE */}
        <div className="lg:col-span-7">

          <div className="relative bg-white rounded-3xl p-10 border border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.06)] overflow-hidden">

            {/* soft background glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-100 blur-3xl opacity-50 rounded-full" />

            <form onSubmit={passwordChangeHandler} className="relative space-y-6">

              {/* header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-gray-900">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Change Password
                  </h2>
                  <p className="text-xs text-gray-400">
                    Secure authentication update
                  </p>
                </div>
              </div>

              {/* inputs */}
              {[
                { label: "Old Password", value: oldPassword, set: setOldPassword },
                { label: "New Password", value: newPassword, set: setNewPassword },
                { label: "Confirm Password", value: confirmPassword, set: setConfirmPassword },
              ].map((f, i) => (
                <div key={i} className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {f.label}
                  </label>

                  <input
                    type="password"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-transparent
                    focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                    outline-none transition text-gray-800"
                    placeholder="••••••••••"
                    required
                  />
                </div>
              ))}

              {/* button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-4 rounded-2xl font-semibold text-white
                bg-gradient-to-r from-gray-900 to-gray-800
                hover:from-blue-600 hover:to-blue-700
                transition-all duration-300 shadow-lg
                disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? "Updating..." : "Update Password"}
                <ShieldCheck className="w-5 h-5" />
              </button>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
}