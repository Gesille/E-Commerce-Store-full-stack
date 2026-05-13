
import { Customer } from "@/types/pos";
import { useState } from "react";

 export function CustomerModal({
  current,
  onSelect,
  onClose,
}: {
  current: Customer | null;
  onSelect: (c: Customer | null) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  // TODO: replace with useGetCustomersQuery() from your API
  const mockCustomers: Customer[] = [
    { id: 1, name: "Alice Johnson", email: "alice@example.com", phone: "+1 555-0101" },
    { id: 2, name: "Bob Smith", email: "bob@example.com", phone: "+1 555-0102" },
    { id: 3, name: "Carol White", email: "carol@example.com", phone: "+1 555-0103" },
    { id: 4, name: "David Brown", email: "david@example.com", phone: "+1 555-0104" },
  ];

  const filtered = mockCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] max-h-[520px] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="text-[15px] font-semibold text-gray-900">Select Customer</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-lg leading-none">✕</button>
        </div>
        <div className="px-4 py-3 border-b border-gray-50">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 h-9">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or phone…" className="bg-transparent border-none outline-none text-gray-700 text-xs w-full placeholder-gray-400" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {current && (
            <button
              onClick={() => { onSelect(null); onClose(); }}
              className="w-full text-left px-5 py-3 text-xs text-red-500 hover:bg-red-50 border-b border-gray-50 cursor-pointer bg-transparent border-none transition-colors"
            >
              ✕ Remove customer
            </button>
          )}
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => { onSelect(c); onClose(); }}
              className={`px-5 py-3 border-b border-gray-50 cursor-pointer transition-colors hover:bg-blue-50 ${current?.id === c.id ? "bg-blue-50" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-medium text-gray-900">{c.name}</div>
                {current?.id === c.id && <span className="text-blue-500 text-xs">✓ Selected</span>}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">{c.email} · {c.phone}</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-20 text-gray-400 text-sm">No customers found</div>
          )}
        </div>
      </div>
    </div>
  );
}
export default CustomerModal