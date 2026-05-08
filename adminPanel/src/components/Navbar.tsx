"use client";

import { LogOut, Moon, Settings, Sun, User } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import { SidebarTrigger } from "./ui/sidebar";
import { useSelector, useDispatch } from "react-redux";
import { userLoggedOut } from "@/redux/auth/authSlice";
import store from "@/redux/store";
import { useState, useEffect } from "react";

type RootState = ReturnType<typeof store.getState>;

const Navbar = () => {

  const { theme, setTheme } = useTheme();
  const dispatch = useDispatch();

  // 👇 read user from redux (AuthSync already populated this)
  const user = useSelector((state: RootState) => state.auth.user as any);


  const handleLogout = () => {
    // clear redux state
    dispatch(userLoggedOut());
    // clear the cookie by calling backend logout
    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/logout`, {
      method: "GET",
      credentials: "include",
    }).finally(() => {
      // redirect back to client
      window.location.href = process.env.NEXT_PUBLIC_CLIENT_URL!;
    });
  };
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);
const firstLetter = mounted
  ? user?.name?.charAt(0)?.toUpperCase() || "?"
  : "?";

  return (
    <nav className="p-4 flex items-center justify-between sticky top-0 bg-background z-10">
      {/* LEFT */}
      <SidebarTrigger />

      {/* RIGHT */}
      <div className="flex items-center gap-4">
        <Link href="/">Dashboard</Link>

        {/* THEME MENU */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
       
          </DropdownMenuContent>
        </DropdownMenu>

        {/* USER MENU */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar>
          
              <AvatarImage src={user?.avatar?.url || ""} />
              <AvatarFallback className="bg-gradient-to-r from-pink-500 to-violet-500 text-white font-bold">
                {firstLetter}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent sideOffset={10}>

            
            <DropdownMenuLabel className="flex flex-col">
              <span>{user?.name || "User"}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {user?.email || ""}
              </span>
              <span className="text-xs text-muted-foreground font-normal capitalize">
                {user?.role || ""}
              </span>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

           

            <DropdownMenuSeparator />

            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="h-[1.2rem] w-[1.2rem] mr-2" />
              Logout
            </DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

export default Navbar;