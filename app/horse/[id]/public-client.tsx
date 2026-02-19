"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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

function pickName(p: ProfileMini | null) {
  const dn = (p?.display_name ?? "").trim();
  const fn = (p?.full_name ?? "").trim();
  return dn || fn || "Owner";
}

function pill(label: string): React.CSSProperties {
  return {
    border: "1px solid rgba(15,23,42,0.12)",
    borderRadius: 999,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 900,
    background: "rgba(15,23,42,0.03)",
    color: "#0f172a",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
  };
}

export default function HorsePublicClient() {
  const params = useParams<{ id: string }>();
  const horseId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [horse, setHorse] = useState<HorseRow | null>(null);
  const [owner, setOwner] = useState<ProfileMini | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!horseId) return;

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

        setHorse(h as HorseRow);

        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("id,display_name,full_name,avatar_url")
          .eq("id", (h as any).owner_id)
          .maybeSingle();

        if (!cancelled) {
          if (!pErr) setOwner((p ?? null) as ProfileMini | null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load horse.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [horseId]);

  const ownerName = useMemo(() => pickName(owner), [owner]);

  if (loading) return <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto", opacity: 0.7 }}>Loading…</div>;

  if (error)
    return (
      <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
        <div
          style={{
            border: "1px solid rgba(255,0,0,0.25)",
            background: "rgba(255,0,0,0.06)",
            padding: 12,
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      </div>
    );

  if (!horse)
    return (
      <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto", opacity: 0.75 }}>
        Horse not found.
      </div>
    );

  if (horse.is_active === false)
    return (
      <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ fontWeight: 950, fontSize: 18 }}>{horse.name ?? "Horse"}</div>
        <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>This listing is not active.</div>
      </div>
    );

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <div
        style={{
          border: "1px solid rgba(15,23,42,0.10)",
          borderRadius: 18,
          background: "white",
          overflow: "hidden",
        }}
      >
        {horse.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={horse.image_url} alt={horse.name ?? "Horse"} style={{ width: "100%", height: 360, objectFit: "cover" }} />
        ) : (
          <div style={{ height: 220, background: "rgba(15,23,42,0.04)" }} />
        )}

        <div style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: 22 }}>{horse.name ?? "Horse"}</h1>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
                Owner:{" "}
                <Link href={`/owner/${horse.owner_id}`} style={{ fontWeight: 900, color: "black" }}>
                  {ownerName}
                </Link>
                {horse.location ? <> • {horse.location}</> : null}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Link
                href={`/request?horseId=${horse.id}`}
                style={{
                  border: "1px solid rgba(0,0,0,0.14)",
                  background: "black",
                  color: "white",
                  padding: "10px 12px",
                  borderRadius: 12,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 950,
                  whiteSpace: "nowrap",
                }}
              >
                Request →
              </Link>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {horse.breed ? <span style={pill("Breed")}>{horse.breed}</span> : null}
            {horse.age ? <span style={pill("Age")}>{horse.age}</span> : null}
            {horse.height ? <span style={pill("Height")}>{horse.height}</span> : null}
            {horse.temperament ? <span style={pill("Temperament")}>{horse.temperament}</span> : null}
          </div>

          {horse.description ? (
            <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, opacity: 0.9 }}>{horse.description}</div>
          ) : (
            <div style={{ marginTop: 12, fontSize: 13, opacity: 0.7 }}>No description yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
