// components/UserLoader.tsx
"use client";

import { useLoadUserQuery } from "@/redux/api/apiSlice";


export default function UserLoader() {
  // runs on every page load — cookie is sent automatically
  useLoadUserQuery(undefined, { refetchOnMountOrArgChange: true });
  return null;
}