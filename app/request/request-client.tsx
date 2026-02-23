"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import HorseMap from "@/components/HorseMap";
import AvailabilityRanges from "@/components/AvailabilityRanges";
import { supabase } from "@/lib/supabaseClient";
import RequestForm from "./request-form";

type HorseRow = {
  id: string;
  owner_id: string;
  name: string | null;
  is_active: boolean | null;
  lat: number | null;
  lng: number | null;
};

type ProfileMini = {
  id: string;
  display_name: string | null;
  full_name: string | null;
};

const palette = {
  forest: "#1F3D2B",
  saddle: "#8B5E3C",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

function ownerLabel(p: ProfileMini | null) {
  return (p?.display_name && p.display_name.trim()) || (p?.full_name && p.full_name.trim()) || "Owner";
}

function wrap(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: "calc(100vh - 64px)",
    background: `linear-gradient(180deg, ${palette.cream} 0%, rgba(250,250,250,1) 70%)`,
    padding: "18px 0 28px",
  };
}

function container(): React.CSSProperties {
  return { padding: 16, maxWidth: 1100, margin: "0 auto" };
}

function pageTitle(): React.CSSProperties {
  return { margin: 0, fontSize: 22, fontWeight: 950, color: palette.navy, letterSpacing: -0.2 };
}

function pageSub(): React.CSSProperties {
  return { marginTop: 6, fontSize: 13, color: "rgba(31,42,68,0.70)", lineHeight: 1.6 };
}

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(31,42,68,0.12)",
    borderRadius: 18,
    padding: 16,
    background: "rgba(255,255,255,0.80)",
    boxShadow: "0 16px 44px rgba(31,42,68,0.08)",
    backdropFilter: "blur(6px)",
  };
}

function softCard(): React.CSSProperties {
  return {
    border: "1px solid rgba(31,42,68,0.10)",
    borderRadius: 18,
    padding: 14,
    background: "rgba(255,255,255,0.72)",
    boxShadow: "0 12px 34px rgba(31,42,68,0.06)",
  };
}

function btn(kind: "primary" | "secondary"): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 14,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 950,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    whiteSpace: "nowrap",
    cursor: "pointer",
    border: "1px solid rgba(0,0,0,0.10)",
  };

  if (kind === "primary") {
    return {
      ...base,
      background: `linear-gradient(180deg, ${palette.forest}, #173223)`,
      color: "white",
      boxShadow: "0 14px 34px rgba(31,61,43,0.18)",
    };
  }

  return {
    ...base,
    background: "rgba(255,255,255,0.78)",
    color: palette.navy,
    border: "1px solid rgba(31,42,68,0.18)",
    boxShadow: "0 12px 30px rgba(31,42,68,0.06)",
  };
}

function inlineLink(): React.CSSProperties {
  return {
    color: palette.forest,
    fontWeight: 900,
    textDecoration: "none",
    borderBottom: "2px solid rgba(200,162,77,0.45)",
    paddingBottom: 1,
  };
}

function hintPill(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(31,61,43,0.16)",
    background: "rgba(31,61,43,0.08)",
    color: palette.forest,
    fontWeight: 900,
    fontSize: 12,
    width: "fit-content",
  };
}

