// src/hooks/usePOSSession.ts
//
// Centralises all POS session state so CashierPage stays clean.
// Uses the existing posApi RTK Query slice — no new API calls needed.

import { useState, useCallback } from "react";
import {
  useGetActiveSessionQuery,
  useOpenSessionMutation,
  useConfirmOpeningBalanceMutation,
  useCloseSessionMutation,
  useStartCashierShiftMutation,
  type Session,
  type Shift,
  type OpenSessionBody,
} from "@/redux/pos/Posapi";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveSession {
  session: Session;
  activeShift: Shift | null;
  stats: { orderCount: number; totalRevenue: number } | null;
}

export interface UsePOSSessionReturn {
  /** Fully resolved session (null = no open session) */
  session: ActiveSession | null;
  /** True while the initial GET /session/active is in flight */
  loading: boolean;
  /** Any error message surfaced from the backend */
  error: string | null;

  /**
   * Opens a session.
   *  - If the backend returns requiresOpeningBalance === true it resolves with
   *    { requiresBalance: true, sessionId } so the caller can show the balance
   *    step (OpenSessionModal already handles this internally, but the hook
   *    exposes it in case you need it elsewhere).
   *  - Otherwise it resolves with { requiresBalance: false }.
   */
  openSession: (body: OpenSessionBody) => Promise<
    | { requiresBalance: true; sessionId: number }
    | { requiresBalance: false }
  >;

  /**
   * Confirms the opening cash balance after openSession returned
   * requiresBalance === true.
   */
  confirmBalance: (args: {
    sessionId: number;
    cashierId: string;
    openingBalance: number;
  }) => Promise<void>;

  /** Closes the current session */
  closeSession: () => Promise<void>;

  /** Call this after OpenSessionModal reports success so the hook re-syncs */
  onSessionOpened: (result: { session: Session; activeShift: Shift }) => void;

  /** Force a refetch from the backend (e.g. after returning from another tab) */
  refresh: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePOSSession(configId?: number): UsePOSSessionReturn {
  // Optimistic local state so the UI updates instantly after open/close
  const [localSession, setLocalSession] = useState<ActiveSession | null>(null);
  const [error, setError] = useState<string | null>(null);

const {
  data,
  isLoading,
  refetch,
} = useGetActiveSessionQuery(configId!, {
  skip: !configId,

  refetchOnFocus: true,
  pollingInterval: 30_000,
});

  const [openSessionMutation] = useOpenSessionMutation();
  const [confirmOpeningBalanceMutation] = useConfirmOpeningBalanceMutation();
  const [closeSessionMutation] = useCloseSessionMutation();

  // ── Derived session ────────────────────────────────────────────────────────
  // Prefer local (optimistic) state; fall back to server response
  const serverSession: ActiveSession | null =
    data?.session
      ? {
          session: data.session,
          activeShift: data.activeShifts?.[0] ?? null,
          stats: data.stats ?? null,
        }
      : null;

  const session = localSession ?? serverSession;

  // ── openSession ────────────────────────────────────────────────────────────
  const openSession = useCallback(
    async (
      body: OpenSessionBody
    ): Promise<
      | { requiresBalance: true; sessionId: number }
      | { requiresBalance: false }
    > => {
      setError(null);
      try {
        const result = await openSessionMutation(body).unwrap();

        if (result.requiresOpeningBalance) {
          if (!result.sessionId) {
            throw new Error("Server did not return a session ID.");
          }
          return { requiresBalance: true, sessionId: result.sessionId };
        }

        // Session opened immediately — update local state
        if (result.session && result.activeShift) {
          setLocalSession({
            session: result.session,
            activeShift: result.activeShift,
            stats: null,
          });
        }
        return { requiresBalance: false };
      } catch (err: any) {
        const msg =
          err?.data?.message ?? err?.message ?? "Failed to open session.";
        setError(msg);
        throw new Error(msg);
      }
    },
    [openSessionMutation]
  );

  // ── confirmBalance ─────────────────────────────────────────────────────────
  const confirmBalance = useCallback(
    async (args: {
      sessionId: number;
      cashierId: string;
      openingBalance: number;
    }) => {
      setError(null);
      try {
        const result = await confirmOpeningBalanceMutation(args).unwrap();
        setLocalSession({
          session: result.session,
          activeShift: result.activeShift,
          stats: null,
        });
      } catch (err: any) {
        const msg =
          err?.data?.message ?? err?.message ?? "Failed to confirm balance.";
        setError(msg);
        throw new Error(msg);
      }
    },
    [confirmOpeningBalanceMutation]
  );

  // ── closeSession ───────────────────────────────────────────────────────────
  const closeSession = useCallback(async () => {
    const sessionId = session?.session?.id;
    if (!sessionId) return;

    setError(null);
    try {
      await closeSessionMutation({ sessionId }).unwrap();
      setLocalSession(null);
    } catch (err: any) {
      const msg =
        err?.data?.message ?? err?.message ?? "Failed to close session.";
      setError(msg);
      throw new Error(msg);
    }
  }, [closeSessionMutation, session]);

  // ── onSessionOpened ────────────────────────────────────────────────────────
  // Called by OpenSessionModal after it fully completes the open + balance flow
  const onSessionOpened = useCallback(
    (result: { session: Session; activeShift: Shift }) => {
      setLocalSession({
        session: result.session,
        activeShift: result.activeShift,
        stats: null,
      });
    },
    []
  );

  // ── refresh ────────────────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    setLocalSession(null); // clear optimistic so server value takes over
    refetch();
  }, [refetch]);

  return {
    session,
    loading: isLoading,
    error,
    openSession,
    confirmBalance,
    closeSession,
    onSessionOpened,
    refresh,
  };
}