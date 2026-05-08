"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const Filter = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const handleFilter = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center justify-end my-6">

      <div className="flex items-center gap-2">

        <span className="text-sm text-gray-600">Sort by:</span>

        <div className="relative">
          <select
            onChange={(e) => handleFilter(e.target.value)}
            className="
              bg-white
              border border-gray-200
              rounded-lg
              px-3 py-2
              text-sm text-gray-700
              shadow-sm
              hover:border-gray-300
              focus:outline-none
              focus:ring-2
              focus:ring-gray-200
              transition
              cursor-pointer
            "
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="asc">Price: Low → High</option>
            <option value="desc">Price: High → Low</option>
          </select>
        </div>

      </div>
    </div>
  );
};

export default Filter;