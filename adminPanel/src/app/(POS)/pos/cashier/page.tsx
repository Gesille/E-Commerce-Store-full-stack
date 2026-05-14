"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useGetCategoriesQuery } from "@/redux/category/categoryApi";
import { useGetAllProductsQuery } from "@/redux/product/productApi";
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
import { usePOSSession } from "@/hooks/usePOSSession";


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

// ─── SEARCH BAR ───────────────────────────────────────────────────────────────




export default function CashierPage() {
  const { session, stats, loading, openSession, closeSession, switchCashier } = usePOSSession();
 const [showOpenSession,   setShowOpenSession]   = useState(false);
  const [showSwitchCashier, setShowSwitchCashier] = useState(false);
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState<string>("");

  const [orders, setOrders] = useState<Order[]>([
    { id: 1, name: "Order 1", cart: [], createdAt: new Date() },
  ]);
  const [activeOrderId, setActiveOrderId] = useState<number>(1);

  // Per-order state: customer, note
  const [orderMeta, setOrderMeta] = useState<Record<number, { customer: Customer | null; note: string }>>({
    1: { customer: null, note: "" },
  });

  // Modals
  const [showCustomer, setShowCustomer] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [receipt, setReceipt] = useState<{ order: Order; paymentLines: PaymentLine[] } | null>(null);

  const activeOrder = orders.find((o) => o.id === activeOrderId);
  const activeMeta = orderMeta[activeOrderId] || { customer: null, note: "" };
  const { total } = calcOrderTotals(activeOrder?.cart || []);

  const updateCart = (newCart: CartItem[]) => {
    setOrders((prev) => prev.map((o) => (o.id === activeOrderId ? { ...o, cart: newCart } : o)));
  };

  const setMeta = (patch: Partial<{ customer: Customer | null; note: string }>) => {
    setOrderMeta((prev) => ({ ...prev, [activeOrderId]: { ...activeMeta, ...patch } }));
  };

  // When a new order is added, initialise its meta
  const handleSetOrders = (newOrders: Order[]) => {
    setOrders(newOrders);
    newOrders.forEach((o) => {
      if (!orderMeta[o.id]) {
        setOrderMeta((prev) => ({ ...prev, [o.id]: { customer: null, note: "" } }));
      }
    });
  };

  const handlePaymentConfirm = (lines: PaymentLine[]) => {
    if (!activeOrder) return;

    // TODO: POST to your backend here
    // Example:
    // await fetch("/api/pos/complete-order", {
    //   method: "POST",
    //   body: JSON.stringify({
    //     orderName: activeOrder.name,
    //     cart: activeOrder.cart,
    //     customer: activeMeta.customer,
    //     note: activeMeta.note,
    //     paymentLines: lines,
    //     generateOdooInvoice: true,   // ← triggers Odoo account.move.create
    //   }),
    // });

    setReceipt({ order: { ...activeOrder }, paymentLines: lines });
    setShowPayment(false);
  };

  const handleNewOrderAfterReceipt = () => {
    // Clear the completed order
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

  // Barcode scanner support
  useEffect(() => {
    let barcodeBuffer = "";
    let barcodeTimer: ReturnType<typeof setTimeout>;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      clearTimeout(barcodeTimer);
      if (e.key === "Enter" && barcodeBuffer.length > 3) {
        // TODO: look up product by barcode
        // dispatch(lookupBarcode(barcodeBuffer));
        console.log("Barcode scanned:", barcodeBuffer);
        barcodeBuffer = "";
        return;
      }
      if (e.key.length === 1) barcodeBuffer += e.key;
      barcodeTimer = setTimeout(() => { barcodeBuffer = ""; }, 100);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <div className="flex flex-col bg-gray-50" style={{ height: "calc(100vh - 60px)" }}>
        {/* Top bar */}
        <div className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-[14px] font-semibold text-gray-900">POS — Shop #1</span>
          {loading ? (
  <span className="text-[11px] text-gray-400">Loading…</span>
) : session ? (
  <>
    <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-medium">
      ● {session.name}
    </span>
    <span className="text-[11px] text-gray-500">
      👤 {session.cashierId.name}
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
            <span className="text-[12px] text-gray-400"><ClockDisplay /></span>
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

      {/* Modals */}
      {showCustomer && (
        <CustomerModal
          current={activeMeta.customer}
          onSelect={(c) => setMeta({ customer: c })}
          onClose={() => setShowCustomer(false)}
        />
      )}

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

      {showNote && (
        <NoteModal
          initial={activeMeta.note}
          onSave={(note) => setMeta({ note })}
          onClose={() => setShowNote(false)}
        />
      )}

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