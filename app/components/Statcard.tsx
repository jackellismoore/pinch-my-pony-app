"use client";

type Accent = "default" | "green" | "amber" | "blue";

export default function StatCard(props: { label: string; value: number; accent?: Accent }) {
  const { label, value, accent = "default" } = props;

  const accentMap: Record<Accent, string> = {
    default: "rgba(15,23,42,0.10)",
    green: "rgba(22,163,74,0.20)",
    amber: "rgba(245,158,11,0.22)",
    blue: "rgba(37,99,235,0.18)",
  };

  return (
    <div style={styles.card}>
      <div style={{ ...styles.accentBar, background: accentMap[accent] }} />
      <div style={styles.label}>{label}</div>
      <div style={styles.value}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    position: "relative",
    borderRadius: 14,
    border: "1px solid rgba(15, 23, 42, 0.10)",
    background: "#fff",
    padding: 14,
    overflow: "hidden",
    minHeight: 78,
  },
  accentBar: {
    position: "absolute",
    inset: "0 0 auto 0",
    height: 6,
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(15,23,42,0.65)",
  },
  value: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: "-0.3px",
  },
};
