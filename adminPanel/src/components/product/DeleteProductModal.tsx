"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Product } from "@/app/(dashboard)/products/columns";
import { useDeleteProductMutation } from "@/redux/product/productApi";
import toast from "react-hot-toast";

interface Props {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteProductModal = ({ product, open, onClose, onSuccess }: Props) => {
  const [deleteProduct, { isLoading }] = useDeleteProductMutation();

  const handleDelete = async () => {
    if (!product) return;
    try {
      await deleteProduct(product.id).unwrap();
      toast.success("Product deleted successfully");
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to delete product");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Product</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{product?.name}</span>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? "Deleting..." : "Yes, Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};