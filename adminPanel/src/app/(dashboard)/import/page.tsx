"use client";

import { useRef, useState, useCallback } from "react";
import Papa from "papaparse";
import { useGetCategoriesQuery } from "@/redux/category/categoryApi";
import { useCreateProductMutation } from "@/redux/product/productApi";
import toast from "react-hot-toast";
import {
  Upload,
  FileText,
  X,
  Check,
  AlertCircle,
  ChevronDown,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type RowStatus = "pending" | "uploading" | "success" | "error";

interface ProductRow {
  id: string;
  // Identity
  name: string;
  reference: string;
  itemNumber: string;
  barcode: string;
  // Pricing
  price: string;
  supplierPrice: string;
  shippingCost: string;
  currency: string;
  // Inventory
  stock: string;
  categoryId: string;
  // Location
  warehouseName: string;
  shelfName: string;
  // Supplier
  supplierId: string;
  supplierName: string;
  // Attributes (comma-separated strings)
  colors: string;
  sizes: string;
  materials: string;
  brand: string;
  // Status
  status: RowStatus;
  errorMessage?: string;
}

// ─── CSV template headers (must match exactly) ───────────────────────────────

const CSV_HEADERS = [
  "name",
  "reference",
  "itemNumber",
  "barcode",
  "price",
  "supplierPrice",
  "shippingCost",
  "currency",
  "stock",
  "categoryId",
  "warehouseName",
  "shelfName",
  "supplierId",
  "supplierName",
  "colors",
  "sizes",
  "materials",
  "brand",
];

const SAMPLE_CSV = `name,reference,itemNumber,barcode,price,supplierPrice,shippingCost,currency,stock,categoryId,warehouseName,shelfName,supplierId,supplierName,colors,sizes,materials,brand
Gastronorm Pan 1/1,NFBU1.1BK,ITM-001,5901234123457,45.00,28.00,3.50,USD,24,1,Main Warehouse,Shelf A,INV-2024-001,RAK Porcelain,Black,1.1|2.1,Porcelain,RAK PORCLAIN
Chef Knife 20cm,CK-200,ITM-002,5901234123458,32.00,18.00,2.00,USD,50,2,Main Warehouse,Shelf B,INV-2024-001,Victorinox,Silver|Black,Small|Large,Stainless Steel,Victorinox`;

// ─── Editable cell ────────────────────────────────────────────────────────────

const EditableCell = ({
  value,
  onChange,
  type = "text",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) => (
  <Input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    type={type}
    className={cn(
      "h-7 text-xs px-2 min-w-[80px] border-0 bg-transparent focus:bg-white focus:border focus:border-indigo-300 rounded transition",
      className
    )}
  />
);

// ─── Category select cell ─────────────────────────────────────────────────────

const CategoryCell = ({
  value,
  categories,
  onChange,
}: {
  value: string;
  categories: any[];
  onChange: (v: string) => void;
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="h-7 text-xs min-w-[120px] border-0 bg-transparent focus:bg-white focus:border focus:border-indigo-300">
      <SelectValue placeholder="Select…" />
    </SelectTrigger>
    <SelectContent>
      {categories.map((cat: any) => (
        <SelectItem key={cat.odooCategoryId} value={String(cat.odooCategoryId)}>
          {cat.catTitle}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

// ─── Status badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({
  status,
  error,
}: {
  status: RowStatus;
  error?: string;
}) => {
  if (status === "pending")
    return (
      <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
        Pending
      </Badge>
    );
  if (status === "uploading")
    return (
      <Badge className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 border">
        <Loader2 size={10} className="animate-spin mr-1" />
        Uploading
      </Badge>
    );
  if (status === "success")
    return (
      <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 border">
        <Check size={10} className="mr-1" />
        Done
      </Badge>
    );
  return (
    <div className="flex flex-col gap-0.5">
      <Badge className="text-[10px] bg-red-50 text-red-700 border-red-200 border whitespace-nowrap">
        <AlertCircle size={10} className="mr-1" />
        Failed
      </Badge>
      {error && (
        <span className="text-[9px] text-red-500 max-w-[140px] leading-tight">
          {error}
        </span>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ImportProductsPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: categories = [], isLoading: categoriesLoading } = useGetCategoriesQuery();
  const [createProduct] = useCreateProductMutation();

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    success: rows.filter((r) => r.status === "success").length,
    error: rows.filter((r) => r.status === "error").length,
  };

  // ── Parse CSV ──────────────────────────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result:any) => {
        const parsed: ProductRow[] = (result.data as any[]).map((row, i) => ({
          id: `row-${Date.now()}-${i}`,
          name: row.name ?? "",
          reference: row.reference ?? "",
          itemNumber: row.itemNumber ?? "",
          barcode: row.barcode ?? "",
          price: row.price ?? "0",
          supplierPrice: row.supplierPrice ?? "0",
          shippingCost: row.shippingCost ?? "0",
          currency: row.currency ?? "USD",
          stock: row.stock ?? "0",
          categoryId: row.categoryId ?? "",
          warehouseName: row.warehouseName ?? "",
          shelfName: row.shelfName ?? "",
          supplierId: row.supplierId ?? "",
          supplierName: row.supplierName ?? "",
          colors: row.colors ?? "",
          sizes: row.sizes ?? "",
          materials: row.materials ?? "",
          brand: row.brand ?? "",
          status: "pending",
        }));
        setRows(parsed);
        toast.success(`${parsed.length} rows loaded — review before importing`);
      },
      error: (err:any) => {
        toast.error("Failed to parse CSV: " + err.message);
      },
    });
  }, []);

  // ── Drop zone ──────────────────────────────────────────────────────────────
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith(".csv")) parseFile(file);
      else toast.error("Please drop a .csv file");
    },
    [parseFile]
  );

  // ── Edit a cell ────────────────────────────────────────────────────────────
  const updateRow = (id: string, field: keyof ProductRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value, status: r.status === "error" ? "pending" : r.status } : r))
    );
  };

  // ── Remove row ─────────────────────────────────────────────────────────────
  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // ── Submit one row ─────────────────────────────────────────────────────────
  const submitRow = async (row: ProductRow) => {
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, status: "uploading" } : r))
    );

    try {
      const splitPipe = (s: string) =>
        s ? s.split("|").map((v) => v.trim()).filter(Boolean) : [];

      await createProduct({
        name: row.name,
        reference: row.reference,
        itemNumber: row.itemNumber || undefined,
        barcode: row.barcode || undefined,
        price: Number(row.price),
        stock: Number(row.stock),
        categoryId: Number(row.categoryId),
        supplierPrice: Number(row.supplierPrice),
        shippingCost: Number(row.shippingCost),
       
        supplierId: row.supplierId || undefined,
        supplierName: row.supplierName || undefined,
        warehouseName: row.warehouseName || undefined,
        shelfName: row.shelfName || undefined,
        attributes: {
          colors: splitPipe(row.colors),
          sizes: splitPipe(row.sizes),
          materials: [
            ...splitPipe(row.materials),
            ...(row.brand ? splitPipe(row.brand) : []),
          ],
        },
      }).unwrap();

      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, status: "success" } : r))
      );
    } catch (err: any) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, status: "error", errorMessage: err?.data?.message ?? err?.message ?? "Unknown error" }
            : r
        )
      );
    }
  };

  // ── Import all pending ─────────────────────────────────────────────────────
  const importAll = async () => {
    const pendingRows = rows.filter((r) => r.status === "pending");
    if (!pendingRows.length) {
      toast("No pending rows to import");
      return;
    }

    // Validate: name and categoryId required
    const invalid = pendingRows.filter((r) => !r.name.trim() || !r.categoryId);
    if (invalid.length) {
      toast.error(`${invalid.length} row(s) missing Name or Category`);
      return;
    }

    for (const row of pendingRows) {
      await submitRow(row);
    }

    toast.success("Import complete!");
  };

  // ── Retry failed ───────────────────────────────────────────────────────────
  const retryFailed = () => {
    setRows((prev) =>
      prev.map((r) => (r.status === "error" ? { ...r, status: "pending", errorMessage: undefined } : r))
    );
  };

  // ── Download sample ────────────────────────────────────────────────────────
  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_import_template.csv";
    a.click();
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">
      {/* Header */}
      <div className="max-w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
              <Upload size={22} className="text-indigo-600" />
              Import Products
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Upload a CSV file, review and edit each row, then sync to Odoo
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSample}
              className="text-xs gap-1.5"
            >
              <Download size={13} />
              Download Template
            </Button>

            {stats.error > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={retryFailed}
                className="text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
              >
                <RefreshCw size={13} />
                Retry {stats.error} failed
              </Button>
            )}

            {rows.length > 0 && (
              <Button
                size="sm"
                onClick={importAll}
                disabled={stats.pending === 0}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                <Upload size={13} />
                Import {stats.pending} pending
              </Button>
            )}
          </div>
        </div>

        {/* Stats bar */}
        {rows.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-100 text-xs">
              <span className="text-slate-500">Total</span>
              <span className="font-semibold text-slate-700">{stats.total}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-100 text-xs">
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              <span className="text-slate-500">Pending</span>
              <span className="font-semibold text-slate-700">{stats.pending}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100 text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-600">Success</span>
              <span className="font-semibold text-emerald-700">{stats.success}</span>
            </div>
            {stats.error > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg border border-red-100 text-xs">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-600">Failed</span>
                <span className="font-semibold text-red-700">{stats.error}</span>
              </div>
            )}
          </div>
        )}

        {/* Drop zone */}
        {rows.length === 0 && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all mb-6",
              isDragging
                ? "border-indigo-400 bg-indigo-50"
                : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
            )}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <FileText size={24} className="text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Drop your CSV file here or click to browse
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Use pipe <code className="bg-slate-100 px-1 rounded">|</code> to separate multiple values in colors, sizes, materials
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-1">
                {CSV_HEADERS.map((h) => (
                  <span key={h} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                    {h}
                  </span>
                ))}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) parseFile(file);
              }}
            />
          </div>
        )}

        {/* Table */}
        {rows.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Replace file button */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500 font-medium">
                {rows.length} products loaded — click any cell to edit
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500 hover:text-slate-700 gap-1"
                onClick={() => {
                  setRows([]);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <X size={12} />
                Clear & upload new file
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-3 py-2.5 text-left font-medium text-slate-500 whitespace-nowrap sticky left-0 bg-slate-50 z-10">#</th>
                    <th className="px-2 py-2.5 text-left font-medium text-slate-500 whitespace-nowrap">Status</th>
                    {/* Identity */}
                    <th className="px-2 py-2.5 text-left font-medium text-indigo-600 whitespace-nowrap">Name *</th>
                    <th className="px-2 py-2.5 text-left font-medium text-indigo-600 whitespace-nowrap">Reference *</th>
                    <th className="px-2 py-2.5 text-left font-medium text-slate-500 whitespace-nowrap">Item #</th>
                    <th className="px-2 py-2.5 text-left font-medium text-slate-500 whitespace-nowrap">Barcode</th>
                    {/* Pricing */}
                    <th className="px-2 py-2.5 text-left font-medium text-emerald-600 whitespace-nowrap">Price</th>
                    <th className="px-2 py-2.5 text-left font-medium text-emerald-600 whitespace-nowrap">Supplier Price</th>
                    <th className="px-2 py-2.5 text-left font-medium text-emerald-600 whitespace-nowrap">Shipping</th>
                    <th className="px-2 py-2.5 text-left font-medium text-emerald-600 whitespace-nowrap">Currency</th>
                    {/* Inventory */}
                    <th className="px-2 py-2.5 text-left font-medium text-purple-600 whitespace-nowrap">Stock</th>
                    <th className="px-2 py-2.5 text-left font-medium text-purple-600 whitespace-nowrap">Category *</th>
                    {/* Location */}
                    <th className="px-2 py-2.5 text-left font-medium text-sky-600 whitespace-nowrap">Warehouse</th>
                    <th className="px-2 py-2.5 text-left font-medium text-sky-600 whitespace-nowrap">Shelf</th>
                    {/* Supplier */}
                    <th className="px-2 py-2.5 text-left font-medium text-orange-600 whitespace-nowrap">Invoice #</th>
                    <th className="px-2 py-2.5 text-left font-medium text-orange-600 whitespace-nowrap">Supplier Name</th>
                    {/* Attributes */}
                    <th className="px-2 py-2.5 text-left font-medium text-pink-600 whitespace-nowrap">Colors</th>
                    <th className="px-2 py-2.5 text-left font-medium text-pink-600 whitespace-nowrap">Sizes</th>
                    <th className="px-2 py-2.5 text-left font-medium text-pink-600 whitespace-nowrap">Materials</th>
                    <th className="px-2 py-2.5 text-left font-medium text-pink-600 whitespace-nowrap">Brand</th>
                    {/* Actions */}
                    <th className="px-2 py-2.5 text-left font-medium text-slate-400 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "group hover:bg-slate-50/80 transition",
                        row.status === "success" && "bg-emerald-50/30",
                        row.status === "error" && "bg-red-50/30",
                        row.status === "uploading" && "bg-indigo-50/30 opacity-70"
                      )}
                    >
                      {/* Row number */}
                      <td className="px-3 py-1.5 text-slate-400 font-mono sticky left-0 bg-white group-hover:bg-slate-50/80 z-10">
                        {idx + 1}
                      </td>

                      {/* Status */}
                      <td className="px-2 py-1.5">
                        <StatusBadge status={row.status} error={row.errorMessage} />
                      </td>

                      {/* Name */}
                      <td className="px-1 py-1">
                        <EditableCell
                          value={row.name}
                          onChange={(v) => updateRow(row.id, "name", v)}
                          className={!row.name.trim() ? "border border-red-300 bg-red-50" : ""}
                        />
                      </td>

                      {/* Reference */}
                      <td className="px-1 py-1">
                        <EditableCell
                          value={row.reference}
                          onChange={(v) => updateRow(row.id, "reference", v)}
                        />
                      </td>

                      {/* Item Number */}
                      <td className="px-1 py-1">
                        <EditableCell
                          value={row.itemNumber}
                          onChange={(v) => updateRow(row.id, "itemNumber", v)}
                        />
                      </td>

                      {/* Barcode */}
                      <td className="px-1 py-1">
                        <EditableCell
                          value={row.barcode}
                          onChange={(v) => updateRow(row.id, "barcode", v)}
                          className="font-mono"
                        />
                      </td>

                      {/* Price */}
                      <td className="px-1 py-1">
                        <EditableCell
                          value={row.price}
                          onChange={(v) => updateRow(row.id, "price", v)}
                          type="number"
                        />
                      </td>

                      {/* Supplier Price */}
                      <td className="px-1 py-1">
                        <EditableCell
                          value={row.supplierPrice}
                          onChange={(v) => updateRow(row.id, "supplierPrice", v)}
                          type="number"
                        />
                      </td>

                      {/* Shipping */}
                      <td className="px-1 py-1">
                        <EditableCell
                          value={row.shippingCost}
                          onChange={(v) => updateRow(row.id, "shippingCost", v)}
                          type="number"
                        />
                      </td>

                      {/* Currency */}
                      <td className="px-1 py-1">
                        <Select
                          value={row.currency}
                          onValueChange={(v) => updateRow(row.id, "currency", v)}
                        >
                          <SelectTrigger className="h-7 text-xs w-[80px] border-0 bg-transparent">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Stock */}
                      <td className="px-1 py-1">
                        <EditableCell
                          value={row.stock}
                          onChange={(v) => updateRow(row.id, "stock", v)}
                          type="number"
                        />
                      </td>

                      {/* Category */}
                      <td className="px-1 py-1">
                        <CategoryCell
                          value={row.categoryId}
                          categories={categories as any[]}
                          onChange={(v) => updateRow(row.id, "categoryId", v)}
                        />
                      </td>

                      {/* Warehouse */}
                      <td className="px-1 py-1">
                        <EditableCell
                          value={row.warehouseName}
                          onChange={(v) => updateRow(row.id, "warehouseName", v)}
                        />
                      </td>

                      {/* Shelf */}
                      <td className="px-1 py-1">
                        <EditableCell
                          value={row.shelfName}
                          onChange={(v) => updateRow(row.id, "shelfName", v)}
                        />
                      </td>

                      {/* Invoice # */}
                      <td className="px-1 py-1">
                        <EditableCell
                          value={row.supplierId}
                          onChange={(v) => updateRow(row.id, "supplierId", v)}
                        />
                      </td>

                      {/* Supplier Name */}
                      <td className="px-1 py-1">
                        <EditableCell
                          value={row.supplierName}
                          onChange={(v) => updateRow(row.id, "supplierName", v)}
                        />
                      </td>

                      {/* Colors */}
                      <td className="px-1 py-1">
                        <EditableCell
                          value={row.colors}
                          onChange={(v) => updateRow(row.id, "colors", v)}
                          className="font-mono"
                        />
                      </td>

                      {/* Sizes */}
                      <td className="px-1 py-1">
                        <EditableCell
                          value={row.sizes}
                          onChange={(v) => updateRow(row.id, "sizes", v)}
                          className="font-mono"
                        />
                      </td>

                      {/* Materials */}
                      <td className="px-1 py-1">
                        <EditableCell
                          value={row.materials}
                          onChange={(v) => updateRow(row.id, "materials", v)}
                          className="font-mono"
                        />
                      </td>

                      {/* Brand */}
                      <td className="px-1 py-1">
                        <EditableCell
                          value={row.brand}
                          onChange={(v) => updateRow(row.id, "brand", v)}
                        />
                      </td>

                      {/* Row actions */}
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          {(row.status === "pending" || row.status === "error") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px] text-indigo-600 hover:bg-indigo-50"
                              onClick={() => submitRow(row)}
                            >
                              Upload
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => removeRow(row.id)}
                          >
                            <X size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Tip: Colors, sizes, materials accept multiple values separated by{" "}
                <code className="bg-white border border-slate-200 px-1 rounded">|</code>
                {" "}e.g.{" "}
                <code className="bg-white border border-slate-200 px-1 rounded">Black|Silver|Red</code>
              </p>
              <Button
                size="sm"
                onClick={importAll}
                disabled={stats.pending === 0}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                <Upload size={13} />
                Import {stats.pending} pending rows
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}