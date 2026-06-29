"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  useGetSuppliersQuery,
  useGetProductsForPOQuery,
  useCreatePurchaseOrderMutation,
} from "@/redux/product/purchaseApi";
import { ProductCombobox } from "@/app/(dashboard)/purchaseOrders/ProductCombobox";
import { SupplierCombobox } from "@/app/(dashboard)/purchaseOrders/SupplierCombobox";
import { CreateSupplierModal } from "@/app/(dashboard)/purchaseOrders/CreateSupplierModal";

interface POLine {
  productId: number;
  qty: number;
  unitPrice: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export const CreatePOModal = ({ open, onClose }: Props) => {
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [lines, setLines] = useState<POLine[]>([{ productId: 0, qty: 1, unitPrice: 0 }]);
  const [expectedDate, setExpectedDate] = useState("");
  const [note, setNotes] = useState("");
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);

  const { data: suppliersRaw = [], refetch: refetchSuppliers } = useGetSuppliersQuery();
  const { data: products = [] } = useGetProductsForPOQuery();
  const [createPO, { isLoading }] = useCreatePurchaseOrderMutation();

  const suppliers: any[] = Array.isArray(suppliersRaw)
    ? suppliersRaw
    : (suppliersRaw as any)?.suppliers ?? [];

  const addLine = () => setLines([...lines, { productId: 0, qty: 1, unitPrice: 0 }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof POLine, value: number) => {
    const updated = [...lines];
    updated[i] = { ...updated[i], [field]: value };
    setLines(updated);
  };

  const resetForm = () => {
    setSupplierId(null);
    setLines([{ productId: 0, qty: 1, unitPrice: 0 }]);
    setNotes("");
    setExpectedDate("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };
const filteredProducts = supplierId
  ? products.filter((p: any) =>
      p.suppliers?.some((s: any) => s.id === supplierId)
    )
  : products;
  const handleSubmit = async () => {
    if (!supplierId) return toast.error("Please select a supplier");
    if (lines.some((l) => !l.productId))
      return toast.error("Please select a product for each line");

    try {
      const result = await createPO({
        supplierId,
        lines,
        expectedDate: expectedDate || undefined,
        note: note || undefined,
      }).unwrap();

      toast.success(`Purchase Order ${result.purchaseOrderName} created!`);
      handleClose();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to create PO");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 bg-indigo-50 border-b border-indigo-100">
            <DialogTitle className="text-lg font-semibold text-slate-800">
              Create Purchase Order
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Supplier */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-slate-700">Supplier *</Label>
                <button
                  type="button"
                  onClick={() => setShowCreateSupplier(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline font-medium"
                >
                  + New Supplier
                </button>
              </div>
              <SupplierCombobox
                suppliers={suppliers}
                value={supplierId}
                onChange={setSupplierId}
              />
            </div>

            {/* Expected Date */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Expected Delivery Date
              </Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="bg-white border-indigo-200"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Notes</Label>
              <Textarea
                value={note}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Container #25, Invoice #INV-001"
                className="bg-white border-indigo-200 resize-none"
                rows={2}
              />
            </div>

            {/* Lines */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-slate-700">Products *</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addLine}
                  className="gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  <Plus size={13} /> Add Line
                </Button>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs text-slate-400 uppercase tracking-wide px-1">
                  <span className="col-span-5">Product</span>
                  <span className="col-span-3">Qty</span>
                  <span className="col-span-3">Unit Price</span>
                  <span className="col-span-1" />
                </div>

                {lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <ProductCombobox
                        products={filteredProducts}
                        value={line.productId}
                        onChange={(id: any) => updateLine(i, "productId", id)}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min={1}
                        value={line.qty}
                        onChange={(e) => updateLine(i, "qty", Number(e.target.value))}
                        className="bg-white border-slate-200 text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(i, "unitPrice", Number(e.target.value))}
                        className="bg-white border-slate-200 text-sm"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          className="text-red-400 hover:text-red-600 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-white/60 gap-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isLoading ? "Creating..." : "Create Purchase Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateSupplierModal
        open={showCreateSupplier}
        onClose={() => setShowCreateSupplier(false)}
        onCreated={(supplier) => {
          setSupplierId(supplier.id);
          refetchSuppliers();
        }}
      />
    </>
  );
};