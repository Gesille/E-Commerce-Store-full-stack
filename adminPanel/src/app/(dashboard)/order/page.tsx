// app/calendar/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useGetAdminOrdersQuery } from "@/redux/order/orderApi";
import { format, isSameDay, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, TrendingUp, ShoppingBag, DollarSign, Users } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useGetAdminOrderDetailQuery } from "@/redux/order/orderApi";
import { X, Package } from "lucide-react";


const STATE_COLORS: Record<string, string> = {
  draft:  "bg-gray-100 text-gray-600 dark:bg-gray-800",
  sent:   "bg-blue-100 text-blue-600",
  sale:   "bg-green-100 text-green-600",
  done:   "bg-violet-100 text-violet-600",
  cancel: "bg-red-100 text-red-500",
};

const STATE_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent",
  sale: "Confirmed", done: "Done", cancel: "Cancelled",
};

export default function CalendarPage() {
  const { data, isLoading } = useGetAdminOrdersQuery({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const orders = data?.orders || [];

  // ── ANALYTICS ──────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = orders.filter((o: any) =>
      new Date(o.date_order).getMonth() === now.getMonth() &&
      new Date(o.date_order).getFullYear() === now.getFullYear()
    );
    const lastMonth = orders.filter((o: any) => {
      const d = new Date(o.date_order);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });

    const totalRevenue = thisMonth.reduce((s: number, o: any) => s + o.amount_total, 0);
    const lastRevenue  = lastMonth.reduce((s: number, o: any) => s + o.amount_total, 0);
    const revenueGrowth = lastRevenue > 0
      ? (((totalRevenue - lastRevenue) / lastRevenue) * 100).toFixed(1)
      : "0";

    // last 7 days chart data
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const day = subDays(now, 6 - i);
      const dayOrders = orders.filter((o: any) =>
        isSameDay(new Date(o.date_order), day)
      );
      return {
        day: format(day, "EEE"),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((s: number, o: any) => s + o.amount_total, 0),
      };
    });

    // orders by state for bar chart
    const byState = Object.entries(
      orders.reduce((acc: Record<string, number>, o: any) => {
        acc[o.state] = (acc[o.state] || 0) + 1;
        return acc;
      }, {})
    ).map(([state, count]) => ({
      state: STATE_LABELS[state] || state,
      count,
    }));

    // unique customers this month
    const uniqueCustomers = new Set(
      thisMonth.map((o: any) => o.partner_id?.[0])
    ).size;

    return { thisMonth, totalRevenue, revenueGrowth, last7, byState, uniqueCustomers };
  }, [orders, currentMonth]);

  // ── CALENDAR DATA ──────────────────────────────────────
  const dayOrders = orders.filter((o: any) =>
    isSameDay(new Date(o.date_order), selectedDate)
  );

  const daysWithOrders = orders.reduce((acc: Record<string, number>, o: any) => {
    const day = format(new Date(o.date_order), "yyyy-MM-dd");
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay  = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startPad = firstDay.getDay();
  const days = Array.from({ length: lastDay.getDate() }, (_, i) =>
    new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1)
  );

  if (isLoading) return <p className="p-6 text-muted-foreground">Loading orders...</p>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      <h1 className="text-2xl font-bold">Orders & Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Orders",
            value: stats.thisMonth.length,
            icon: ShoppingBag,
            color: "text-violet-500",
            bg: "bg-violet-50 dark:bg-violet-950",
          },
          {
            label: "Revenue",
            value: `$${stats.totalRevenue.toFixed(2)}`,
            icon: DollarSign,
            color: "text-green-500",
            bg: "bg-green-50 dark:bg-green-950",
          },
          {
            label: "Growth",
            value: `${stats.revenueGrowth}%`,
            icon: TrendingUp,
            color: "text-pink-500",
            bg: "bg-pink-50 dark:bg-pink-950",
          },
          {
            label: "Customers",
            value: stats.uniqueCustomers,
            icon: Users,
            color: "text-blue-500",
            bg: "bg-blue-50 dark:bg-blue-950",
          },
        ].map((s) => (
          <div key={s.label} className="bg-background border rounded-2xl p-4 flex items-center gap-3">
            <div className={`${s.bg} p-2.5 rounded-xl`}>
              <s.icon size={20} className={s.color} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-bold text-lg">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* AREA CHART — revenue last 7 days */}
        <div className="bg-background border rounded-2xl p-5">
          <p className="font-semibold mb-4 text-sm">Revenue — Last 7 Days</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={stats.last7}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.05} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Revenue"]}
                contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* BAR CHART — orders by state */}
        <div className="bg-background border rounded-2xl p-5">
          <p className="font-semibold mb-4 text-sm">Orders by Status</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.byState} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.05} />
              <XAxis dataKey="state" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: any) => [v, "Orders"]}
                contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
              />
              <Bar dataKey="count" fill="#ec4899" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ── CALENDAR + ORDER LIST (your existing code) ── */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* CALENDAR */}
        <div className="bg-background border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-1.5 hover:bg-muted rounded-lg transition"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="font-semibold">{format(currentMonth, "MMMM yyyy")}</p>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-1.5 hover:bg-muted rounded-lg transition"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map((day) => {
              const key        = format(day, "yyyy-MM-dd");
              const count      = daysWithOrders[key] || 0;
              const isSelected = isSameDay(day, selectedDate);
              const isToday    = isSameDay(day, new Date());
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={`relative flex flex-col items-center justify-center h-10 rounded-xl text-sm font-medium transition
                    ${isSelected ? "bg-primary text-primary-foreground"
                      : isToday  ? "border border-primary text-primary"
                      : "hover:bg-muted"}`}
                >
                  {day.getDate()}
                  {count > 0 && (
                    <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full
                      ${isSelected ? "bg-white" : "bg-primary"}`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted rounded-xl p-3">
              <p className="text-muted-foreground text-xs">Orders this month</p>
              <p className="font-bold text-lg">{stats.thisMonth.length}</p>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <p className="text-muted-foreground text-xs">Revenue this month</p>
              <p className="font-bold text-lg">${stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* ORDER LIST */}
        <div className="bg-background border rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{format(selectedDate, "MMMM d, yyyy")}</h2>
            <span className="text-xs bg-muted px-2 py-1 rounded-full">
              {dayOrders.length} orders · $
              {dayOrders.reduce((s: number, o: any) => s + o.amount_total, 0).toFixed(2)}
            </span>
          </div>

          {dayOrders.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              No orders on this day
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[420px] pr-1">
              {dayOrders.map((order: any) => (
               <div
    key={order.id}
    onClick={() => setSelectedOrderId(order.id)} // 👈 add this
    className="flex items-center justify-between p-3 rounded-xl border
      hover:bg-muted hover:border-primary cursor-pointer transition" // 👈 add cursor-pointer
  >
                  <div className="flex flex-col gap-0.5">
                    <p className="font-semibold text-sm">{order.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.partner_id?.[1]} · {format(new Date(order.date_order), "h:mm a")}
                    </p>
                    {order.origin?.startsWith("WEB_ORDER") && (
                      <span className="text-[10px] text-violet-500">From store</span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full capitalize font-medium
                      ${STATE_COLORS[order.state] || "bg-gray-100"}`}>
                      {STATE_LABELS[order.state] || order.state}
                    </span>
                    <span className="font-bold text-sm">${order.amount_total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      {selectedOrderId && (
  <OrderDetailModal
    orderId={selectedOrderId}
    onClose={() => setSelectedOrderId(null)}
  />
)}
    </div>
    
  );
}

