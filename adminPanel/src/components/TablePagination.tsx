import { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2">
      
      {/* Left info */}
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          {table.getFilteredSelectedRowModel().rows.length}
        </span>{" "}
        selected of{" "}
        <span className="font-medium text-foreground">
          {table.getFilteredRowModel().rows.length}
        </span>{" "}
        rows
      </div>

      {/* Right controls */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">

        {/* Page size */}
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Rows</p>

          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[75px] border-border bg-background text-sm">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page indicator */}
        <div className="text-sm text-muted-foreground">
          Page{" "}
          <span className="font-medium text-foreground">
            {table.getState().pagination.pageIndex + 1}
          </span>{" "}
          /{" "}
          <span className="font-medium text-foreground">
            {table.getPageCount()}
          </span>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-md border-border hover:bg-muted"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft size={16} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-md border-border hover:bg-muted"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft size={16} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-md border-border hover:bg-muted"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight size={16} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-md border-border hover:bg-muted"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}