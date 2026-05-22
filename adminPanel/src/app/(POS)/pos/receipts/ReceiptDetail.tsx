"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useGetReceiptByIdQuery } from "@/redux/reciept/recieptApi";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

// Odoo Many2one fields are `false | [number, string]` — never null/undefined
function m2oName(field: false | [number, string], fallback = "—"): string {
  return Array.isArray(field) ? field[1] : fallback;
}

// ─────────────────────────────────────────────────────────
// State config
// ─────────────────────────────────────────────────────────

const STATE_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  paid:     { label: "Paid",      dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
  done:     { label: "Done",      dot: "bg-sky-500",     text: "text-sky-700 dark:text-sky-400" },
  invoiced: { label: "Invoiced",  dot: "bg-violet-500",  text: "text-violet-700 dark:text-violet-400" },
  cancel:   { label: "Cancelled", dot: "bg-rose-500",    text: "text-rose-700 dark:text-rose-400" },
};

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

function Row({ label, value, mono = false, bold = false }: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={cn(
        "text-xs text-right",
        mono && "font-mono",
        bold && "font-semibold text-foreground",
        !bold && "text-foreground/80"
      )}>
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2 mt-4">
      {children}
    </p>
  );
}

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────

export default function ReceiptDetail({ id }: { id: number }) {
  const { data, isLoading, isError, error } = useGetReceiptByIdQuery(id);

  // ── Loading ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-2 mt-6 px-1">
        <Skeleton className="h-4 w-2/3 mx-auto" />
        <Skeleton className="h-3 w-1/2 mx-auto" />
        <div className="mt-5 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className={cn("h-3", i % 3 === 2 ? "w-1/2" : "w-full")} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────
  if (isError) {
    const message =
      (error as any)?.data?.error ||
      (error as any)?.error ||
      "Failed to load receipt.";
    return (
      <div className="mt-6 rounded-lg bg-destructive/8 border border-destructive/20 px-4 py-3">
        <p className="text-xs text-destructive">{message}</p>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────
  const payload = data?.receipt;
  if (!payload) {
    return (
      <div className="mt-6 rounded-lg bg-muted/50 px-4 py-3">
        <p className="text-xs text-muted-foreground">Receipt not found.</p>
      </div>
    );
  }

  const { order, lines, payments } = payload;
  const state = STATE_CONFIG[order.state] ?? { label: order.state, dot: "bg-gray-400", text: "text-muted-foreground" };
  const subtotal = order.amount_total - order.amount_tax;

  // ── Receipt ──────────────────────────────────────────
  return (
    <div className="mt-4 print:mt-0">
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">

        {/* Header strip */}
        <div className="bg-muted/40 border-b border-border/40 px-5 py-4 text-center">
          <p className="font-semibold text-sm text-foreground tracking-tight">
            {m2oName(order.config_id, "Point of Sale")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {format(new Date(order.date_order), "MMMM d, yyyy · h:mm a")}
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className={cn("inline-block w-1.5 h-1.5 rounded-full", state.dot)} />
            <span className={cn("text-[11px] font-medium", state.text)}>{state.label}</span>
            <span className="text-[11px] text-muted-foreground/50 mx-1">·</span>
            <span className="text-[11px] font-mono text-muted-foreground">
              {order.pos_reference || order.name}
            </span>
          </div>
        </div>

        <div className="px-5 pb-5">

          {/* Info grid */}
          <SectionLabel>Details</SectionLabel>
          <div className="grid grid-cols-2 gap-x-3">
            {[
              { label: "Customer", value: m2oName(order.partner_id, "Walk-in") },
              { label: "Cashier",  value: m2oName(order.user_id) },
              { label: "Session",  value: m2oName(order.session_id) },
              { label: "Terminal", value: m2oName(order.config_id) },
            ].map(({ label, value }) => (
              <div key={label} className="py-1.5">
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{label}</p>
                <p className="text-xs font-medium text-foreground mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Line items */}
          <SectionLabel>Items</SectionLabel>
          <div className="rounded-lg border border-border/40 overflow-hidden divide-y divide-border/30">
            {lines.map((l: any, idx: number) => (
              <div
                key={l.id ?? idx}
                className="flex items-start justify-between gap-3 px-3 py-2.5 bg-background hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {Array.isArray(l.product_id) ? l.product_id[1] : "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {l.qty} × ${(l.price_unit as number).toFixed(2)}
                    {l.discount > 0 && (
                      <span className="ml-1.5 text-rose-500 font-medium">−{l.discount}%</span>
                    )}
                  </p>
                  {l.note && (
                    <p className="text-[11px] italic text-muted-foreground/70 mt-0.5">{l.note}</p>
                  )}
                </div>
                <p className="text-xs font-mono font-semibold text-foreground whitespace-nowrap pt-0.5">
                  ${(l.price_subtotal_incl as number).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <SectionLabel>Summary</SectionLabel>
          <div className="rounded-lg border border-border/40 overflow-hidden bg-background divide-y divide-border/30">
            <div className="px-3">
              <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} mono />
              <Row label="Tax"      value={`$${order.amount_tax.toFixed(2)}`} mono />
            </div>
            <div className="px-3 bg-muted/30">
              <Row label="Total" value={`$${order.amount_total.toFixed(2)}`} mono bold />
            </div>
          </div>

          {/* Payments */}
          <SectionLabel>Payment</SectionLabel>
          <div className="rounded-lg border border-border/40 overflow-hidden bg-background divide-y divide-border/30">
            <div className="px-3">
              {payments.map((p: any, idx: number) => (
                <Row
                  key={p.id ?? idx}
                  label={Array.isArray(p.payment_method_id) ? p.payment_method_id[1] : "—"}
                  value={`$${(p.amount as number).toFixed(2)}`}
                  mono
                />
              ))}
              {order.amount_return > 0 && (
                <Row
                  label="Change returned"
                  value={`$${order.amount_return.toFixed(2)}`}
                  mono
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-muted-foreground/50 mt-5">
            Thank you for your purchase
          </p>
        </div>
      </div>
    </div>
  );
}