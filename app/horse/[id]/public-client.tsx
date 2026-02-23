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
  breed: string | null;
  age: string | null;
  height: string | null;
  temperament: string | null;
  description: string | null;
  is_active: boolean | null;
};

type ProfileMini = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

const palette = {
  forest: "#1F3D2B",
  cream: "#F5F1E8",
  navy: "#0f172a",
  gold: "#C8A24D",
};

function pickName(p: ProfileMini | null) {
  const dn = (p?.display_name ?? "").trim();
  const fn = (p?.full_name ?? "").trim();
  return dn || fn || "Owner";
}

function fmt(v: string | null | undefined) {
  const t = (v ?? "").trim();
  return t.length ? t : "—";
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
  // ✅ Robust: works if your folder is [horseId] OR [id]
  const params = useParams() as { horseId?: string; id?: string };
  const horseId = params?.horseId ?? params?.id;

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
      // ✅ Never hang: if no param, stop loading and show helpful error
      if (!horseId) {
        if (!cancelled) {
          setLoading(false);
          setError("Missing horse id in route. Check your folder name: /horse/[id] or /horse/[horseId].");
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: h, error: hErr } = await supabase
          .from("horses")
          .select("id,owner_id,name,image_url,location,breed,age,height,temperament,description,is_active")
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
            .select("id,display_name,full_name,avatar_url")
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

  const ctaHref = useMemo(() => {
    if (!horseId) return "/browse";
    if (!sessionUserId) return `/login?redirectTo=${encodeURIComponent(`/horse/${horseId}`)}`;
    return `/dashboard/borrower/horses/${horseId}/request`;
  }, [horseId, sessionUserId]);

  const ctaLabel = sessionUserId ? "Request dates →" : "Log in to request →";

  if (loading) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto", opacity: 0.75 }}>
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            border: "1px solid rgba(255,0,0,0.25)",
            background: "rgba(255,0,0,0.06)",
            padding: 12,
            borderRadius: 14,
            fontSize: 13,
          }}
        >
          {error}
        </div>

        <div style={{ marginTop: 12 }}>
          <Link href="/browse" style={{ textDecoration: "none", fontWeight: 950, color: palette.navy }}>
            ← Back to browse
          </Link>
        </div>
      </div>
    );
  }

  if (!horse) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto", opacity: 0.75 }}>
        Horse not found.
      </div>
    );
  }

  if (horse.is_active === false) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontWeight: 950, fontSize: 18, color: palette.navy }}>{horse.name ?? "Horse"}</div>
        <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>This listing is not active.</div>
        <div style={{ marginTop: 12 }}>
          <Link href="/browse" style={{ textDecoration: "none", fontWeight: 950, color: palette.navy }}>
            ← Back to browse
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <style>{responsiveCss}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <Link href="/browse" style={topLink}>
          ← Back to browse
        </Link>

        <Link href="/contact" style={topLink}>
          Need help? Contact us →
        </Link>
      </div>

      <div className="pmp-horse-grid" style={grid}>
        <div style={shell}>
          {horse.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={horse.image_url}
              alt={horse.name ?? "Horse"}
              style={{ width: "100%", height: 360, objectFit: "cover", display: "block" }}
            />
          ) : (
            <div
              style={{
                height: 240,
                background:
                  "radial-gradient(900px 300px at 18% 0%, rgba(200,162,77,0.18), transparent 60%), radial-gradient(700px 260px at 92% 12%, rgba(31,61,43,0.12), transparent 60%), rgba(15,23,42,0.03)",
              }}
            />
          )}

          <div style={{ padding: 16 }}>
            <div style={titleRow}>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ margin: 0, fontSize: 26, letterSpacing: -0.2, color: palette.navy }}>
                  {horse.name ?? "Horse"}
                </h1>

                <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75, lineHeight: 1.5 }}>
                  Owner:{" "}
                  <span style={{ fontWeight: 950, color: palette.navy }}>{ownerName}</span>
                  {horse.location ? <span> • {horse.location}</span> : null}
                </div>
              </div>

              <Link href={ctaHref} style={{ textDecoration: "none" }}>
                <div style={primaryCta}>{ctaLabel}</div>
              </Link>
            </div>

            <div style={divider} />

            <div style={sectionHeader}>
              <div style={sectionTitle}>Details</div>
              <div style={sectionSubtitle}>Readable, spec-style layout (no bubbles).</div>
            </div>

            <div style={detailsCard}>
              <DetailRow label="Breed" value={fmt(horse.breed)} />
              <DetailRow label="Age" value={fmt(horse.age)} />
              <DetailRow label="Height" value={fmt(horse.height)} />
              <DetailRow label="Temperament" value={fmt(horse.temperament)} />
              <DetailRow label="Location" value={fmt(horse.location)} />
            </div>

            <div style={{ height: 12 }} />

            <div style={sectionHeader}>
              <div style={sectionTitle}>Description</div>
              <div style={sectionSubtitle}>What to expect when riding.</div>
            </div>

            <div style={descCard}>
              {horse.description?.trim() ? (
                <div style={{ fontSize: 14.5, lineHeight: 1.75, color: palette.navy, opacity: 0.92 }}>
                  {horse.description.trim()}
                </div>
              ) : (
                <div style={{ fontSize: 13, opacity: 0.7 }}>No description yet.</div>
              )}
            </div>
          </div>
        </div>

        <aside style={sideRail}>
          <div style={{ fontWeight: 950, fontSize: 16, color: palette.navy }}>Ready to request?</div>
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.78, lineHeight: 1.65 }}>
            Choose your dates and we’ll automatically prevent availability conflicts.
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <Link href={ctaHref} style={{ textDecoration: "none" }}>
              <div style={primaryCtaSmall}>{ctaLabel}</div>
            </Link>

            <Link href="/faq" style={{ textDecoration: "none" }}>
              <div style={secondaryCtaSmall}>Read FAQs →</div>
            </Link>

            <div style={tipCard}>
              <div style={{ fontWeight: 950, color: palette.navy }}>Tip</div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.78, lineHeight: 1.65 }}>
                Share your experience level and preferred times in the message — owners love clarity.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- styles ---------- */

