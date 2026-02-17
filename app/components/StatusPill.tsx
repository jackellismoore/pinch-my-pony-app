"use client";

export default function StatusPill(props: { status: "pending" | "approved" | "rejected" }) {
  const { status } = props;

  const config = {
    pending: { bg: "rgba(245,158,11,0.14)", fg: "rgba(146,64,14,1)", label: "Pending" },
    approved: { bg: "rgba(22,163,74,0.14)", fg: "rgba(20,83,45,1)", label: "Approved" },
    rejected: { bg: "rgba(220,38,38,0.12)", fg: "rgba(127,29,29,1)", label: "Rejected" },
  }[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        background: config.bg,
        color: config.fg,
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {config.label}
    </span>
  );
}
