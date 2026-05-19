"use client";

import { useState, useEffect, useRef } from "react";
import {
  useOpenSessionMutation,
  useConfirmOpeningBalanceMutation,
  useGetPOSConfigsQuery,
} from "@/redux/pos/Posapi";
import { useGetAllUsersQuery, type User } from "@/redux/user/userApi";
import { POSConfig, Session, Shift } from "@/types/session";

// types for the modal steps and results
type SessionType = "daily" | "long_term";
type ModalStep = "configure" | "opening_balance" | "success";

interface OpenSessionResult {
  session: Session;
  activeShift: Shift;
  configId: number;
}

interface OpenSessionModalProps {
  onSessionOpened: (result: OpenSessionResult) => void;
  onClose: () => void;
}

function StepDots({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`inline-block rounded-full transition-all duration-300 ${
            n === current
              ? "w-5 h-2 bg-blue-600"
              : n < current
                ? "w-2 h-2 bg-blue-300"
                : "w-2 h-2 bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11.5px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {children}
    </label>
  );
}

function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 text-[12px] rounded-xl px-3 py-2.5">
      <span className="mt-px">⚠</span>
      <span>{message}</span>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
      />
    </svg>
  );
}

interface StepConfigureProps {
  onNext: (data: {
    cashierId: string;
    configId: number;
    type: SessionType;
  }) => Promise<void>;
  onClose: () => void;
}

function StepConfigure({ onNext, onClose }: StepConfigureProps) {
  const [cashierId, setCashierId] = useState("");
  const [configId, setConfigId] = useState<number | "">("");
  const [type, setType] = useState<SessionType>("daily");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    data: configsData,
    isLoading: configsLoading,
    isError: configsError,
  } = useGetPOSConfigsQuery();

  const configs: POSConfig[] = configsData?.configs ?? [];

  const {
    data: allUsers,
    isLoading: usersLoading,
    isError: usersError,
  } = useGetAllUsersQuery();

  const cashiers: User[] = (allUsers ?? []).filter(
    (u: any) => u.role === "cashier",
  );

  const handleNext = async () => {
    if (!cashierId) {
      setError("Please select a cashier.");
      return;
    }
    if (configId === "") {
      setError("Please select a POS config.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onNext({ cashierId, configId: Number(configId), type });
    } catch (err: any) {
      setError(err.message || "Failed to open session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-5 py-5 space-y-4">
      {/* Cashier */}
      <div>
        <FieldLabel>Active cashier</FieldLabel>
        <div className="relative">
          {usersLoading ? (
            <div className="w-full border border-gray-200 rounded-xl h-10 flex items-center px-3 gap-2 text-[13px] text-gray-400">
              <SpinnerIcon />
              Loading cashiers…
            </div>
          ) : usersError ? (
            <div className="w-full border border-red-100 bg-red-50 rounded-xl h-10 flex items-center px-3 text-[13px] text-red-500">
              Failed to load cashiers
            </div>
          ) : (
            <>
              <select
                value={cashierId}
                onChange={(e) => setCashierId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 pr-8 h-10 text-[13px] text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white appearance-none transition"
              >
                <option value="">Select cashier…</option>
                {cashiers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                    {c.email ? ` — ${c.email}` : ""}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
                ▼
              </span>
            </>
          )}
        </div>
      </div>

      {/* POS Config */}
      <div>
        <FieldLabel>POS register</FieldLabel>
        <div className="relative">
          {configsLoading ? (
            <div className="w-full border border-gray-200 rounded-xl h-10 flex items-center px-3 gap-2 text-[13px] text-gray-400">
              <SpinnerIcon />
              Loading registers…
            </div>
          ) : configsError ? (
            <div className="w-full border border-red-100 bg-red-50 rounded-xl h-10 flex items-center px-3 text-[13px] text-red-500">
              Failed to load registers
            </div>
          ) : (
            <>
              <select
                value={configId}
                onChange={(e) => setConfigId(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 pr-8 h-10 text-[13px] text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white appearance-none transition"
              >
                <option value="">Select register…</option>
                {configs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.currency_id ? ` (${c.currency_id[1]})` : ""}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
                ▼
              </span>
            </>
          )}
        </div>
      </div>

      {/* Session type */}
      <div>
        <FieldLabel>Session type</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {(["daily", "long_term"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`h-10 rounded-xl border text-[12.5px] font-medium cursor-pointer transition-all ${
                type === t
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              {t === "daily" ? "Daily" : "Long-term"}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5 pl-0.5">
          {type === "daily"
            ? "Session will close automatically at end of day."
            : "Session stays open across multiple days."}
        </p>
      </div>

      <ErrorBanner message={error} />

      {/* Footer */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 h-10 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 bg-transparent cursor-pointer transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={
            loading ||
            !cashierId ||
            configId === "" ||
            configsLoading ||
            usersLoading
          }
          className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <SpinnerIcon />
              Opening…
            </>
          ) : (
            "Continue →"
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Step 2 : Opening Balance ────────────────────────────────────────────────

interface StepOpeningBalanceProps {
  onConfirm: (balance: number) => Promise<void>;
  onBack: () => void;
  cashierName: string;
}

function StepOpeningBalance({
  onConfirm,
  onBack,
  cashierName,
}: StepOpeningBalanceProps) {
  const [raw, setRaw] = useState("0.00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const parsedValue = parseFloat(raw) || 0;

  const handleConfirm = async () => {
    if (parsedValue < 0) {
      setError("Opening balance cannot be negative.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onConfirm(parsedValue);
    } catch (err: any) {
      setError(err.message || "Failed to confirm opening balance.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
  };

  return (
    <div className="px-5 py-5 space-y-5">
      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-[12px] text-amber-700 flex gap-2.5 items-start">
        <span className="text-[15px] mt-0.5">💵</span>
        <div>
          <p className="font-semibold mb-0.5">Opening cash control</p>
          <p className="text-amber-600">
            Count the cash in the drawer and enter the total below before{" "}
            <span className="font-medium">{cashierName}</span> starts selling.
          </p>
        </div>
      </div>

      {/* Balance input */}
      <div>
        <FieldLabel>Cash in drawer ($)</FieldLabel>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[14px] font-medium select-none">
            $
          </span>
          <input
            ref={inputRef}
            type="number"
            min="0"
            step="0.01"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full border border-gray-200 rounded-xl pl-7 pr-4 h-12 text-[20px] font-semibold text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-right tracking-wide transition"
          />
        </div>
        {parsedValue === 0 && (
          <p className="text-[11px] text-gray-400 mt-1.5 pl-0.5">
            Enter 0 if the drawer is empty — you can still open the session.
          </p>
        )}
      </div>

      <ErrorBanner message={error} />

      {/* Footer */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex-1 h-10 border border-gray-200 rounded-xl text-[13px] text-gray-600 hover:bg-gray-50 bg-transparent cursor-pointer transition disabled:opacity-40"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <SpinnerIcon />
              Opening…
            </>
          ) : (
            "Open session →"
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3 : Success ────────────────────────────────────────────────────────

interface StepSuccessProps {
  sessionName: string;
  cashierName: string;
  openingBalance: number;
  onDone: () => void;
}

function StepSuccess({
  sessionName,
  cashierName,
  openingBalance,
  onDone,
}: StepSuccessProps) {
  return (
    <div className="px-5 py-8 flex flex-col items-center text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-[28px]">
        ✅
      </div>

      <div>
        <p className="text-[15px] font-semibold text-gray-900">
          Session opened!
        </p>
        <p className="text-[13px] text-gray-500 mt-1">
          <span className="font-medium text-gray-700">{sessionName}</span> is
          live. {cashierName} can start selling.
        </p>
      </div>

      <div className="flex gap-3">
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-center">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
            Cashier
          </p>
          <p className="text-[13px] font-semibold text-gray-800">
            {cashierName}
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-center">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
            Opening cash
          </p>
          <p className="text-[13px] font-semibold text-gray-800">
            ${openingBalance.toFixed(2)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="mt-2 w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-colors"
      >
        Start selling
      </button>
    </div>
  );
}

// ─── MAIN MODAL ───────────────────────────────────────────────────────────────

export function OpenSessionModal({
  onSessionOpened,
  onClose,
}: OpenSessionModalProps) {
  const [step, setStep] = useState<ModalStep>("configure");
  const [pendingSessionId, setPendingSessionId] = useState<number | null>(null);
  const [pendingCashierId, setPendingCashierId] = useState<string>("");
  const [pendingConfigId, setPendingConfigId] = useState<number>(0);
  const [cashierName, setCashierName] = useState<string>("");
  const [sessionName, setSessionName] = useState<string>("");
  const [confirmedBalance, setConfirmedBalance] = useState<number>(0);

  const [openSession] = useOpenSessionMutation();
  const [confirmOpeningBalance] = useConfirmOpeningBalanceMutation();

  const { data: allUsers } = useGetAllUsersQuery();

  const handleConfigure = async (data: {
    cashierId: string;
    configId: number;
    type: SessionType;
  }) => {
    const result = await openSession({
      configId: data.configId,
      cashierId: data.cashierId,
    }).unwrap();
    const shiftCashier = (result as any).activeShift?.cashierId;
    const nameFromShift =
      shiftCashier && typeof shiftCashier === "object"
        ? shiftCashier.name
        : null;
    const cashier = (allUsers ?? []).find((u: any) => u._id === data.cashierId);
    setCashierName(nameFromShift ?? cashier?.name ?? "Cashier");
    setPendingCashierId(data.cashierId);
    setPendingConfigId(data.configId);
    if (result.requiresOpeningBalance) {
      if (!result.sessionId) {
        throw new Error("No session ID returned from server.");
      }
      setPendingSessionId(result.sessionId);
      setStep("opening_balance");
    } else {
      // ── Branch B: session opened immediately (no balance step needed) ────
      setSessionName(result.session?.name ?? "");
      setConfirmedBalance(0);
      setStep("success");
      onSessionOpened({
        session: result.session as Session,
        activeShift: result.activeShift as Shift,
        configId: data.configId,
      });
    }
  };

  // ─── Step 2 handler ─────────────────────────────────────────────────────────
  const handleConfirmBalance = async (balance: number) => {
    if (pendingSessionId === null) {
      throw new Error("No pending session found.");
    }

 const result = await confirmOpeningBalance({
  sessionId: pendingSessionId,
  cashierId: pendingCashierId,
  configId: pendingConfigId,
  openingBalance: balance,
}).unwrap();

    setSessionName(result.session?.name ?? "");
    setConfirmedBalance(balance);
    setStep("success");
    onSessionOpened({
      session: result.session,
      activeShift: result.activeShift,
       configId: pendingConfigId,
    });
  };

  // ─── Step metadata ───────────────────────────────────────────────────────────
  const stepTitles: Record<ModalStep, string> = {
    configure: "Open POS session",
    opening_balance: "Opening cash balance",
    success: "",
  };

  const stepNumbers: Record<ModalStep, 1 | 2 | 3> = {
    configure: 1,
    opening_balance: 2,
    success: 3,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden"
        style={{ boxShadow: "0 24px 60px -10px rgba(0,0,0,0.18)" }}
      >
        {/* Header */}
        {step !== "success" && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="text-[14.5px] font-semibold text-gray-900">
              {stepTitles[step]}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 bg-transparent border-none cursor-pointer text-[16px] leading-none transition"
            >
              ✕
            </button>
          </div>
        )}

        {/* Step dots */}
        {step !== "success" && (
          <div className="pt-4 px-5">
            <StepDots current={stepNumbers[step]} />
          </div>
        )}

        {/* Step content */}
        {step === "configure" && (
          <StepConfigure onNext={handleConfigure} onClose={onClose} />
        )}

        {step === "opening_balance" && (
          <StepOpeningBalance
            cashierName={cashierName}
            onConfirm={handleConfirmBalance}
            onBack={() => setStep("configure")}
          />
        )}

        {step === "success" && (
          <StepSuccess
            sessionName={sessionName}
            cashierName={cashierName}
            openingBalance={confirmedBalance}
            onDone={onClose}
          />
        )}
      </div>
    </div>
  );
}
