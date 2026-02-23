"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AvailabilityConflictNotice } from "@/components/AvailabilityConflictNotice";

const palette = {
  forest: "#1F3D2B",
  saddle: "#8B5E3C",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(31,42,68,0.12)",
    borderRadius: 18,
    padding: 16,
    background: "rgba(255,255,255,0.82)",
    boxShadow: "0 16px 44px rgba(31,42,68,0.08)",
    backdropFilter: "blur(6px)",
    display: "grid",
    gap: 12,
  };
}

function labelStyle(): React.CSSProperties {
  return {
    display: "grid",
    gap: 6,
    fontSize: 13,
    color: "rgba(31,42,68,0.78)",
    fontWeight: 850,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    border: "1px solid rgba(31,42,68,0.16)",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 14,
    background: "rgba(255,255,255,0.78)",
    outline: "none",
  };
}

function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 14,
    padding: "11px 14px",
    background: disabled
      ? "rgba(31,42,68,0.06)"
      : `linear-gradient(180deg, ${palette.forest}, #173223)`,
    color: disabled ? "rgba(31,42,68,0.45)" : "white",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 950,
    boxShadow: disabled ? "none" : "0 14px 34px rgba(31,61,43,0.18)",
  };
}

export default function RequestForm({
  horseId,
  onSuccess,
}: {
  horseId: string;
  onSuccess?: () => void;
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // conflict OR loading disables submit
  const [blockedOrLoading, setBlockedOrLoading] = useState(true);

  const submitDisabled =
    submitting ||
    !startDate ||
    !endDate ||
    startDate > endDate ||
    blockedOrLoading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!startDate || !endDate) return;

    if (startDate > endDate) {
      setSubmitError("Start date must be before or equal to end date.");
      return;
    }

    if (blockedOrLoading) {
      setSubmitError("Selected dates are unavailable.");
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) throw new Error("Not authenticated");

      // fast RPC check (UX)
      const { data: ok, error: rpcErr } = await supabase.rpc(
        "is_horse_range_available",
        {
          p_horse_id: horseId,
          p_start_date: startDate,
          p_end_date: endDate,
          p_exclude_request_id: null,
        }
      );

      if (!rpcErr && ok === false) {
        setSubmitError("Selected dates overlap an unavailable range.");
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.from("borrow_requests").insert({
        horse_id: horseId,
        borrower_id: user.id,
        status: "pending",
        start_date: startDate,
        end_date: endDate,
        message: message?.trim() ? message.trim() : null,
      });

      if (error) {
        setSubmitError(error.message);
        setSubmitting(false);
        return;
      }

      onSuccess?.();
    } catch (err: any) {
      setSubmitError(err?.message ?? "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={card()}>
      <div style={{ fontWeight: 950, color: palette.navy, fontSize: 14 }}>
        Request Dates
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label style={labelStyle()}>
          Start Date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={inputStyle()}
          />
        </label>

        <label style={labelStyle()}>
          End Date (inclusive)
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={inputStyle()}
          />
        </label>
      </div>

      <div style={{ marginTop: 2 }}>
        <AvailabilityConflictNotice
          horseId={horseId}
          startDate={startDate}
          endDate={endDate}
          onConflictChange={(v) => setBlockedOrLoading(v)}
        />
      </div>

      <label style={labelStyle()}>
        Message (optional)
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          style={{ ...inputStyle(), resize: "vertical" }}
          placeholder="Anything the owner should know?"
        />
      </label>

      {submitError ? (
        <div
          style={{
            fontSize: 13,
            color: "rgba(180,0,0,0.9)",
            fontWeight: 850,
          }}
        >
          {submitError}
        </div>
      ) : null}

      <button type="submit" disabled={submitDisabled} style={btnPrimary(submitDisabled)}>
        {submitting ? "Submitting…" : "Submit Borrow Request →"}
      </button>

      <div style={{ fontSize: 12, color: "rgba(31,42,68,0.62)", lineHeight: 1.6 }}>
        Availability conflicts are blocked automatically.
      </div>
    </form>
  );
}