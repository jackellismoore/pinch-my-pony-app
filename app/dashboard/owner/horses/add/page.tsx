"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const palette = {
  forest: "#1F3D2B",
  saddle: "#8B5E3C",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

const card: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.86)",
  boxShadow: "0 18px 50px rgba(31,42,68,0.08)",
};

const btn = (kind: "primary" | "secondary") =>
  ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 14,
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 950,
    whiteSpace: "nowrap",
    border: "1px solid rgba(31,42,68,0.16)",
    background: kind === "primary" ? `linear-gradient(180deg, ${palette.forest}, #173223)` : "rgba(255,255,255,0.72)",
    color: kind === "primary" ? "white" : palette.navy,
    boxShadow: kind === "primary" ? "0 14px 34px rgba(31,61,43,0.18)" : "0 14px 34px rgba(31,42,68,0.08)",
    cursor: "pointer",
  }) as React.CSSProperties;

const input: React.CSSProperties = {
  border: "1px solid rgba(31,42,68,0.16)",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 14,
  background: "rgba(255,255,255,0.85)",
  outline: "none",
};

export default function AddHorsePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return;

    try {
      setSubmitting(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) throw new Error("Not authenticated");

      const latNum = lat.trim() ? Number(lat) : null;
      const lngNum = lng.trim() ? Number(lng) : null;

      if (lat.trim() && Number.isNaN(latNum)) throw new Error("Latitude must be a number.");
      if (lng.trim() && Number.isNaN(lngNum)) throw new Error("Longitude must be a number.");

      const { error: insErr } = await supabase.from("horses").insert({
        owner_id: user.id,
        name: name.trim(),
        location: location.trim() ? location.trim() : null,
        image_url: imageUrl.trim() ? imageUrl.trim() : null,
        lat: latNum,
        lng: lngNum,
        is_active: isActive,
      });

      if (insErr) throw insErr;

      router.push("/dashboard/owner/horses");
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to add horse.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: -0.3, color: palette.navy, fontWeight: 950 }}>Add a horse</h1>
          <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.62)", lineHeight: 1.6 }}>
            Create a listing with a name, optional location, and optional map coordinates.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href="/dashboard/owner/horses" style={btn("secondary")}>
            ← Back
          </Link>
        </div>
      </div>

      <form onSubmit={onSubmit} style={{ marginTop: 16, ...card, padding: 16 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
            Horse name *
            <input value={name} onChange={(e) => setName(e.target.value)} style={input} placeholder="e.g. Joey" />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
            Location (optional)
            <input value={location} onChange={(e) => setLocation(e.target.value)} style={input} placeholder="e.g. London, UK" />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
            Image URL (optional)
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={input} placeholder="https://…" />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
              Latitude (optional)
              <input value={lat} onChange={(e) => setLat(e.target.value)} style={input} placeholder="51.5072" />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
              Longitude (optional)
              <input value={lng} onChange={(e) => setLng(e.target.value)} style={input} placeholder="-0.1276" />
            </label>
          </div>

          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, fontWeight: 900, color: palette.navy }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Set listing as active
          </label>

          {error ? (
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
          ) : null}

          <button type="submit" disabled={!canSubmit} style={{ ...btn("primary"), opacity: canSubmit ? 1 : 0.6 }}>
            {submitting ? "Saving…" : "Create Listing"}
          </button>

          <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)", lineHeight: 1.6 }}>
            Tip: If you don’t know coords, leave lat/lng blank — you can add them later to show a pin on the map.
          </div>
        </div>
      </form>

      <div style={{ height: 24 }} />
    </div>
  );
}