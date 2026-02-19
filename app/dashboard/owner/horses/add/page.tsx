"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { supabase } from "@/lib/supabaseClient";
import HorseImageUploader from "@/components/HorseImageUploader";

export default function AddHorsePage() {
  const router = useRouter();

  const [loadingUser, setLoadingUser] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingUser(true);
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;

      const uid = data.user?.id ?? null;
      setOwnerId(uid);
      setLoadingUser(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setError(null);
    if (!ownerId) {
      setError("You must be logged in.");
      return;
    }

    const latNum = lat.trim() ? Number(lat.trim()) : null;
    const lngNum = lng.trim() ? Number(lng.trim()) : null;

    if (latNum !== null && !Number.isFinite(latNum)) {
      setError("Latitude must be a number");
      return;
    }
    if (lngNum !== null && !Number.isFinite(lngNum)) {
      setError("Longitude must be a number");
      return;
    }

    try {
      setSaving(true);

      const payload: any = {
        owner_id: ownerId,
        name: name.trim() ? name.trim() : null,
        is_active: true,
        lat: latNum,
        lng: lngNum,
      };

      if (imageUrl.trim()) payload.image_url = imageUrl.trim();

      const { data, error } = await supabase.from("horses").insert(payload).select("id").single();
      if (error) throw error;

      router.push(`/dashboard/owner/horses`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create horse");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Add Horse</h1>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
          Add a listing. Include a photo so it shows on the map.
        </div>

        {loadingUser ? <div style={{ marginTop: 14, fontSize: 13, opacity: 0.7 }}>Loading…</div> : null}

        {error ? (
          <div
            style={{
              marginTop: 14,
              border: "1px solid rgba(255,0,0,0.25)",
              background: "rgba(255,0,0,0.06)",
              padding: 12,
              borderRadius: 12,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            Horse name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                border: "1px solid rgba(0,0,0,0.14)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
              }}
            />
          </label>

          <HorseImageUploader bucket="horses" value={imageUrl} onChange={setImageUrl} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              Latitude (optional)
              <input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="51.5072"
                style={{
                  border: "1px solid rgba(0,0,0,0.14)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 14,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              Longitude (optional)
              <input
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="-0.1276"
                style={{
                  border: "1px solid rgba(0,0,0,0.14)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 14,
                }}
              />
            </label>
          </div>

          <button
            onClick={save}
            disabled={saving || loadingUser || !ownerId}
            style={{
              border: "1px solid rgba(0,0,0,0.14)",
              borderRadius: 12,
              padding: "12px 14px",
              background: saving ? "rgba(0,0,0,0.08)" : "black",
              color: saving ? "rgba(0,0,0,0.55)" : "white",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 900,
              width: "fit-content",
            }}
          >
            {saving ? "Saving…" : "Create horse"}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
