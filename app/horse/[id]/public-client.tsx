"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type HorseRow = {
  id: string;
  owner_id: string;
  name: string | null;
  image_url: string | null;
  location: string | null;
  breed: any;
  age: any;
  height: any;
  height_hh?: any;
  temperament: any;
  description: any;
  is_active: boolean | null;
};

type ProfileMini = {
  id: string;
  display_name: any;
  full_name: any;
  avatar_url: string | null;
  verification_status?: string | null;
};

const palette = {
  forest: "#1F3D2B",
  cream: "#F5F1E8",
  navy: "#0f172a",
  gold: "#C8A24D",
};

function safeText(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  try {
    return String(v);
  } catch {
    return "";
  }
}

function fmt(v: any) {
  const t = safeText(v).trim();
  return t.length ? t : "—";
}

function pickName(p: ProfileMini | null) {
  const dn = safeText(p?.display_name).trim();
  const fn = safeText(p?.full_name).trim();
  return dn || fn || "Owner";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={detailRow}>
      <div style={detailLabel}>{label}</div>
      <div style={detailValue}>{value}</div>
    </div>
  );
}

export default function HorsePublicClient() {
  const params = useParams<{ id: string }>();
  const horseId = params?.id;

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [horse, setHorse] = useState<HorseRow | null>(null);
  const [owner, setOwner] = useState<ProfileMini | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled) setSessionUserId(data.session?.user?.id ?? null);
      } catch {
        if (!cancelled) setSessionUserId(null);
      }
    }

    async function loadHorse() {
      if (!horseId) {
        if (!cancelled) {
          setLoading(false);
          setError("Missing horse id in route.");
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: h, error: hErr } = await supabase
          .from("horses")
          .select("id,owner_id,name,image_url,location,breed,age,height,height_hh,temperament,description,is_active")
          .eq("id", horseId)
          .maybeSingle();

        if (cancelled) return;
        if (hErr) throw hErr;

        if (!h) {
          setHorse(null);
          setOwner(null);
          setLoading(false);
          return;
        }

        const horseRow = h as HorseRow;
        setHorse(horseRow);

        if (horseRow?.owner_id) {
          const { data: p, error: pErr } = await supabase
            .from("profiles")
            .select("id,display_name,full_name,avatar_url,verification_status")
            .eq("id", horseRow.owner_id)
            .maybeSingle();

          if (!cancelled) {
            if (!pErr) setOwner((p ?? null) as ProfileMini | null);
          }
        } else {
          if (!cancelled) setOwner(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load horse.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSession();
    loadHorse();

    return () => {
      cancelled = true;
    };
  }, [horseId]);

  const ownerName = useMemo(() => pickName(owner), [owner]);
  const ownerVerified = String(owner?.verification_status ?? "").toLowerCase() === "verified";

  const ctaHref = useMemo(() => {
    if (!horseId) return "/browse";
    if (!sessionUserId) return `/login?redirectTo=${encodeURIComponent(`/horse/${horseId}`)}`;
    return `/dashboard/borrower/horses/${horseId}/request`;
  }, [horseId, sessionUserId]);

  const ctaLabel = sessionUserId ? "Request dates →" : "Log in to request →";

  if (loading) {
    return (
      <div className="pmp-pageShell">
        <div className="pmp-sectionCard">
          <div className="pmp-mutedText">Loading horse…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pmp-pageShell">
        <div className="pmp-errorBanner">{error}</div>
        <div style={{ marginTop: 12 }}>
          <Link href="/browse" className="pmp-inlineLink">
            ← Back to browse
          </Link>
        </div>
      </div>
    );
  }

  if (!horse) {
    return (
      <div className="pmp-pageShell">
        <div className="pmp-sectionCard">
          <div className="pmp-mutedText">Horse not found.</div>
        </div>
      </div>
    );
  }

  if (horse.is_active === false) {
    return (
      <div className="pmp-pageShell">
        <div className="pmp-sectionCard">
          <h1 className="pmp-pageTitle">{fmt(horse.name)}</h1>
          <div className="pmp-mutedText" style={{ marginTop: 6 }}>
            This listing is not active.
          </div>
          <div style={{ marginTop: 12 }}>
            <Link href="/browse" className="pmp-inlineLink">
              ← Back to browse
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media (max-width: 980px) {
          .pmp-horsePublic-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 767px) {
          .pmp-horsePublic-titleRow {
            flex-direction: column;
            align-items: stretch !important;
          }

          .pmp-horsePublic-detailsRow {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className="pmp-pageShell">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <Link href="/browse" className="pmp-inlineLink">
            ← Back to browse
          </Link>

          <Link href="/contact" className="pmp-inlineLink">
            Need help? Contact us →
          </Link>
        </div>

        <div
          className="pmp-horsePublic-grid"
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: 12,
            alignItems: "start",
          }}
        >
          <div
            className="pmp-sectionCard"
            style={{
              overflow: "hidden",
              padding: 0,
            }}
          >
            {horse.image_url ? (
              <img
                src={safeText(horse.image_url)}
                alt={fmt(horse.name)}
                style={{ width: "100%", height: 360, objectFit: "cover", display: "block" }}
              />
            ) : (
              <div
                style={{
                  height: 240,
                  background:
                    "radial-gradient(900px 300px at 18% 0%, rgba(200,162,77,0.18), transparent 60%), radial-gradient(700px 260px at 92% 12%, rgba(31,61,43,0.12), transparent 60%), rgba(15,23,42,0.03)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 56,
                }}
              >
                🐎
              </div>
            )}

            <div style={{ padding: 16 }}>
              <div
                className="pmp-horsePublic-titleRow"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h1 style={{ margin: 0, fontSize: 26, letterSpacing: -0.2, color: palette.navy }}>
                    {fmt(horse.name)}
                  </h1>

                  <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75, lineHeight: 1.5 }}>
                    Owner: <span style={{ fontWeight: 950, color: palette.navy }}>{ownerName}</span>
                    {ownerVerified ? <span> • Verified</span> : null}
                    {safeText(horse.location).trim() ? <span> • {fmt(horse.location)}</span> : null}
                  </div>
                </div>

                <Link href={ctaHref} style={{ textDecoration: "none" }}>
                  <div className="pmp-ctaPrimary">{ctaLabel}</div>
                </Link>
              </div>

              <div style={{ height: 1, background: "rgba(15,23,42,0.10)", margin: "14px 0" }} />

              <div className="pmp-sectionHeader">
                <div>
                  <div className="pmp-kicker">At a glance</div>
                  <h3 className="pmp-sectionTitle">Listing details</h3>
                </div>
              </div>

              <div className="pmp-sectionCard" style={{ padding: 12 }}>
                <div className="pmp-horsePublic-detailsRow" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                  <DetailRow label="Breed" value={fmt(horse.breed)} />
                  <DetailRow label="Age" value={fmt(horse.age)} />
                  <DetailRow label="Height" value={fmt(horse.height_hh ?? horse.height)} />
                  <DetailRow label="Temperament" value={fmt(horse.temperament)} />
                  <DetailRow label="Location" value={fmt(horse.location)} />
                  <DetailRow label="Trust" value={ownerVerified ? "Verified owner profile" : "Owner not yet verified"} />
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div className="pmp-sectionHeader">
                <div>
                  <div className="pmp-kicker">Overview</div>
                  <h3 className="pmp-sectionTitle">Description</h3>
                </div>
                <div className="pmp-mutedText">What to expect when riding.</div>
              </div>

              <div className="pmp-sectionCard" style={{ padding: 12 }}>
                {safeText(horse.description).trim() ? (
                  <div style={{ fontSize: 14.5, lineHeight: 1.75, color: palette.navy, opacity: 0.92 }}>
                    {safeText(horse.description).trim()}
                  </div>
                ) : (
                  <div className="pmp-mutedText">No description yet.</div>
                )}
              </div>
            </div>
          </div>

          <aside className="pmp-sectionCard">
            <div style={{ fontWeight: 950, fontSize: 16, color: palette.navy }}>Ready to request?</div>
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.78, lineHeight: 1.65 }}>
              Choose your dates and send a clear request. Availability conflicts are blocked automatically.
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <Link href={ctaHref} style={{ textDecoration: "none" }}>
                <div className="pmp-ctaPrimary" style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                  <span>{ctaLabel.replace(" →", "")}</span>
                  <span>→</span>
                </div>
              </Link>

              <Link href="/faq" style={{ textDecoration: "none" }}>
                <div className="pmp-ctaSecondary" style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                  <span>Read FAQs</span>
                  <span>→</span>
                </div>
              </Link>

              <div
                style={{
                  marginTop: 4,
                  padding: 12,
                  borderRadius: 18,
                  border: "1px solid rgba(15,23,42,0.10)",
                  background: `linear-gradient(90deg, rgba(31,61,43,0.08) 0%, rgba(200,162,77,0.10) 55%, rgba(15,23,42,0.06) 100%)`,
                }}
              >
                <div style={{ fontWeight: 950, color: palette.navy }}>Tip</div>
                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.78, lineHeight: 1.65 }}>
                  Include your riding experience, preferred dates, and any key details in your request.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

const detailRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "140px 1fr",
  gap: 12,
  padding: "10px 6px",
  alignItems: "start",
  borderBottom: "1px solid rgba(15,23,42,0.06)",
};

const detailLabel: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 950,
  color: "rgba(15,23,42,0.70)",
};

const detailValue: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  color: palette.navy,
  lineHeight: 1.55,
  overflowWrap: "anywhere",
};