function OrderDetailModal({
  orderId,
  onClose,
}: {
  orderId: number;
  onClose: () => void;
}) {
  const { data, isLoading } = useGetAdminOrderDetailQuery(orderId);
  const order = data?.order;

  return (
    // BACKDROP
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : !order ? (
          <div className="p-8 text-center text-muted-foreground">Order not found</div>
        ) : (
          <>
            {/* HEADER */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">{order.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(order.date_order), "MMMM d, yyyy · h:mm a")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize
                  ${STATE_COLORS[order.state] || "bg-gray-100"}`}>
                  {STATE_LABELS[order.state] || order.state}
                </span>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-xl transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* CUSTOMER INFO */}
            <div className="p-6 border-b grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-1">Customer</p>
                <p className="font-semibold">{order.partner_id?.[1]}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Salesperson</p>
                <p className="font-semibold">{order.user_id?.[1] || "—"}</p>
              </div>
              {order.origin && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Origin</p>
                  <p className="font-semibold">{order.origin}</p>
                </div>
              )}
            </div>

            {/* ORDER LINES */}
            <div className="p-6">
              <p className="font-semibold mb-3 flex items-center gap-2">
                <Package size={16} />
                Products
              </p>

              <div className="border rounded-xl overflow-hidden">
                {/* TABLE HEADER */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted text-xs text-muted-foreground font-medium">
                  <span className="col-span-5">Product</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Unit Price</span>
                  <span className="col-span-3 text-right">Subtotal</span>
                </div>

                {/* TABLE ROWS */}
                {order.lines?.map((line: any, i: number) => (
                  <div
                    key={line.id || i}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 text-sm items-center
                      ${i % 2 === 0 ? "" : "bg-muted/40"}`}
                  >
                    <div className="col-span-5">
                      <p className="font-medium">{line.product_id?.[1]}</p>
                      {line.name !== line.product_id?.[1] && (
                        <p className="text-xs text-muted-foreground truncate">
                          {line.name}
                        </p>
                      )}
                    </div>
                    <p className="col-span-2 text-center">{line.product_uom_qty}</p>
                    <p className="col-span-2 text-right">${line.price_unit.toFixed(2)}</p>
                    <p className="col-span-3 text-right font-semibold">
                      ${line.price_subtotal.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* TOTALS */}
              <div className="mt-4 flex flex-col items-end gap-1 text-sm">
                <div className="flex gap-8">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${order.amount_untaxed?.toFixed(2)}</span>
                </div>
                <div className="flex gap-8">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${order.amount_tax?.toFixed(2)}</span>
                </div>
                <div className="flex gap-8 font-bold text-base border-t pt-2 mt-1">
                  <span>Total</span>
                  <span>${order.amount_total?.toFixed(2)}</span>
                </div>
              </div>

              {/* NOTE */}
              {order.note && (
                <div className="mt-4 p-3 bg-muted rounded-xl text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Note</p>
                  <p>{order.note}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}