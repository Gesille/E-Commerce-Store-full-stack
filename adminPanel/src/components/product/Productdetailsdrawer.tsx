"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/app/(dashboard)/products/columns";
import Image from "next/image";
import {
  MapPin,
  DollarSign,
  Users,
  FileText,
  Layers,
  ShoppingCart,
  Hash,
  Package,
  TrendingUp,
} from "lucide-react";

interface ProductDetailsDrawerProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

const SectionTitle = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
      <Icon size={13} className="text-muted-foreground" />
    </div>
    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {label}
    </span>
  </div>
);

const Field = ({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="flex items-start justify-between gap-6 py-2 border-b border-border/50 last:border-0">
    <span className="text-xs text-muted-foreground w-28 shrink-0 pt-0.5">
      {label}
    </span>
    <span
      className={`text-sm text-right font-medium break-all ${
        mono ? "font-mono text-xs" : ""
      }`}
    >
      {value ?? <span className="text-muted-foreground/50 font-normal">—</span>}
    </span>
  </div>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-4 space-y-0">
    {children}
  </div>
);

export const ProductDetailsDrawer = ({
  product,
  open,
  onClose,
}: ProductDetailsDrawerProps) => {
  if (!product) return null;

  const imageSrc = product.image_1920
    ? `data:image/png;base64,${product.image_1920}`
    : "/placeholder.png";

  const stockBadge =
    product.qty_available === 0
      ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
      : product.qty_available <= 5
      ? "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
      : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400";

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto flex flex-col gap-0">

        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
          <SheetHeader>
            <SheetTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Product Details
            </SheetTitle>
          </SheetHeader>
        </div>

        {/* ── Hero ── */}
        <div className="px-6 pt-6 pb-5 bg-muted/30 border-b border-border">
          <div className="flex gap-4">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-border bg-background shrink-0 shadow-sm">
              <Image
                src={imageSrc}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-lg font-bold leading-tight line-clamp-2">
                {product.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {product.category || "Uncategorised"}
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-2xl font-bold tabular-nums">
                  ${(product.price ?? 0).toFixed(2)}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stockBadge}`}
                >
                  {product.qty_available} in stock
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-6">

          {/* Identity */}
          <div>
            <SectionTitle icon={Hash} label="Identity" />
            <Card>
              <Field label="Reference" value={product.shortDescription || null} />
              <Field label="Item number" value={product.itemNumber || null} />
              <Field
                label="Barcode"
                value={
                  product.barcode ? (
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                      {product.barcode}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-500 font-medium">No barcode</span>
                  )
                }
              />
              <Field label="Invoice #" value={product.invoiceNumber || null} />
            </Card>
          </div>

          {/* Pricing */}
          <div>
            <SectionTitle icon={DollarSign} label="Pricing" />
            <Card>
              <Field
                label="Selling price"
                value={
                  <span className="text-base font-bold">
                    ${(product.price ?? 0).toFixed(2)}
                  </span>
                }
              />
              <Field
                label="Supplier price"
                value={
                  product.supplierPrice
                    ? `$${product.supplierPrice.toFixed(2)}`
                    : null
                }
              />
              <Field
                label="Shipping cost"
                value={
                  product.shippingCost
                    ? `$${product.shippingCost.toFixed(2)}`
                    : null
                }
              />
              <Field label="Currency" value={product.currency || "USD"} />
              {product.markup && product.markup !== 1 && (
                <Field label="Markup" value={`×${product.markup}`} />
              )}
              {(product.finalPrice ?? 0) > 0 && (
                <Field
                  label="Final (XCD)"
                  value={`$${(product.finalPrice ?? 0).toFixed(2)}`}
                />
              )}
            </Card>
          </div>

          {/* Location */}
          {product.location && (
            <div>
              <SectionTitle icon={MapPin} label="Location" />
              <Card>
                <Field label="Shelf" value={product.location.shelfName || null} />
                <Field label="Warehouse" value={product.location.warehouseName || null} />
                <Field label="Full path" value={product.location.fullPath || null} />
              </Card>
            </div>
          )}

          {/* Suppliers */}
          <div>
            <SectionTitle icon={Users} label="Suppliers" />
            {product.suppliers && product.suppliers.length > 0 ? (
              <div className="space-y-2">
                {product.suppliers.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {s.name || "Unknown supplier"}
                      </p>
                      {s.productCode && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {s.productCode}
                        </p>
                      )}
                    </div>
                    {s.price > 0 && (
                      <span className="text-sm font-bold tabular-nums shrink-0">
                        ${s.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5 text-center">
                <p className="text-sm text-muted-foreground">No suppliers linked</p>
              </div>
            )}
          </div>

          {/* Purchase Orders */}
          <div>
            <SectionTitle icon={ShoppingCart} label="Purchase Orders" />
            {product.purchaseOrders && product.purchaseOrders.length > 0 ? (
              <div className="space-y-2">
                {product.purchaseOrders.map((po, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {po.poNumber || `PO #${po.id}`}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          po.status === "done" || po.status === "purchase"
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                            : po.status === "cancel"
                            ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                            : "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                        }`}
                      >
                        {po.status || "draft"}
                      </span>
                    </div>
                    <div className="space-y-0 border-t border-border/50 pt-2">
                      <Field label="Supplier" value={po.supplierName || null} />
                      {po.invoiceNumber && (
                        <Field label="Invoice #" value={po.invoiceNumber} />
                      )}
                      {po.date && (
                        <Field
                          label="Date"
                          value={new Date(po.date).toLocaleDateString()}
                        />
                      )}
                      {po.totalAmount > 0 && (
                        <Field
                          label="Total"
                          value={
                            <span className="font-bold">
                              ${po.totalAmount.toFixed(2)}
                            </span>
                          }
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5 text-center">
                <p className="text-sm text-muted-foreground">No purchase orders</p>
              </div>
            )}
          </div>

          {/* Attributes */}
          <div>
            <SectionTitle icon={Layers} label="Attributes" />
            <Card>
              {product.attributes?.brand && (
                <Field label="Brand" value={product.attributes.brand} />
              )}
              {product.sizes?.length > 0 && (
                <div className="flex items-start justify-between gap-6 py-2 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground w-28 shrink-0 pt-1">
                    Sizes
                  </span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {[...new Set(product.sizes)].map((s) => (
                      <span
                        key={s}
                        className="text-xs bg-muted px-2 py-0.5 rounded-md font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {product.colors?.length > 0 && (
                <div className="flex items-start justify-between gap-6 py-2 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground w-28 shrink-0 pt-1">
                    Colors
                  </span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {[...new Set(product.colors)].map((c) => (
                      <span
                        key={c}
                        className="text-xs bg-muted px-2 py-0.5 rounded-md font-medium"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {product.materials?.length > 0 && (
                <div className="flex items-start justify-between gap-6 py-2 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground w-28 shrink-0 pt-1">
                    Materials
                  </span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {[...new Set(product.materials)].map((m) => (
                      <span
                        key={m}
                        className="text-xs bg-muted px-2 py-0.5 rounded-md font-medium"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {!product.attributes?.brand &&
                !product.sizes?.length &&
                !product.colors?.length &&
                !product.materials?.length && (
                  <p className="text-sm text-muted-foreground py-2">
                    No attributes set
                  </p>
                )}
            </Card>
          </div>

          {/* Taxes */}
          {((product.taxes?.sales?.length ?? 0) > 0 ||
            (product.taxes?.purchase?.length ?? 0) > 0) && (
            <div>
              <SectionTitle icon={FileText} label="Taxes" />
              <Card>
                {(product.taxes?.sales?.length ?? 0) > 0 && (
                  <Field
                    label="Sales tax IDs"
                    value={product.taxes!.sales.join(", ")}
                  />
                )}
                {(product.taxes?.purchase?.length ?? 0) > 0 && (
                  <Field
                    label="Purchase tax IDs"
                    value={product.taxes!.purchase.join(", ")}
                  />
                )}
              </Card>
            </div>
          )}

          {/* bottom padding */}
          <div className="h-4" />
        </div>
      </SheetContent>
    </Sheet>
  );
};