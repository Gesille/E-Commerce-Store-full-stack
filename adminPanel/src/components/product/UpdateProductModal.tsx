"use client";

import { useEffect, useState } from "react";
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
import { Product } from "@/app/(dashboard)/products/columns";
import { useUpdateProductMutation } from "@/redux/product/productApi";
import toast from "react-hot-toast";
import { BarcodeSticker } from "../BarcodeSticker";

interface Props {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UpdateProductModal = ({
  product,
  open,
  onClose,
  onSuccess,
}: Props) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [colors, setColors] = useState("");
  const [sizes, setSizes] = useState("");
  const [materials, setMaterials] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [imageChanged, setImageChanged] = useState(false); // ✅ track new image

  const [updateProduct, { isLoading }] = useUpdateProductMutation();
const [barcode, setBarcode] = useState("");
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setPreview(reader.result as string);
      setImageChanged(true); // ✅ new image selected
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (product) {
      setName(product.name);
      setPrice(product.price);
      setStock(product.qty_available);
      setColors(product.colors?.join(", ") ?? "");
      setSizes(product.sizes?.join(", ") ?? "");
      setMaterials((product as any).materials?.join(", ") ?? "");
      setBarcode((product as any).barcode ?? "");
      setImage(null);         // ✅ don't send existing Odoo base64
      setImageChanged(false); // ✅ reset
      setPreview(            // ✅ show existing image as preview only
        product.image_1920
          ? `data:image/png;base64,${product.image_1920}`
          : ""
      );
    }
  }, [product]);

  const handleSubmit = async () => {
    if (!product) return;
    try {
      await updateProduct({
        id: product.id,
        name,
        price,
        stock,
        barcode: barcode || undefined,
        image: imageChanged ? image : null, // ✅ only upload if new image picked
        colors: colors.split(",").map((c) => c.trim()).filter(Boolean),
        sizes: sizes.split(",").map((s) => s.trim()).filter(Boolean),
        materials: materials.split(",").map((m) => m.trim()).filter(Boolean),
      }).unwrap();

      toast.success("Product updated successfully");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to update product");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Product</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Price</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Stock</Label>
            <Input
              type="number"
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Image</Label>
            <Input type="file" accept="image/*" onChange={handleImageChange} />
          </div>
          {preview && (
            <img src={preview} alt="preview" className="w-24 h-24 object-cover rounded" />
          )}
          <div>
            <Label>Colors <span className="text-xs text-muted-foreground">(comma separated)</span></Label>
            <Input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="red, blue" />
          </div>
          <div>
            <Label>Sizes <span className="text-xs text-muted-foreground">(comma separated)</span></Label>
            <Input value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="S, M, L" />
          </div>
          <div>
            <Label>Materials <span className="text-xs text-muted-foreground">(comma separated)</span></Label>
            <Input value={materials} onChange={(e) => setMaterials(e.target.value)} placeholder="cotton, wool" />
          </div>
         <div>
  <Label>Barcode</Label>
  <div className="flex gap-2">
    <Input
      value={barcode}
      onChange={(e) => setBarcode(e.target.value)}
      placeholder="Scan or type barcode"
      className="font-mono flex-1"
    />
    {barcode && (
  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
    <p className="text-xs font-semibold text-gray-500 mb-2">Sticker</p>
    <BarcodeSticker productName={name} barcode={barcode} />
  </div>
)}
    <Button
      type="button"
      variant="outline"
      className="shrink-0 text-xs px-3"
      onClick={() => {
        const digits = Array.from({ length: 12 }, () =>
          Math.floor(Math.random() * 10)
        );
        const check =
          (10 -
            (digits.reduce((sum, d, i) =>
              sum + d * (i % 2 === 0 ? 1 : 3), 0) % 10)) % 10;
        setBarcode([...digits, check].join(""));
      }}
    >
      Generate
    </Button>
  </div>
  {!barcode && (
    <p className="text-xs text-amber-600 mt-1">
      ⚠ No barcode — scanner won't find this product
    </p>
  )}
</div>
          <div>
            <Label>Category</Label>
            <Input value={product?.category ?? ""} disabled className="opacity-60" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};