const responsiveCss = `
  @media (max-width: 980px) {
    .pmp-horse-grid { grid-template-columns: 1fr !important; }
  }
`;

const topLink: React.CSSProperties = {
  textDecoration: "none",
  fontWeight: 950,
  color: palette.navy,
  border: "1px solid rgba(15,23,42,0.10)",
  background: "rgba(255,255,255,0.72)",
  padding: "10px 12px",
  borderRadius: 14,
};

const grid: React.CSSProperties = {
  marginTop: 12,
  display: "grid",
  gridTemplateColumns: "1.15fr 0.85fr",
  gap: 12,
  alignItems: "start",
};

const shell: React.CSSProperties = {
  border: "1px solid rgba(15,23,42,0.10)",
  borderRadius: 22,
  background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(245,241,232,0.65))",
  overflow: "hidden",
  boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
};

const titleRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const primaryCta: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.10)",
  background: `linear-gradient(180deg, ${palette.forest}, #173223)`,
  color: "white",
  padding: "12px 14px",
  borderRadius: 14,
  fontSize: 13,
  fontWeight: 950,
  whiteSpace: "nowrap",
  boxShadow: "0 14px 34px rgba(31,61,43,0.16)",
};

const divider: React.CSSProperties = {
  height: 1,
  background: "rgba(15,23,42,0.10)",
  margin: "14px 0",
};

const sectionHeader: React.CSSProperties = {
  display: "grid",
  gap: 4,
  marginBottom: 10,
};

const sectionTitle: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 16,
  color: palette.navy,
};

const sectionSubtitle: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.75,
  lineHeight: 1.55,
};

const detailsCard: React.CSSProperties = {
  border: "1px solid rgba(15,23,42,0.10)",
  borderRadius: 18,
  background: "rgba(255,255,255,0.72)",
  padding: 12,
  display: "grid",
  gap: 0,
};

const detailRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "160px 1fr",
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

const descCard: React.CSSProperties = {
  border: "1px solid rgba(15,23,42,0.10)",
  borderRadius: 18,
  background: "rgba(255,255,255,0.72)",
  padding: 12,
};

const sideRail: React.CSSProperties = {
  border: "1px solid rgba(15,23,42,0.10)",
  borderRadius: 22,
  background: "white",
  boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
  padding: 16,
};

const primaryCtaSmall: React.CSSProperties = {
  ...primaryCta,
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const secondaryCtaSmall: React.CSSProperties = {
  border: "1px solid rgba(15,23,42,0.10)",
  background: "rgba(15,23,42,0.03)",
  color: palette.navy,
  padding: "12px 14px",
  borderRadius: 14,
  fontSize: 13,
  fontWeight: 950,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const tipCard: React.CSSProperties = {
  marginTop: 4,
  padding: 12,
  borderRadius: 18,
  border: "1px solid rgba(15,23,42,0.10)",
  background: `linear-gradient(90deg, rgba(31,61,43,0.08) 0%, rgba(200,162,77,0.10) 55%, rgba(15,23,42,0.06) 100%)`,
};