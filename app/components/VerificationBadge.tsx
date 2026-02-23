"use client";

import React from "react";

export type VerificationStatus = "unverified" | "pending" | "processing" | "verified" | "failed" | string | null;

export function VerificationBadge({
  status,
  verifiedAt,
  provider,
  compact,
}: {
  status: VerificationStatus;
  verifiedAt?: string | null;
  provider?: string | null;
  compact?: boolean;
}) {
  const s = (status ?? "unverified").toLowerCase();

  const meta =
    s === "verified"
      ? { label: "Verified", icon: "✅", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.26)", fg: "rgba(6,95,70,1)" }
      : s === "pending" || s === "processing"
      ? { label: "Verification processing", icon: "⏳", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.22)", fg: "rgba(30,64,175,1)" }
      : s === "failed"
      ? { label: "Verification needs attention", icon: "⚠️", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.22)", fg: "rgba(153,27,27,1)" }
      : { label: "Verification required", icon: "🔒", bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.26)", fg: "rgba(113,63,18,1)" };

  const sub =
    !compact && s === "verified" && verifiedAt
      ? `Verified ${safeDate(verifiedAt)}`
      : !compact && (s === "pending" || s === "processing")
      ? "You’ll be unlocked automatically."
      : !compact && s === "failed"
      ? "Please re-try verification."
      : !compact && s !== "verified"
      ? "Verify an ID to unlock the app."
      : null;

  const providerLabel = !compact && provider ? provider : null;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: compact ? "6px 10px" : "8px 12px",
        borderRadius: 999,
        border: `1px solid ${meta.border}`,
        background: meta.bg,
        color: meta.fg,
        fontWeight: 950,
        fontSize: compact ? 12 : 13,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
      title={providerLabel ?? undefined}
    >
      <span aria-hidden="true">{meta.icon}</span>
      <span>{meta.label}</span>
      {sub ? (
        <span style={{ fontWeight: 800, opacity: 0.72, marginLeft: 6, fontSize: compact ? 11 : 12 }}>
          {sub}
        </span>
      ) : null}
    </div>
  );
}

function safeDate(v: string) {
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return v;
  }
}