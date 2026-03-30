"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
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
  height_hh: any;
  temperament: any;
  description: any;
  is_active: any;
};

const BREED_OPTIONS = [
  "Arabian",
  "Cob",
  "Connemara",
  "Clydesdale",
  "Dutch Warmblood",
  "Ex-Racehorse",
  "Fell Pony",
  "Friesian",
  "Hackney",
  "Highland Pony",
  "Irish Draught",
  "Irish Sport Horse",
  "New Forest Pony",
  "Shetland",
  "Shire",
  "Sports Horse",
  "Thoroughbred",
  "Warmblood",
  "Welsh Pony",
  "Welsh Section D",
  "Other",
] as const;

const TEMPERAMENT_OPTIONS = [
  "Calm",
  "Friendly",
  "Gentle",
  "Safe",
  "Confidence Giving",
  "Forward Going",
  "Energetic",
  "Playful",
  "Sensitive",
  "Sharp",
  "Needs Experienced Rider",
  "Experienced Ride",
  "Lazy",
  "Strong",
  "Other",
] as const;

function asString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function asBool(v: unknown, fallback = true): boolean {
  if (typeof v === "boolean") return v;
  if (v === 0) return false;
  if (v === 1) return true;
  return fallback;
}

function normalizeBreed(value: string) {
  const raw = value.trim().toLowerCase();
  if (!raw) return "";

  const exact = BREED_OPTIONS.find((option) => option.toLowerCase() === raw);
  if (exact) return exact;

  if (raw.includes("irish") && raw.includes("sport")) return "Irish Sport Horse";
  if (raw.includes("irish") && raw.includes("draught")) return "Irish Draught";
  if (raw.includes("welsh") && raw.includes("section d")) return "Welsh Section D";
  if (raw.includes("welsh")) return "Welsh Pony";
  if (raw.includes("sport")) return "Sports Horse";
  if (raw.includes("warmblood")) return "Warmblood";
  if (raw.includes("thoroughbred") || raw.includes("racehorse")) return raw.includes("ex") ? "Ex-Racehorse" : "Thoroughbred";
  if (raw.includes("new forest")) return "New Forest Pony";
  if (raw.includes("highland")) return "Highland Pony";
  if (raw.includes("shetland")) return "Shetland";
  if (raw.includes("shire")) return "Shire";
  if (raw.includes("connemara")) return "Connemara";
  if (raw.includes("friesian")) return "Friesian";
  if (raw.includes("arabian")) return "Arabian";
  if (raw.includes("cob")) return "Cob";
  if (raw.includes("clydesdale")) return "Clydesdale";
  if (raw.includes("hackney")) return "Hackney";
  if (raw.includes("fell")) return "Fell Pony";
  if (raw.includes("dutch")) return "Dutch Warmblood";

  return "Other";
}

