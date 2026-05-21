"use client";

import { useState, useEffect } from "react";
import {
  Order,
  CartItem,
  calcOrderTotals,
  Customer,
  PaymentLine,
} from "@/types/pos";
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
import { usePOSSession } from "@/hooks/usePOSSession";
import { useGetAllUsersQuery } from "@/redux/user/userApi";
import { CloseSessionConfirmModal } from "@/components/CloseSessionConfirmModal";
import { useCreateOrderMutation } from "@/redux/pos/Posapi";
import { useHeldOrders } from "@/hooks/Useheldorders";

// ── Clock ─────────────────────────────────────────────────────────────────────
function ClockDisplay() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  );

  useEffect(() => {
    const t = setInterval(
      () =>
        setTime(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        ),
      60_000,
    );
    return () => clearInterval(t);
  }, []);

  return <>{time}</>;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CashierPage() {
const [activeConfigId, setActiveConfigId] = useState<number | undefined>();

useEffect(() => {
  const saved = localStorage.getItem("pos_active_config_id");
  if (saved) setActiveConfigId(Number(saved));
}, []);
  const { session, loading, onSessionOpened, closeSession } =
    usePOSSession(activeConfigId);

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [showSwitchCashier, setShowSwitchCashier] = useState(false);
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    if (!loading && !session && activeConfigId !== undefined) {
      setShowOpenSession(true);
    } else if (!loading && !session && activeConfigId === undefined) {
      setShowOpenSession(true);
    }
  }, [loading, session, activeConfigId]);

  type OrderMeta = { customer: Customer | null; note: string };

  const initialOrderId = 1;

  const {
    orders,
    activeOrderId,
    setOrders,
    setActiveOrderId,
    updateCart: persistCart,
    removeOrder,
  } = useHeldOrders();

  const initMeta: Record<number, OrderMeta> = {};
  initMeta[initialOrderId] = { customer: null, note: "" };

  const [orderMeta, setOrderMeta] = useState<Record<number, OrderMeta>>(() => {
    try {
      const raw = localStorage.getItem("pos_order_meta");
      return raw
        ? JSON.parse(raw)
        : { [orders[0].id]: { customer: null, note: "" } };
    } catch {
      return { [orders[0].id]: { customer: null, note: "" } };
    }
  });

  const [showCustomer, setShowCustomer] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [receipt, setReceipt] = useState<{
    order: Order;
    paymentLines: PaymentLine[];
    odooOrderId?: number;
  } | null>(null);

  const activeOrder = orders.find((o) => o.id === activeOrderId);
  const activeMeta = orderMeta[activeOrderId] || { customer: null, note: "" };
  const { subtotal, tax, total } = calcOrderTotals(activeOrder?.cart || []);

  // ── Cart helpers ───────────────────────────────────────────────────────────
  const updateCart = (newCart: CartItem[]) => {
    persistCart(activeOrderId, newCart);
  };
  const setMeta = (
    patch: Partial<{ customer: Customer | null; note: string }>,
  ) => {
    setOrderMeta((prev) => {
      const next = { ...prev, [activeOrderId]: { ...activeMeta, ...patch } };
      localStorage.setItem("pos_order_meta", JSON.stringify(next));
      return next;
    });
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
  const [createOrder, { isLoading: isSubmitting }] = useCreateOrderMutation();
  const handlePaymentConfirm = async (lines: PaymentLine[]) => {
    if (!activeOrder || !session) return;

    try {
      const result = await createOrder({
        cart: activeOrder.cart.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          price: item.price,
          discount: item.discount ?? 0,
          note: item.note ?? "",
        })),
        paymentLines: lines.map((l) => ({
          method: l.method as "cash" | "card" | "bank",
          amount: l.amount,
        })),
        cashierId:
          typeof session.activeShift?.cashierId === "object"
            ? session.activeShift.cashierId._id
            : (session.activeShift?.cashierId ?? ""),
        configId: activeConfigId!,
        customerId: activeMeta.customer?.id ?? undefined,
        note: activeMeta.note ?? "",
      }).unwrap();

      setReceipt({
        order: { ...activeOrder },
        paymentLines: lines,
        odooOrderId: result.orderId,
      });
      setShowPayment(false);
    } catch (err: any) {
      alert(err?.data?.message ?? "Order failed. Please try again.");
    }
  };

  const handleNewOrderAfterReceipt = () => {
    removeOrder(activeOrderId);
    setReceipt(null);
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

  // ── Cashier name resolution ────────────────────────────────────────────────
  const { data: allUsers } = useGetAllUsersQuery();
  const shiftCashier = session?.activeShift?.cashierId;

  const cashierName = (() => {
    if (!session?.activeShift) return "Cashier";

    if (typeof shiftCashier === "object" && shiftCashier !== null) {
      return shiftCashier.name ?? "Cashier";
    }

    if (typeof shiftCashier === "string") {
      const user = (allUsers ?? []).find((u: any) => u._id === shiftCashier);
      return user?.name ?? shiftCashier;
    }

    return "Cashier";
  })();

  // ── Close session handler ──────────────────────────────────────────────────
  // FIX: only close the modal after closeSession succeeds.
  // CloseSessionConfirmModal catches the error internally and shows it,
  // so we only reach setShowCloseConfirm(false) on the happy path.
  const handleCloseSession = async () => {
    await closeSession(session!.session.id);
    setShowCloseConfirm(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className="flex flex-col bg-gray-50"
        style={{ height: "calc(100vh - 60px)" }}
      >
        {/* ── Top bar ───────────────────────────────────────────────────────── */}
        <div className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-5 shrink-0">
          {/* Left section */}
          <div className="flex items-center gap-3">
            {/* Store icon */}
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

            <span className="text-[14px] font-semibold text-gray-900">
              POS — Shop #1
            </span>

            {/* Session badge */}
            {loading ? (
              <span className="text-[11px] text-gray-400 animate-pulse">
                Loading session…
              </span>
            ) : session ? (
              <>
                <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-medium">
                  ●{" "}
                  {session.session.name && session.session.name !== "."
                    ? session.session.name
                    : (session.session.config_id?.[1] ?? "Session Open")}
                </span>

                {/* FIX: cashier name shown once here on the left, removed from right */}
                <span className="text-[11px] text-gray-500">
                  👤 {cashierName}
                </span>

                <button
                  onClick={() => setShowSwitchCashier(true)}
                  className="text-[11px] text-blue-500 hover:underline bg-transparent border-none cursor-pointer p-0"
                >
                  Switch
                </button>

                <button
                  onClick={() => setShowCloseConfirm(true)}
                  className="text-[11px] text-red-400 hover:text-red-600 hover:underline bg-transparent border-none cursor-pointer p-0 ml-1"
                >
                  Close session
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowOpenSession(true)}
                className="text-[11px] bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full font-medium hover:bg-red-100 border-none cursor-pointer transition"
              >
                ○ No session — click to open
              </button>
            )}
          </div>

          {/* Right section — FIX: removed duplicate cashier name span */}
          <div className="flex items-center gap-4">
            <POSSearchBar search={search} setSearch={setSearch} />
            <span className="text-[12px] text-gray-400">
              <ClockDisplay />
            </span>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
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
            onOpenPayment={(_payload) => setShowPayment(true)}
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

      {/* ── Open Session Modal ─────────────────────────────────────────────── */}
      {showOpenSession && (
        <OpenSessionModal
          onSessionOpened={(result) => {
            setActiveConfigId(result.configId);
            localStorage.setItem(
              "pos_active_config_id",
              String(result.configId),
            );
            onSessionOpened(result);
            setShowOpenSession(false);
          }}
          onClose={() => setShowOpenSession(false)}
        />
      )}

      {/* ── Switch Cashier Modal ───────────────────────────────────────────── */}
      {showSwitchCashier && session && (
        <SwitchCashierModal
          currentCashierId={
            typeof session.activeShift?.cashierId === "object"
              ? session.activeShift.cashierId._id
              : (session.activeShift?.cashierId ?? "")
          }
          configId={session.session.config_id?.[0] ?? activeConfigId ?? 0}
          currentShift={session.activeShift}
          onSwitch={(newCashierId, newShift) => {
            onSessionOpened({
              session: session.session,
              activeShift: newShift,
            });
            setShowSwitchCashier(false);
          }}
          onClose={() => setShowSwitchCashier(false)}
        />
      )}

      {/* ── Customer Modal ─────────────────────────────────────────────────── */}
      {showCustomer && (
        <CustomerModal
          current={activeMeta.customer}
          onSelect={(c) => setMeta({ customer: c })}
          onClose={() => setShowCustomer(false)}
        />
      )}

      {/* ── Payment Modal ──────────────────────────────────────────────────── */}
      {showPayment && activeOrder && (
        <PaymentModal
          total={total}
          orderName={activeOrder.name}
          customer={activeMeta.customer}
          cart={activeOrder.cart}
          onClose={() => setShowPayment(false)}
          onConfirm={handlePaymentConfirm}
          isSubmitting={isSubmitting}
        />
      )}

      {/* ── Note Modal ─────────────────────────────────────────────────────── */}
      {showNote && (
        <NoteModal
          initial={activeMeta.note}
          onSave={(note) => setMeta({ note })}
          onClose={() => setShowNote(false)}
        />
      )}

      {/* ── Receipt Modal ──────────────────────────────────────────────────── */}
      {receipt && (
        <ReceiptModal
          order={receipt.order}
          customer={activeMeta.customer}
          paymentLines={receipt.paymentLines}
          onClose={() => setReceipt(null)}
          onNewOrder={handleNewOrderAfterReceipt}
          odooOrderId={receipt.odooOrderId}
        />
      )}

      {/* ── Close Session Confirm Modal ────────────────────────────────────── */}
      {showCloseConfirm && session && (
        <CloseSessionConfirmModal
          session={session}
          onConfirm={handleCloseSession}
          onClose={() => setShowCloseConfirm(false)}
        />
      )}
    </>
  );
}
