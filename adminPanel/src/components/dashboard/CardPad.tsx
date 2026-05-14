export function CardPad({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ padding: "18px 20px", ...style }}>{children}</div>;
}

export function Divider({ style = {} }: { style?: React.CSSProperties }) {
  return <div style={{ height: 1, background: "var(--border)", ...style }} />;
}
