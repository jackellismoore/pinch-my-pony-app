"use client";

export default function DashboardShell(props: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onRefresh?: () => void;
  loading?: boolean;
}) {
  const { title, subtitle, children, onRefresh, loading } = props;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>{title}</div>
          {subtitle && <div style={styles.subtitle}>{subtitle}</div>}
        </div>

        {onRefresh && (
          <button onClick={onRefresh} style={styles.refreshBtn} disabled={!!loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        )}
      </div>

      {children}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 24,
    maxWidth: 1200,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: 900, letterSpacing: "-0.4px" },
  subtitle: { marginTop: 8, fontSize: 13, color: "rgba(15,23,42,0.70)", maxWidth: 760 },
  refreshBtn: {
    height: 36,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.14)",
    background: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
};
