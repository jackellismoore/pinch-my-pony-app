"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import HorseImageUploader from "@/components/HorseImageUploader";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { supabase } from "@/lib/supabaseClient";

type HorseRow = {
  id: string;
  owner_id: string;
  name: any;
  location: any;
  lat: any;
  lng: any;
  image_url: any;
  breed: any;
  age: any;
  height: any;
  temperament: any;
  description: any;
  is_active: any;
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function asBool(v: unknown, fallback = true): boolean {
  if (typeof v === "boolean") return v;
  if (v === 0) return false;
  if (v === 1) return true;
  return fallback;
}

function input(): React.CSSProperties {
  return {
    border: "1px solid rgba(15,23,42,0.12)",
    borderRadius: 12,
    padding: "12px 12px",
    fontSize: 14,
    outline: "none",
    background: "white",
    width: "100%",
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

export default function EditHorsePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // keep ALL these as strings (safe for .trim + inputs)
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState(""); // string
  const [lng, setLng] = useState(""); // string

  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [temperament, setTemperament] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) {
        setError("Missing horse id in URL.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("horses")
          .select("id,owner_id,name,location,lat,lng,image_url,breed,age,height,temperament,description,is_active")
          .eq("id", id)
          .single();

        if (cancelled) return;
        if (error) throw error;

        const h = data as HorseRow;

        // sanitize incoming values (prevents `.trim` crashes later)
        setName(asString(h.name));
        setLocation(asString(h.location));

        // lat/lng from DB might be number or null
        setLat(h.lat == null ? "" : String(h.lat));
        setLng(h.lng == null ? "" : String(h.lng));

        setImageUrl(asString(h.image_url));
        setBreed(asString(h.breed));
        setAge(asString(h.age));
        setHeight(asString(h.height));
        setTemperament(asString(h.temperament));
        setDescription(asString(h.description));
        setIsActive(asBool(h.is_active, true));
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load horse");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const canSave = useMemo(() => !saving && name.trim().length > 0, [saving, name]);

  async function save() {
    if (!id) return;
    setError(null);

    try {
      setSaving(true);

      // convert lat/lng strings -> numbers or null
      const latNum = lat.trim() ? Number(lat) : null;
      const lngNum = lng.trim() ? Number(lng) : null;

      if (latNum != null && !Number.isFinite(latNum)) throw new Error("Latitude must be a number");
      if (lngNum != null && !Number.isFinite(lngNum)) throw new Error("Longitude must be a number");

      const payload: any = {
        name: name.trim() || null,
        location: location.trim() || null,
        lat: latNum,
        lng: lngNum,
        image_url: imageUrl.trim() || null,
        breed: breed.trim() || null,
        age: age.trim() || null,
        height: height.trim() || null,
        temperament: temperament.trim() || null,
        description: description.trim() || null,
        is_active: isActive,
      };

      const { error } = await supabase.from("horses").update(payload).eq("id", id);
      if (error) throw error;

      router.push("/dashboard/owner/horses");
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save horse");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <div style={{ padding: 16, maxWidth: 900, margin: "0 auto", opacity: 0.7 }}>Loading…</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
        <div style={{ margin: 0, fontSize: 24, fontWeight: 950 }}>Edit Horse</div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
          Update details. Select a location suggestion to set the map pin.
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
                setLat(String(lat));
                setLng(String(lng));
              }}
              placeholder="Type a location and select a suggestion…"
            />
          </Field>

          <div style={{ fontSize: 12, opacity: 0.65 }}>
            {lat.trim() && lng.trim() ? (
              <span>
                Pin set: <b>{Number(lat).toFixed(5)}</b>, <b>{Number(lng).toFixed(5)}</b>
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
          </div>

          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, fontWeight: 900 }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active listing
          </label>

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
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
