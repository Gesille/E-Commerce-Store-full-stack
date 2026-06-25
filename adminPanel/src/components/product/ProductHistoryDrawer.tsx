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
import { Package, ShoppingCart, ArrowDownToLine, ArrowUpFromLine, RefreshCw } from "lucide-react";
import { format } from "date-fns";

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
  date: string;
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
  restock:    { label: "Restock",    icon: ArrowDownToLine, color: "text-emerald-600 bg-emerald-50" },
  sale:       { label: "Sale",       icon: ShoppingCart,    color: "text-blue-600 bg-blue-50"    },
  return:     { label: "Return",     icon: ArrowUpFromLine, color: "text-amber-600 bg-amber-50"  },
  adjustment: { label: "Adjustment", icon: RefreshCw,       color: "text-gray-500 bg-gray-100"   },
};

const fmt = (d: string) => {
  try { return format(new Date(d), "MMM d, yyyy · h:mm a"); }
  catch { return d; }
};

export const ProductHistoryDrawer = ({ product, open, onClose }: Props) => {
  const [fetchHistory, { data, isLoading, isFetching }] = useLazyGetProductHistoryQuery();

  useEffect(() => {
    if (open && product?.id) fetchHistory(product.id);
  }, [open, product?.id]);

  const loading = isLoading || isFetching;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-base font-semibold">
            {product?.name ?? "Product"} — History
          </SheetTitle>
        </SheetHeader>

        {loading && (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            Loading history...
          </div>
        )}

        {!loading && data && (
          <div className="space-y-8">

            {/* ── Stock Movements ─────────────────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Package size={15} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Stock Movements</h3>
                <span className="ml-auto text-xs text-muted-foreground">
                  {data.stockMoves.length} records
                </span>
              </div>

              {data.stockMoves.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No stock movements found.</p>
              ) : (
                <div className="space-y-2">
                  {data.stockMoves.map((m:StockMove, i:number) => {
                    const cfg = TYPE_CONFIG[m.type];
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/40 transition"
                      >
                        <span className={`p-1.5 rounded-md ${cfg.color}`}>
                          <Icon size={13} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-foreground truncate">
                              {m.reference}
                            </span>
                            <span className={`text-xs font-semibold tabular-nums ${
                              m.type === "sale" ? "text-red-500" : "text-emerald-600"
                            }`}>
                              {m.type === "sale" ? "-" : "+"}{m.qty}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {fmt(m.date)}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {m.from} → {m.to}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── POS Sales ───────────────────────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ShoppingCart size={15} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">POS Sales</h3>
                <span className="ml-auto text-xs text-muted-foreground">
                  {data.salesHistory.length} transactions
                </span>
              </div>

              {data.salesHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No POS sales found.</p>
              ) : (
                <div className="space-y-2">
                  {data.salesHistory.map((s:SaleHistory, i:number) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/40 transition"
                    >
                      <span className="p-1.5 rounded-md text-blue-600 bg-blue-50">
                        <ShoppingCart size={13} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-foreground">{s.orderId}</span>
                          <span className="text-xs font-semibold text-foreground tabular-nums">
                            ${s.total.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {fmt(s.date)} · qty {s.qty}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}

        {!loading && !data && (
          <p className="text-sm text-muted-foreground text-center py-10">
            No history available.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
};