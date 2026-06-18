"use client";
import {
  Home,
  Inbox,
  Calendar,
  Search,
  User2,
  ChevronUp,
  Plus,
  Projector,
  ChevronDown,
  Package,
  User,
  ShoppingBasket,
  ListOrdered,
  RotateCcw,
  Upload,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "./ui/sidebar";
import Link from "next/link";
import Image from "next/image";
import { DropdownMenu, DropdownMenuTrigger } from "./ui/dropdown-menu";

import { Sheet, SheetTrigger } from "./ui/sheet";
import { RootState } from "@/redux/store";

import AddCategory from "./AddCategory";
import AddProduct from "./AddProduct";
import { useSelector } from "react-redux";

import { useGetAllMessagesQuery } from "@/redux/contact/contactApi";

import ReturnOrder from "./ReturnOrders";
import CreateOrderForUser from "./CreateOrderForUser";
import AddUser from "./AddUser";
import { useState } from "react";
import { useGetOrdersByStatusQuery } from "@/redux/order/orderApi";
const clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL!;
const items = [
  {
    title: "Home",
    url: `${clientUrl}/`,
    icon: Home,
  },
  {
    title: "Inbox",
    url: "/inbox",
    icon: Inbox,
  },
  {
    title: "Orders",
    url: "/order",
    icon: Calendar,
  },

  {
    title: "POS",
    url: "/pos",
    icon: ListOrdered,
  },
];

const AppSidebar = () => {
  const user = useSelector((state: RootState) => state?.auth.user as any);
const [ordersOpen, setOrdersOpen] = useState(false);

const { data: pendingData } = useGetOrdersByStatusQuery("pending");
const { data: confirmedData } = useGetOrdersByStatusQuery("confirmed");
const { data: cancelledData } = useGetOrdersByStatusQuery("cancelled");

const pendingCount = pendingData?.orders?.length ?? 0;
const confirmedCount = confirmedData?.orders?.length ?? 0;
const cancelledCount = cancelledData?.orders?.length ?? 0;
  const { data: messagesData } = useGetAllMessagesQuery({});
  const unreadCount = messagesData?.unreadCount ?? 0;
  return (
    <Sidebar collapsible="icon" className="border-r bg-background">
      {/* HEADER */}
      {/* HEADER — keep logo, remove static name */}
      <SidebarHeader className="px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/chefworldlogo.png"
                  alt="logo"
                  width={26}
                  height={26}
                  className="rounded-md"
                />
                <span className="font-semibold text-sm">Chef's World</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />

      <SidebarContent className="px-1">
        {/* APPLICATION */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] text-muted-foreground px-2 mb-1">
            Application
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      href={item.url}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition"
                    >
                      <item.icon size={16} />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.title === "Inbox" && unreadCount > 0 && (
                    <SidebarMenuBadge className="bg-primary text-white text-[10px] px-1.5">
                      {unreadCount}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* PRODUCTS */}
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-[11px] text-muted-foreground px-2 mb-1">
            Products
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/products"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition"
                  >
                    <Package size={16} />
                    <span className="text-sm">All Products</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Sheet>
                  <SheetTrigger asChild>
                    <SidebarMenuButton className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition">
                      <Plus size={16} />
                      <span className="text-sm">Add Product</span>
                    </SidebarMenuButton>
                  </SheetTrigger>
                  <AddProduct />
                </Sheet>
              </SidebarMenuItem>
             
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/import"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition"
                  >
                    <Upload size={16} />
                    <span className="text-sm">Import Products</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Sheet>
                  <SheetTrigger asChild>
                    <SidebarMenuButton className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition">
                      <Plus size={16} />
                      <span className="text-sm">Add Category</span>
                    </SidebarMenuButton>
                  </SheetTrigger>
                  <AddCategory />
                </Sheet>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* USERS */}
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-[11px] text-muted-foreground px-2 mb-1">
            Users
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/users"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition"
                  >
                    <User size={16} />
                    <span className="text-sm">All Users</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Sheet>
                <SheetTrigger asChild>
                  <SidebarMenuButton className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition">
                    <Plus size={16} />
                    <span className="text-sm">Add Users</span>
                  </SidebarMenuButton>
                </SheetTrigger>
                <AddUser />
              </Sheet>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* ORDERS */}
      {/* ORDERS */}
<SidebarGroup className="mt-2">
  <SidebarGroupLabel className="text-[11px] text-muted-foreground px-2 mb-1">
    Orders
  </SidebarGroupLabel>

  <SidebarGroupContent>
    <SidebarMenu>
      {/* Add Order */}
      <Sheet>
        <SheetTrigger asChild>
          <SidebarMenuButton className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition">
            <Plus size={16} />
            <span className="text-sm">Add Orders</span>
          </SidebarMenuButton>
        </SheetTrigger>
        <CreateOrderForUser />
      </Sheet>

      {/* Return Order */}
      <Sheet>
        <SheetTrigger asChild>
          <SidebarMenuButton className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition">
            <RotateCcw size={16} />
            <span className="text-sm">Return Orders</span>
          </SidebarMenuButton>
        </SheetTrigger>
        <ReturnOrder />
      </Sheet>

      {/* All Orders collapsible */}
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => setOrdersOpen(!ordersOpen)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition"
        >
          <ListOrdered size={16} />
          <span className="text-sm">All Orders</span>
          <ChevronDown
            size={14}
            className={`ml-auto transition-transform ${ordersOpen ? "rotate-180" : ""}`}
          />
        </SidebarMenuButton>

        {ordersOpen && (
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <SidebarMenuSubButton asChild>
                <Link
                  href="/order?status=pending"
                  className="flex items-center justify-between px-2 py-1 text-sm"
                >
                  <span>Pending</span>
                  {pendingCount > 0 && (
                    <span className="text-[10px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full px-2 py-0.5 font-medium">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>

            <SidebarMenuSubItem>
              <SidebarMenuSubButton asChild>
                <Link
                  href="/order?status=confirmed"
                  className="flex items-center justify-between px-2 py-1 text-sm"
                >
                  <span>Confirmed</span>
                  {confirmedCount > 0 && (
                    <span className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full px-2 py-0.5 font-medium">
                      {confirmedCount}
                    </span>
                  )}
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>

            <SidebarMenuSubItem>
              <SidebarMenuSubButton asChild>
                <Link
                  href="/order?status=cancelled"
                  className="flex items-center justify-between px-2 py-1 text-sm"
                >
                  <span>Cancelled</span>
                  {cancelledCount > 0 && (
                    <span className="text-[10px] bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full px-2 py-0.5 font-medium">
                      {cancelledCount}
                    </span>
                  )}
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroupContent>
</SidebarGroup>
        {/* INVENTORY */}
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-[11px] text-muted-foreground px-2 mb-1">
            Inventory/Daily Report for Chef's World
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/inventory"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition"
                  >
                    <ShoppingBasket size={16} />
                    <span className="text-sm">Inventory</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/dailyReport"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition"
                  >
                    <ShoppingBasket size={16} />
                    <span className="text-sm">Daily Report </span>
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

export default AppSidebar;
