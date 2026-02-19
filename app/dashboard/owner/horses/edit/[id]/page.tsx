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
  name: string | null;
  location: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  breed: string | null;
  age: string | null;
  height: string | null;
  temperament: string | null;
  description: string | null;
  is_active: boolean | null;
};

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

/**
 * ✅ Accepts Promises OR "thenables" (Supabase query builders).
 * This fixes: "PostgrestFilterBuilder ... is not assignable to Promise"
 */
function withTimeout<T>(thenable: { then: Function }, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);

    Promise.resolve(thenable as any)
      .then((v: T) => {
        window.clearTimeout(t);
        resolve(v);
      })
      .catch((e: any) => {
        window.clearTimeout(t);
        reject(e);
      });
  });
}

export default function EditHorsePage() {
  const params = useParams() as { id?: string | string[] };
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [horse, setHorse] = useState<HorseRow | null>(null);

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
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      if (!id) {
        setHorse(null);
        setError("Missing horse id in URL. Folder must be: edit/[id]/page.tsx");
        setLoading(false);
        return;
      }

      try {
        // ✅ Use .single() and catch 406 or RLS nicely
        const res = await withTimeout<any>(
          supabase
            .from("horses")
            .select("id,owner_id,name,location,lat,lng,image_url,breed,age,height,temperament,description,is_active")
            .eq("id", id)
            .single(),
          8000,
          "Load horse"
        );

        if (cancelled) return;

        const { data, error } = res;
        if (error) throw error;

        if (!data) {
          setHorse(null);
          setError("Horse not found (or blocked by RLS).");
          setLoading(false);
          return;
        }

        const h = data as HorseRow;

        setHorse(h);
        setName(h.name ?? "");
        setLocation(h.location ?? "");
        setLat(h.lat ?? null);
        setLng(h.lng ?? null);
        setImageUrl(h.image_url ?? "");
        setBreed(h.breed ?? "");
        setAge(h.age ?? "");
        setHeight(h.height ?? "");
        setTemperament(h.temperament ?? "");
        setDescription(h.description ?? "");
        setIsActive(h.is_active !== false);

        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setHorse(null);
          setError(e?.message ?? "Failed to load horse");
          setLoading(false);
        }
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

      const payload: any = {
        name: name.trim() ? name.trim() : null,
        location: location.trim() ? location.trim() : null,
        lat,
        lng,
        image_url: imageUrl.trim() ? imageUrl.trim() : null,
        breed: breed.trim() ? breed.trim() : null,
        age: age.trim() ? age.trim() : null,
        height: height.trim() ? height.trim() : null,
        temperament: temperament.trim() ? temperament.trim() : null,
        description: description.trim() ? description.trim() : null,
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

        {!horse ? null : (
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
        )}
      </div>
    </DashboardShell>
  );
}
