// admin-panel/src/components/AuthSync.tsx
"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { userLoggedIn } from "@/redux/auth/authSlice";
import { useRouter } from "next/navigation";

const AuthSync = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  useEffect(() => {
    // Cookie is sent automatically — no token in URL needed
    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/get-user-info`, {
      credentials: "include", // sends the httpOnly cookie
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          dispatch(
            userLoggedIn({
              accessToken: data.accessToken,
              user: data.user,
            })
          );
        } else {
          window.location.href = process.env.NEXT_PUBLIC_CLIENT_URL!;
        }
      })
      .catch(() => {
        window.location.href = process.env.NEXT_PUBLIC_CLIENT_URL!;
      });
  }, []);

  return null;
};

export default AuthSync;