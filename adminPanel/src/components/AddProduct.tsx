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
import { DollarSign, Edit3, Grid3X3, Hash, Layers, Package, Palette, User } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { useState } from "react";
import { useCreateProductMutation } from "@/redux/product/productApi";
import toast from "react-hot-toast";
import { useGetCategoriesQuery } from "@/redux/category/categoryApi";

const colors = ["red", "orange", "amber", "yellow", "blue", "purple", "cyan", "black", "white", "gray"] as const;
const sizes = ["Small", "Medium", "Large", "Industrial"] as const;

const formSchema = z.object({
  name: z.string().min(1, { message: "Product name is required!" }),
  reference: z.string().min(1, { message: "Reference/SKU is required!" }),
  shortDescription: z.string().min(1).max(60),
  description: z.string().min(1),
  price: z.coerce.number().min(1),
  quantity: z.coerce.number().min(0),
  category: z.coerce.number().min(1, { message: "Category is required" }),
  sizes: z.array(z.enum(sizes)),
  colors: z.array(z.enum(colors)),
  images: z.record(z.string(), z.any()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const AddProduct = () => {
  // ✅ single useForm inside component with all defaultValues
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      reference: "",
      shortDescription: "",
      description: "",
      price: 0,
      quantity: 0,
      category: 0,
      sizes: [],
      colors: [],
      images: {},
    },
  });

  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [createProduct, { isLoading }] = useCreateProductMutation();
  const { data: categories = [], isLoading: categoriesLoading } = useGetCategoriesQuery();

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

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
        name: data.name,
        reference: data.reference,
        price: data.price,
        stock: data.quantity,
        categoryId: data.category,
        image: imageBase64,
        attributes: {
          colors: data.colors,
          sizes: data.sizes,
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

  return (
    <SheetContent className="w-[420px] sm:w-[500px] p-0 bg-gradient-to-b from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <SheetHeader className="p-6 bg-blue-50 border-b border-blue-100 text-slate-900">
        <SheetTitle className="text-xl font-semibold flex items-center gap-2 text-slate-800">
          <User size={18} /> Add Product
        </SheetTitle>
        <p className="text-sm text-slate-500">Create a new product for your store</p>
      </SheetHeader>

      <div className="p-5 max-h-[calc(100vh-140px)] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-indigo-700"><User size={14} /> Name</FormLabel>
                <FormControl>
                  <Input {...field} className="bg-white border-indigo-200 rounded-lg" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="reference" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-indigo-700"><Hash size={14} /> Reference / SKU</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. APSK-730" className="bg-white border-indigo-200 rounded-lg" />
                </FormControl>
                <FormDescription>Unique product code shown in Odoo</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="shortDescription" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-indigo-700"><Edit3 size={14} /> Short Description</FormLabel>
                <FormControl>
                  <Input {...field} className="bg-white border-indigo-200 rounded-lg" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-emerald-700"><Edit3 size={14} /> Description</FormLabel>
                <FormControl>
                  <Textarea {...field} className="bg-white border-emerald-200 rounded-lg" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-emerald-700"><DollarSign size={14} /> Price</FormLabel>
                <FormControl>
                  <Input type="number" {...field} className="bg-white border-emerald-200 rounded-lg" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="quantity" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-purple-700"><Package size={14} /> Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="bg-white border-purple-200 rounded-lg"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-pink-600"><Layers size={14} /> Category</FormLabel>
                <Select onValueChange={(val: any) => field.onChange(Number(val))} disabled={categoriesLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={categoriesLoading ? "Loading..." : "Select category"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat:any) => (
                      <SelectItem key={cat.odooCategoryId} value={String(cat.odooCategoryId)}>
                        {cat.catTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

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
          const values = e.target.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          field.onChange(values);
        }}
      />
    </FormControl>
    <FormDescription>Type sizes separated by commas</FormDescription>
    <FormMessage />
  </FormItem>
)} />
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
                            onCheckedChange={(checked: any) => {
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

            <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white hover:opacity-90 rounded-lg shadow-md">
              {isLoading ? "Creating..." : "Save Product"}
            </Button>
          </form>
        </Form>
      </div>
    </SheetContent>
  );
};

export default AddProduct;