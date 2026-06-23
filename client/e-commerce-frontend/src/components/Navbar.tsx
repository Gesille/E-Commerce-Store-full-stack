/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Bell } from "lucide-react";
import SearchBar from "./SearchBar";
import ShoppingCartIcon from "./ShoppingCartIcon";
import { useSelector, useDispatch } from "react-redux";
import store from "@/redux/store";
import { userLoggedOut } from "@/redux/auth/authSlice";
import { useAuth } from "@/context/AuthContex";


type NavLink = {
  name: string;
  path: string;
};

const Navbar = () => {
  const token = useSelector((state: RootState) => state.auth.token);
const adminUrl = process.env.NEXT_PUBLIC_ADMIN_PANEL_URL!;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
type RootState = ReturnType<typeof store.getState>;

const user = useSelector(
  (state: RootState) => state.auth.user as any
);
const dispatch = useDispatch();
const { setLoginOpen } = useAuth(); // only modal
  const pathname = usePathname();

  const navLinks: NavLink[] = [
    { name: "home", path: "/" },
  
    { name: "categories", path: "/categories" },
    { name: "about", path: "/about" },
    { name: "contact", path: "/contact" },
    { name: "Terms / Policy", path: "/policy" },
  ];
  const logout = () => {
  dispatch(userLoggedOut());
};

  const firstLetter = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">

        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/chefworldlogo.png" width={180} height={45} alt="logo" />
        </Link>

        {/* NAV LINKS */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((item) => {
            const active =
              item.path === "/"
                ? pathname === "/"
                : pathname.startsWith(item.path);

            return (
              <Link
                key={item.name}
                href={item.path}
                className="relative text-lg font-medium capitalize"
              >
                {item.name}

                {active && (
                  <motion.div
                    layoutId="underline"
                    className="absolute left-0 -bottom-1 w-full h-0.5 bg-black rounded"
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* SEARCH */}
        <div className="hidden md:flex w-96">
          <SearchBar />
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-3">

          <button className="p-2 hover:bg-gray-100 rounded-full">
            <ShoppingCartIcon />
          </button>

         

          {/* LOGIN */}
          {!user ? (
            <button
  onClick={() => setLoginOpen(true)}
  className="hidden md:block bg-black text-white px-4 py-2 rounded-full"
>
  Sign in
</button>
          ) : (
            <div className="relative hidden md:block">

              {/* AVATAR */}
              <button
                onClick={() => setUserMenuOpen((p) => !p)}
                className="w-9 h-9 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white font-bold flex items-center justify-center uppercase"
              >
                {firstLetter}
              </button>

              {/* BACKDROP */}
              {userMenuOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
              )}

              {/* DROPDOWN */}
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-3 w-64 z-50
                      bg-white/80 backdrop-blur-xl border border-white/40
                      shadow-2xl rounded-2xl overflow-hidden"
                  >
                    {/* HEADER */}
                    <div className="p-4 bg-gradient-to-r from-pink-50 to-violet-50 flex items-center gap-3">

                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold uppercase">
                        {firstLetter}
                      </div>

                      <div>
                        <p className="font-semibold text-sm">
                          {user?.name || "User"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user?.role || "user"}
                        </p>
                      </div>

                    </div>

                    {/* LINKS */}
                    <div className="p-2 flex flex-col gap-1 text-sm">

                      {user?.role === "admin" && (
                        <a
                          href={adminUrl}
                          className="px-3 py-2 rounded-xl hover:bg-gray-100"
                        >
                          Dashboard
                        </a>
                      )}

                      <Link href="/profile" className="px-3 py-2 rounded-xl hover:bg-gray-100">
                        Profile
                      </Link>

                     

                      <Link href="/settings" className="px-3 py-2 rounded-xl hover:bg-gray-100">
                        Settings
                      </Link>
                    </div>

                    {/* LOGOUT */}
                    <div className="border-t p-2">
                      <button
                        onClick={logout}
                        className="w-full text-left px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl"
                      >
                        Logout
                      </button>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          )}

          {/* MOBILE MENU */}
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-2">
            <Menu />
          </button>

        </div>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed right-0 top-0 h-full w-80 bg-white z-50 p-5 flex flex-col gap-6"
            >
              <button onClick={() => setMobileOpen(false)}>
                <X />
              </button>

              <SearchBar />

              {navLinks.map((i) => (
                <Link
                  key={i.name}
                  href={i.path}
                  onClick={() => setMobileOpen(false)}
                  className="text-lg capitalize"
                >
                  {i.name}
                </Link>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;