export function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px",
      borderRadius: 7, border: "1px solid var(--border)", background: "transparent",
      fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", cursor: "pointer",
      transition: "all 0.15s",
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-muted)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
      }}
    >
      {children}
    </button>
  );
}
