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
import {
  DollarSign,
  Edit3,
  Hash,
  Package,
  Palette,
  Tag,
  Layers,
  ScanBarcode,
  Shirt,
} from "lucide-react";

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
  const [imageChanged, setImageChanged] = useState(false);
  const [barcode, setBarcode] = useState("");

  const [updateProduct, { isLoading }] = useUpdateProductMutation();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setPreview(reader.result as string);
      setImageChanged(true);
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
      setImage(null);
      setImageChanged(false);
      setPreview(
        product.image_1920
          ? `data:image/png;base64,${product.image_1920}`
          : ""
      );
    }
  }, [product]);

  const handleSubmit = async () => {
    if (!product) return;
    try {
      console.log("Sending barcode:", barcode);
      const result = await updateProduct({
        id: product.id,
        name,
        price,
        stock,
        barcode: barcode || undefined,
        image: imageChanged ? image : null,
        colors: colors.split(",").map((c) => c.trim()).filter(Boolean),
        sizes: sizes.split(",").map((s) => s.trim()).filter(Boolean),
        materials: materials.split(",").map((m) => m.trim()).filter(Boolean),
      }).unwrap();
console.log("Response:", result);
      toast.success("Product updated successfully");
      onSuccess();
      onClose();
      
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to update product");
    }
  };

  const fieldClass = "bg-white border rounded-lg focus-visible:ring-2 focus-visible:ring-offset-0";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">

        {/* Header */}
        <DialogHeader className="px-6 py-5 bg-blue-50 border-b border-blue-100 shrink-0">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2 text-slate-800">
            <Edit3 size={18} className="text-indigo-600" />
            Update Product
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-0.5">Edit the details of your product</p>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-indigo-700 text-sm font-medium">
              <Edit3 size={13} /> Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${fieldClass} border-indigo-200 focus-visible:ring-indigo-300`}
            />
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
              <DollarSign size={13} /> Price
            </Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className={`${fieldClass} border-emerald-200 focus-visible:ring-emerald-300`}
            />
          </div>

          {/* Stock */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-purple-700 text-sm font-medium">
              <Package size={13} /> Stock
            </Label>
            <Input
              type="number"
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className={`${fieldClass} border-purple-200 focus-visible:ring-purple-300`}
            />
          </div>

          {/* Image */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-pink-600 text-sm font-medium">
              <Palette size={13} /> Image
            </Label>
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className={`${fieldClass} border-pink-200 focus-visible:ring-pink-300`}
            />
            {preview && (
              <img
                src={preview}
                alt="preview"
                className="w-20 h-20 object-cover rounded-lg border border-pink-100 shadow-sm mt-1"
              />
            )}
          </div>

          {/* Colors */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-indigo-700 text-sm font-medium">
              <Palette size={13} /> Colors
              <span className="text-xs text-slate-400 font-normal">(comma separated)</span>
            </Label>
            <Input
              value={colors}
              onChange={(e) => setColors(e.target.value)}
              placeholder="red, blue"
              className={`${fieldClass} border-indigo-200 focus-visible:ring-indigo-300`}
            />
          </div>

          {/* Sizes */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
              <Shirt size={13} /> Sizes
              <span className="text-xs text-slate-400 font-normal">(comma separated)</span>
            </Label>
            <Input
              value={sizes}
              onChange={(e) => setSizes(e.target.value)}
              placeholder="S, M, L"
              className={`${fieldClass} border-emerald-200 focus-visible:ring-emerald-300`}
            />
          </div>

          {/* Materials */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-purple-700 text-sm font-medium">
              <Layers size={13} /> Materials
              <span className="text-xs text-slate-400 font-normal">(comma separated)</span>
            </Label>
            <Input
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              placeholder="cotton, wool"
              className={`${fieldClass} border-purple-200 focus-visible:ring-purple-300`}
            />
          </div>

          {/* Barcode */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-indigo-700 text-sm font-medium">
              <ScanBarcode size={13} /> Barcode
            </Label>
            <div className="flex gap-2">
              <Input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or type barcode"
                className={`${fieldClass} border-indigo-200 focus-visible:ring-indigo-300 font-mono flex-1`}
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 text-xs px-3 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                onClick={() => {
                  const digits = Array.from({ length: 12 }, () =>
                    Math.floor(Math.random() * 10)
                  );
                  const check =
                    (10 -
                      (digits.reduce(
                        (sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3),
                        0
                      ) %
                        10)) %
                    10;
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
            {barcode && (
              <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 mb-2">Sticker Preview</p>
                <BarcodeSticker productName={name} barcode={barcode} />
              </div>
            )}
          </div>

          {/* Category (read-only) */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-pink-600 text-sm font-medium">
              <Tag size={13} /> Category
            </Label>
            <Input
              value={product?.category ?? ""}
              disabled
              className="bg-slate-50 border-slate-200 text-slate-400 rounded-lg opacity-70 cursor-not-allowed"
            />
          </div>

        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-indigo-100 bg-white/60 shrink-0 flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white hover:opacity-90 rounded-lg shadow-md"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};