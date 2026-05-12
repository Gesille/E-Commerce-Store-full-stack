"use client";

import { usePathname } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import POSSidebar from "./Possidebar";


const SidebarSwitcher = () => {
  const pathname = usePathname();
  const isPOS = pathname.startsWith("/POS");

  return isPOS ? <POSSidebar /> : <AppSidebar />;
};

export default SidebarSwitcher;