"use client";

import {
  ShoppingCart,
  BarChart2,
  ClipboardList,
  RotateCcw,
  Package,
  ArrowLeftFromLine,
  User2,
  Receipt,
  Wallet,
  ScanBarcode,
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

const POSSidebar = () => {
  const user = useSelector((state: RootState) => state?.auth.user as any);

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

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/cashier"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition"
                  >
                    <ScanBarcode size={16} />
                    <span className="text-sm">Cashier</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/pos/orders"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition"
                  >
                    <ClipboardList size={16} />
                    <span className="text-sm">POS Orders</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/pos/receipts"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition"
                  >
                    <Receipt size={16} />
                    <span className="text-sm">Receipts</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/pos/returns"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition"
                  >
                    <RotateCcw size={16} />
                    <span className="text-sm">Returns</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* REPORTS */}
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-[11px] text-muted-foreground px-2 mb-1">
            Reports
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/pos/reports/sales"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition"
                  >
                    <BarChart2 size={16} />
                    <span className="text-sm">Sales Report</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/pos/reports/payments"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition"
                  >
                    <Wallet size={16} />
                    <span className="text-sm">Payments</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* INVENTORY */}
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-[11px] text-muted-foreground px-2 mb-1">
            Inventory
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/pos/products"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition"
                  >
                    <Package size={16} />
                    <span className="text-sm">Products</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

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