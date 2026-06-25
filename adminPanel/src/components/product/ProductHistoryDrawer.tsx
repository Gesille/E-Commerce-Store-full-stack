"use client";

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLazyGetProductHistoryQuery } from "@/redux/product/productApi";
import { Product } from "@/app/(dashboard)/products/columns";
import { useEffect } from "react";
import {
  Package,
  ShoppingCart,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  TrendingDown,
  CalendarClock,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Props {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

type MovementType = "restock" | "sale" | "return" | "adjustment";

type StockMove = {
  type: MovementType;
  reference: string;
  qty: number;
  movementDate: string;
  insertedDate: string;
  lastModified: string;
  from: string;
  to: string;
};

type SaleHistory = {
  orderId: string;
  total: number;
  qty: number;
  date: string;
};

type ProductHistory = {
  success: boolean;
  currentStock: number;
  lastRestock: { date: string; qty: number } | null;
  stockMoves: StockMove[];
  salesHistory: SaleHistory[];
};

const TYPE_CONFIG: Record<MovementType, { label: string; icon: any; bg: string; iconColor: string; badge: string }> = {
  restock:    { label: "Restock",    icon: ArrowDownToLine, bg: "bg-emerald-50", iconColor: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
  sale:       { label: "Sale",       icon: ShoppingCart,    bg: "bg-blue-50",    iconColor: "text-blue-600",    badge: "bg-blue-100 text-blue-700"    },
  return:     { label: "Return",     icon: ArrowUpFromLine, bg: "bg-amber-50",   iconColor: "text-amber-600",   badge: "bg-amber-100 text-amber-700"  },
  adjustment: { label: "Adjustment", icon: RefreshCw,       bg: "bg-gray-50",    iconColor: "text-gray-400",    badge: "bg-gray-100 text-gray-500"    },
};

const fmt = (d: string) => {
  try {
    return format(new Date(d), "MMM d, yyyy · h:mm a");
  } catch {
    return d;
  }
};

const timeAgo = (d: string) => {
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: true });
  } catch {
    return "";
  }
};

export const ProductHistoryDrawer = ({ product, open, onClose }: Props) => {
  const [fetchHistory, { data: rawData, isLoading, isFetching }] =
    useLazyGetProductHistoryQuery();

  // Cast to our properly typed interface since RTK Query may have a stale inferred type
  const data = rawData as ProductHistory | undefined;

  useEffect(() => {
    if (open && product?.id) fetchHistory(product.id);
  }, [open, product?.id]);

  const loading = isLoading || isFetching;
  const stockMoves: StockMove[] = data?.stockMoves ?? [];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        className="w-full sm:max-w-[480px] flex flex-col p-0 overflow-hidden"
        style={{ gap: 0 }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle className="text-base font-semibold leading-snug">
            {product?.name ?? "Product"}
          </SheetTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Stock movements &amp; sales history
          </p>
        </div>

        {/* ── Scrollable body ────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">

          {loading && (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              <RefreshCw size={16} className="animate-spin mr-2" />
              Loading history…
            </div>
          )}

          {!loading && data && (
            <>
              {/* ── Stats Row ─────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Current Stock</p>
                  <p className="text-2xl font-bold text-foreground">{data.currentStock}</p>
                  <p className="text-[10px] text-muted-foreground">units on hand</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Total Moves</p>
                  <p className="text-2xl font-bold text-foreground">{stockMoves.length}</p>
                  <p className="text-[10px] text-muted-foreground">recorded entries</p>
                </div>
              </div>

              {/* ── Last Restock Card ─────────────────────────── */}
              {data.lastRestock ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
                  <span className="p-2 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                    <CalendarClock size={16} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide mb-0.5">
                      Last Restocked
                    </p>
                    <p className="text-2xl font-bold text-emerald-700 leading-none">
                      +{data.lastRestock.qty}
                      <span className="text-sm font-normal ml-1.5 text-emerald-600">units</span>
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      {fmt(data.lastRestock.date)}
                      <span className="ml-1.5 text-emerald-500">
                        ({timeAgo(data.lastRestock.date)})
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 flex items-center gap-3">
                  <Package size={16} className="text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground">No restock recorded yet.</p>
                </div>
              )}

              {/* ── Stock Movements ──────────────────────────── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Package size={14} className="text-muted-foreground" />
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    Stock Movements
                  </h3>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {stockMoves.length} records
                  </span>
                </div>

                {stockMoves.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    No stock movements found.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {stockMoves.map((m, i) => {
                      const cfg = TYPE_CONFIG[m.type] ?? TYPE_CONFIG.adjustment;
                      const Icon = cfg.icon;
                      const isSale = m.type === "sale";
                      return (
                        <div
                          key={i}
                          className="p-3 rounded-xl border border-border bg-background hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <span className={`p-2 rounded-lg ${cfg.bg} ${cfg.iconColor} shrink-0 mt-0.5`}>
                              <Icon size={13} />
                            </span>
                            <div className="flex-1 min-w-0">
                              {/* Badge + qty */}
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                                  {cfg.label}
                                </span>
                                <span className={`text-sm font-bold tabular-nums shrink-0 ${isSale ? "text-red-500" : "text-emerald-600"}`}>
                                  {isSale ? "−" : "+"}{m.qty} units
                                </span>
                              </div>

                              {/* Reference */}
                              <p className="text-[11px] text-foreground font-medium mt-1 truncate">
                                {m.reference}
                              </p>

                              {/* Route */}
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                {m.from} → {m.to}
                              </p>

                              {/* All three dates */}
                              <div className="mt-2 pt-2 border-t border-border/60 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-muted-foreground shrink-0">Movement date</span>
                                  <span className="text-[10px] text-foreground font-medium tabular-nums text-right">
                                    {fmt(m.movementDate)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-muted-foreground shrink-0">Inserted date</span>
                                  <span className="text-[10px] text-foreground font-medium tabular-nums text-right">
                                    {fmt(m.insertedDate)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-muted-foreground shrink-0">Last modified</span>
                                  <span className="text-[10px] text-foreground font-medium tabular-nums text-right">
                                    {fmt(m.lastModified)}
                                    <span className="ml-1 text-muted-foreground">({timeAgo(m.lastModified)})</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ── POS Sales History ────────────────────────── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart size={14} className="text-muted-foreground" />
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    POS Sales
                  </h3>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {data.salesHistory.length} transactions
                  </span>
                </div>

                {data.salesHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    No POS sales found.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.salesHistory.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:bg-muted/30 transition-colors"
                      >
                        <span className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                          <ShoppingCart size={13} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-foreground truncate">
                              {s.orderId}
                            </span>
                            {s.total > 0 ? (
                              <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">
                                ${s.total.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full shrink-0">
                                $0.00
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {fmt(s.date)} · qty {s.qty}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {!loading && !data && (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
              <TrendingDown size={24} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No history available.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};