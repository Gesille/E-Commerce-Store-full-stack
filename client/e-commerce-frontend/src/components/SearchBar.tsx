"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

const SearchBar = () => {
  const [query, setQuery] = useState<string>("");
  const router = useRouter();

  const handleSearch = () => {
    if (!query.trim()) return;

    
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="flex items-center bg-gray-100 px-4 py-2 rounded-full w-full focus-within:ring-2 transition">
      <Search size={18} className="text-gray-500" />

      <input
        type="text"
        placeholder="Search products..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="bg-transparent outline-none px-2 w-full text-sm"
      />

      <button
        onClick={handleSearch}
        className="text-xs bg-black text-white px-3 py-1 rounded-full hover:scale-105 transition"
      >
        Go
      </button>
    </div>
  );
};

export default SearchBar;