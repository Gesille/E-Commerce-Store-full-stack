// components/LoginModalWrapper.tsx
"use client"; // ضروري جداً هنا


import { useAuth } from "@/context/AuthContex";
import LoginModal from "../app/Auth/LoginModal";


export default function LoginModalWrapper() {
 const { loginOpen, setLoginOpen } = useAuth();


  
  return (
    <LoginModal 
      isOpen={loginOpen} 
      onClose={() => setLoginOpen(false)} 
    />
  );
}