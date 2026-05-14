
export function Chip({ children, color = "#3b82f6" }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
      background: `${color}14`, color,
      border: `1px solid ${color}28`, letterSpacing: "0.02em",
    }}>
      {children}
    </span>
  );
}
