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
import { User, Phone, Mail, Hash } from "lucide-react";
import toast from "react-hot-toast";
import { useCreateSupplierMutation } from "@/redux/product/purchaseApi";


interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (supplier: { id: number; name: string }) => void;
}

export const CreateSupplierModal = ({ open, onClose, onCreated }: Props) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [ref, setRef] = useState("");

  const [createSupplier, { isLoading }] = useCreateSupplierMutation();

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Supplier name is required");
      return;
    }

    try {
      const result = await createSupplier({ name, phone, email, ref }).unwrap();
      toast.success(`Supplier "${result.supplier.name}" created!`);
      onCreated(result.supplier); // pass back to PO modal to auto-select
      onClose();
      // reset
      setName("");
      setPhone("");
      setEmail("");
      setRef("");
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to create supplier");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <User size={18} className="text-indigo-600" />
            New Supplier
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm text-slate-700">
              <User size={13} /> Name *
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="border-indigo-200"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm text-slate-700">
              <Phone size={13} /> Phone
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
              className="border-slate-200"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm text-slate-700">
              <Mail size={13} /> Email
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="supplier@example.com"
              className="border-slate-200"
            />
          </div>

          {/* Reference */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm text-slate-700">
              <Hash size={13} /> Reference / Code
            </Label>
            <Input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="e.g. SUP-001"
              className="border-slate-200"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-slate-200">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isLoading ? "Creating..." : "Create Supplier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};