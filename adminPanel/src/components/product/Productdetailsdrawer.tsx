"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Product } from "@/app/(dashboard)/products/columns";
import Image from "next/image";
import {
  Package,
  Tag,
  Barcode,
  MapPin,
  DollarSign,
  Users,
  FileText,
  Layers,
  ShoppingCart,
} from "lucide-react";

interface ProductDetailsDrawerProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

const Section = ({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Icon size={15} className="text-muted-foreground" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </span>
    </div>
    <div className="pl-5 space-y-2">{children}</div>
  </div>
);

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 text-sm">
    <span className="text-muted-foreground shrink-0">{label}</span>
    <span className="text-right font-medium break-all">{value ?? "—"}</span>
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

  const stockColor =
    product.qty_available === 0
      ? "text-red-500"
      : product.qty_available <= 5
      ? "text-amber-500"
      : "text-green-600";

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-lg font-semibold">
            Product Details
          </SheetTitle>
        </SheetHeader>

        {/* Hero */}
        <div className="flex items-start gap-4 mb-6">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border shrink-0 bg-muted">
            <Image
              src={imageSrc}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold leading-tight truncate">
              {product.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {product.category || "Uncategorised"}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-lg font-bold">
                ${(product.price ?? 0).toFixed(2)}
              </span>
              <span className={`text-sm font-medium ${stockColor}`}>
                {product.qty_available} in stock
              </span>
            </div>
          </div>
        </div>

        <Separator className="mb-6" />

        <div className="space-y-6">
          {/* Identity */}
          <Section icon={Tag} title="Identity">
            <Row label="Reference" value={product.shortDescription || "—"} />
            <Row label="Item number" value={(product as any).itemNumber || "—"} />
            <Row
              label="Barcode"
              value={
                product.barcode ? (
                  <span className="font-mono text-xs">{product.barcode}</span>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                    No barcode
                  </Badge>
                )
              }
            />
            <Row label="Invoice #" value={(product as any).invoiceNumber || "—"} />
          </Section>

          <Separator />

          {/* Pricing */}
          <Section icon={DollarSign} title="Pricing">
            <Row label="Selling price" value={`$${(product.price ?? 0).toFixed(2)}`} />
            <Row
              label="Supplier price"
              value={
                product.supplierPrice
                  ? `$${product.supplierPrice.toFixed(2)}`
                  : "—"
              }
            />
            <Row
              label="Shipping cost"
              value={
                product.shippingCost
                  ? `$${product.shippingCost.toFixed(2)}`
                  : "—"
              }
            />
            <Row label="Currency" value={product.currency || "USD"} />
            {(product as any).markup && (product as any).markup !== 1 && (
              <Row label="Markup" value={`×${(product as any).markup}`} />
            )}
            {(product as any).finalPrice > 0 && (
              <Row
                label="Final price (XCD)"
                value={`$${((product as any).finalPrice ?? 0).toFixed(2)}`}
              />
            )}
          </Section>

          <Separator />

          {/* Location */}
          {product.location && (
            <>
              <Section icon={MapPin} title="Location">
                <Row
                  label="Shelf"
                  value={(product.location as any).shelfName || "—"}
                />
                <Row
                  label="Warehouse"
                  value={(product.location as any).warehouseName || "—"}
                />
                <Row
                  label="Full path"
                  value={(product.location as any).fullPath || "—"}
                />
              </Section>
              <Separator />
            </>
          )}

          {/* Suppliers */}
          <Section icon={Users} title="Suppliers">
            {product.suppliers && product.suppliers.length > 0 ? (
              product.suppliers.map((s: any, i: number) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{s.name || "Unknown"}</span>
                    {s.price > 0 && (
                      <span className="text-sm font-semibold">
                        ${s.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {s.productCode && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Code: {s.productCode}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No suppliers linked.</p>
            )}
          </Section>

          <Separator />

          {/* Purchase Orders */}
          <Section icon={ShoppingCart} title="Purchase Orders">
            {product.purchaseOrders && product.purchaseOrders.length > 0 ? (
              product.purchaseOrders.map((po: any, i: number) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {po.poNumber || `PO #${po.id}`}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        po.status === "done" || po.status === "purchase"
                          ? "text-green-600 border-green-300"
                          : po.status === "cancel"
                          ? "text-red-500 border-red-300"
                          : "text-amber-600 border-amber-300"
                      }
                    >
                      {po.status || "draft"}
                    </Badge>
                  </div>
                  <Row label="Supplier" value={po.supplierName || "—"} />
                  {po.invoiceNumber && (
                    <Row label="Invoice #" value={po.invoiceNumber} />
                  )}
                  {po.date && (
                    <Row
                      label="Date"
                      value={new Date(po.date).toLocaleDateString()}
                    />
                  )}
                  {po.totalAmount > 0 && (
                    <Row
                      label="Total"
                      value={`$${po.totalAmount.toFixed(2)}`}
                    />
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No purchase orders.</p>
            )}
          </Section>

          <Separator />

          {/* Attributes */}
          <Section icon={Layers} title="Attributes">
            {(product as any).brand && (
              <Row label="Brand" value={(product as any).brand} />
            )}
            {product.sizes?.length > 0 && (
              <div className="flex items-start justify-between gap-4 text-sm">
                <span className="text-muted-foreground shrink-0">Sizes</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {[...new Set(product.sizes)].map((s: string) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {product.colors?.length > 0 && (
              <div className="flex items-start justify-between gap-4 text-sm">
                <span className="text-muted-foreground shrink-0">Colors</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {[...new Set(product.colors)].map((c: string) => (
                    <Badge key={c} variant="secondary" className="text-xs">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {product.materials?.length > 0 && (
              <div className="flex items-start justify-between gap-4 text-sm">
                <span className="text-muted-foreground shrink-0">Materials</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {[...new Set(product.materials)].map((m: string) => (
                    <Badge key={m} variant="secondary" className="text-xs">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {!product.sizes?.length &&
              !product.colors?.length &&
              !product.materials?.length &&
              !(product as any).brand && (
                <p className="text-sm text-muted-foreground">
                  No attributes set.
                </p>
              )}
          </Section>

          {/* Taxes */}
          {((product as any).taxes?.sales?.length > 0 ||
            (product as any).taxes?.purchase?.length > 0) && (
            <>
              <Separator />
              <Section icon={FileText} title="Taxes">
                {(product as any).taxes?.sales?.length > 0 && (
                  <Row
                    label="Sales tax IDs"
                    value={(product as any).taxes.sales.join(", ")}
                  />
                )}
                {(product as any).taxes?.purchase?.length > 0 && (
                  <Row
                    label="Purchase tax IDs"
                    value={(product as any).taxes.purchase.join(", ")}
                  />
                )}
              </Section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};