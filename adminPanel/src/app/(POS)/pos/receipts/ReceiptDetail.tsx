"use client";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useGetReceiptByIdQuery } from "@/redux/reciept/recieptApi";


const STATE_LABELS: Record<string, { label: string; cls: string }> = {
  paid:     { label: "Paid",      cls: "bg-green-100 text-green-700" },
  done:     { label: "Done",      cls: "bg-blue-100 text-blue-700" },
  invoiced: { label: "Invoiced",  cls: "bg-purple-100 text-purple-700" },
  cancel:   { label: "Cancelled", cls: "bg-red-100 text-red-700" },
};

export default function ReceiptDetail({ id }: { id: number }) {
  const { data, isLoading, isError, error } = useGetReceiptByIdQuery(id);

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    const message =
      (error as any)?.data?.error ||
      (error as any)?.error ||
      "Failed to load receipt.";
    return <p className="text-sm text-destructive mt-4">{message}</p>;
  }

  // API shape: { success, receipt: { order, lines, payments } }
  const payload = data?.receipt;
  if (!payload) {
    return <p className="text-sm text-destructive mt-4">Receipt not found.</p>;
  }

  const { order, lines, payments } = payload;
  const s = STATE_LABELS[order.state] ?? { label: order.state, cls: "" };

  return (
    <div className="mt-4 space-y-4 text-sm print:text-xs">
      {/* ── Receipt Header ── */}
      <div className="text-center space-y-1">
        <p className="font-bold text-base">{order.config_id?.[1] ?? "POS"}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(order.date_order), "MMMM d, yyyy  •  h:mm a")}
        </p>
        <p className="font-mono text-xs">{order.pos_reference || order.name}</p>
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", s.cls)}>
          {s.label}
        </span>
      </div>

      <Separator />

      {/* ── Customer / Cashier ── */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground uppercase tracking-wide">Customer</p>
          <p className="font-medium mt-0.5">
            {order.partner_id ? order.partner_id[1] : "Walk-in"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground uppercase tracking-wide">Cashier</p>
          <p className="font-medium mt-0.5">
            {order.user_id ? order.user_id[1] : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground uppercase tracking-wide">Session</p>
          <p className="font-medium mt-0.5">
            {order.session_id ? order.session_id[1] : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground uppercase tracking-wide">Terminal</p>
          <p className="font-medium mt-0.5">
            {order.config_id ? order.config_id[1] : "—"}
          </p>
        </div>
      </div>

      <Separator />

      {/* ── Line Items ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
          Items
        </p>
        {lines.map((l: any) => (
          <div key={l.id ?? `${l.product_id?.[0]}-${Math.random()}`} className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="truncate">{l.product_id?.[1]}</p>
              <p className="text-xs text-muted-foreground">
                {l.qty} × ${l.price_unit.toFixed(2)}
                {l.discount > 0 && (
                  <span className="text-red-500 ml-1.5">{l.discount}% off</span>
                )}
              </p>
              {l.note && (
                <p className="text-xs text-muted-foreground italic">{l.note}</p>
              )}
            </div>
            <p className="font-mono font-medium whitespace-nowrap">
              ${l.price_subtotal_incl.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <Separator />

      {/* ── Totals ── */}
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-mono">
            ${order.amount_untaxed?.toFixed(2) ?? "—"}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Tax</span>
          <span className="font-mono">${order.amount_tax.toFixed(2)}</span>
        </div>
        <Separator className="my-1" />
        <div className="flex justify-between font-bold text-base">
          <span>Total</span>
          <span className="font-mono">${order.amount_total.toFixed(2)}</span>
        </div>
      </div>

      <Separator />

      {/* ── Payments ── */}
      <div className="space-y-1.5 text-xs">
        <p className="font-semibold uppercase text-muted-foreground tracking-wide">
          Payment
        </p>
        {payments.map((p: any) => (
          <div key={p.id ?? `${p.payment_method_id?.[0]}-${p.payment_date}`} className="flex justify-between">
            <span className="text-muted-foreground">
              {p.payment_method_id?.[1] ?? "—"}
            </span>
            <span className="font-mono">${p.amount.toFixed(2)}</span>
          </div>
        ))}
        {order.amount_return > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Change returned</span>
            <span className="font-mono">${order.amount_return.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* ── Notes ── */}
      {order.note && (
        <>
          <Separator />
          <p className="text-xs text-muted-foreground italic">{order.note}</p>
        </>
      )}

      <div className="text-center pt-2 text-xs text-muted-foreground">
        Thank you for your purchase!
      </div>
    </div>
  );
}
