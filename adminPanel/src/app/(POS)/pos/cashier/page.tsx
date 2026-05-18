"use client";

import { useEffect, useState } from "react";
import { Order, CartItem, Product, Category, calcOrderTotals, Customer, PaymentLine } from "@/types/pos";
import CustomerModal from "@/components/CustomerModal";
import PaymentModal from "@/components/PaymentModal";
import { CartPanel } from "@/components/CartPanel";
import { CategorySidebar } from "@/components/CategorySidebar";
import { HoldOrdersPanel } from "@/components/HoldOrdersPanel";
import { NoteModal } from "@/components/NoteModal";
import { ProductGrid } from "@/components/ProductGrid";
import { ReceiptModal } from "@/components/ReceiptModal";
import { POSSearchBar } from "@/components/POSSearchBar";
import { OpenSessionModal } from "@/components/OpenSessionModal";
import { SwitchCashierModal } from "@/components/SwitchCashierModal";
import {
  useGetActiveSessionQuery,
  useCloseSessionMutation,
  useStartCashierShiftMutation,
  type Session,
  type Shift,
} from "@/redux/pos/Posapi";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

// ─── CLOCK ────────────────────────────────────────────────────────────────────

function ClockDisplay() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
  useEffect(() => {
    const t = setInterval(
      () =>
        setTime(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        ),
      60000
    );
    return () => clearInterval(t);
  }, []);
  return <>{time}</>;
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function CashierPage() {
  // ── Session state ──────────────────────────────────────────────────────────
  // Fetches the active session on mount and keeps it live.
  const {
    data: sessionData,
    isLoading,
    isFetching,
    isError,
    refetch: refetchSession,
  } = useGetActiveSessionQuery();

  // Show spinner only on the very first load (no data yet).
  // Once we have data OR the request errored, stop showing "Loading…".
  const sessionLoading = isLoading && !sessionData && !isError;

  const session = sessionData?.session ?? null;
  const stats = sessionData?.stats ?? null;

  // Track the currently active cashier shift so we can show the cashier name
  // and pass it to SwitchCashierModal.  We seed this from the live query but
  // update it immediately when a new session is opened or a cashier switches.
  const [activeShift, setActiveShift] = useState<Shift | null>(
    () => sessionData?.activeShifts?.[0] ?? null
  );

  // Keep activeShift in sync whenever the query refreshes on its own.
  useEffect(() => {
    const shift = sessionData?.activeShifts?.[0] ?? null;
    setActiveShift(shift);
  }, [sessionData]);

  // ── RTK mutations ──────────────────────────────────────────────────────────
  const [closeSession] = useCloseSessionMutation();
  const [startCashierShift] = useStartCashierShiftMutation();

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [showSwitchCashier, setShowSwitchCashier] = useState(false);
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState<string>("");

  const [orders, setOrders] = useState<Order[]>([
    { id: 1, name: "Order 1", cart: [], createdAt: new Date() },
  ]);
  const [activeOrderId, setActiveOrderId] = useState<number>(1);

  // Per-order state: customer, note
  const [orderMeta, setOrderMeta] = useState<
    Record<number, { customer: Customer | null; note: string }>
  >({
    1: { customer: null, note: "" },
  });

  // Modals
  const [showCustomer, setShowCustomer] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [receipt, setReceipt] = useState<{
    order: Order;
    paymentLines: PaymentLine[];
  } | null>(null);

  const activeOrder = orders.find((o) => o.id === activeOrderId);
  const activeMeta = orderMeta[activeOrderId] || { customer: null, note: "" };
  const { total } = calcOrderTotals(activeOrder?.cart || []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const updateCart = (newCart: CartItem[]) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === activeOrderId ? { ...o, cart: newCart } : o))
    );
  };

  const setMeta = (patch: Partial<{ customer: Customer | null; note: string }>) => {
    setOrderMeta((prev) => ({
      ...prev,
      [activeOrderId]: { ...activeMeta, ...patch },
    }));
  };

  const handleSetOrders = (newOrders: Order[]) => {
    setOrders(newOrders);
    newOrders.forEach((o) => {
      if (!orderMeta[o.id]) {
        setOrderMeta((prev) => ({
          ...prev,
          [o.id]: { customer: null, note: "" },
        }));
      }
    });
  };

  const handlePaymentConfirm = (lines: PaymentLine[]) => {
    if (!activeOrder) return;
    setReceipt({ order: { ...activeOrder }, paymentLines: lines });
    setShowPayment(false);
  };

  const handleNewOrderAfterReceipt = () => {
    const newId = Date.now();
    const remaining = orders.filter((o) => o.id !== activeOrderId);
    if (remaining.length === 0) {
      setOrders([{ id: newId, name: "Order 1", cart: [], createdAt: new Date() }]);
      setActiveOrderId(newId);
      setOrderMeta({ [newId]: { customer: null, note: "" } });
    } else {
      setOrders(remaining);
      setActiveOrderId(remaining[0].id);
    }
    setReceipt(null);
  };

  // ── OpenSessionModal callback ──────────────────────────────────────────────
  // Called by OpenSessionModal once the session is fully open.
  const handleSessionOpened = ({
    session: newSession,
    activeShift: newShift,
  }: {
    session: Session;
    activeShift: Shift;
  }) => {
    setActiveShift(newShift);
    setShowOpenSession(false);
    // Refresh the active-session query so the top-bar updates immediately.
    refetchSession();
  };

  // ── SwitchCashierModal callback ────────────────────────────────────────────
  // Ends the current cashier's shift and starts one for the new cashier.
  const handleSwitchCashier = async (newCashierId: string) => {
    if (!session) return;

    await startCashierShift({ cashierId: newCashierId });
    setShowSwitchCashier(false);
    refetchSession();
  };

  // ── Barcode scanner ────────────────────────────────────────────────────────
  useEffect(() => {
    let barcodeBuffer = "";
    let barcodeTimer: ReturnType<typeof setTimeout>;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      clearTimeout(barcodeTimer);
      if (e.key === "Enter" && barcodeBuffer.length > 3) {
        // TODO: look up product by barcode
        console.log("Barcode scanned:", barcodeBuffer);
        barcodeBuffer = "";
        return;
      }
      if (e.key.length === 1) barcodeBuffer += e.key;
      barcodeTimer = setTimeout(() => {
        barcodeBuffer = "";
      }, 100);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Resolve cashier display name ───────────────────────────────────────────
  // The active shift stores the cashier's MongoDB ID as a string; the session
  // query returns activeShifts with a populated cashierId object on the old
  // hook but here we work with the raw Shift type. Adjust the field name below
  // to match your actual populated Shift shape.
  const cashierName =
    (activeShift as any)?.cashierId?.name ??
    activeShift?.cashierId ??
    "Cashier";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-col bg-gray-50" style={{ height: "calc(100vh - 60px)" }}>
        {/* Top bar */}
        <div className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2563EB"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-[14px] font-semibold text-gray-900">POS — Shop #1</span>

            {sessionLoading ? (
              <span className="text-[11px] text-gray-400">Loading…</span>
            ) : session ? (
              <>
                <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-medium">
                  ● {session.name}
                </span>
                <span className="text-[11px] text-gray-500">
                  👤 {cashierName}
                </span>
                <button
                  onClick={() => setShowSwitchCashier(true)}
                  className="text-[11px] text-blue-500 hover:underline"
                >
                  Switch
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowOpenSession(true)}
                className="text-[11px] bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full font-medium hover:bg-red-100"
              >
                ○ No session — click to open
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <POSSearchBar search={search} setSearch={setSearch} />
            <span className="text-[13px] text-gray-500 font-medium">👤 Admin</span>
            <span className="text-[12px] text-gray-400">
              <ClockDisplay />
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          <CategorySidebar selected={category} setSelected={setCategory} />

          <div className="flex-1 overflow-y-auto bg-gray-50">
            <ProductGrid
              category={category}
              search={search}
              cart={activeOrder?.cart || []}
              setCart={updateCart}
            />
          </div>

          <CartPanel
            cart={activeOrder?.cart || []}
            setCart={updateCart}
            orderName={activeOrder?.name || ""}
            customer={activeMeta.customer}
            onOpenCustomer={() => setShowCustomer(true)}
            onOpenPayment={() => setShowPayment(true)}
            orderNote={activeMeta.note}
            onOpenNote={() => setShowNote(true)}
          />

          <HoldOrdersPanel
            orders={orders}
            setOrders={handleSetOrders}
            activeOrderId={activeOrderId}
            setActiveOrderId={setActiveOrderId}
          />
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* Open Session */}
      {showOpenSession && (
        <OpenSessionModal
          onSessionOpened={handleSessionOpened}
          onClose={() => setShowOpenSession(false)}
        />
      )}

      {/* Switch Cashier */}
      {showSwitchCashier && session && (
        <SwitchCashierModal
          currentCashierId={
            typeof activeShift?.cashierId === "object"
              ? (activeShift.cashierId as any)._id
              : activeShift?.cashierId ?? ""
          }
          onSwitch={handleSwitchCashier}
          onClose={() => setShowSwitchCashier(false)}
        />
      )}

      {/* Customer */}
      {showCustomer && (
        <CustomerModal
          current={activeMeta.customer}
          onSelect={(c) => setMeta({ customer: c })}
          onClose={() => setShowCustomer(false)}
        />
      )}

      {/* Payment */}
      {showPayment && activeOrder && (
        <PaymentModal
          total={total}
          orderName={activeOrder.name}
          customer={activeMeta.customer}
          cart={activeOrder.cart}
          onClose={() => setShowPayment(false)}
          onConfirm={handlePaymentConfirm}
        />
      )}

      {/* Note */}
      {showNote && (
        <NoteModal
          initial={activeMeta.note}
          onSave={(note) => setMeta({ note })}
          onClose={() => setShowNote(false)}
        />
      )}

      {/* Receipt */}
      {receipt && (
        <ReceiptModal
          order={receipt.order}
          customer={activeMeta.customer}
          paymentLines={receipt.paymentLines}
          onClose={() => setReceipt(null)}
          onNewOrder={handleNewOrderAfterReceipt}
        />
      )}
    </>
  );
}