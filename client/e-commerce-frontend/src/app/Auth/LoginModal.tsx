"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft } from "lucide-react";
import Image from "next/image";
import Login from "./login";
import Signup from "./register";
import Verification from "./verification";

type AuthView = "login" | "register" | "verification";

export default function LoginModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [authView, setAuthView] = useState<AuthView>("login");

  if (!isOpen) return null;

  const handleSetRoute = (route: string) => {
    setAuthView(route.toLowerCase() as AuthView);
  };

  const headings: Record<AuthView, { title: string; subtitle: string }> = {
    login: { title: "Welcome Back!", subtitle: "Ready to start cooking?" },
    register: { title: "Join Chef World", subtitle: "Create your account today" },
    verification: { title: "Check Your Email", subtitle: "Enter the code we sent you" },
  };

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          layout
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-gray-100 z-[10000]"
        >
          {/* Back button for register & verification */}
          {(authView === "register" || authView === "verification") && (
            <button
              onClick={() => setAuthView(authView === "verification" ? "register" : "login")}
              className="absolute top-7 left-8 flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-pink-500 transition-colors"
            >
              <ChevronLeft size={14} /> BACK
            </button>
          )}

          {/* Header */}
          <div className="p-8 pb-4 flex flex-col items-center">
            <div className="relative w-16 h-16 mb-4">
              <Image src="/chefworldlogo.png" alt="Logo" fill className="object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{headings[authView].title}</h2>
            <p className="text-gray-500 text-sm mt-1">{headings[authView].subtitle}</p>
          </div>

          {/* Body */}
          <div className="p-8 pt-2 space-y-5">
            {authView === "login" && (
              <Login setRoute={handleSetRoute} setOpen={onClose} />
            )}

            {authView === "register" && (
              <Signup setRoute={handleSetRoute} />
            )}

            {authView === "verification" && (
              <Verification setRoute={handleSetRoute} />
            )}

            {/* Toggle login/register — only show on login or register */}
            {authView !== "verification" && (
              <div className="text-center pt-2">
                <p className="text-sm text-gray-500 font-medium">
                  {authView === "login" ? "Don't have an account? " : "Already a member? "}
                  <button
                    type="button"
                    onClick={() => setAuthView(authView === "login" ? "register" : "login")}
                    className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-80 transition-opacity"
                  >
                    {authView === "login" ? "Create one" : "Sign In"}
                  </button>
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <X size={18} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}