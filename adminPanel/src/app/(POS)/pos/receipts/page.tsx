"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, ChevronLeft, ChevronRight,
  Eye, Printer, ReceiptText,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import ReceiptDetail from "./ReceiptDetail";
import { Receipt, useGetReceiptsQuery } from "@/redux/reciept/recieptApi";




const STATE_LABELS: Record<string, { label: string; cls: string }> = {
  paid:     { label: "Paid",     cls: "bg-green-100 text-green-700" },
  done:     { label: "Done",     cls: "bg-blue-100 text-blue-700" },
  invoiced: { label: "Invoiced", cls: "bg-purple-100 text-purple-700" },
  cancel:   { label: "Cancelled",cls: "bg-red-100 text-red-700" },
};

export default function ReceiptsPage() {
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [sheetOpen, setSheetOpen]     = useState(false);
  const [detailId, setDetailId]       = useState<number | null>(null);

  // RTK Query: keep args stable to leverage caching
  const queryArgs = useMemo(
    () => ({
      page,
      limit: 20,
      search,
      state: stateFilter === "all" ? "" : stateFilter,
      // optionally include dateFrom/dateTo when you add date filters
    }),
    [page, search, stateFilter]
  );

  const { data, isLoading, isFetching, isError, error } = useGetReceiptsQuery(queryArgs, {
    // if you want smoother UX while re-fetching:
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false,
    refetchOnReconnect: true,
  });

  const receipts: Receipt[] = data?.receipts ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const openDetail = (id: number) => {
    setDetailId(id);
    setSheetOpen(true);
  };

  // When filters change, reset to page 1.
  // You already do that by state updates where relevant (e.g., handlers).
  // If you want immediate reset-on-change:
  // useEffect(() => { setPage(1); }, [search, stateFilter]);

  const showLoadingRows = isLoading || isFetching;

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ReceiptText size={20} className="text-muted-foreground" />
          <h1 className="text-lg font-semibold">Receipts</h1>
          {!showLoadingRows && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {total}
            </span>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search receipt # or customer…"
            className="pl-8 text-sm h-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <Select
          value={stateFilter}
          onValueChange={(v) => {
            setStateFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="invoiced">Invoiced</SelectItem>
            <SelectItem value="cancel">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <div className="rounded-md border flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Receipt #</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Cashier</TableHead>
              <TableHead>Terminal</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {showLoadingRows
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : isError
              ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16 text-destructive text-sm">
                      {(error as any)?.data?.error || (error as any)?.error || "Failed to load receipts."}
                    </TableCell>
                  </TableRow>
                )
              : receipts.length === 0
              ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground text-sm">
                      No receipts found.
                    </TableCell>
                  </TableRow>
                )
              : receipts.map((r) => {
                  const s = STATE_LABELS[r.state] ?? { label: r.state, cls: "" };
                  return (
                    <TableRow key={r.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs">
                        {r.pos_reference || r.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(r.date_order), "MMM d, yyyy · h:mm a")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.partner_id ? r.partner_id[1] : (
                          <span className="text-muted-foreground italic">Walk-in</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.user_id ? r.user_id[1] : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.config_id ? r.config_id[1] : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${r.amount_total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        ${r.amount_paid.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          s.cls
                        )}>
                          {s.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => openDetail(r.id)}
                        >
                          <Eye size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
            }
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} receipts</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={14} />
          </Button>
          <span className="px-1 tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline" size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      {/* ── Detail Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between pr-6">
              <span>Receipt Detail</span>
              <Button
                size="sm" variant="outline"
                onClick={() => window.print()}
                className="flex items-center gap-1 text-xs"
              >
                <Printer size={13} /> Print
              </Button>
            </SheetTitle>
          </SheetHeader>
          {detailId && <ReceiptDetail id={detailId} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
