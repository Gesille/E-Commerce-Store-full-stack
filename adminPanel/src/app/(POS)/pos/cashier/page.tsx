"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { ScanToast, ScanToastState } from "@/components/Scantoast";
import { useLazyGetProductByBarcodeQuery } from "@/redux/product/productApi";


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
  const [activeConfigId, setActiveConfigId] = useState<number | undefined>(
    () => {
      const saved = localStorage.getItem("pos_active_config_id");
      return saved ? Number(saved) : undefined;
    },
  );

  const { session, loading, onSessionOpened, closeSession } =
    usePOSSession(activeConfigId);

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [showSwitchCashier, setShowSwitchCashier] = useState(false);
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState<string>("");

  // ── Barcode scan state ─────────────────────────────────────────────────────
  const [scanToast, setScanToast] = useState<ScanToastState>(null);
  const scanToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [triggerGetProductByBarcode] = useLazyGetProductByBarcodeQuery();

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

  const [paymentTotal, setPaymentTotal] = useState<number>(0);

  const activeOrder = orders.find((o) => o.id === activeOrderId);
  const activeMeta = orderMeta[activeOrderId] || { customer: null, note: "" };

  // ── Cart helpers ───────────────────────────────────────────────────────────
  const updateCart = (newCart: CartItem[]) => {
    persistCart(activeOrderId, newCart);
  };

  // Stable ref so barcode handler always gets latest cart
  const activeOrderRef = useRef(activeOrder);
  useEffect(() => {
    activeOrderRef.current = activeOrder;
  }, [activeOrder]);

  const updateCartRef = useRef(updateCart);
  useEffect(() => {
    updateCartRef.current = updateCart;
  });

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

  // ── Dismiss toast helper ───────────────────────────────────────────────────
  const showToastFor = useCallback((state: ScanToastState, ms = 2500) => {
    setScanToast(state);
    if (scanToastTimerRef.current) clearTimeout(scanToastTimerRef.current);
    scanToastTimerRef.current = setTimeout(() => setScanToast(null), ms);
  }, []);

  // ── Add scanned product to cart ────────────────────────────────────────────
  const addScannedProductToCart = useCallback(
    (product: any) => {
      const currentOrder = activeOrderRef.current;
      if (!currentOrder) return;

      const existingIdx = currentOrder.cart.findIndex(
        (item) => item.productId === product.id,
      );

      let newCart: CartItem[];
      if (existingIdx !== -1) {
        // Increment qty if already in cart
        newCart = currentOrder.cart.map((item, idx) =>
          idx === existingIdx ? { ...item, qty: item.qty + 1 } : item,
        );
      } else {
        // Add new cart item
        const newItem: CartItem = {
          id: Date.now(),
          productId: product.id,
          name: product.name,
          price: product.list_price ?? 0,
          unitPrice: product.list_price ?? 0,
          qty: 1,
          discount: 0,
          note: "",
        };
        newCart = [...currentOrder.cart, newItem];
      }

      updateCartRef.current(newCart);
      showToastFor({ status: "success", name: product.name });
    },
    [showToastFor],
  );

  // ── Barcode scanner ────────────────────────────────────────────────────────
useEffect(() => {
  let barcodeBuffer = "";
  let lastKeyTime = 0;
  let barcodeTimer: ReturnType<typeof setTimeout>;

  const handler = async (e: KeyboardEvent) => {
    const now = Date.now();
    const timeSinceLast = now - lastKeyTime;
    lastKeyTime = now;

    // If a character arrives suspiciously fast (< 50 ms), it's a scanner —
    // prevent it from landing in whatever input has focus.
    const isScannerSpeed = timeSinceLast < 50;

    if (e.key === "Enter") {
      if (barcodeBuffer.length > 2) {
        const code = barcodeBuffer.trim();
        barcodeBuffer = "";
        clearTimeout(barcodeTimer);

        setScanToast({ status: "scanning", code });

        try {
          const result = await triggerGetProductByBarcode(code).unwrap();
          if (result) {
            addScannedProductToCart(result);
          } else {
            showToastFor(
              { status: "error", message: `No product found for: ${code}` },
              3000,
            );
          }
        } catch {
          showToastFor(
            { status: "error", message: `Product not found: ${code}` },
            3000,
          );
        }
      }
      barcodeBuffer = "";
      return;
    }

    if (e.key.length === 1) {
      if (isScannerSpeed || barcodeBuffer.length > 0) {
        // We're in a scan sequence — grab the char and block it from inputs
        e.preventDefault();
        barcodeBuffer += e.key;

        clearTimeout(barcodeTimer);
        barcodeTimer = setTimeout(() => {
          barcodeBuffer = "";
        }, 100);
      }
      // If it's the very first slow keystroke (manual typing), leave it alone
    }
  };

  window.addEventListener("keydown", handler, true); // ← capture phase
  return () => window.removeEventListener("keydown", handler, true);
}, [triggerGetProductByBarcode, addScannedProductToCart, showToastFor]);

  const [createOrder, { isLoading: isSubmitting }] = useCreateOrderMutation();

  const handlePaymentConfirm = async (lines: PaymentLine[]) => {
    if (!activeOrder || !session) return;

    const rawCashierId = session.activeShift?.cashierId;

    const cashierId: string =
      rawCashierId == null
        ? ""
        : typeof rawCashierId === "object"
          ? (rawCashierId as any)._id ?? ""
          : String(rawCashierId);

    if (!cashierId) {
      alert(
        "No active cashier shift found. Please switch cashier or reopen the session.",
      );
      return;
    }

    if (!activeConfigId) {
      alert("No POS config selected. Please reopen the session.");
      return;
    }

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
        cashierId,
        configId: activeConfigId,
        customerId: activeMeta.customer?.id ?? undefined,
        note: activeMeta.note ?? "",
      }).unwrap();

      setReceipt({
        order: { ...activeOrder },
        paymentLines: lines,
        odooOrderId: result.orderId,
      });
      updateCart([]);
      setMeta({ customer: null, note: "" });
      setShowPayment(false);
    } catch (err: any) {
      alert(err?.data?.message ?? "Order failed. Please try again.");
    }
  };

  const handleNewOrderAfterReceipt = () => {
    removeOrder(activeOrderId);
    setReceipt(null);
  };

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

          {/* Right section */}
          <div className="flex items-center gap-4">
            {/* Barcode scanner indicator */}
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400" title="Barcode scanner ready">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9V5a2 2 0 012-2h4M3 15v4a2 2 0 002 2h4M21 9V5a2 2 0 00-2-2h-4M21 15v4a2 2 0 01-2 2h-4" />
                <line x1="7" y1="12" x2="17" y2="12" />
              </svg>
              <span>Scanner ready</span>
            </div>

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
            onOpenPayment={(payload) => {
              setPaymentTotal(payload.total);
              setShowPayment(true);
            }}
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

      {/* ── Barcode Scan Toast ─────────────────────────────────────────────── */}
      <ScanToast state={scanToast} />

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
          total={paymentTotal}
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