"use client";

import { useEffect, useRef, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product } from "@/app/(dashboard)/products/columns";
import {
  useUpdateProductMutation,
  useGetAttributeOptionsQuery, // ← جديد
} from "@/redux/product/productApi";
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
  MapPin,
  Building2,
  Truck,
  ShoppingCart,
  User,
  X,
} from "lucide-react";

const COLOR_OPTIONS = [
  "red", "orange", "amber", "yellow", "blue", "purple",
  "cyan", "black", "white", "gray", "green", "pink",
] as const;

const SIZE_OPTIONS = ["Small", "Medium", "Large", "Industrial", "XS", "XL", "XXL"] as const;

const MATERIAL_OPTIONS = ["cotton", "wool", "polyester", "leather", "wood", "metal", "plastic"] as const;

const CURRENCIES = ["USD", "EUR"] as const;

const XCD_RATES: Record<string, number> = { USD: 2.7, EUR: 2.9 };

interface Props {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1">
      {title}
    </h3>
    {children}
  </div>
);

const TagInput = ({
  values,
  onChange,
  placeholder,
  presets,
  color = "indigo",
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  presets?: readonly string[];
  color?: string;
}) => {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const borderMap: Record<string, string> = {
    indigo: "border-indigo-200 focus:ring-indigo-300",
    emerald: "border-emerald-200 focus:ring-emerald-300",
    purple: "border-purple-200 focus:ring-purple-300",
  };

  const addValue = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  };

  const removeValue = (val: string) => {
    onChange(values.filter((v) => v !== val));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addValue(input);
    } else if (e.key === "Backspace" && !input && values.length > 0) {
      removeValue(values[values.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <div
        className={`min-h-[40px] flex flex-wrap gap-1.5 px-3 py-2 bg-white border rounded-lg cursor-text ${borderMap[color] ?? borderMap.indigo}`}
        onClick={() => inputRef.current?.focus()}
      >
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
          >
            {v}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeValue(v); }}
              className="hover:text-indigo-900"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input.trim()) addValue(input); }}
          placeholder={values.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] text-sm outline-none bg-transparent"
        />
      </div>

      {presets && (
        <div className="flex flex-wrap gap-1.5">
          {presets
            .filter((p) => !values.includes(p))
            .map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange([...values, preset])}
                className="px-2 py-0.5 rounded-full text-xs border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors capitalize"
              >
                + {preset}
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export const UpdateProductModal = ({ product, open, onClose, onSuccess }: Props) => {

  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [itemNumber, setItemNumber] = useState("");
  const [barcode, setBarcode] = useState("");

  const [price, setPrice] = useState(0);
  const [supplierPrice, setSupplierPrice] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [currency, setCurrency] = useState<"USD" | "EUR">("USD");

  const [stock, setStock] = useState(0);

  const [warehouseName, setWarehouseName] = useState("");
  const [shelfName, setShelfName] = useState("");

  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");

  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);

  const [image, setImage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [imageChanged, setImageChanged] = useState(false);

  const [updateProduct, { isLoading }] = useUpdateProductMutation();

  // ── جديد: جلب القيم الحقيقية الموجودة في Odoo ─────────────────────────
  const { data: sizeData } = useGetAttributeOptionsQuery("sizes");
  const { data: materialData } = useGetAttributeOptionsQuery("materials");

  const sizePresets = sizeData?.values?.length ? sizeData.values : SIZE_OPTIONS;
  const materialPresets = materialData?.values?.length ? materialData.values : MATERIAL_OPTIONS;
  // ──────────────────────────────────────────────────────────────────

  const calculatedXCD = ((supplierPrice + shippingCost) * (XCD_RATES[currency] ?? 2.7)).toFixed(2);
  const [useFinalAsPrice, setUseFinalAsPrice] = useState(false);

  useEffect(() => {
    if (useFinalAsPrice) setPrice(Number(calculatedXCD));
  }, [calculatedXCD, useFinalAsPrice]);

  useEffect(() => {
    if (!product) return;
    const p = product as any;

    setName(p.name ?? "");
    setReference(p.reference ?? p.shortDescription ?? "");
    setItemNumber(p.itemNumber ?? "");
    setBarcode(p.barcode ?? "");

    setPrice(p.price ?? 0);
    setSupplierPrice(p.supplierPrice ?? 0);
    setShippingCost(p.shippingCost ?? 0);
    setCurrency(p.currency ?? "USD");

    setStock(p.qty_available ?? p.stock ?? 0);

    setWarehouseName(p.location?.warehouseName ?? "");
    setShelfName(p.location?.shelfName ?? "");

    setSupplierId(p.supplierInvoiceNumber ?? p.supplierId ?? "");
    setSupplierName(p.supplier ?? p.supplierName ?? "");

    setColors(Array.isArray(p.colors) ? p.colors : []);
    setSizes(Array.isArray(p.sizes) ? p.sizes : []);
    setMaterials(Array.isArray(p.materials) ? p.materials : []);

    setImage(null);
    setImageChanged(false);
    setPreview(p.image_1920 ? `data:image/png;base64,${p.image_1920}` : "");
    setUseFinalAsPrice(false);
  }, [product]);

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

  const generateEAN13 = () => {
    const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
    const check = (10 - (digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 1 : 3), 0) % 10)) % 10;
    setBarcode([...digits, check].join(""));
  };

  const handleSubmit = async () => {
    if (!product) return;
    try {
      const payload: any = {
        id: product.id,
        name,
        reference,
        itemNumber: itemNumber || undefined,
        barcode: barcode || undefined,
        price,
        stock,
        supplierPrice,
        shippingCost,
        currency,
        warehouseName: warehouseName || undefined,
        shelfName: shelfName || undefined,
        supplierId: supplierId || undefined,
        supplierName: supplierName || undefined,
        attributes: { colors, sizes, materials },
      };

      if (imageChanged && image) payload.image = image;

      await updateProduct(payload).unwrap();
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">

        <DialogHeader className="px-6 py-5 bg-blue-50 border-b border-blue-100 shrink-0">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2 text-slate-800">
            <Edit3 size={18} className="text-indigo-600" />
            Update Product
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-0.5">Edit and sync with Odoo</p>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-8">

          <Section title="Product Identity">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-indigo-700 text-sm font-medium">
                <Edit3 size={13} /> Name *
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)}
                className={`${fieldClass} border-indigo-200`} />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-indigo-700 text-sm font-medium">
                <Hash size={13} /> Reference / SKU
              </Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. APSK-730"
                className={`${fieldClass} border-indigo-200`} />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-indigo-700 text-sm font-medium">
                <Tag size={13} /> Item Number
              </Label>
              <Input value={itemNumber} onChange={(e) => setItemNumber(e.target.value)}
                placeholder="Internal item #"
                className={`${fieldClass} border-indigo-200`} />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-indigo-700 text-sm font-medium">
                <ScanBarcode size={13} /> Barcode
              </Label>
              <div className="flex gap-2">
                <Input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or type barcode"
                  className={`${fieldClass} border-indigo-200 font-mono flex-1`}
                />
                <Button type="button" variant="outline"
                  className="shrink-0 text-xs px-3 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  onClick={generateEAN13}>
                  Generate
                </Button>
              </div>
              {!barcode && (
                <p className="text-xs text-amber-600">⚠ No barcode — scanner won't find this product</p>
              )}
              {barcode && (
                <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Sticker Preview</p>
                  <BarcodeSticker productName={name} barcode={barcode} />
                </div>
              )}
            </div>
          </Section>

          <Section title="Pricing & Cost">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                <DollarSign size={13} /> Currency
              </Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as "USD" | "EUR")}>
                <SelectTrigger className="bg-white border-emerald-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                <DollarSign size={13} /> Sale Price *
              </Label>
              <Input type="number" min={0} step="0.01" value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className={`${fieldClass} border-emerald-200`} />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                <ShoppingCart size={13} /> Supplier Price
              </Label>
              <Input type="number" min={0} step="0.01" value={supplierPrice}
                onChange={(e) => setSupplierPrice(Number(e.target.value))}
                className={`${fieldClass} border-emerald-200`} />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                <Truck size={13} /> Shipping Cost
              </Label>
              <Input type="number" min={0} step="0.01" value={shippingCost}
                onChange={(e) => setShippingCost(Number(e.target.value))}
                className={`${fieldClass} border-emerald-200`} />
            </div>

            <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Final Price (XCD)</span>
                <span className="font-semibold text-emerald-700">XCD {calculatedXCD}</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={useFinalAsPrice}
                  onCheckedChange={(c) => setUseFinalAsPrice(!!c)}
                />
                <span className="text-sm text-slate-600">Use final price as sale price</span>
              </label>
            </div>
          </Section>

          <Section title="Inventory">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-purple-700 text-sm font-medium">
                <Package size={13} /> Stock *
              </Label>
              <Input type="number" min={0} value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className={`${fieldClass} border-purple-200`} />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-pink-600 text-sm font-medium">
                <Tag size={13} /> Category
              </Label>
              <Input
                value={(product as any)?.category ?? ""}
                disabled
                className="bg-slate-50 border-slate-200 text-slate-400 rounded-lg opacity-70 cursor-not-allowed"
              />
            </div>
          </Section>

          <Section title="Storage Location">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sky-700 text-sm font-medium">
                <MapPin size={13} /> Shelf Name
              </Label>
              <Input value={shelfName} onChange={(e) => setShelfName(e.target.value)}
                placeholder="e.g. Shelf A"
                className={`${fieldClass} border-sky-200`} />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sky-700 text-sm font-medium">
                <Building2 size={13} /> Warehouse Name
              </Label>
              <Input value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)}
                placeholder="e.g. Main Warehouse"
                className={`${fieldClass} border-sky-200`} />
            </div>
          </Section>

          <Section title="Supplier">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-orange-600 text-sm font-medium">
                <User size={13} /> Supplier Invoice #
              </Label>
              <Input value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                placeholder="e.g. INV-2024-001"
                className={`${fieldClass} border-orange-200`} />
              <p className="text-xs text-slate-400">Shared invoice reference across products</p>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-orange-600 text-sm font-medium">
                <User size={13} /> Supplier Name
              </Label>
              <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className={`${fieldClass} border-orange-200`} />
            </div>
          </Section>

          <Section title="Attributes">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-indigo-700 text-sm font-medium">
                <Palette size={13} /> Colors
                <span className="text-xs text-slate-400 font-normal">press Enter or comma to add</span>
              </Label>
              <TagInput
                values={colors}
                onChange={setColors}
                placeholder="Type a color…"
                presets={COLOR_OPTIONS}
                color="indigo"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                <Shirt size={13} /> Sizes
                <span className="text-xs text-slate-400 font-normal">press Enter or comma to add</span>
              </Label>
              <TagInput
                values={sizes}
                onChange={setSizes}
                placeholder="Type a size…"
                presets={sizePresets}
                color="emerald"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-purple-700 text-sm font-medium">
                <Layers size={13} /> Materials
                <span className="text-xs text-slate-400 font-normal">press Enter or comma to add</span>
              </Label>
              <TagInput
                values={materials}
                onChange={setMaterials}
                placeholder="Type a material…"
                presets={materialPresets}
                color="purple"
              />
            </div>
          </Section>

          <Section title="Product Image">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-pink-600 text-sm font-medium">
                <Palette size={13} /> Upload new image
              </Label>
              <Input type="file" accept="image/*" onChange={handleImageChange}
                className={`${fieldClass} border-pink-200`} />
              {preview && (
                <img src={preview} alt="preview"
                  className="w-24 h-24 object-cover rounded-xl border border-pink-100 shadow-sm mt-1" />
              )}
            </div>
          </Section>

        </div>

        <DialogFooter className="px-6 py-4 border-t border-indigo-100 bg-white/60 shrink-0 flex gap-2">
          <Button variant="outline" onClick={onClose}
            className="border-slate-200 text-slate-600 hover:bg-slate-50">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white hover:opacity-90 rounded-lg shadow-md">
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};