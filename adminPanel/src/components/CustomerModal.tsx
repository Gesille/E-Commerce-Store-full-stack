"use client";

import { Customer } from "@/types/pos";
import { useState } from "react";
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
} from "@/redux/pos/Posapi";

// Fix exportCustomersCSV
function exportCustomersCSV(customers: Customer[]) {
  const header = [
    "Name",
    "Email",
    "Phone",
    "Company",
    "Street",
    "City",
    "Country",
  ];
  const rows = customers.map((c) => [
    `"${c.name.replace(/"/g, '""')}"`,
    `"${(c.email ?? "").replace(/"/g, '""')}"`,
    `"${(c.phone ?? "").replace(/"/g, '""')}"`,
    `"${(c.company ?? "").replace(/"/g, '""')}"`,
    `"${(c.street ?? "").replace(/"/g, '""')}"`,
    `"${(c.city ?? "").replace(/"/g, '""')}"`,
    `"${(c.country ?? "").replace(/"/g, '""')}"`,
  ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
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
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newStreet, setNewStreet] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [createError, setCreateError] = useState("");

  // ── live search from Odoo via backend ────────────────────────────────────
  const { data, isLoading } = useGetCustomersQuery(search);
  const [createCustomer, { isLoading: creating }] = useCreateCustomerMutation();

  // Backend returns { customers: [...] }
  // In CustomerModal — fix the customers mapping
  const customers: Customer[] = (data?.customers ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    email: c.email || "",
    phone: c.phone || "",
    company: c.company || undefined,
    street: c.street || undefined,
    city: c.city || undefined,
    country: c.country || undefined,
  }));

  const handleCreate = async () => {
    if (!newName.trim()) {
      setCreateError("Name is required.");
      return;
    }
    setCreateError("");
    try {
      const result = await createCustomer({
        name: newName.trim(),
        phone: newPhone.trim() || undefined,
        email: newEmail.trim() || undefined,
        company: newCompany.trim() || undefined,
        street: newStreet.trim() || undefined,
        city: newCity.trim() || undefined,
        country: newCountry.trim() || undefined,
      }).unwrap();

      const created: Customer = {
        id: result.customerId,
        name: newName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim(),
        company: newCompany.trim() || undefined,
        street: newStreet.trim() || undefined,
        city: newCity.trim() || undefined,
        country: newCountry.trim() || undefined,
      };
      onSelect(created);
      onClose();
    } catch (e: any) {
      setCreateError(e?.data?.message ?? "Failed to create customer.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] max-h-[580px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="text-[15px] font-semibold text-gray-900">
            {showCreate ? "New Customer" : "Select Customer"}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* ── CREATE FORM ── */}
        {showCreate ? (
          <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto flex-1">
            {/* Name */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                Name *
              </label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-blue-400"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                Phone
              </label>
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+1 555-0100"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-blue-400"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                Email
              </label>
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-blue-400"
              />
            </div>

            {/* Company */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                Company
              </label>
              <input
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Company name"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-blue-400"
              />
            </div>

            {/* Street */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                Street
              </label>
              <input
                value={newStreet}
                onChange={(e) => setNewStreet(e.target.value)}
                placeholder="Street address"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-blue-400"
              />
            </div>

            {/* City + Country */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                  City
                </label>
                <input
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="City"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-blue-400"
                />
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                  Country
                </label>
                <input
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  placeholder="e.g. United States"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-blue-400"
                />
              </div>
            </div>
            {createError && (
              <div className="text-[12px] text-red-500 bg-red-50 rounded-lg px-3 py-2">
                {createError}
              </div>
            )}
            <div className="flex gap-2 mt-1 pb-1">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setCreateError("");
                }}
                className="flex-1 h-9 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 bg-transparent cursor-pointer"
              >
                ← Back
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-colors"
              >
                {creating ? "Creating…" : "Create & Select"}
              </button>
            </div>
          </div>
        ) : (
          /* ── SEARCH LIST ── */
          <>
            {/* Search bar */}
            <div className="px-4 py-3 border-b border-gray-50">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 h-9">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email or phone…"
                  className="bg-transparent border-none outline-none text-gray-700 text-xs w-full placeholder-gray-400"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {/* Remove customer */}
              {current && (
                <button
                  onClick={() => {
                    onSelect(null);
                    onClose();
                  }}
                  className="w-full text-left px-5 py-3 text-xs text-red-500 hover:bg-red-50 border-b border-gray-50 cursor-pointer bg-transparent transition-colors"
                >
                  ✕ Remove customer
                </button>
              )}

              {/* Loading */}
              {isLoading && (
                <div className="flex items-center justify-center h-20 text-gray-400 text-sm">
                  Loading customers…
                </div>
              )}

              {/* Results */}
              {!isLoading &&
                customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelect(c);
                      onClose();
                    }}
                    className={`px-5 py-3 border-b border-gray-50 cursor-pointer transition-colors hover:bg-blue-50 ${
                      current?.id === c.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] font-medium text-gray-900">
                        {c.name}
                      </div>
                      {current?.id === c.id && (
                        <span className="text-blue-500 text-xs">
                          ✓ Selected
                        </span>
                      )}
                    </div>
                  
                    <div className="text-[11px] text-gray-400 mt-0.5 space-y-0.5">
                      <div>
                        {c.email} · {c.phone}
                      </div>
                      {(c.street || c.city || c.country) && (
                        <div>
                          {[c.street, c.city, c.country]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      )}
                      {c.company && (
                        <div className="text-blue-400">{c.company}</div>
                      )}
                    </div>
                  </div>
                ))}

              {/* Empty */}
              {!isLoading && customers.length === 0 && (
                <div className="flex flex-col items-center justify-center h-20 text-gray-400 text-sm gap-1">
                  <span>No customers found</span>
                </div>
              )}
            </div>

            {/* Footer — create new */}
            {/* Footer — create new + export */}
            <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => setShowCreate(true)}
                className="flex-1 h-9 border border-dashed border-gray-300 rounded-xl text-[13px] text-gray-500 hover:border-blue-400 hover:text-blue-600 bg-transparent cursor-pointer transition-colors"
              >
                + New customer
              </button>
              <button
                onClick={() => exportCustomersCSV(customers)}
                disabled={customers.length === 0}
                title="Export to CSV"
                className="h-9 px-3 border border-gray-200 rounded-xl text-gray-500 hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed bg-transparent cursor-pointer transition-colors flex items-center gap-1.5 text-[13px]"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                CSV
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CustomerModal;
