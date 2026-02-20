"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const palette = {
  forest: "#1F3D2B",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

export default function VerifyPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) return;

      const { data: p } = await supabase.from("profiles").select("verification_status").eq("id", uid).maybeSingle();
      if (cancelled) return;

      const s = (p as any)?.verification_status ?? "unverified";
      setStatus(s);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startVerification() {
    setError(null);
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const res = await fetch("/api/identity/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to start verification");

      if (json?.url) {
        window.location.assign(json.url);
        return;
      }

      throw new Error("Missing verification URL");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isVerified = status === "verified";

  return (
    <div
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "28px 16px",
      }}
    >
      <div
        style={{
          borderRadius: 22,
          border: "1px solid rgba(31,42,68,0.12)",
          background: `linear-gradient(180deg, rgba(255,255,255,0.92) 0%, ${palette.cream} 110%)`,
          boxShadow: "0 18px 50px rgba(31,42,68,0.10)",
          padding: 18,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            borderRadius: 999,
            background: "rgba(31,61,43,0.08)",
            border: "1px solid rgba(31,61,43,0.12)",
            color: palette.forest,
            fontWeight: 950,
            fontSize: 13,
          }}
        >
          🪪 Identity verification
        </div>

        <h1 style={{ margin: "12px 0 6px", color: palette.navy, letterSpacing: -0.4 }}>
          Verification required to continue
        </h1>

        <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.65 }}>
          To keep Pinch My Pony safe and trustworthy, we ask all users to verify a valid ID before unlocking the app.
          This is automated and typically takes just a few minutes.
        </p>

        <div style={{ height: 14 }} />

        <div
          style={{
            padding: 12,
            borderRadius: 16,
            border: "1px solid rgba(31,42,68,0.10)",
            background: "rgba(255,255,255,0.70)",
          }}
        >
          <div style={{ fontWeight: 950, color: palette.navy }}>Current status</div>
          <div style={{ marginTop: 6, opacity: 0.8 }}>
            {isVerified ? "✅ Verified" : status === "processing" ? "⏳ Processing" : status === "failed" ? "⚠️ Action needed" : "🔒 Not verified yet"}
          </div>
        </div>

        {error ? (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 14, border: "1px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)" }}>
            <div style={{ fontWeight: 950 }}>Couldn’t start verification</div>
            <div style={{ marginTop: 6, opacity: 0.85 }}>{error}</div>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          {!isVerified ? (
            <button
              onClick={startVerification}
              disabled={loading}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                background: `linear-gradient(180deg, ${palette.forest}, #173223)`,
                color: "white",
                fontWeight: 950,
                border: "1px solid rgba(0,0,0,0.10)",
                boxShadow: "0 14px 34px rgba(31,61,43,0.18)",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Starting…" : "Start verification"}
            </button>
          ) : (
            <a
              href="/browse"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 16px",
                borderRadius: 14,
                background: `linear-gradient(180deg, ${palette.forest}, #173223)`,
                color: "white",
                fontWeight: 950,
                border: "1px solid rgba(0,0,0,0.10)",
              }}
            >
              Continue to app
            </a>
          )}

          <a
            href="/"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 16px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.75)",
              color: palette.navy,
              fontWeight: 950,
              border: "1px solid rgba(31,42,68,0.18)",
            }}
          >
            Back to home
          </a>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7, lineHeight: 1.6 }}>
          We store verification outcomes and an audit trail for legal and safety reasons. We do not store raw ID images
          in your Supabase database unless you explicitly choose to.
        </div>
      </div>
    </div>
  );
}