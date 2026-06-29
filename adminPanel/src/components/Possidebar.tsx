"use client";

import {
 
  ClipboardList,
  LayoutDashboard,
  RotateCcw,
  
  ArrowLeftFromLine,
  User2,
  Receipt,

  ScanBarcode,
  BookDashed,
  TicketCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "./ui/sidebar";
import Link from "next/link";
import Image from "next/image";
import { DropdownMenu, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const POSSidebar = () => {
  const user = useSelector((state: RootState) => state?.auth.user as any);
  const pathname = usePathname();

  const navItem = (href: string, icon: React.ReactNode, label: string) => {
    const active = pathname === href;
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link
            href={href}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md transition",
              active
                ? "bg-muted font-medium text-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {icon}
            <span className="text-sm">{label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r bg-background">
      {/* HEADER */}
      <SidebarHeader className="px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/pos" className="flex items-center gap-2">
                <Image
                  src="/chefworldlogo.png"
                  alt="logo"
                  width={26}
                  height={26}
                  className="rounded-md"
                />
                <span className="font-semibold text-sm">POS System</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="px-1">
        {/* MAIN */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] text-muted-foreground px-2 mb-1">
            Point of Sale
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItem("/pos", <LayoutDashboard size={16} />, "Dashboard")}
              {navItem("/pos/cashier", <ScanBarcode size={16} />, "Cashier")}
              {navItem("/pos/orders", <ClipboardList size={16} />, "POS Orders")}
              {navItem("/pos/receipts", <Receipt size={16} />, "Receipts")}
              {navItem("/pos/returns", <RotateCcw size={16} />, "Returns")}
              {navItem("/pos/POSReport", <BookDashed size={16} />, "POSReport")}
              

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

       

       

        {/* BACK TO ADMIN */}
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-[11px] text-muted-foreground px-2 mb-1">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition text-muted-foreground"
                  >
                    <ArrowLeftFromLine size={16} />
                    <span className="text-sm">Back to Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter className="p-2 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted">
              <User2 size={16} />
              <Link
                href={user?._id ? `/users/${user._id}` : "#"}
                className="text-sm"
              >
                {user?.name || "Account"}
              </Link>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default POSSidebar;