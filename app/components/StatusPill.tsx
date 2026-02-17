"use client";

type NormalizedStatus = "pending" | "approved" | "rejected";

function normalizeStatus(input: unknown): NormalizedStatus {
  const raw = String(input ?? "").toLowerCase();

  // handle legacy / unexpected values safely
  if (raw === "approved") return "approved";
  if (raw === "rejected") return "rejected";

  // legacy mapping
  if (raw === "declined") return "rejected";

  // default fallback (prevents UI crash)
  return "pending";
}

export default function StatusPill(props: { status: string }) {
  const status = normalizeStatus(props.status);

  const config: Record<
    NormalizedStatus,
    { bg: string; fg: string; label: string }
  > = {
    pending: {
      bg: "rgba(245,158,11,0.14)",
      fg: "rgba(146,64,14,1)",
      label: "Pending",
    },
    approved: {
      bg: "rgba(22,163,74,0.14)",
      fg: "rgba(20,83,45,1)",
      label: "Approved",
    },
    rejected: {
      bg: "rgba(220,38,38,0.12)",
      fg: "rgba(127,29,29,1)",
      label: "Rejected",
    },
  };

  const c = config[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      {c.label}
    </span>
  );
}
