"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Horse = {
  id: string;
  owner_id: string;
  name: string | null;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
};

type ProfileMini = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export default function PublicHorsePage() {
  const params = useParams<{ id: string }>();
  const horseId = params?.id;

  const [horse, setHorse] = useState<Horse | null>(null);
  const [owner, setOwner] = useState<ProfileMini | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!horseId) return;
      setLoading(true);
      setErr(null);

      try {
        const { data: h, error: he } = await supabase
          .from("horses")
          .select("id,owner_id,name,image_url,lat,lng")
          .eq("id", horseId)
          .single();

        if (he) throw he;
        if (cancelled) return;

        const horseRow = (h ?? null) as Horse | null;
        setHorse(horseRow);

        if (horseRow?.owner_id) {
          const { data: p } = await supabase
            .from("profiles")
            .select("id,display_name,full_name,avatar_url")
            .eq("id", horseRow.owner_id)
            .maybeSingle();
          if (!cancelled) setOwner((p ?? null) as ProfileMini | null);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load horse");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [horseId]);

  const ownerName =
    (owner?.display_name ?? "").trim() || (owner?.full_name ?? "").trim() || "Owner";

  if (loading) return <div style={{ padding: 20, opacity: 0.75 }}>Loading…</div>;
  if (err) return <div style={{ padding: 20, color: "rgba(180,0,0,0.9)" }}>{err}</div>;
  if (!horse) return <div style={{ padding: 20 }}>Horse not found.</div>;

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ border: "1px solid rgba(15,23,42,0.10)", borderRadius: 18, background: "white", overflow: "hidden" }}>
        {horse.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={horse.image_url} alt={horse.name ?? "Horse"} style={{ width: "100%", height: 320, objectFit: "cover" }} />
        ) : (
          <div style={{ height: 220, background: "rgba(15,23,42,0.06)" }} />
        )}

        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 950 }}>{horse.name ?? "Horse"}</div>

          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
            Owned by{" "}
            <Link href={`/owner/${horse.owner_id}`} style={{ fontWeight: 900, color: "black" }}>
              {ownerName}
            </Link>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href={`/request?horseId=${horse.id}`}
              style={{
                borderRadius: 12,
                padding: "12px 14px",
                background: "black",
                color: "white",
                textDecoration: "none",
                fontWeight: 950,
              }}
            >
              Request dates →
            </Link>

            <Link
              href="/browse"
              style={{
                borderRadius: 12,
                padding: "12px 14px",
                background: "white",
                border: "1px solid rgba(15,23,42,0.12)",
                color: "black",
                textDecoration: "none",
                fontWeight: 900,
              }}
            >
              ← Back to browse
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
