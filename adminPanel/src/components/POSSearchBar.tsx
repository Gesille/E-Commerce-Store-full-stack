"use client";

import { Search } from "lucide-react";

export default function POSSearchBar({ search, setSearch }: any) {
  return (
    <div className="p-2 border-b flex items-center gap-2 bg-background">

      <Search size={16} />

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products..."
        className="w-full bg-transparent outline-none"
      />

    </div>
  );
}