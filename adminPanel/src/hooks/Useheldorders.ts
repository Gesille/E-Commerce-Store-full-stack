import { useState, useCallback } from "react";
import { Order, CartItem } from "@/types/pos";

const STORAGE_KEY = "pos_held_orders";
const ACTIVE_KEY  = "pos_active_order_id";

// ─── helpers ─────────────────────────────────────────────────────────────────

function defaultOrder(): Order {
  return { id: Date.now(), name: "Order 1", cart: [], createdAt: new Date() };
}

function load(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [defaultOrder()];
    const parsed: any[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [defaultOrder()];
    return parsed.map((o) => ({ ...o, createdAt: new Date(o.createdAt) }));
  } catch {
    return [defaultOrder()];
  }
}

function loadActiveId(orders: Order[]): number {
  try {
    const id = Number(localStorage.getItem(ACTIVE_KEY));
    if (orders.some((o) => o.id === id)) return id;
  } catch {}
  return orders[0].id;
}

function persist(orders: Order[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(orders)); } catch {}
}

function persistActive(id: number) {
  try { localStorage.setItem(ACTIVE_KEY, String(id)); } catch {}
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useHeldOrders() {
  const [orders, setOrdersRaw] = useState<Order[]>(load);
  const [activeOrderId, setActiveRaw] = useState<number>(() =>
    loadActiveId(load())
  );

  const setOrders = useCallback((next: Order[]) => {
    setOrdersRaw(next);
    persist(next);
  }, []);

  const setActiveOrderId = useCallback((id: number) => {
    setActiveRaw(id);
    persistActive(id);
  }, []);

  const addOrder = useCallback(() => {
    setOrdersRaw((prev) => {
      const o: Order = {
        id: Date.now(),
        name: `Order ${prev.length + 1}`,
        cart: [],
        createdAt: new Date(),
      };
      const next = [...prev, o];
      persist(next);
      persistActive(o.id);
      setActiveRaw(o.id);
      return next;
    });
  }, []);

  const deleteOrder = useCallback((id: number) => {
    setOrdersRaw((prev) => {
      const next = prev.filter((o) => o.id !== id);
      const safe = next.length > 0 ? next : [defaultOrder()];
      persist(safe);
      setActiveRaw((active) => {
        if (active === id) {
          persistActive(safe[0].id);
          return safe[0].id;
        }
        return active;
      });
      return safe;
    });
  }, []);

  const updateCart = useCallback((orderId: number, cart: CartItem[]) => {
    setOrdersRaw((prev) => {
      const next = prev.map((o) => (o.id === orderId ? { ...o, cart } : o));
      persist(next);
      return next;
    });
  }, []);

  /** Call after a successful payment to remove the paid order */
  const removeOrder = useCallback((id: number) => {
    deleteOrder(id);
  }, [deleteOrder]);

  const activeOrder = orders.find((o) => o.id === activeOrderId) ?? null;

  return {
    orders,
    activeOrderId,
    activeOrder,
    setOrders,
    setActiveOrderId,
    addOrder,
    deleteOrder,
    updateCart,
    removeOrder,
  };
}