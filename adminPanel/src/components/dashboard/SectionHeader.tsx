
export function SectionHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em", margin: 0 }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, margin: 0 }}>{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}