"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardShell from "@/components/DashboardShell";
import HorseImageUploader from "@/components/HorseImageUploader";

function toNumOrNull(v: string) {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function AddHorsePage() {
  const router = useRouter();

  const [loadingUser, setLoadingUser] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fields (match edit)
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [temperament, setTemperament] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingUser(true);
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error || !data.user) {
        setOwnerId(null);
        setLoadingUser(false);
        return;
      }
      setOwnerId(data.user.id);
      setLoadingUser(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSave = useMemo(() => {
    return !saving && !!ownerId && name.trim().length > 0;
  }, [saving, ownerId, name]);

  async function save() {
    setError(null);
    if (!ownerId) return;

    try {
      setSaving(true);

      const latNum = toNumOrNull(lat);
      const lngNum = toNumOrNull(lng);

      const payload: any = {
        owner_id: ownerId,
        is_active: true,
        name: name.trim() ? name.trim() : null,
        breed: breed.trim() ? breed.trim() : null,
        age: age.trim() ? age.trim() : null,
        height: height.trim() ? height.trim() : null,
        temperament: temperament.trim() ? temperament.trim() : null,
        location: location.trim() ? location.trim() : null,
        description: description.trim() ? description.trim() : null,
        lat: latNum,
        lng: lngNum,
        image_url: imageUrl.trim() ? imageUrl.trim() : null,
      };

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
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950 }}>Add Horse</h1>
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

        <div
          style={{
            marginTop: 14,
            border: "1px solid rgba(15,23,42,0.10)",
            borderRadius: 16,
            padding: 16,
            background: "white",
            display: "grid",
            gap: 12,
          }}
        >
          <Field label="Horse name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" style={input()} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Breed">
              <input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Breed" style={input()} />
            </Field>
            <Field label="Age">
              <input value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" style={input()} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Height (hh)">
              <input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Height" style={input()} />
            </Field>
            <Field label="Temperament">
              <input
                value={temperament}
                onChange={(e) => setTemperament(e.target.value)}
                placeholder="Temperament"
                style={input()}
              />
            </Field>
          </div>

          <Field label="Location">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Buckhurst Hill IG9, UK"
              style={input()}
            />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe your horse"
              style={{ ...input(), resize: "vertical" }}
            />
          </Field>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 900 }}>Photo</div>
            <HorseImageUploader
              bucket="horses"
              value={imageUrl}
              onChange={(url: string) => setImageUrl(url)}
              label="Upload photo"
              helper="Uploads to storage bucket horses and saves a public URL."
            />

            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>
              Optional: set lat/lng to place the pin precisely.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Latitude (optional)">
                <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="51.5072" style={input()} />
              </Field>
              <Field label="Longitude (optional)">
                <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-0.1276" style={input()} />
              </Field>
            </div>
          </div>

          <button onClick={save} disabled={!canSave} style={primaryBtn(!canSave)}>
            {saving ? "Creating…" : "Create horse"}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
      <span style={{ fontWeight: 900 }}>{label}</span>
      {children}
    </label>
  );
}

function input(): React.CSSProperties {
  return {
    width: "100%",
    border: "1px solid rgba(15,23,42,0.14)",
    borderRadius: 12,
    padding: "11px 12px",
    fontSize: 14,
    outline: "none",
    background: "white",
  };
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    height: 44,
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.14)",
    background: disabled ? "rgba(15,23,42,0.06)" : "#0f172a",
    color: disabled ? "rgba(15,23,42,0.45)" : "white",
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
