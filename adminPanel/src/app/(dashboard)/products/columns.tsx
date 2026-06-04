"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export type Product = {
  id: string | number;
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  qty_available: number;
  image_1920: string | false; 
 category: string; 
  sizes: string[];
  colors: string[];
  barcode?: string;
};

export const getColumns = (
  onEdit: (product: Product) => void,
  onDelete: (product: Product) => void
): ColumnDef<Product>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        onCheckedChange={(value: any) => table.toggleAllPageRowsSelected(!!value)}
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        onCheckedChange={(value: any) => row.toggleSelected(!!value)}
        checked={row.getIsSelected()}
      />
    ),
  },
  {
    accessorKey: "image_1920",
    header: "Image",
    cell: ({ row }) => {
      const product = row.original;
      const src = product.image_1920
        ? `data:image/png;base64,${product.image_1920}`
        : "/placeholder.png";
      return (
        <div className="w-9 h-9 relative">
          <Image src={src} alt={product.name} fill className="rounded-full object-cover" />
        </div>
      );
    },
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Price <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => `$${row.getValue<number>("price").toFixed(2)}`,
  },
  {
    accessorKey: "qty_available",
    header: "Stock",
    cell: ({ row }) => {
      const stock = row.getValue<number>("qty_available");
      return (
        <span className={stock === 0 ? "text-red-500" : "text-green-600"}>
          {stock}
        </span>
      );
    },
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "shortDescription",
    header: "Code",
  },
  {
  accessorKey: "barcode",
  header: "Barcode",
  cell: ({ row }) => {
    const b = row.original.barcode;
    if (b) return <span className="font-mono text-xs text-gray-600">{b}</span>;
    return (
      <span className="text-[10px] bg-amber-100 text-amber-700 
                       font-semibold px-2 py-0.5 rounded-full">
        ⚠ No barcode
      </span>
    );
  },
},
  {
    id: "actions",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(product)}>  
              Update Product
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(product)}
            >
              Delete Product
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
