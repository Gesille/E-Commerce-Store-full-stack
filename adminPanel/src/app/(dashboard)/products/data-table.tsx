"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/TablePagination";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Trash2, Search } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]); 
  const [globalFilter, setGlobalFilter] = useState("");                       

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(), 
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,   
    onGlobalFilterChange: setGlobalFilter,      
    state: {
      sorting,
      rowSelection,
      columnFilters,
      globalFilter,                           
    },
  });

  return (
    <div className="rounded-xl border border-border bg-background text-foreground shadow-sm overflow-hidden">

      {/* ✅ Search bar */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Search size={16} className="text-muted-foreground" />
        <Input
          placeholder="Search by name, category or code..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm border-none shadow-none focus-visible:ring-0 p-0 h-auto text-sm"
        />
      </div>

      {Object.keys(rowSelection).length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-destructive/10 border-b border-border">
          <p className="text-sm text-destructive font-medium">
            {Object.keys(rowSelection).length} selected
          </p>
          <button className="flex items-center gap-2 text-sm bg-destructive hover:opacity-90 text-white px-3 py-1.5 rounded-md transition">
            <Trash2 size={16} />
            Delete Product(s)
          </button>
        </div>
      )}

      <Table>
        <TableHeader className="bg-muted/40">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-muted/50 transition">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No results found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="border-t border-border bg-muted/30 px-4 py-3">
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}