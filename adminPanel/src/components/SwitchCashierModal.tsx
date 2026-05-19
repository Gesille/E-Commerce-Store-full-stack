"use client";

import { useState } from "react";
import { useGetAllUsersQuery, type User } from "@/redux/user/userApi";
import {
  useEndCashierShiftMutation,
  useStartCashierShiftMutation,
} from "@/redux/pos/Posapi";
import { Shift } from "@/types/session";

interface SwitchCashierModalProps {
  currentCashierId: string;
  configId: number;
  currentShift: Shift | null;
  onSwitch: (
    newCashierId: string,
    newShift: Shift,
    newCashierName: string,
  ) => void;
  onClose: () => void;
}

export function SwitchCashierModal({
  currentCashierId,
  configId,
  currentShift,
  onSwitch,
  onClose,
}: SwitchCashierModalProps) {
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: allUsers, isLoading: usersLoading } = useGetAllUsersQuery();
  const [endCashierShift] = useEndCashierShiftMutation();
  const [startCashierShift] = useStartCashierShiftMutation();

  const cashiers: User[] = (allUsers ?? []).filter(
    (u: any) => u.role === "cashier" && u._id !== currentCashierId,
  );

  const handleSwitch = async () => {
    if (!selected) {
      setError("Please select a cashier.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (currentShift && currentShift.state !== "closed") {
        await endCashierShift({
          cashierId:
            typeof currentShift.cashierId === "object"
              ? currentShift.cashierId._id
              : currentShift.cashierId,
          configId,
        }).unwrap();
      }

      const result = await startCashierShift({
        cashierId: selected,
        configId,
      }).unwrap();
      const newShift = (result as any).shift as Shift;
      const populatedCashier = newShift.cashierId as any;
      const cashierName =
        typeof populatedCashier === "object"
          ? populatedCashier.name
          : (cashiers.find((c) => c._id === selected)?.name ?? selected);

      onSwitch(selected, newShift, cashierName);
      onClose();
    } catch (err: any) {
      setError(
        err?.data?.message ?? err?.message ?? "Failed to switch cashier.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[380px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="text-[15px] font-semibold text-gray-900">
            Switch Cashier
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Info banner */}
        <div className="mx-5 mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-[12px] text-blue-700">
          <p className="font-semibold mb-0.5">Shift handover</p>
          <p className="text-blue-600">
            Current cashier's shift will end and a new shift will start for the
            selected cashier in the same session.
          </p>
        </div>

        {/* Cashier list */}
        <div className="px-4 py-3 space-y-1 max-h-60 overflow-y-auto">
          {usersLoading ? (
            <div className="text-[13px] text-gray-400 text-center py-4">
              Loading cashiers…
            </div>
          ) : cashiers.length === 0 ? (
            <div className="text-[13px] text-gray-400 text-center py-4">
              No other cashiers available.
            </div>
          ) : (
            cashiers.map((c) => (
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
                  <div className="text-[13px] font-medium text-gray-900">
                    {c.name}
                  </div>
                  <div className="text-[11px] text-gray-400">{c.email}</div>
                </div>
                {selected === c._id && (
                  <span className="text-blue-500 text-sm">✓</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-[12px] text-red-500 mx-5 mb-2 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-10 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 bg-transparent cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSwitch}
            disabled={loading || !selected || usersLoading}
            className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-colors flex items-center justify-center gap-2"
          >
            {loading ? "Switching…" : "Switch cashier"}
          </button>
        </div>
      </div>
    </div>
  );
}
