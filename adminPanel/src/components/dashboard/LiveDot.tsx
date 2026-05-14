
export function LiveDot() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%", background: "#10b981",
        boxShadow: "0 0 0 2px rgba(16,185,129,0.25)",
        animation: "pulse 2s infinite",
      }} />
      <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 2px rgba(16,185,129,0.25)} 50%{box-shadow:0 0 0 5px rgba(16,185,129,0.1)} }`}</style>
    </span>
  );
}
