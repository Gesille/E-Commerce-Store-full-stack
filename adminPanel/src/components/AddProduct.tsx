"use client";

import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "./ui/button";
import {
  DollarSign, Edit3, Grid3X3, Hash, Layers, Package, Palette, User,
  MapPin, Truck, Building2, Tag, ShoppingCart,
} from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { useEffect, useRef, useState } from "react";
import { useCreateProductMutation } from "@/redux/product/productApi";
import toast from "react-hot-toast";
import { useGetCategoriesQuery } from "@/redux/category/categoryApi";
import { BarcodeSticker } from "./BarcodeSticker";

// ─── Constants ───────────────────────────────────────────────────────────────

const colors = ["red", "orange", "amber", "yellow", "blue", "purple", "cyan", "black", "white", "gray"] as const;
const sizes  = ["Small", "Medium", "Large", "Industrial"] as const;
const CURRENCIES = ["USD", "EUR"] as const;

// ─── Schema ──────────────────────────────────────────────────────────────────

const formSchema = z.object({
  // Core
  name:             z.string().min(1, { message: "Product name is required!" }),
  reference:        z.string().min(1, { message: "Reference/SKU is required!" }),
  itemNumber:       z.string().optional(),
  barcode:          z.string().optional(),
  shortDescription: z.string().min(1).max(60),
  description:      z.string().min(1),

  // Pricing
  price:            z.coerce.number().min(0),
  supplierPrice:    z.coerce.number().min(0).optional(),
  shippingCost:     z.coerce.number().min(0).optional(),
  currency:         z.enum(CURRENCIES).default("USD"),

  // Inventory
  quantity:         z.coerce.number().min(0),
  category:         z.coerce.number().min(1, { message: "Category is required" }),

  // Location
  locationId:       z.coerce.number().optional(),
  warehouseId:      z.coerce.number().optional(),
  warehouseName:    z.string().optional(),
  shelfName:        z.string().optional(),

  // Supplier
  supplierId:       z.coerce.number().optional(),
  supplierName:     z.string().optional(),

  // Attributes
  sizes:            z.array(z.enum(sizes)),
  colors:           z.array(z.enum(colors)),
  images:           z.record(z.string(), z.any()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Section wrapper ──────────────────────────────────────────────────────────

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1">
      {title}
    </h3>
    {children}
  </div>
);

// ─── Component ───────────────────────────────────────────────────────────────

const AddProduct = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "", reference: "", itemNumber: "", barcode: "",
      shortDescription: "", description: "",
      price: 0, supplierPrice: 0, shippingCost: 0, currency: "USD",
      quantity: 0, category: 0,
      locationId: undefined, warehouseId: undefined, warehouseName: "", shelfName: "",
      supplierId: undefined, supplierName: "",
      sizes: [], colors: [], images: {},
    },
  });

  const [imagePreviews, setImagePreviews]         = useState<Record<string, string>>({});
  const [createProduct, { isLoading }]            = useCreateProductMutation();
  const { data: categories = [], isLoading: categoriesLoading } = useGetCategoriesQuery();

  const barcodeRef   = useRef<HTMLInputElement>(null);
  const watchedBarcode = form.watch("barcode");

  // XCD preview
  const supplierPrice = form.watch("supplierPrice") ?? 0;
  const shippingCost  = form.watch("shippingCost") ?? 0;
  const currency      = form.watch("currency") ?? "USD";
  const XCD_RATES: Record<string, number> = { USD: 2.7, EUR: 2.9 };
  const xcdPreview = ((Number(supplierPrice) + Number(shippingCost)) * (XCD_RATES[currency] ?? 2.7)).toFixed(2);

  // Base64 helper
  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror  = reject;
      reader.readAsDataURL(file);
    });

  // Barcode scanner
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = 0;
    let timer: ReturnType<typeof setTimeout>;

    const handler = (e: KeyboardEvent) => {
      const active       = document.activeElement;
      const isBarcodeField = active === barcodeRef.current;
      const isOtherInput = active?.tagName === "INPUT" || active?.tagName === "TEXTAREA";
      if (isOtherInput && !isBarcodeField) return;

      const now = Date.now();
      const gap = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === "Enter" && buffer.length > 2) {
        e.preventDefault();
        form.setValue("barcode", buffer.trim());
        barcodeRef.current?.focus();
        buffer = "";
        clearTimeout(timer);
        return;
      }
      if (e.key.length === 1 && (gap < 50 || isBarcodeField)) {
        if (!isBarcodeField) e.preventDefault();
        buffer += e.key;
        clearTimeout(timer);
        timer = setTimeout(() => { buffer = ""; }, 150);
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [form]);

  // Submit
  const onSubmit = async (data: FormValues) => {
    try {
      let imageBase64: string | undefined;
      if (data.images && data.colors.length > 0) {
        const firstColorFile = data.images[data.colors[0]];
        if (firstColorFile instanceof File) {
          imageBase64 = await toBase64(firstColorFile);
        }
      }

      await createProduct({
        name:          data.name,
        reference:     data.reference,
        itemNumber:    data.itemNumber || undefined,
        barcode:       data.barcode   || undefined,
        price:         data.price,
        stock:         data.quantity,
        categoryId:    data.category,
        image:         imageBase64,

        supplierPrice: data.supplierPrice,
        shippingCost:  data.shippingCost,
        currency:      data.currency,

        locationId:    data.locationId,
        warehouseId:   data.warehouseId,
        warehouseName: data.warehouseName,
        shelfName:     data.shelfName,

        supplierId:    data.supplierId,
        supplierName:  data.supplierName,

        attributes: {
          colors:    data.colors,
          sizes:     data.sizes,
          materials: [],
        },
      }).unwrap();

      toast.success("Product created successfully!");
      form.reset();
      setImagePreviews({});
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to create product");
    }
  };

  // EAN-13 generator
  const generateEAN13 = () => {
    const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
    const check  = (10 - (digits.reduce((sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3), 0) % 10)) % 10;
    form.setValue("barcode", [...digits, check].join(""));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SheetContent className="w-[440px] sm:w-[520px] p-0 bg-gradient-to-b from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <SheetHeader className="p-6 bg-blue-50 border-b border-blue-100 text-slate-900">
        <SheetTitle className="text-xl font-semibold flex items-center gap-2 text-slate-800">
          <Package size={18} /> Add Product
        </SheetTitle>
        <p className="text-sm text-slate-500">Fill all fields to sync with Odoo correctly</p>
      </SheetHeader>

      <div className="p-5 max-h-[calc(100vh-140px)] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

            {/* ── 1. Identity ─────────────────────────────────────────── */}
            <Section title="Product Identity">
              {/* Name */}
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-indigo-700"><User size={14} /> Name *</FormLabel>
                  <FormControl><Input {...field} className="bg-white border-indigo-200 rounded-lg" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Reference */}
              <FormField control={form.control} name="reference" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-indigo-700"><Hash size={14} /> Reference / SKU *</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. APSK-730" className="bg-white border-indigo-200 rounded-lg" /></FormControl>
                  <FormDescription>Stored as <code>default_code</code> in Odoo</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Item Number */}
              <FormField control={form.control} name="itemNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-indigo-700"><Tag size={14} /> Item Number</FormLabel>
                  <FormControl><Input {...field} placeholder="Internal item #" className="bg-white border-indigo-200 rounded-lg" /></FormControl>
                  <FormDescription>Overrides Reference in Odoo if provided</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Barcode */}
              <FormField control={form.control} name="barcode" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-indigo-700">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 9V5a2 2 0 012-2h4M3 15v4a2 2 0 002 2h4M21 9V5a2 2 0 00-2-2h-4M21 15v4a2 2 0 01-2 2h-4" />
                      <line x1="7" y1="12" x2="17" y2="12" />
                    </svg>
                    Barcode
                  </FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        {...field}
                        ref={(el) => { field.ref(el); (barcodeRef as any).current = el; }}
                        placeholder="Scan or type barcode"
                        className="bg-white border-indigo-200 rounded-lg font-mono flex-1"
                      />
                    </FormControl>
                    <Button type="button" variant="outline" className="shrink-0 text-xs px-3" onClick={generateEAN13}>
                      Generate
                    </Button>
                  </div>
                  {watchedBarcode && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 mb-2">Sticker Preview</p>
                      <BarcodeSticker productName={form.watch("name") || "Product"} barcode={watchedBarcode} />
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              {/* Short Description */}
              <FormField control={form.control} name="shortDescription" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-indigo-700"><Edit3 size={14} /> Short Description *</FormLabel>
                  <FormControl><Input {...field} className="bg-white border-indigo-200 rounded-lg" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Description */}
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-emerald-700"><Edit3 size={14} /> Description *</FormLabel>
                  <FormControl><Textarea {...field} className="bg-white border-emerald-200 rounded-lg" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </Section>

            {/* ── 2. Pricing ──────────────────────────────────────────── */}
            <Section title="Pricing & Cost">
              {/* Currency */}
              <FormField control={form.control} name="currency" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-emerald-700"><DollarSign size={14} /> Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white border-emerald-200">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Sale Price */}
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-emerald-700"><DollarSign size={14} /> Sale Price *</FormLabel>
                  <FormControl><Input type="number" min={0} step="0.01" {...field} className="bg-white border-emerald-200 rounded-lg" /></FormControl>
                  <FormDescription>Shown to customers (<code>list_price</code>)</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Supplier Price */}
              <FormField control={form.control} name="supplierPrice" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-emerald-700"><ShoppingCart size={14} /> Supplier Price</FormLabel>
                  <FormControl><Input type="number" min={0} step="0.01" {...field} className="bg-white border-emerald-200 rounded-lg" /></FormControl>
                  <FormDescription>Cost price in selected currency (<code>standard_price</code>)</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Shipping Cost */}
              <FormField control={form.control} name="shippingCost" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-emerald-700"><Truck size={14} /> Shipping Cost</FormLabel>
                  <FormControl><Input type="number" min={0} step="0.01" {...field} className="bg-white border-emerald-200 rounded-lg" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* XCD preview */}
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm">
                <span className="text-slate-500">Final Price (XCD)</span>
                <span className="font-semibold text-emerald-700">XCD {xcdPreview}</span>
              </div>
            </Section>

            {/* ── 3. Inventory ────────────────────────────────────────── */}
            <Section title="Inventory">
              {/* Quantity */}
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-purple-700"><Package size={14} /> Opening Stock *</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} className="bg-white border-purple-200 rounded-lg" />
                  </FormControl>
                  <FormDescription>Applied via <code>stock.quant</code> inventory adjustment</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Category */}
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-pink-600"><Layers size={14} /> Category *</FormLabel>
                  <Select onValueChange={(val) => field.onChange(Number(val))} disabled={categoriesLoading}>
                    <FormControl>
                      <SelectTrigger className="bg-white border-pink-200">
                        <SelectValue placeholder={categoriesLoading ? "Loading..." : "Select category"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.odooCategoryId} value={String(cat.odooCategoryId)}>
                          {cat.catTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </Section>

            {/* ── 4. Location ─────────────────────────────────────────── */}
            <Section title="Storage Location">
              {/* Location ID */}
              <FormField control={form.control} name="locationId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-sky-700"><MapPin size={14} /> Location ID</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} placeholder="Odoo stock.location ID" {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} className="bg-white border-sky-200 rounded-lg" />
                  </FormControl>
                  <FormDescription>Leave empty to use default internal location</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Shelf Name */}
              <FormField control={form.control} name="shelfName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-sky-700"><MapPin size={14} /> Shelf Name</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Shelf A" className="bg-white border-sky-200 rounded-lg" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Warehouse ID */}
              <FormField control={form.control} name="warehouseId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-sky-700"><Building2 size={14} /> Warehouse ID</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} placeholder="Odoo warehouse ID" {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} className="bg-white border-sky-200 rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Warehouse Name */}
              <FormField control={form.control} name="warehouseName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-sky-700"><Building2 size={14} /> Warehouse Name</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Main Warehouse" className="bg-white border-sky-200 rounded-lg" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </Section>

            {/* ── 5. Supplier ─────────────────────────────────────────── */}
            <Section title="Supplier">
              {/* Supplier ID */}
              <FormField control={form.control} name="supplierId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-orange-600"><User size={14} /> Supplier ID</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} placeholder="Odoo res.partner ID" {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} className="bg-white border-orange-200 rounded-lg" />
                  </FormControl>
                  <FormDescription>Creates a <code>product.supplierinfo</code> record</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Supplier Name */}
              <FormField control={form.control} name="supplierName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-orange-600"><User size={14} /> Supplier Name</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Acme Corp" className="bg-white border-orange-200 rounded-lg" /></FormControl>
                  <FormDescription>Stored in MongoDB only (display label)</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </Section>

            {/* ── 6. Attributes ───────────────────────────────────────── */}
            <Section title="Attributes">
              {/* Sizes */}
              <FormField control={form.control} name="sizes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-emerald-700">
                    <Grid3X3 size={14} /> Sizes
                    <span className="text-xs text-muted-foreground font-normal">(comma separated)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Small, Medium, Large, Industrial"
                      className="bg-white border-emerald-200 rounded-lg"
                      onChange={(e) => {
                        const values = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                        field.onChange(values);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Colors */}
              <FormField control={form.control} name="colors" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-indigo-700"><Palette size={14} /> Colors</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {colors.map((color) => (
                          <label key={color} className="flex items-center gap-2 p-2 rounded-md border bg-white border-indigo-100 cursor-pointer hover:bg-indigo-50 transition">
                            <Checkbox
                              checked={field.value?.includes(color)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                field.onChange(checked ? [...current, color] : current.filter((v) => v !== color));
                              }}
                            />
                            <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: color }} />
                            <span className="text-sm capitalize text-slate-700">{color}</span>
                          </label>
                        ))}
                      </div>

                      {field.value && field.value.length > 0 && (
                        <div className="space-y-3 pt-2 border-t border-indigo-100">
                          <p className="text-sm font-medium text-slate-600">Upload images for selected colors</p>
                          {field.value.map((color) => (
                            <div key={color} className="flex items-center gap-3 p-2 rounded-md border border-indigo-100 bg-white">
                              <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: color }} />
                              <span className="text-sm capitalize text-slate-700 w-20">{color}</span>
                              <div className="flex flex-col gap-2 w-full">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  className="flex-1 text-sm"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const current = form.getValues("images") || {};
                                    form.setValue("images", { ...current, [color]: file });
                                    setImagePreviews((prev) => ({ ...prev, [color]: URL.createObjectURL(file) }));
                                  }}
                                />
                                {imagePreviews[color] && (
                                  <img src={imagePreviews[color]} alt={`${color} preview`} className="w-14 h-14 object-cover rounded-md border shadow-sm" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </Section>

            {/* ── Submit ──────────────────────────────────────────────── */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white hover:opacity-90 rounded-lg shadow-md"
            >
              {isLoading ? "Creating..." : "Save Product"}
            </Button>

          </form>
        </Form>
      </div>
    </SheetContent>
  );
};

export default AddProduct;