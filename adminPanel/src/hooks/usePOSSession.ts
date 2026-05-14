// hooks/usePOSSession.ts
import { useEffect, useState, useCallback } from "react";

export interface POSSessionData {
  _id: string;
  name: string;
  status: "open" | "closed";
  type: "daily" | "long_term";
  cashierId: { _id: string; name: string; email: string };
  openedBy: { _id: string; name: string; email: string };
  openedAt: string;
}

export function usePOSSession() {
  const [session, setSession] = useState<POSSessionData | null>(null);
  const [stats, setStats] = useState({ orderCount: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/pos/session/active");
      const data = await res.json();
      setSession(data.session);
      if (data.stats) setStats(data.stats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  const openSession = async (payload: {
    cashierId: string;
    type?: "daily" | "long_term";
    openingBalance?: number;
  }) => {
    const res = await fetch("/api/pos/session/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    setSession(data.session);
    return data.session;
  };

  const closeSession = async (payload?: {
    closingBalance?: number;
    closingNote?: string;
  }) => {
    const res = await fetch("/api/pos/session/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    setSession(null);
    return data.summary;
  };

  const switchCashier = async (newCashierId: string) => {
    const res = await fetch("/api/pos/session/switch-cashier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newCashierId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    setSession(data.session);
    return data.session;
  };

  return { session, stats, loading, openSession, closeSession, switchCashier, refetch: fetchSession };
}