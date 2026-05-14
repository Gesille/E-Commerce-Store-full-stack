export function POSSearchBar({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 h-8 w-52">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products…"
        className="bg-transparent border-none outline-none text-gray-700 text-xs w-full placeholder-gray-400"
      />
      {search && (
        <button onClick={() => setSearch("")} aria-label="Clear search" className="text-gray-400 hover:text-gray-600 text-xs leading-none bg-transparent border-none cursor-pointer">
          ✕
        </button>
      )}
    </div>
  );
}
