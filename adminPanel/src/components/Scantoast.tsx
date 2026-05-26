import React from "react";

export type ScanToastState =
  | { status: "scanning"; code: string }
  | { status: "success"; name: string }
  | { status: "error"; message: string }
  | null;

export function ScanToast({ state }: { state: ScanToastState }) {
  if (!state) return null;

  let cfg: { bg: string; icon: React.ReactNode; text: string; label: string };

  switch (state.status) {
    case "scanning":
      cfg = {
        bg: "bg-blue-50 border-blue-200",
        icon: (
          <svg
            className="w-4 h-4 text-blue-500 animate-pulse"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 9V5a2 2 0 012-2h4M3 15v4a2 2 0 002 2h4M21 9V5a2 2 0 00-2-2h-4M21 15v4a2 2 0 01-2 2h-4" />
            <line x1="7" y1="12" x2="17" y2="12" />
          </svg>
        ),
        text: "text-blue-700",
        label: `Scanning: ${state.code}`,
      };
      break;
    case "success":
      cfg = {
        bg: "bg-emerald-50 border-emerald-200",
        icon: (
          <svg
            className="w-4 h-4 text-emerald-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ),
        text: "text-emerald-700",
        label: `Added: ${state.name}`,
      };
      break;
    case "error":
      cfg = {
        bg: "bg-red-50 border-red-200",
        icon: (
          <svg
            className="w-4 h-4 text-red-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ),
        text: "text-red-700",
        label: state.message,
      };
      break;
  }

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-lg text-[13px] font-medium transition-all duration-300 ${cfg.bg} ${cfg.text}`}
    >
      {cfg.icon}
      <span>{cfg.label}</span>
    </div>
  );
}