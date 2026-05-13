import { useGetCategoriesQuery } from "@/redux/category/categoryApi";
import { Category } from "@/types/pos";

export function CategorySidebar({
  selected,
  setSelected,
}: {
  selected: string;
  setSelected: (id: string) => void;
}) {
  const { data: categories = [], isLoading } = useGetCategoriesQuery();

  return (
    <div className="w-36 bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div className="px-4 pt-4 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Categories</div>
      <div className="flex-1 overflow-y-auto">
        <button
          onClick={() => setSelected("All")}
          className={`w-full text-left px-4 py-2.5 text-[13px] font-normal border-l-2 transition-all cursor-pointer ${
            selected === "All" ? "bg-blue-50 text-blue-600 font-medium border-blue-500" : "text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          All items
        </button>
        {isLoading && <div className="px-4 py-2 text-[11px] text-gray-400">Loading…</div>}
        {categories.map((cat: Category) => (
          <button
            key={cat.odooCategoryId}
            onClick={() => setSelected(String(cat.odooCategoryId))}
            className={`w-full text-left px-4 py-2.5 text-[13px] font-normal border-l-2 transition-all cursor-pointer ${
              selected === String(cat.odooCategoryId) ? "bg-blue-50 text-blue-600 font-medium border-blue-500" : "text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {cat.catTitle}
          </button>
        ))}
      </div>
    </div>
  );
}