"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

import toast from "react-hot-toast";
import { useGetSuppliersQuery, useGetProductsForPOQuery, useCreatePurchaseOrderMutation } from "@/redux/product/purchaseApi";

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
  const [notes, setNotes] = useState("");

  const { data: suppliers = [] } = useGetSuppliersQuery();
  const { data: products = [] } = useGetProductsForPOQuery();
  const [createPO, { isLoading }] = useCreatePurchaseOrderMutation();

  const addLine = () => setLines([...lines, { productId: 0, qty: 1, unitPrice: 0 }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const updateLine = (i: number, field: keyof POLine, value: number) => {
    const updated = [...lines];
    updated[i] = { ...updated[i], [field]: value };
    setLines(updated);
  };

  const handleSubmit = async () => {
    if (!supplierId) return toast.error("Please select a supplier");
    if (lines.some((l) => !l.productId)) return toast.error("Please select a product for each line");

    try {
      const result = await createPO({
        supplierId,
        lines,
        expectedDate: expectedDate || undefined,
        notes: notes || undefined,
      }).unwrap();

      toast.success(`Purchase Order ${result.purchaseOrderName} created!`);
      onClose();
      setSupplierId(null);
      setLines([{ productId: 0, qty: 1, unitPrice: 0 }]);
      setNotes("");
      setExpectedDate("");
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to create PO");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 bg-indigo-50 border-b border-indigo-100">
          <DialogTitle className="text-lg font-semibold text-slate-800">Create Purchase Order</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Supplier */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Supplier *</Label>
            <Select onValueChange={(v) => setSupplierId(Number(v))}>
              <SelectTrigger className="bg-white border-indigo-200">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s:any) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expected Date */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Expected Delivery Date</Label>
            <Input type="date" value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="bg-white border-indigo-200" />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Container #25, Invoice #INV-001"
              className="bg-white border-indigo-200 resize-none" rows={2} />
          </div>

          {/* Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-700">Products *</Label>
              <Button type="button" size="sm" variant="outline"
                onClick={addLine} className="gap-1 text-indigo-600 border-indigo-200">
                <Plus size={13} /> Add Line
              </Button>
            </div>

            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs text-slate-400 uppercase px-1">
                <span className="col-span-5">Product</span>
                <span className="col-span-3">Qty</span>
                <span className="col-span-3">Unit Price</span>
                <span className="col-span-1" />
              </div>

              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Select onValueChange={(v) => updateLine(i, "productId", Number(v))}>
                      <SelectTrigger className="bg-white border-slate-200 text-sm">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p:any) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input type="number" min={1} value={line.qty}
                      onChange={(e) => updateLine(i, "qty", Number(e.target.value))}
                      className="bg-white border-slate-200 text-sm" />
                  </div>
                  <div className="col-span-3">
                    <Input type="number" min={0} step="0.01" value={line.unitPrice}
                      onChange={(e) => updateLine(i, "unitPrice", Number(e.target.value))}
                      className="bg-white border-slate-200 text-sm" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(i)}
                        className="text-red-400 hover:text-red-600 transition">
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {isLoading ? "Creating..." : "Create Purchase Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};