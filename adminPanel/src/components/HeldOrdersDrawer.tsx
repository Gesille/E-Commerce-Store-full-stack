"use client";
import { useState } from "react";
import { fmt } from "@/types/pos";
import {
  useLazyGetHeldOrdersQuery,

} from "@/redux/pos/Posapi";
import { useRemoveHeldOrderMutation } from "@/redux/order/orderApi";

export function HeldOrdersDrawer({ onRestore }: { onRestore?: (order: any) => void }) {
  const [open, setOpen] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const [fetchHeldOrders, { data, isLoading }] = useLazyGetHeldOrdersQuery();
  const [removeHeldOrder] = useRemoveHeldOrderMutation();

  const orders = data?.orders ?? [];

  const handleRemove = async (odooOrderId: number) => {
    setRemovingId(odooOrderId);
    try {
      await removeHeldOrder(odooOrderId).unwrap();
      fetchHeldOrders(); // refresh the list
    } catch (err) {
      console.error("Failed to remove held order", err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <>
      <button
        onClick={() => { setOpen(true); fetchHeldOrders(); }}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Held Orders ({orders.length || "…"})
      </button>

      {open && (
        <div className="fixed inset-0 z-[300] flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />

          <div className="relative w-[480px] h-full bg-white shadow-2xl flex flex-col">
            <div className="h-14 border-b border-gray-100 flex items-center justify-between px-5 shrink-0">
              <div>
                <div className="text-[14px] font-bold text-gray-900">Hold Orders</div>
                <div className="text-[11px] text-gray-400">Draft quotations saved in Odoo</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchHeldOrders()}
                  className="text-[11px] text-blue-500 hover:underline border-none bg-transparent cursor-pointer"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer text-lg leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-32 text-[13px] text-gray-400">Loading…</div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center px-8">
                  <div className="text-3xl mb-2">📋</div>
                  <div className="text-[13px] font-medium text-gray-500">No held orders</div>
                  <div className="text-[11px] text-gray-400 mt-1">Orders held in Odoo will appear here</div>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {orders.map((order: any) => (
                    <div key={order.odooOrderId} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[12px] font-bold text-gray-900 font-mono">{order.name}</span>
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">HELD</span>
                          </div>
                          <div className="text-[12px] text-indigo-600 font-medium mb-1">
                            👤 {order.customer?.name || "No customer"}
                          </div>
                          <div className="text-[11px] text-gray-400 mb-2">
                            {new Date(order.date).toLocaleString("en-US", {
                              month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </div>
                          <div className="space-y-0.5">
                            {order.lines.map((line: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-600 truncate flex-1">{line.qty}× {line.productName}</span>
                                <span className="text-gray-700 font-medium ml-2">${fmt(line.price * line.qty)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="text-[16px] font-bold text-gray-900">${fmt(order.total)}</div>

                          {onRestore && (
                            <button
                              onClick={() => { onRestore(order); setOpen(false); }}
                              className="text-[11px] bg-indigo-600 text-white px-3 py-1.5 rounded-lg border-none cursor-pointer hover:bg-indigo-700 transition-colors font-semibold"
                            >
                              Restore
                            </button>
                          )}

                          {/* ← new remove button */}
                          <button
                            onClick={() => handleRemove(order.id)}
                            disabled={removingId === order.odooOrderId}
                            className="text-[11px] bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-red-100 transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {removingId === order.odooOrderId ? "Removing…" : "Remove"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 shrink-0">
              <div className="text-[11px] text-gray-400">
                {orders.length} held order{orders.length !== 1 ? "s" : ""} · Total: ${fmt(orders.reduce((s: number, o: any) => s + o.total, 0))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}