"use client";

interface POSSearchBarProps {
  search: string;
  setSearch: (v: string) => void;
}

export default function POSSearchBar({ search, setSearch }: POSSearchBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        background: "#2C2C2A",
        border: "1px solid #5F5E5A",
        borderRadius: "3px",
        padding: "0 8px",
        height: "28px",
        width: "220px",
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#888780"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products…"
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          color: "#f1efe8",
          fontSize: "12px",
          width: "100%",
        }}
      />
      {search && (
        <button
          onClick={() => setSearch("")}
          aria-label="Clear search"
          style={{
            background: "none",
            border: "none",
            color: "#888780",
            cursor: "pointer",
            fontSize: "13px",
            padding: 0,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}