"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useGetReceiptByIdQuery } from "@/redux/reciept/recieptApi";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function m2oName(field: false | [number, string], fallback = "—"): string {
  return Array.isArray(field) ? field[1] : fallback;
}

// ─────────────────────────────────────────────────────────
// State config
// ─────────────────────────────────────────────────────────

const STATE_CONFIG: Record<string, {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
}> = {
  paid:     { label: "Paid",      bg: "bg-emerald-50 dark:bg-emerald-950/40",  text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" },
  done:     { label: "Done",      bg: "bg-sky-50 dark:bg-sky-950/40",          text: "text-sky-700 dark:text-sky-300",         border: "border-sky-200 dark:border-sky-800",         dot: "bg-sky-500" },
  invoiced: { label: "Invoiced",  bg: "bg-violet-50 dark:bg-violet-950/40",    text: "text-violet-700 dark:text-violet-300",   border: "border-violet-200 dark:border-violet-800",   dot: "bg-violet-500" },
  cancel:   { label: "Cancelled", bg: "bg-rose-50 dark:bg-rose-950/40",        text: "text-rose-700 dark:text-rose-300",       border: "border-rose-200 dark:border-rose-800",       dot: "bg-rose-500" },
};

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

function Row({ label, value, mono = false, bold = false, accent = false }: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className={cn("text-xs shrink-0", bold ? "font-semibold text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
      <span className={cn(
        "text-xs text-right",
        mono && "font-mono",
        bold && "font-bold text-base",
        accent && "text-indigo-600 dark:text-indigo-400",
        !bold && !accent && "text-foreground/80"
      )}>
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children, color = "default" }: {
  children: React.ReactNode;
  color?: "default" | "indigo" | "amber" | "emerald";
}) {
  const colors = {
    default: "text-muted-foreground/60",
    indigo:  "text-indigo-500 dark:text-indigo-400",
    amber:   "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
  };
  return (
    <p className={cn(
      "text-[10px] font-bold uppercase tracking-widest mb-2 mt-5 flex items-center gap-1.5",
      colors[color]
    )}>
      {children}
    </p>
  );
}

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────

export default function ReceiptDetail({ id }: { id: number }) {
  const { data, isLoading, isError, error } = useGetReceiptByIdQuery(id);

  if (isLoading) {
    return (
      <div className="space-y-2 mt-6 px-1">
        <Skeleton className="h-5 w-2/3 mx-auto rounded-full" />
        <Skeleton className="h-3 w-1/2 mx-auto" />
        <div className="mt-6 space-y-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className={cn("h-3 rounded-full", i % 3 === 2 ? "w-1/2" : "w-full")} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    const message =
      (error as any)?.data?.error ||
      (error as any)?.error ||
      "Failed to load receipt.";
    return (
      <div className="mt-6 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-4 py-3">
        <p className="text-xs text-rose-600 dark:text-rose-400">{message}</p>
      </div>
    );
  }

  const payload = data?.receipt;
  if (!payload) {
    return (
      <div className="mt-6 rounded-xl bg-muted/50 px-4 py-3">
        <p className="text-xs text-muted-foreground">Receipt not found.</p>
      </div>
    );
  }

  const { order, lines, payments } = payload;
  const state = STATE_CONFIG[order.state] ?? {
    label: order.state, bg: "bg-muted", text: "text-muted-foreground",
    border: "border-border", dot: "bg-gray-400",
  };
  const subtotal = order.amount_total - order.amount_tax;

  return (
    <div className="mt-4 print:mt-0 space-y-0">

      {/* ── Coloured header card ── */}
      <div className="rounded-t-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 px-5 pt-5 pb-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200 mb-1">
              Receipt
            </p>
            <p className="font-bold text-lg leading-tight">
              {m2oName(order.config_id, "Point of Sale")}
            </p>
            <p className="text-xs text-indigo-200 mt-0.5 font-mono">
              {order.pos_reference || order.name}
            </p>
          </div>

          {/* State badge */}
          <span className={cn(
            "text-[11px] font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 mt-0.5",
            state.bg, state.text, state.border
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", state.dot)} />
            {state.label}
          </span>
        </div>

        <p className="text-xs text-indigo-100 mt-4">
          {format(new Date(order.date_order), "MMMM d, yyyy · h:mm a")}
        </p>
      </div>

      {/* ── Body card ── */}
      <div className="rounded-b-2xl border border-t-0 border-border/60 bg-card overflow-hidden">

        {/* Dashed tear line */}
        <div className="relative px-5 py-0">
          <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-background border border-border/60" />
          <div className="absolute -right-3 top-0 w-6 h-6 rounded-full bg-background border border-border/60" />
          <div className="border-t-2 border-dashed border-border/40 my-0" />
        </div>

        <div className="px-5 pb-6">

          {/* Details grid */}
          <SectionLabel color="indigo">Details</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Customer", value: m2oName(order.partner_id, "Walk-in"),  icon: "👤" },
              { label: "Cashier",  value: m2oName(order.user_id),                icon: "🧑‍💼" },
              { label: "Session",  value: m2oName(order.session_id),             icon: "🖥️" },
              { label: "Terminal", value: m2oName(order.config_id),              icon: "📍" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="rounded-xl bg-muted/40 border border-border/40 px-3 py-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-xs font-semibold text-foreground mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Line items */}
          <SectionLabel color="amber">Items</SectionLabel>
          <div className="rounded-xl border border-amber-100 dark:border-amber-900/40 overflow-hidden divide-y divide-amber-100 dark:divide-amber-900/40">
            {lines.map((l: any, idx: number) => (
              <div
                key={l.id ?? idx}
                className="flex items-start justify-between gap-3 px-3 py-2.5 bg-amber-50/50 dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {Array.isArray(l.product_id) ? l.product_id[1] : "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {l.qty} × ${(l.price_unit as number).toFixed(2)}
                    {l.discount > 0 && (
                      <span className="ml-1.5 text-rose-500 font-semibold">−{l.discount}%</span>
                    )}
                  </p>
                  {l.note && (
                    <p className="text-[11px] italic text-muted-foreground/70 mt-0.5">{l.note}</p>
                  )}
                </div>
                <p className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap pt-0.5">
                  ${(l.price_subtotal_incl as number).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <SectionLabel color="emerald">Summary</SectionLabel>
          <div className="rounded-xl border border-border/40 overflow-hidden divide-y divide-border/30">
            <div className="px-3 bg-background">
              <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} mono />
              <Row label="Tax"      value={`$${order.amount_tax.toFixed(2)}`} mono />
            </div>
            <div className="px-3 bg-emerald-50 dark:bg-emerald-950/30">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Total</span>
                <span className="font-mono font-extrabold text-lg text-emerald-700 dark:text-emerald-300">
                  ${order.amount_total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payments */}
          <SectionLabel color="indigo">Payment</SectionLabel>
          <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 overflow-hidden divide-y divide-indigo-100 dark:divide-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/10">
            <div className="px-3">
              {payments.map((p: any, idx: number) => (
                <Row
                  key={p.id ?? idx}
                  label={Array.isArray(p.payment_method_id) ? p.payment_method_id[1] : "—"}
                  value={`$${(p.amount as number).toFixed(2)}`}
                  mono
                  accent
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
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground/50">— Thank you for your purchase —</p>
          </div>
        </div>
      </div>
    </div>
  );
}