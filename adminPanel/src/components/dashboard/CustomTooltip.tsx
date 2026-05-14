export function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "9px 13px", fontSize: 12,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    }}>
      <div style={{ color: "var(--text-muted)", marginBottom: 5, fontWeight: 500 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "var(--text-secondary)" }}>Revenue</span>
          <span style={{ fontWeight: 700, color: "#3b82f6" }}>${payload[0]?.value?.toLocaleString()}</span>
        </div>
        {payload[1] && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <span style={{ color: "var(--text-secondary)" }}>Prior period</span>
            <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>${payload[1]?.value?.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}