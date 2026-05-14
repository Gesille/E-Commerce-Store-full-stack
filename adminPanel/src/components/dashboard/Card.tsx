export function Card({ children, style = {}, className = "" }: {
  children: React.ReactNode; style?: React.CSSProperties; className?: string
}) {
  return (
    <div style={{
      background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
      overflow: "hidden", ...style,
    }} className={className}>
      {children}
    </div>
  );
}