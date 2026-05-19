"use client";

import { ActiveSession } from "@/hooks/usePOSSession";
import { useState } from "react";

export function CloseSessionConfirmModal({
  session,
  onConfirm,
  onClose,
}: {
  session: ActiveSession;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const orderCount = session.stats?.orderCount ?? 0;
  const totalRevenue = session.stats?.totalRevenue ?? 0;
  const sessionName = session.session?.name ?? "Session";
  const startAt = session.session?.start_at
    ? new Date(session.session.start_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      await onConfirm();
      // onConfirm is responsible for closing the modal on success
    } catch (err: any) {
      // Show the error inside the modal instead of letting it bubble silently
      setError(err?.data?.message ?? err?.message ?? "Failed to close session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="text-[14.5px] font-semibold text-gray-900">
            Close POS Session
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 bg-transparent border-none cursor-pointer text-[16px] leading-none transition disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Warning banner */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-[12px] text-amber-700 flex gap-2.5 items-start">
            <span className="text-[15px] mt-0.5">⚠️</span>
            <div>
              <p className="font-semibold mb-0.5">Are you sure?</p>
              <p className="text-amber-600">
                Closing the session will end all active cashier shifts. This
                cannot be undone.
              </p>
            </div>
          </div>

          {/* Daily summary */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-2">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Today's summary — {sessionName}
            </p>
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Session opened at</span>
              <span className="font-medium text-gray-800">{startAt}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Total orders</span>
              <span className="font-medium text-gray-800">{orderCount}</span>
            </div>
            <div className="flex justify-between text-[13px] border-t border-gray-100 pt-2 mt-1">
              <span className="text-gray-700 font-semibold">Total revenue</span>
              <span className="font-bold text-emerald-700 text-[14px]">
                ${totalRevenue.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Error message — was missing before */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-[12px] text-red-600 flex gap-2 items-start">
              <span className="mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-10 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 bg-transparent cursor-pointer transition disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 h-10 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              {loading ? "Closing…" : "Yes, close session"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}