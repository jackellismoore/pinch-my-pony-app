"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { AvailabilityConflictNotice } from "@/components/AvailabilityConflictNotice";

type HorseRow = {
  id: string;
  name: string | null;
  is_active: boolean | null;
  owner_id: string;
  location?: string | null;
  breed?: string | null;
  temperament?: string | null;
  image_url?: string | null;
};

export default function BorrowerRequestHorsePage() {
  const params = useParams<{ horseId: string }>();
  const horseId = params?.horseId;
  const router = useRouter();

  const [horse, setHorse] = useState<HorseRow | null>(null);
  const [loadingHorse, setLoadingHorse] = useState(true);
  const [horseError, setHorseError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [blockedOrLoading, setBlockedOrLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadHorse() {
      if (!horseId) return;

      setLoadingHorse(true);
      setHorseError(null);

      const { data, error } = await supabase
        .from("horses")
        .select("id,name,is_active,owner_id,location,breed,temperament,image_url")
        .eq("id", horseId)
        .single();

      if (cancelled) return;

      if (error) {
        setHorseError(error.message);
        setLoadingHorse(false);
        return;
      }

      const row = data as HorseRow;

      if (!row?.is_active) {
        setHorseError("This horse is not available.");
        setLoadingHorse(false);
        return;
      }

      setHorse(row);
      setLoadingHorse(false);
    }

    loadHorse();
    return () => {
      cancelled = true;
    };
  }, [horseId]);

  const submitDisabled =
    submitting ||
    !startDate ||
    !endDate ||
    startDate > endDate ||
    blockedOrLoading ||
    loadingHorse ||
    !!horseError;

  const requestSummary = useMemo(() => {
    if (!startDate || !endDate) return "Choose your dates to preview the request summary.";
    if (startDate > endDate) return "Start date must be before or on the end date.";
    return `You are requesting ${startDate} → ${endDate}${horse?.name ? ` for ${horse.name}` : ""}.`;
  }, [startDate, endDate, horse]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!horseId) return;
    if (!startDate || !endDate) return;

    if (startDate > endDate) {
      setSubmitError("Start date must be <= end date.");
      return;
    }

    if (blockedOrLoading) {
      setSubmitError("Selected dates are unavailable (or availability is still loading).");
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

      const { error: insertErr } = await supabase.from("borrow_requests").insert({
        horse_id: horseId,
        borrower_id: user.id,
        status: "pending",
        start_date: startDate,
        end_date: endDate,
        message: message?.trim() ? message.trim() : null,
      });

      if (insertErr) throw insertErr;

      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="pmp-pageShell">
        <div className="pmp-sectionCard">
          <div className="pmp-emptyState" style={{ textAlign: "left", justifyItems: "start" }}>
            <div className="pmp-emptyIcon">✅</div>
            <div className="pmp-emptyTitle">Request sent</div>
            <div className="pmp-emptyText" style={{ maxWidth: "100%" }}>
              Your request has been sent to the owner. You can check your dashboard or messages for updates.
            </div>

            <div className="pmp-cardActions">
              <Link href="/dashboard/borrower/horses" className="pmp-ctaPrimary">
                Back to horses
              </Link>
              <Link href="/messages" className="pmp-ctaSecondary">
                Open messages
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pmp-pageShell">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div className="pmp-kicker">Borrower request</div>
          <h1 className="pmp-pageTitle">Request dates</h1>
          <div className="pmp-mutedText" style={{ marginTop: 6 }}>
            {loadingHorse ? "Loading horse…" : horse ? `Horse: ${horse.name ?? "Unnamed horse"}` : ""}
          </div>
        </div>

        <button onClick={() => router.back()} className="pmp-ctaSecondary" type="button">
          ← Back
        </button>
      </div>

      {horseError ? <div className="pmp-errorBanner" style={{ marginTop: 12 }}>{horseError}</div> : null}

      {horse ? (
        <div className="pmp-sectionCard" style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 18,
                overflow: "hidden",
                background: "rgba(15,23,42,0.06)",
                flexShrink: 0,
              }}
            >
              {horse.image_url ? (
                <img src={horse.image_url} alt={horse.name ?? "Horse"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 30 }}>🐎</div>
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 950, fontSize: 18 }}>{horse.name ?? "Unnamed horse"}</div>
              <div className="pmp-mutedText" style={{ marginTop: 4 }}>
                {[horse.location, horse.breed, horse.temperament].filter(Boolean).join(" • ") || "More details available on the listing"}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="pmp-sectionCard" style={{ marginTop: 14 }}>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              Start date
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  border: "1px solid rgba(0,0,0,0.14)",
                  borderRadius: 12,
                  padding: "12px 12px",
                  fontSize: 14,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              End date (inclusive)
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  border: "1px solid rgba(0,0,0,0.14)",
                  borderRadius: 12,
                  padding: "12px 12px",
                  fontSize: 14,
                }}
              />
            </label>
          </div>

          {horseId ? (
            <AvailabilityConflictNotice
              horseId={horseId}
              startDate={startDate}
              endDate={endDate}
              onConflictChange={(v) => setBlockedOrLoading(v)}
            />
          ) : null}

          <div
            className="pmp-sectionCard"
            style={{
              padding: 12,
              background: "rgba(15,23,42,0.03)",
              margin: 0,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 13 }}>Request summary</div>
            <div className="pmp-mutedText" style={{ marginTop: 4 }}>
              {requestSummary}
            </div>
          </div>

          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            Message to owner (optional)
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Tell the owner about your riding experience, preferred times, or anything helpful…"
              style={{
                border: "1px solid rgba(0,0,0,0.14)",
                borderRadius: 12,
                padding: "12px 12px",
                fontSize: 14,
                resize: "vertical",
              }}
            />
          </label>

          {submitError ? <div className="pmp-errorBanner" style={{ margin: 0 }}>{submitError}</div> : null}

          <div className="pmp-cardActions">
            <button
              type="submit"
              disabled={submitDisabled}
              className="pmp-ctaPrimary"
              style={{
                opacity: submitDisabled ? 0.6 : 1,
                cursor: submitDisabled ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Submitting…" : "Submit borrow request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}