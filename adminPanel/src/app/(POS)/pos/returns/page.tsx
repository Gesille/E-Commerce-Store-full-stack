"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  RotateCcw,
  Search,
  X,
  Plus,
  Minus,
  Printer,
  CheckCircle2,
  AlertCircle,
  ScanBarcode,
  History,
  Ban,
  Eye,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { format } from "date-fns";
import { useCreateReturnMutation, useGetReturnsQuery, useLazyLookupReceiptQuery, useVoidReturnMutation } from "@/redux/returns/Returnsapi";



// ─── Types ───────────────────────────────────────────────────────────────────

interface ReceiptItem {
  productId: number;
  name: string;
  sku: string;
  unitPrice: number;
  taxRate: number;
  qty: number;
  discount: number;
  subtotal: number;
}

const RETURN_REASONS = [
  "Wrong item / order error",
  "Defective / damaged",
  "Customer changed mind",
  "Duplicate purchase",
  "Item not as described",
  "Other",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReturnsPage() {
  const user = useSelector((state: RootState) => state?.auth.user as any);
  const [tab, setTab] = useState<"process" | "history">("process");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <RotateCcw size={20} className="text-muted-foreground" />
              Returns
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Process refunds and view return history
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex border rounded-lg overflow-hidden text-sm">
            <button
              onClick={() => setTab("process")}
              className={cn(
                "px-4 py-2 flex items-center gap-1.5 transition",
                tab === "process"
                  ? "bg-foreground text-background"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <ScanBarcode size={14} /> Process Return
            </button>
            <button
              onClick={() => setTab("history")}
              className={cn(
                "px-4 py-2 flex items-center gap-1.5 border-l transition",
                tab === "history"
                  ? "bg-foreground text-background"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <History size={14} /> All Returns
            </button>
          </div>
        </div>

        {tab === "process" ? (
          <ProcessReturn user={user} onSuccess={() => setTab("history")} />
        ) : (
          <ReturnHistory />
        )}
      </div>
    </div>
  );
}

// ─── Process Return Tab ───────────────────────────────────────────────────────

function ProcessReturn({
  user,
  onSuccess,
}: {
  user: any;
  onSuccess: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  // ── RTK Query hooks ──
  const [lookupReceiptQuery, { data: receiptData, isFetching: lookupLoading, isError: lookupError, reset: resetLookup }] =
    useLazyLookupReceiptQuery();
  const [createReturn, { isLoading: submitting }] = useCreateReturnMutation();

  const receipt = receiptData?.receipt ?? null;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset qty map whenever a new receipt loads
  useEffect(() => {
    if (receipt) {
      const qtys: Record<number, number> = {};
      receipt.items.forEach((item:any) => {
        qtys[item.productId] = 0;
      });
      setReturnQtys(qtys);
    }
  }, [receipt]);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLookup = () => {
    const val = query.trim();
    if (!val) return;
    lookupReceiptQuery(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLookup();
  };

  const changeQty = (productId: number, delta: number) => {
    const item = receipt!.items.find((i:any) => i.productId === productId)!;
    setReturnQtys((prev) => ({
      ...prev,
      [productId]: Math.max(0, Math.min(item.qty, (prev[productId] || 0) + delta)),
    }));
  };

  const toggleAll = (checked: boolean) => {
    if (!receipt) return;
    const qtys: Record<number, number> = {};
    receipt.items.forEach((item:any) => {
      qtys[item.productId] = checked ? item.qty : 0;
    });
    setReturnQtys(qtys);
  };

  const clearReceipt = () => {
    resetLookup();
    setQuery("");
    setReason("");
    setNotes("");
    setReturnQtys({});
  };

  // Computed totals
  const selectedItems = receipt
    ? receipt.items.filter((i:any) => (returnQtys[i.productId] || 0) > 0)
    : [];

  const subtotal = selectedItems.reduce(
    (s: number, i: any) => s + i.unitPrice * (returnQtys[i.productId] || 0),
    0
  );
  const taxTotal = selectedItems.reduce(
    (s: number, i: any) =>
      s + i.unitPrice * (returnQtys[i.productId] || 0) * i.taxRate,
    0
  );
  const total = subtotal + taxTotal;

  const allSelected =
    receipt?.items.every((i:any) => (returnQtys[i.productId] || 0) === i.qty) ??
    false;

  const processReturn = async () => {
    if (!receipt) return;
    if (!reason) {
      showToast("error", "Please select a return reason.");
      return;
    }
    if (!selectedItems.length) {
      showToast("error", "Select at least one item to return.");
      return;
    }

    try {
      const payload = {
        receiptNumber: receipt.receiptNumber,
        odooOrderId: receipt.odooOrderId,
        cashier: user?.name || "Unknown",
        cashierId: user?._id,
        reason,
        paymentMethod: receipt.paymentMethod,
        notes,
        items: selectedItems.map((item:any) => ({
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          qtyReturned: returnQtys[item.productId],
        })),
      };

      const data = await createReturn(payload).unwrap();
      showToast(
        "success",
        `Return ${data.return.returnNumber} processed — $${total.toFixed(2)} refunded.`
      );
      clearReceipt();
      setTimeout(onSuccess, 1500);
    } catch (err: any) {
      showToast("error", err?.data?.message || "Something went wrong.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-lg text-sm border",
            toast.type === "success"
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-300"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-300"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {toast.msg}
        </div>
      )}

      {/* Search Card */}
      <div className="bg-background border rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
          <ScanBarcode size={13} /> Scan barcode or type receipt number and
          press Enter
        </p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. REC-2025-0041"
            className="flex-1 h-10 px-3 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
          />
          <button
            onClick={handleLookup}
            disabled={lookupLoading}
            className="h-10 px-4 bg-foreground text-background rounded-lg text-sm flex items-center gap-1.5 hover:opacity-90 transition disabled:opacity-50"
          >
            {lookupLoading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Search size={14} />
            )}
            Look up
          </button>
          {(receipt || lookupError) && (
            <button
              onClick={clearReceipt}
              className="h-10 px-3 border rounded-lg text-sm flex items-center gap-1.5 hover:bg-muted transition"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Not found */}
      {lookupError && !lookupLoading && (
        <div className="border rounded-xl p-10 text-center">
          <AlertCircle size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-sm">Receipt not found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Check the number and try again
          </p>
        </div>
      )}

      {/* Receipt found */}
      {receipt && (
        <>
          {/* Receipt Header */}
          <div className="bg-background border rounded-xl overflow-hidden">
            <div className="flex items-start justify-between p-4 border-b">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Receipt</p>
                <h2 className="font-semibold text-base">
                  {receipt.receiptNumber}
                </h2>
                <div className="flex gap-4 mt-2 flex-wrap">
                  {[
                    {
                      label: "Date",
                      value: format(
                        new Date(receipt.date),
                        "MMM d, yyyy · h:mm a"
                      ),
                    },
                    { label: "Cashier", value: receipt.cashier },
                    { label: "Payment", value: receipt.paymentMethod },
                    {
                      label: "Original total",
                      value: `$${receipt.originalTotal.toFixed(2)}`,
                    },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {label}
                      </p>
                      <p className="text-sm font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2.5 py-1 rounded-md font-medium">
                Paid
              </span>
            </div>

            {/* Items Table */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2.5 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="cursor-pointer"
                    />
                  </th>
                  {[
                    "Item",
                    "Unit price",
                    "Qty bought",
                    "Qty to return",
                    "Refund",
                  ].map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide",
                        h === "Item" ? "text-left" : "text-right"
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item:any) => {
                  const qty = returnQtys[item.productId] || 0;
                  const refund = qty * item.unitPrice * (1 + item.taxRate);
                  const isSelected = qty > 0;
                  return (
                    <tr
                      key={item.productId}
                      className={cn(
                        "border-b last:border-b-0 transition-colors",
                        isSelected
                          ? "bg-blue-50/50 dark:bg-blue-950/20"
                          : "hover:bg-muted/20"
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setReturnQtys((prev) => ({
                              ...prev,
                              [item.productId]: e.target.checked
                                ? item.qty
                                : 0,
                            }));
                          }}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.sku}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">{item.qty}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => changeQty(item.productId, -1)}
                            disabled={qty === 0}
                            className="w-6 h-6 border rounded flex items-center justify-center hover:bg-muted transition disabled:opacity-30"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-5 text-center font-medium text-sm">
                            {qty}
                          </span>
                          <button
                            onClick={() => changeQty(item.productId, 1)}
                            disabled={qty === item.qty}
                            className="w-6 h-6 border rounded flex items-center justify-center hover:bg-muted transition disabled:opacity-30"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {isSelected ? `$${refund.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary + Actions */}
          <div className="bg-background border rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Return reason *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-10 px-3 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
                >
                  <option value="">Select a reason…</option>
                  {RETURN_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes…"
                  className="w-full h-10 px-3 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>Items selected</span>
                <span>{selectedItems.length}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>Subtotal refund</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground mb-3">
                <span>Tax refund</span>
                <span>${taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-3">
                <span>Total refund</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={processReturn}
                disabled={submitting || !selectedItems.length || !reason}
                className="flex-1 h-10 bg-foreground text-background rounded-lg text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition disabled:opacity-40"
              >
                {submitting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <RotateCcw size={14} />
                )}
                {submitting ? "Processing…" : "Process return & refund"}
              </button>
              <button
                onClick={() => window.print()}
                className="h-10 px-4 border rounded-lg text-sm flex items-center gap-1.5 hover:bg-muted transition"
              >
                <Printer size={14} /> Print
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Return History Tab ───────────────────────────────────────────────────────

function ReturnHistory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "completed" | "pending" | "voided" | ""
  >("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);

  // ── RTK Query hooks ──
  const { data, isFetching: loading, refetch } = useGetReturnsQuery({
    page,
    limit: 15,
    search,
    status: statusFilter,
    date_from: from,
    date_to: to,
  });
  const [voidReturnMutation] = useVoidReturnMutation();

  const returns = data?.returns ?? [];
  const stats = data?.stats ?? {
    totalRefunded: 0,
    totalReturns: 0,
    totalItems: 0,
  };
  const totalPages = data?.pages ?? 1;

  const handleVoid = async (id: string) => {
    if (!confirm("Are you sure you want to void this return?")) return;
    setVoidingId(id);
    try {
      await voidReturnMutation({ id, notes: "Voided by manager" }).unwrap();
    } catch {
      // error handled silently; RTK will invalidate cache so list refreshes
    } finally {
      setVoidingId(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      voided:
        "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    };
    return (
      <span
        className={cn(
          "text-xs px-2 py-0.5 rounded font-medium",
          map[status] || ""
        )}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total refunded",
            value: `$${stats.totalRefunded.toFixed(2)}`,
          },
          { label: "Total returns", value: stats.totalReturns },
          { label: "Items returned", value: stats.totalItems },
        ].map(({ label, value }) => (
          <div key={label} className="bg-muted/40 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-background border rounded-xl p-4 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-48">
          <label className="text-xs text-muted-foreground block mb-1">
            Search
          </label>
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Return #, receipt #, cashier…"
              className="w-full h-9 pl-8 pr-3 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(
                e.target.value as "completed" | "pending" | "voided" | ""
              );
              setPage(1);
            }}
            className="h-9 px-2 border rounded-lg text-sm bg-background focus:outline-none"
          >
            <option value="">All</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="voided">Voided</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="h-9 px-2 border rounded-lg text-sm bg-background focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="h-9 px-2 border rounded-lg text-sm bg-background focus:outline-none"
          />
        </div>
        <button
          onClick={clearFilters}
          className="h-9 px-3 border rounded-lg text-sm flex items-center gap-1 hover:bg-muted transition"
        >
          <X size={13} /> Clear
        </button>
        <button
          onClick={() => refetch()}
          className="h-9 px-3 border rounded-lg text-sm flex items-center gap-1 hover:bg-muted transition"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-background border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
            Loading returns…
          </div>
        ) : returns.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            <History size={32} className="mx-auto mb-3 opacity-30" />
            <p>No returns found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {[
                  "Return #",
                  "Receipt #",
                  "Date",
                  "Cashier",
                  "Reason",
                  "Items",
                  "Total",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {returns.map((ret:any) => (
                <>
                  <tr
                    key={ret._id}
                    className={cn(
                      "border-b last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer",
                      ret.status === "voided" && "opacity-50"
                    )}
                    onClick={() =>
                      setExpandedId(
                        expandedId === ret._id ? null : ret._id
                      )
                    }
                  >
                    <td className="px-4 py-3 font-medium">
                      {ret.returnNumber}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ret.receiptNumber}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {format(new Date(ret.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">{ret.cashier}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ret.reason}
                    </td>
                    <td className="px-4 py-3">{ret.items.length}</td>
                    <td className="px-4 py-3 font-semibold">
                      ${ret.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">{statusBadge(ret.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(
                              expandedId === ret._id ? null : ret._id
                            );
                          }}
                          className="p-1.5 hover:bg-muted rounded transition"
                          title="View details"
                        >
                          <Eye size={14} />
                        </button>
                        {ret.status !== "voided" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVoid(ret._id);
                            }}
                            disabled={voidingId === ret._id}
                            className="p-1.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 rounded transition"
                            title="Void return"
                          >
                            {voidingId === ret._id ? (
                              <RefreshCw
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <Ban size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded row */}
                  {expandedId === ret._id && (
                    <tr key={ret._id + "-expand"} className="bg-muted/10">
                      <td colSpan={9} className="px-6 py-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Returned items
                        </p>
                        <table className="w-full text-xs">
                          <thead>
                            <tr>
                              {["Item", "SKU", "Qty", "Refund"].map((h) => (
                                <th
                                  key={h}
                                  className={cn(
                                    "pb-1 text-muted-foreground font-medium",
                                    h === "Item" || h === "SKU"
                                      ? "text-left"
                                      : "text-right"
                                  )}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {ret.items.map((item:any, i:any) => (
                              <tr key={i} className="border-t">
                                <td className="py-1.5 font-medium">
                                  {item.name}
                                </td>
                                <td className="py-1.5 text-muted-foreground">
                                  {item.sku}
                                </td>
                                <td className="py-1.5 text-right">
                                  {item.qtyReturned}
                                </td>
                                <td className="py-1.5 text-right font-medium">
                                  ${item.refundTotal.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t">
                              <td
                                colSpan={3}
                                className="pt-2 text-right text-muted-foreground"
                              >
                                Subtotal / Tax / Total:
                              </td>
                              <td className="pt-2 text-right font-semibold">
                                ${ret.subtotal.toFixed(2)} / $
                                {ret.taxTotal.toFixed(2)} / $
                                {ret.total.toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 px-3 border rounded-lg hover:bg-muted transition disabled:opacity-40 text-xs"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 px-3 border rounded-lg hover:bg-muted transition disabled:opacity-40 text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}