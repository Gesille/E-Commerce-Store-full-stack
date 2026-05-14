"use client";
import { useState } from "react";

const mockCashiers = [
  { _id: "1", name: "Ahmed Al-Rashid", email: "ahmed@shop.com" },
  { _id: "2", name: "Sara Hassan",     email: "sara@shop.com" },
  { _id: "3", name: "Mohamed Salim",   email: "mo@shop.com" },
];

export function SwitchCashierModal({
  currentCashierId,
  onSwitch,
  onClose,
}: {
  currentCashierId: string;
  onSwitch: (newCashierId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSwitch = async () => {
    if (!selected) { setError("Please select a cashier."); return; }
    setLoading(true);
    setError("");
    try {
      await onSwitch(selected);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to switch cashier.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[380px] overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="text-[15px] font-semibold text-gray-900">Switch Cashier</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-lg leading-none">✕</button>
        </div>

        <div className="px-4 py-3 space-y-1">
          {mockCashiers
            .filter((c) => c._id !== currentCashierId)
            .map((c) => (
              <div
                key={c._id}
                onClick={() => setSelected(c._id)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                  selected === c._id
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-gray-50 border border-transparent"
                }`}
              >
                <div>
                  <div className="text-[13px] font-medium text-gray-900">{c.name}</div>
                  <div className="text-[11px] text-gray-400">{c.email}</div>
                </div>
                {selected === c._id && (
                  <span className="text-blue-500 text-sm">✓</span>
                )}
              </div>
            ))}
        </div>

        {error && (
          <p className="text-[12px] text-red-500 mx-5 mb-2 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-2 px-5 pb-5 pt-2">
          <button
            onClick={onClose}
            className="flex-1 h-10 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 bg-transparent cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSwitch}
            disabled={loading || !selected}
            className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-colors"
          >
            {loading ? "Switching…" : "Switch cashier"}
          </button>
        </div>
      </div>
    </div>
  );
}