"use client";
import { useState } from "react";

// TODO: استبدل هذا بـ useGetUsersQuery من الـ API
const mockCashiers = [
  { _id: "1", name: "Ahmed Al-Rashid", email: "ahmed@shop.com" },
  { _id: "2", name: "Sara Hassan",     email: "sara@shop.com" },
  { _id: "3", name: "Mohamed Salim",   email: "mo@shop.com" },
];

export function OpenSessionModal({
  onOpen,
  onClose,
}: {
  onOpen: (payload: {
    cashierId: string;
    type: "daily" | "long_term";
    openingBalance: number;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [cashierId, setCashierId]         = useState("");
  const [type, setType]                   = useState<"daily" | "long_term">("daily");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");

  const handleSubmit = async () => {
    if (!cashierId) { setError("Please select a cashier."); return; }
    setLoading(true);
    setError("");
    try {
      await onOpen({
        cashierId,
        type,
        openingBalance: parseFloat(openingBalance) || 0,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to open session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="text-[15px] font-semibold text-gray-900">Open POS Session</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-lg leading-none">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Cashier select */}
          <div>
            <label className="text-[12px] font-medium text-gray-600 block mb-1.5">
              Active cashier
            </label>
            <select
              value={cashierId}
              onChange={(e) => setCashierId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 h-9 text-[13px] text-gray-700 outline-none focus:border-blue-400 bg-white"
            >
              <option value="">Select cashier…</option>
              {mockCashiers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Session type */}
          <div>
            <label className="text-[12px] font-medium text-gray-600 block mb-1.5">
              Session type
            </label>
            <div className="flex gap-2">
              {(["daily", "long_term"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 h-9 rounded-xl border text-[12px] font-medium cursor-pointer transition-colors ${
                    type === t
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {t === "daily" ? "Daily" : "Long-term"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              {type === "daily"
                ? "Session closes at end of day."
                : "Session stays open across multiple days."}
            </p>
          </div>

          {/* Opening balance */}
          <div>
            <label className="text-[12px] font-medium text-gray-600 block mb-1.5">
              Opening balance ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 h-9 text-[13px] text-gray-700 outline-none focus:border-blue-400"
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 h-10 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 bg-transparent cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !cashierId}
            className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-colors"
          >
            {loading ? "Opening…" : "Open session"}
          </button>
        </div>
      </div>
    </div>
  );
}