"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Horse = {
  id: string;
  owner_id: string;
  name: string | null;
  breed: string | null;
  age: string | null;
  height: string | null;
  temperament: string | null;
  location: string | null;
  description: string | null;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
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

export default function HorsePublicPage() {
  const sp = useSearchParams();
  const horseId = sp.get("id") || sp.get("horseId") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [horse, setHorse] = useState<Horse | null>(null);
  const [owner, setOwner] = useState<ProfileMini | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!horseId) {
        setLoading(false);
        setError("Missing horse id in URL.");
        return;
      }

      setLoading(true);
      setError(null);

      const { data: h, error: hErr } = await supabase
        .from("horses")
        .select("id,owner_id,name,breed,age,height,temperament,location,description,image_url,lat,lng,is_active")
        .eq("id", horseId)
        .maybeSingle();

      if (cancelled) return;

      if (hErr || !h) {
        setHorse(null);
        setOwner(null);
        setError(hErr?.message ?? "Horse not found.");
        setLoading(false);
        return;
      }

      setHorse(h as Horse);

      const { data: p } = await supabase
        .from("profiles")
        .select("id,display_name,full_name,avatar_url")
        .eq("id", (h as any).owner_id)
        .maybeSingle();

      if (!cancelled) setOwner((p ?? null) as ProfileMini | null);
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [horseId]);

  const title = useMemo(() => horse?.name?.trim() || "Horse", [horse]);

  if (loading) return <div style={{ padding: 16, opacity: 0.75 }}>Loading…</div>;

  if (error)
    return (
      <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
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

  if (!horse) return <div style={{ padding: 16 }}>Horse not found.</div>;

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950 }}>{title}</h1>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
            Owner:{" "}
            <Link href={`/owner/${horse.owner_id}`} style={{ color: "#2563eb", fontWeight: 900, textDecoration: "none" }}>
              {pickName(owner)}
            </Link>
          </div>
        </div>

        <Link
          href={`/request?horseId=${horse.id}`}
          style={{
            alignSelf: "flex-start",
            textDecoration: "none",
            background: "#0f172a",
            color: "white",
            padding: "12px 14px",
            borderRadius: 14,
            fontWeight: 950,
            border: "1px solid rgba(15,23,42,0.14)",
          }}
        >
          Request → 
        </Link>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(15,23,42,0.10)",
            borderRadius: 16,
            background: "white",
            overflow: "hidden",
          }}
        >
          {horse.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={horse.image_url} alt={title} style={{ width: "100%", height: 420, objectFit: "cover" }} />
          ) : (
            <div style={{ height: 420, display: "grid", placeItems: "center", opacity: 0.6 }}>No photo yet</div>
          )}
        </div>

        <div
          style={{
            border: "1px solid rgba(15,23,42,0.10)",
            borderRadius: 16,
            background: "white",
            padding: 14,
            display: "grid",
            gap: 10,
          }}
        >
          <Row label="Breed" value={horse.breed} />
          <Row label="Age" value={horse.age} />
          <Row label="Height" value={horse.height} />
          <Row label="Temperament" value={horse.temperament} />
          <Row label="Location" value={horse.location} />
          <div style={{ marginTop: 4 }}>
            <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Description</div>
            <div style={{ fontSize: 13, opacity: 0.85, whiteSpace: "pre-wrap" }}>
              {horse.description?.trim() ? horse.description : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 900 }}>{value?.trim() ? value : "—"}</div>
    </div>
  );
}
