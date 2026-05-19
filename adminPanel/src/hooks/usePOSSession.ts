import { useState, useCallback } from "react";
import {
  useGetActiveSessionQuery,
  useOpenSessionMutation,
  useConfirmOpeningBalanceMutation,
  useCloseSessionMutation,
} from "@/redux/pos/Posapi";
import { OpenSessionBody, Session, Shift } from "@/types/session";

export interface ActiveSession {
  session: Session;
  activeShift: Shift | null;
  stats: { orderCount: number; totalRevenue: number } | null;
}

export interface UsePOSSessionReturn {
  session: ActiveSession | null;

  loading: boolean;

  error: string | null;

  openSession: (
    body: OpenSessionBody,
  ) => Promise<
    { requiresBalance: true; sessionId: number } | { requiresBalance: false }
  >;

  confirmBalance: (args: {
    sessionId: number;
    cashierId: string;
    openingBalance: number;
  }) => Promise<void>;

closeSession: (sessionId: number) => Promise<void>;

  onSessionOpened: (result: { session: Session; activeShift: Shift }) => void;

  refresh: () => void;
}

export function usePOSSession(configId?: number): UsePOSSessionReturn {
  const [localSession, setLocalSession] = useState<ActiveSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useGetActiveSessionQuery(configId ?? 0, {
    skip: !configId,
    refetchOnFocus: true,
    pollingInterval: 30_000,
  });
  const [openSessionMutation] = useOpenSessionMutation();
  const [confirmOpeningBalanceMutation] = useConfirmOpeningBalanceMutation();
  const [closeSessionMutation] = useCloseSessionMutation();

  const serverSession: ActiveSession | null = data?.session
    ? {
        session: data.session,
        activeShift: data.activeShifts?.[0] ?? null,
        stats: data.stats ?? null,
      }
    : null;

  const session = localSession ?? serverSession;

  const openSession = useCallback(
    async (
      body: OpenSessionBody,
    ): Promise<
      { requiresBalance: true; sessionId: number } | { requiresBalance: false }
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
    [openSessionMutation],
  );

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
    [confirmOpeningBalanceMutation],
  );
const closeSession = useCallback(async (sessionId: number) => {
  setError(null);
  try {
    await closeSessionMutation({ sessionId }).unwrap();
    setLocalSession(null);
  } catch (err: any) {
    const msg = err?.data?.message ?? err?.message ?? "Failed to close session.";
    setError(msg);
    throw new Error(msg);
  }
}, [closeSessionMutation]);

  const onSessionOpened = useCallback(
    (result: { session: Session; activeShift: Shift }) => {
      setLocalSession({
        session: result.session,
        activeShift: result.activeShift,
        stats: null,
      });
    },
    [],
  );

  const refresh = useCallback(() => {
    setLocalSession(null);
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
