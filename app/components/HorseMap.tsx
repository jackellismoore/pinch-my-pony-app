"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import HorseImageUploader from "@/components/HorseImageUploader";
import { supabase } from "@/lib/supabaseClient";

function input(): React.CSSProperties {
  return {
    border: "1px solid rgba(15,23,42,0.12)",
    borderRadius: 12,
    padding: "12px 12px",
    fontSize: 14,
    outline: "none",
    background: "white",
  };
}

function labelStyle(): React.CSSProperties {
  return { fontSize: 13, fontWeight: 900 };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <div style={labelStyle()}>{label}</div>
      {children}
    </label>
  );
}

export default function AddHorsePage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [temperament, setTemperament] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const canSave = useMemo(() => !saving && name.trim().length > 0, [saving, name]);

  async function save() {
    setError(null);

    try {
      setSaving(true);

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const ownerId = userRes.user?.id;
      if (!ownerId) throw new Error("Not authenticated");

      const latNum = lat.trim() ? Number(lat) : null;
      const lngNum = lng.trim() ? Number(lng) : null;

      if (latNum != null && !Number.isFinite(latNum)) throw new Error("Latitude must be a number");
      if (lngNum != null && !Number.isFinite(lngNum)) throw new Error("Longitude must be a number");

      const payload: any = {
        owner_id: ownerId,
        is_active: true,
        name: name.trim() ? name.trim() : null,
        location: location.trim() ? location.trim() : null,
        breed: breed.trim() ? breed.trim() : null,
        age: age.trim() ? age.trim() : null,
        height: height.trim() ? height.trim() : null,
        temperament: temperament.trim() ? temperament.trim() : null,
        description: description.trim() ? description.trim() : null,
        lat: latNum,
        lng: lngNum,
      };

      if (imageUrl.trim()) payload.image_url = imageUrl.trim();

      const { error: insErr } = await supabase.from("horses").insert(payload);
      if (insErr) throw insErr;

      router.push("/dashboard/owner/horses");
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
        <h1 style={{ margin: 0, fontSize: 28 }}>Add Horse</h1>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
          Add a listing. Include a photo so it shows on the map.
        </div>

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
            background: "white",
            padding: 14,
            display: "grid",
            gap: 12,
          }}
        >
          <Field label="Horse name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" style={input()} />
          </Field>

          <Field label="Location">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Buckhurst Hill IG9, UK"
              style={input()}
            />
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
              <input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 15.2" style={input()} />
            </Field>

            <Field label="Temperament">
              <input
                value={temperament}
                onChange={(e) => setTemperament(e.target.value)}
                placeholder="Calm, forward, etc."
                style={input()}
              />
            </Field>
          </div>

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
            <div style={labelStyle()}>Photo</div>

            <HorseImageUploader
              bucket="horses"
              value={imageUrl}
              onChange={(url: string) => setImageUrl(url)}
            />

            <div style={{ fontSize: 12, opacity: 0.65 }}>Uploads to storage bucket <b>horses</b> and saves a public URL.</div>

            <Field label="Image URL (auto-filled on upload)">
              <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." style={input()} />
            </Field>
          </div>

          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>
            Optional: set lat/lng to place the pin precisely (otherwise map can fallback to location).
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Latitude (optional)">
              <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="51.5072" style={input()} />
            </Field>
            <Field label="Longitude (optional)">
              <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-0.1276" style={input()} />
            </Field>
          </div>

          <button
            onClick={save}
            disabled={!canSave}
            style={{
              marginTop: 4,
              border: "none",
              borderRadius: 12,
              padding: "12px 14px",
              background: !canSave ? "rgba(0,0,0,0.10)" : "black",
              color: !canSave ? "rgba(0,0,0,0.55)" : "white",
              fontWeight: 950,
              cursor: !canSave ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Creating…" : "Create horse"}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