export default function RequestClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const horseId = searchParams.get("horseId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [horse, setHorse] = useState<HorseRow | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<ProfileMini | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (!horseId) {
          setHorse(null);
          setOwnerProfile(null);
          setLoading(false);
          return;
        }

        const hRes = await supabase
          .from("horses")
          .select("id,owner_id,name,is_active,lat,lng")
          .eq("id", horseId)
          .single();

        if (cancelled) return;
        if (hRes.error) throw hRes.error;

        const h = (hRes.data ?? null) as HorseRow | null;
        setHorse(h);

        if (!h?.owner_id) {
          setOwnerProfile(null);
          setLoading(false);
          return;
        }

        const pRes = await supabase
          .from("profiles")
          .select("id,display_name,full_name")
          .eq("id", h.owner_id)
          .single();

        if (!cancelled) {
          if (!pRes.error) setOwnerProfile((pRes.data ?? null) as ProfileMini | null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load request details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [horseId]);

  const mapHorses = useMemo(() => {
    if (!horse) return [];
    if (typeof horse.lat !== "number" || typeof horse.lng !== "number") return [];

    return [
      {
        id: horse.id,
        name: horse.name ?? "Horse",
        lat: horse.lat,
        lng: horse.lng,
        owner_id: horse.owner_id,
        owner_label: ownerLabel(ownerProfile),
      },
    ];
  }, [horse, ownerProfile]);

  if (!horseId) {
    return (
      <div style={wrap()}>
        <div style={container()}>
          <div style={card()}>
            <div style={hintPill()}>📌 Request</div>
            <h1 style={{ ...pageTitle(), marginTop: 10 }}>Missing horseId</h1>
            <div style={{ marginTop: 10, fontSize: 13, color: "rgba(31,42,68,0.72)", lineHeight: 1.7 }}>
              This page needs a horse to request. Go back to{" "}
              <Link href="/browse" style={inlineLink()}>
                Browse
              </Link>
              .
            </div>

            <div style={{ marginTop: 14 }}>
              <Link href="/browse" style={btn("primary")}>
                ← Browse horses
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap()}>
      <div style={container()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={hintPill()}>📅 Request dates</div>
            <h1 style={{ ...pageTitle(), marginTop: 10 }}>Request</h1>
            <div style={pageSub()}>Pick dates. Availability is enforced.</div>
          </div>

          <button onClick={() => router.push("/browse")} style={btn("secondary")}>
            ← Browse
          </button>
        </div>

        {loading ? (
          <div style={{ marginTop: 14, ...softCard(), fontSize: 13, color: "rgba(31,42,68,0.70)" }}>Loading…</div>
        ) : null}

        {error ? (
          <div
            style={{
              marginTop: 14,
              border: "1px solid rgba(255,0,0,0.25)",
              background: "rgba(255,0,0,0.06)",
              padding: 12,
              borderRadius: 14,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}

        {/* Horse/Owner header card */}
        {horse ? (
          <div style={{ marginTop: 14, ...card() }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 950, fontSize: 16, color: palette.navy }}>{horse.name ?? "Horse"}</div>
                <div style={{ marginTop: 6, fontSize: 13, color: "rgba(31,42,68,0.72)" }}>
                  Owner: <span style={{ fontWeight: 950, color: palette.forest }}>{ownerLabel(ownerProfile)}</span>
                </div>

                {horse.owner_id ? (
                  <div style={{ marginTop: 10 }}>
                    <Link href={`/owner/${horse.owner_id}`} style={inlineLink()}>
                      View owner profile →
                    </Link>
                  </div>
                ) : null}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Link href={`/horse/${horse.id}`} style={btn("secondary")}>
                  View horse →
                </Link>
              </div>
            </div>

            <div style={{ marginTop: 12, height: 1, background: "rgba(31,42,68,0.08)" }} />

            <div style={{ marginTop: 12, fontSize: 13, color: "rgba(31,42,68,0.70)", lineHeight: 1.65 }}>
              Choose your dates below. We’ll block conflicts automatically and route you into Messages after the request is sent.
            </div>
          </div>
        ) : null}

        {/* Map */}
        <div style={{ marginTop: 14, ...softCard() }}>
          <HorseMap horses={mapHorses as any} userLocation={null} highlightedId={null} />
        </div>

        {/* Availability */}
        <div style={{ marginTop: 14, ...card() }}>
          <div style={{ fontWeight: 950, color: palette.navy }}>Availability</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "rgba(31,42,68,0.70)" }}>
            Unavailable ranges are shown below (blocks + approved bookings).
          </div>

          <div style={{ marginTop: 12 }}>
            <AvailabilityRanges horseId={horseId} />
          </div>
        </div>

        {/* Request form */}
        <div style={{ marginTop: 14, ...card() }}>
          <div style={{ fontWeight: 950, color: palette.navy }}>Send request</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "rgba(31,42,68,0.70)" }}>
            Submit your date range request. You’ll be taken to Messages after success.
          </div>

          <div style={{ marginTop: 12 }}>
            <RequestForm
              horseId={horseId}
              onSuccess={() => {
                router.push("/messages");
                router.refresh();
              }}
            />
          </div>
        </div>

        <div style={{ height: 18 }} />
      </div>
    </div>
  );
}