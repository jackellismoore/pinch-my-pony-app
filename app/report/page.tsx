"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { supabase } from "@/lib/supabaseClient";
import { userFacingError } from "@/lib/userFacingError";

const categories = [
  ["safety", "Immediate safety concern"],
  ["listing", "Horse listing"],
  ["member", "Member behaviour"],
  ["messages", "Messages or harassment"],
  ["fraud", "Fraud or suspicious activity"],
  ["other", "Something else"],
] as const;

export default function ReportPage() {
  const [context, setContext] = useState({ userId: "", horseId: "", requestId: "", query: "" });
  const [category, setCategory] = useState<(typeof categories)[number][0]>("safety");
  const [details, setDetails] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setContext({ userId: params.get("userId") ?? "", horseId: params.get("horseId") ?? "", requestId: params.get("requestId") ?? "", query: params.toString() });
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!userId) {
      window.location.href = `/login?redirectTo=${encodeURIComponent(`/report?${context.query}`)}`;
      return;
    }
    if (details.trim().length < 20) {
      setError("Please add at least 20 characters so our safety team has enough context.");
      return;
    }

    setBusy(true);
    const { error: insertError } = await supabase.from("safety_reports").insert({
      reporter_id: userId,
      subject_user_id: context.userId || null,
      horse_id: context.horseId || null,
      request_id: context.requestId || null,
      category,
      details: details.trim(),
      status: "submitted",
    });
    setBusy(false);
    if (insertError) setError(userFacingError(insertError, "We couldn’t submit this report. Please contact support."));
    else setSent(true);
  }

  return (
    <div className="pmp-pageShell">
      <section className="pmp-sectionCard" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="pmp-kicker"><Icon name="shield" size={17} /> Safety report</div>
        <h1 className="pmp-pageTitle">Tell us what happened</h1>
        {sent ? (
          <div className="pmp-emptyState"><div className="pmp-emptyIcon"><Icon name="check" size={30} /></div><div className="pmp-emptyTitle">Report received</div><div className="pmp-emptyText">Thank you. We’ll review the details and contact you if we need more information.</div><Link href="/dashboard" className="pmp-ctaPrimary">Return to dashboard</Link></div>
        ) : (
          <form onSubmit={submit} style={{ display: "grid", gap: 16, marginTop: 18 }}>
            <label>What best describes the concern?<select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className="pmp-formControl">{categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label>Details<textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={7} maxLength={4000} className="pmp-formControl" placeholder="Include dates, names and what you observed. Avoid sharing unnecessary sensitive information." /></label>
            <div className="pmp-mutedText">{details.trim().length}/4000 characters</div>
            {error ? <div className="pmp-errorBanner" role="alert"><Icon name="warning" size={19} />{error}</div> : null}
            <button className="pmp-ctaPrimary" type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit report"}</button>
            <p className="pmp-mutedText">If somebody is in immediate danger, contact the emergency services first. This form is monitored for platform safety concerns.</p>
          </form>
        )}
      </section>
    </div>
  );
}