function normalizeTemperament(value: string) {
  const raw = value.trim().toLowerCase();
  if (!raw) return "";

  const exact = TEMPERAMENT_OPTIONS.find((option) => option.toLowerCase() === raw);
  if (exact) return exact;

  if (raw.includes("calm")) return "Calm";
  if (raw.includes("friendly")) return "Friendly";
  if (raw.includes("gentle")) return "Gentle";
  if (raw.includes("safe")) return "Safe";
  if (raw.includes("confidence")) return "Confidence Giving";
  if (raw.includes("forward")) return "Forward Going";
  if (raw.includes("energetic") || raw.includes("energy")) return "Energetic";
  if (raw.includes("playful")) return "Playful";
  if (raw.includes("sensitive")) return "Sensitive";
  if (raw.includes("sharp")) return "Sharp";
  if (raw.includes("experienced")) return "Needs Experienced Rider";
  if (raw.includes("lazy")) return "Lazy";
  if (raw.includes("strong")) return "Strong";

  return "Other";
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

const STORAGE_BUCKET = "horses";

export default function EditHorsePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
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
          .select("id,owner_id,name,location,lat,lng,image_url,breed,age,height,height_hh,temperament,description,is_active")
          .eq("id", id)
          .single();

        if (cancelled) return;
        if (error) throw error;

        const h = data as HorseRow;

        setName(asString(h.name));
        setLocation(asString(h.location));
        setLat(h.lat == null ? "" : String(h.lat));
        setLng(h.lng == null ? "" : String(h.lng));
        setImageUrl(asString(h.image_url));
        setBreed(normalizeBreed(asString(h.breed)));
        setAge(asString(h.age));
        setHeight(asString(h.height_hh ?? h.height));
        setTemperament(normalizeTemperament(asString(h.temperament)));
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

  const canSave = useMemo(() => !saving && !uploadingImage && name.trim().length > 0, [saving, uploadingImage, name]);

  async function uploadImage(file: File) {
    if (!id) return;
    setError(null);

    try {
      setUploadingImage(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("Failed to get public image URL");

      setImageUrl(publicUrl);
    } catch (e: any) {
      setError(e?.message ?? "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  }

  async function save() {
    if (!id) return;
    setError(null);

    try {
      setSaving(true);

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
        height_hh: height.trim() || null,
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

  async function removeHorse() {
    if (!id) return;
    const ok = window.confirm("Delete this horse listing? This cannot be undone.");
    if (!ok) return;

    setError(null);

    try {
      setDeleting(true);
      const { error } = await supabase.from("horses").delete().eq("id", id);
      if (error) throw error;

      router.push("/dashboard/owner/horses");
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete horse");
    } finally {
      setDeleting(false);
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
      <div style={{ padding: 16, maxWidth: 900, margin: "0 auto", paddingBottom: 110 }}>
        <style>{`
          .pmp-editHorse-grid2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          @media (max-width: 767px) {
            .pmp-editHorse-grid2 {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

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
              onChange={(value) => {
                setLocation(value);
                setLat("");
                setLng("");
              }}
              onPlaceSelect={({ address, lat, lng }) => {
                setLocation(address);
                setLat(lat == null ? "" : String(lat));
                setLng(lng == null ? "" : String(lng));
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

          <div className="pmp-editHorse-grid2">
            <Field label="Breed">
              <select value={breed} onChange={(e) => setBreed(e.target.value)} style={input()}>
                <option value="">Select breed</option>
                {BREED_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Age">
              <input value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" style={input()} />
            </Field>
          </div>

          <div className="pmp-editHorse-grid2">
            <Field label="Height (hh)">
              <input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 15.2" style={input()} />
            </Field>
            <Field label="Temperament">
              <select value={temperament} onChange={(e) => setTemperament(e.target.value)} style={input()}>
                <option value="">Select temperament</option>
                {TEMPERAMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
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
            <div style={labelStyle()}>Image upload</div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file) {
                  void uploadImage(file);
                }
                e.currentTarget.value = "";
              }}
              style={{ fontSize: 13 }}
              disabled={uploadingImage}
            />

            {imageUrl ? (
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 16,
                  overflow: "hidden",
                  border: "1px solid rgba(0,0,0,0.10)",
                  background: "rgba(15,23,42,0.04)",
                }}
              >
                <img
                  src={imageUrl}
                  alt="Horse"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setImageUrl("")}
                disabled={!imageUrl || uploadingImage}
                style={{
                  border: "1px solid rgba(0,0,0,0.14)",
                  background: "white",
                  color: "black",
                  padding: "10px 12px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: !imageUrl || uploadingImage ? "not-allowed" : "pointer",
                  opacity: !imageUrl || uploadingImage ? 0.6 : 1,
                }}
              >
                Remove image
              </button>

              {uploadingImage ? (
                <div style={{ fontSize: 13, opacity: 0.7, alignSelf: "center" }}>Uploading image…</div>
              ) : null}
            </div>
          </div>

          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, fontWeight: 900 }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active listing
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={save}
              disabled={!canSave}
              style={{
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

            <button
              type="button"
              onClick={removeHorse}
              disabled={deleting || saving}
              style={{
                border: "1px solid rgba(185,28,28,0.22)",
                background: deleting ? "rgba(185,28,28,0.05)" : "rgba(185,28,28,0.08)",
                color: "#991b1b",
                borderRadius: 12,
                padding: "12px 14px",
                fontWeight: 950,
                cursor: deleting ? "not-allowed" : "pointer",
              }}
            >
              {deleting ? "Deleting…" : "Delete horse"}
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}