"use client";

import { useState } from "react";


import { Button } from "@/components/ui/button";

import { Plus, CheckCircle, PackageCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useGetPurchaseOrdersQuery, useConfirmPurchaseOrderMutation, useReceivePurchaseOrderMutation } from "@/redux/product/purchaseApi";
import { CreatePOModal } from "@/components/product/CreatePOModal";


const STATE_COLORS: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-700",
  sent: "bg-blue-100 text-blue-700",
  purchase: "bg-green-100 text-green-700",
  done: "bg-slate-100 text-slate-600",
  cancel: "bg-red-100 text-red-600",
};

export default function PurchaseOrdersPage() {
  const [openCreate, setOpenCreate] = useState(false);
  const { data: orders = [], isLoading } = useGetPurchaseOrdersQuery();
  const [confirmPO] = useConfirmPurchaseOrderMutation();
  const [receivePO] = useReceivePurchaseOrderMutation();

  const handleConfirm = async (id: number) => {
    try {
      await confirmPO(id).unwrap();
      toast.success("Purchase Order confirmed!");
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to confirm");
    }
  };

  const handleReceive = async (pickingId: number) => {
    try {
      await receivePO(pickingId).unwrap();
      toast.success("Goods received! Stock updated.");
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to receive");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Purchase Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage supplier orders and stock receipts</p>
        </div>
        <Button
          onClick={() => setOpenCreate(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
        >
          <Plus size={16} /> Create PO
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">PO Number</th>
                <th className="px-4 py-3 text-left">Supplier</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Notes</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {orders.map((order:any) => (
                <tr key={order.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono font-medium text-indigo-700">{order.name}</td>
                  <td className="px-4 py-3 text-slate-700">{order.supplier}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(order.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-500">{order.notes || "—"}</td>
                  <td className="px-4 py-3 font-medium">${order.total.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATE_COLORS[order.state]}`}>
                      {order.state.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    {order.state === "draft" && (
                      <Button size="sm" variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50 gap-1"
                        onClick={() => handleConfirm(order.id)}
                      >
                        <CheckCircle size={13} /> Confirm
                      </Button>
                    )}
                    {order.state === "purchase" && order.pickingIds.map((pid:any) => (
                      <Button key={pid} size="sm" variant="outline"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 gap-1"
                        onClick={() => handleReceive(pid)}
                      >
                        <PackageCheck size={13} /> Receive
                      </Button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreatePOModal open={openCreate} onClose={() => setOpenCreate(false)} />
    </div>
  );
}