"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import HorseImageUploader from "@/components/HorseImageUploader";
import LocationAutocomplete from "@/components/LocationAutocomplete";
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
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [temperament, setTemperament] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const canSave = useMemo(() => !saving && name.trim().length > 0, [saving, name]);

  async function save() {
    setError(null);

    try {
      setSaving(true);

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const ownerId = userRes.user?.id;
      if (!ownerId) throw new Error("Not authenticated");

      const payload: any = {
        owner_id: ownerId,
        is_active: true,
        name: name.trim() ? name.trim() : null,
        location: location.trim() ? location.trim() : null,
        lat: lat,
        lng: lng,
        breed: breed.trim() ? breed.trim() : null,
        age: age.trim() ? age.trim() : null,
        height: height.trim() ? height.trim() : null,
        temperament: temperament.trim() ? temperament.trim() : null,
        description: description.trim() ? description.trim() : null,
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
        <div style={{ margin: 0, fontSize: 24, fontWeight: 950 }}>Add Horse</div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
          Add a listing. Choose a location from the dropdown so the map pin works.
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
            <LocationAutocomplete
              value={location}
              onChange={setLocation}
              onPlaceSelected={({ locationText, lat, lng }) => {
                setLocation(locationText);
                setLat(lat);
                setLng(lng);
              }}
              placeholder="Type a location and select a suggestion…"
            />
          </Field>

          <div style={{ fontSize: 12, opacity: 0.65 }}>
            {lat != null && lng != null ? (
              <span>
                Pin set: <b>{lat.toFixed(5)}</b>, <b>{lng.toFixed(5)}</b>
              </span>
            ) : (
              <span>Select a location from Google suggestions to set the map pin.</span>
            )}
          </div>

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
              <input value={temperament} onChange={(e) => setTemperament(e.target.value)} placeholder="Calm, forward…" style={input()} />
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

            <HorseImageUploader bucket="horses" value={imageUrl} onChange={(url: string) => setImageUrl(url)} />

            <Field label="Image URL (auto-filled on upload)">
              <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." style={input()} />
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
