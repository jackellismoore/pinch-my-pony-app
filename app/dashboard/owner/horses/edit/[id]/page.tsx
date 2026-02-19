"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function EditHorsePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const horseId = params?.id;

  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!horseId) return;

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("horses")
          .select("id,name,location,breed,age,height,temperament,description,image_url,lat,lng")
          .eq("id", horseId)
          .single();

        if (cancelled) return;
        if (error) throw error;

        setName(data?.name ?? "");
        setLocation((data as any)?.location ?? "");
        setBreed((data as any)?.breed ?? "");
        setAge((data as any)?.age ?? "");
        setHeight((data as any)?.height ?? "");
        setTemperament((data as any)?.temperament ?? "");
        setDescription((data as any)?.description ?? "");
        setImageUrl((data as any)?.image_url ?? "");
        setLat((data as any)?.lat != null ? String((data as any).lat) : "");
        setLng((data as any)?.lng != null ? String((data as any).lng) : "");
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load horse");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [horseId]);

  const canSave = useMemo(() => !saving && name.trim().length > 0, [saving, name]);

  async function save() {
    if (!horseId) return;

    setError(null);

    try {
      setSaving(true);

      const latNum = lat.trim() ? Number(lat) : null;
      const lngNum = lng.trim() ? Number(lng) : null;

      if (latNum != null && !Number.isFinite(latNum)) throw new Error("Latitude must be a number");
      if (lngNum != null && !Number.isFinite(lngNum)) throw new Error("Longitude must be a number");

      const payload: any = {
        name: name.trim() ? name.trim() : null,
        location: location.trim() ? location.trim() : null,
        breed: breed.trim() ? breed.trim() : null,
        age: age.trim() ? age.trim() : null,
        height: height.trim() ? height.trim() : null,
        temperament: temperament.trim() ? temperament.trim() : null,
        description: description.trim() ? description.trim() : null,
        image_url: imageUrl.trim() ? imageUrl.trim() : null,
        lat: latNum,
        lng: lngNum,
      };

      const { error } = await supabase.from("horses").update(payload).eq("id", horseId);
      if (error) throw error;

      router.push("/dashboard/owner/horses");
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to update horse");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Edit Horse</h1>

        {loading ? <div style={{ marginTop: 10, fontSize: 13, opacity: 0.65 }}>Loading…</div> : null}

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

        {!loading ? (
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

              <HorseImageUploader bucket="horses" value={imageUrl} onChange={(url: string) => setImageUrl(url)} />

              <div style={{ fontSize: 12, opacity: 0.65 }}>Uploads to storage bucket <b>horses</b> and saves a public URL.</div>

              <Field label="Image URL (auto-filled on upload)">
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." style={input()} />
              </Field>
            </div>

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
              {saving ? "Saving…" : "Update horse"}
            </button>
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}
