"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
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

type MovementType = keyof typeof TYPE_CONFIG;

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

const TYPE_CONFIG = {
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
  const [fetchHistory, { data, isLoading, isFetching }] =
    useLazyGetProductHistoryQuery();

  useEffect(() => {
    if (open && product?.id) fetchHistory(product.id);
  }, [open, product?.id]);

  const loading = isLoading || isFetching;

  // Separate meaningful moves from noise
  const meaningfulMoves = data?.stockMoves?.filter(
    (m: StockMove) => !(m.type === "adjustment" && m.qty === 0)
  ) ?? [];

  const adjustmentMoves = data?.stockMoves?.filter(
    (m: StockMove) => m.type === "adjustment" && m.qty === 0
  ) ?? [];

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
                    {meaningfulMoves.length} records
                  </span>
                </div>

                {meaningfulMoves.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    No stock movements found.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {meaningfulMoves.map((m: StockMove, i: number) => {
                      const cfg = TYPE_CONFIG[m.type];
                      const Icon = cfg.icon;
                      const isSale = m.type === "sale";
                      return (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background hover:bg-muted/30 transition-colors"
                        >
                          <span className={`p-2 rounded-lg ${cfg.bg} ${cfg.iconColor} shrink-0`}>
                            <Icon size={13} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] text-muted-foreground truncate">
                                {m.reference}
                              </span>
                              <span
                                className={`text-xs font-bold tabular-nums shrink-0 ${
                                  isSale ? "text-red-500" : "text-emerald-600"
                                }`}
                              >
                                {isSale ? "−" : "+"}{m.qty}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                             {fmt(m.movementDate)}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {m.from} → {m.to}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Collapsed audit moves */}
                {adjustmentMoves.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-2 pl-1">
                    + {adjustmentMoves.length} confirmed-quantity audit entries (no stock change)
                  </p>
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
                    {data.salesHistory.map((s: SaleHistory, i: number) => (
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