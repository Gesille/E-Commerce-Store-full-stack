"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/TablePagination";
import { useState } from "react";
import { Trash2 } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onBulkDelete?: (rows: TData[]) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onBulkDelete,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
  });

  const selectedCount = Object.keys(rowSelection).length;

  const handleBulkDelete = () => {
    if (!onBulkDelete) return;
    const selectedRows = table
      .getSelectedRowModel()
      .rows.map((row) => row.original);
    onBulkDelete(selectedRows);
    setRowSelection({});
  };

  return (
    <div className="rounded-xl border border-border bg-background text-foreground shadow-sm overflow-hidden">
      {selectedCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-destructive/10 border-b border-border">
          <p className="text-sm text-destructive font-medium">
            {selectedCount} selected
          </p>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 text-sm bg-destructive hover:opacity-90 text-white px-3 py-1.5 rounded-md transition"
          >
            <Trash2 size={16} />
            Delete User(s)
          </button>
        </div>
      )}

      <Table>
        <TableHeader className="bg-muted/40">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="hover:bg-muted/50 transition"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
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
