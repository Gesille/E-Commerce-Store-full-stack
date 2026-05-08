"use client";

import { createContext, useContext, useState } from "react";

type AuthContextType = {
  loginOpen: boolean;
  setLoginOpen: (value: boolean) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <AuthContext.Provider value={{ loginOpen, setLoginOpen }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};