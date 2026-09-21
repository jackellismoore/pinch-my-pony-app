"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { parseHorseHeight } from "@/lib/horseHeight";
import LocationAutocomplete from "@/components/LocationAutocomplete";

const palette = {
  forest: "#1F3D2B",
  navy: "#1F2A44",
};

const STORAGE_BUCKET = "horses";

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
    minHeight: 44,
  }) as React.CSSProperties;

const input: React.CSSProperties = {
  border: "1px solid rgba(31,42,68,0.16)",
  borderRadius: 12,
  padding: "12px 12px",
  fontSize: 14,
  background: "rgba(255,255,255,0.85)",
  outline: "none",
  width: "100%",
};

export default function AddHorsePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [heightHh, setHeightHh] = useState("");
  const [temperament, setTemperament] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [active, setActive] = useState(true);

  const [location, setLocation] = useState("");
  const [locationName, setLocationName] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!name.trim()) missing.push("Horse name");
    if (!breed.trim()) missing.push("Breed");
    if (!age.trim()) missing.push("Age");
    if (!heightHh.trim()) missing.push("Height");
    if (!temperament.trim()) missing.push("Temperament");
    if (!description.trim()) missing.push("Description");
    if (!location.trim() || lat == null || lng == null) missing.push("Location");
    if (!imageFile) missing.push("Photo");
    return missing;
  }, [name, breed, age, heightHh, temperament, description, location, lat, lng, imageFile]);

  const fieldStyle = (missing: boolean): React.CSSProperties => ({
    ...input,
    borderColor: showValidation && missing ? "#b42318" : input.border,
    background: showValidation && missing ? "rgba(180,35,24,0.05)" : input.background,
  });

  const canSubmit = useMemo(() => {
    return Boolean(
      name.trim() &&
      breed.trim() &&
      age.trim() &&
      heightHh.trim() &&
      temperament.trim() &&
      description.trim() &&
      location.trim() &&
      lat != null &&
      lng != null &&
      imageFile &&
      !submitting
    );
  }, [name, breed, age, heightHh, temperament, description, location, lat, lng, imageFile, submitting]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  async function uploadImage(userId: string, file: File) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (upErr) throw upErr;

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error("Failed to get public image URL");
    return publicUrl;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setShowValidation(true);

    if (!name.trim() || !breed.trim() || !age.trim() || !heightHh.trim() || !temperament.trim() || !description.trim() || !location.trim() || lat == null || lng == null || !imageFile) {
      setError("Please complete all required fields, including a photo and map location.");
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) throw new Error("Not authenticated");

      const ageNum = Number(age);
      if (!Number.isInteger(ageNum) || ageNum < 0 || ageNum > 100) throw new Error("Age must be a whole number between 0 and 100.");

      const heightNum = parseHorseHeight(heightHh);
      if (heightNum == null) throw new Error("Please enter a valid horse height.");

      const priceNum = pricePerDay.trim() ? Number(pricePerDay) : null;
      if (pricePerDay.trim() && Number.isNaN(priceNum)) throw new Error("Price per day must be a number.");

      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage(user.id, imageFile);
      }

      const { error: insErr } = await supabase.from("horses").insert({
        owner_id: user.id,
        name: name.trim(),
        breed: breed.trim() ? breed.trim() : null,
        temperament: temperament.trim() ? temperament.trim() : null,
        description: description.trim() ? description.trim() : null,
        active,
        age: ageNum,
        height_hh: heightNum,
        price_per_day: priceNum,
        location: location.trim() ? location.trim() : null,
        location_name: locationName.trim() ? locationName.trim() : null,
        lat,
        lng,
        latitude: null,
        longitude: null,
        image_url: imageUrl,
        photo_url: null,
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
    <>
      <style>{`
        .pmp-addHorse-grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .pmp-addHorse-grid3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }

        @media (max-width: 767px) {
          .pmp-addHorse-grid2,
          .pmp-addHorse-grid3 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="pmp-pageShell">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div className="pmp-kicker">Owner tools</div>
            <h1 className="pmp-pageTitle">Add a horse</h1>
            <div className="pmp-mutedText" style={{ marginTop: 6 }}>
              Create a listing with details, location search, and image upload.
            </div>
          </div>

          <Link href="/dashboard/owner/horses" style={btn("secondary")}>
            ← Back
          </Link>
        </div>

        <form onSubmit={onSubmit} style={{ marginTop: 16, ...card, padding: 16 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
              Horse name *
              <input value={name} onChange={(e) => setName(e.target.value)} style={fieldStyle(!name.trim())} placeholder="e.g. Apollo" />
            </label>

            <div className="pmp-addHorse-grid2">
              <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
                Breed *
                <select value={breed} onChange={(e) => setBreed(e.target.value)} style={fieldStyle(!breed.trim())}>
                  <option value="">Select breed</option>
                  {BREED_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
                Temperament *
                <select value={temperament} onChange={(e) => setTemperament(e.target.value)} style={fieldStyle(!temperament.trim())}>
                  <option value="">Select temperament</option>
                  {TEMPERAMENT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="pmp-addHorse-grid3">
              <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
                Age *
                <input value={age} onChange={(e) => setAge(e.target.value)} style={fieldStyle(!age.trim())} placeholder="9" inputMode="numeric" />
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
                Height (hh) *
                <input value={heightHh} onChange={(e) => setHeightHh(e.target.value)} style={fieldStyle(!heightHh.trim())} placeholder="16.2" inputMode="decimal" />
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
                Price per day (optional)
                <input value={pricePerDay} onChange={(e) => setPricePerDay(e.target.value)} style={input} placeholder="40" inputMode="numeric" />
              </label>
            </div>

            <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
              Description *
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                style={{ ...fieldStyle(!description.trim()), resize: "vertical" }}
                placeholder="Tell borrowers about schooling, rider suitability, rules, etc."
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
              Location (search) *
              <LocationAutocomplete
                value={location}
                onChange={(v) => {
                  setLocation(v);
                  setLocationName("");
                  setLat(null);
                  setLng(null);
                }}
                onPlaceSelect={({ address, name, lat, lng }) => {
                  setLocation(address);
                  setLocationName(name && name !== address ? name : "");
                  setLat(lat);
                  setLng(lng);
                }}
              />
              {showValidation && (!location.trim() || lat == null || lng == null) ? <div style={{ fontSize: 12, color: "#b42318", fontWeight: 800 }}>Please select a location suggestion so the map coordinates are set.</div> : null}
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
                {lat && lng ? `Coordinates set: ${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Pick a suggestion to set coordinates automatically."}
              </div>
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
              Image upload *
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                style={{ fontSize: 13 }}
              />
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt=""
                  style={{
                    marginTop: 10,
                    width: 140,
                    height: 140,
                    objectFit: "cover",
                    borderRadius: 16,
                    border: "1px solid rgba(0,0,0,0.10)",
                  }}
                />
              ) : null}
            </label>

            <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, fontWeight: 900, color: palette.navy }}>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Set listing as active
            </label>

            {showValidation && missingFields.length > 0 ? (
              <div className="pmp-errorBanner">
                <div style={{ fontWeight: 950 }}>Please complete the required fields before creating your listing:</div>
                <div style={{ marginTop: 6 }}>{missingFields.join(", ")}</div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>Price per day is optional.</div>
              </div>
            ) : null}
            {error ? <div className="pmp-errorBanner">{error}</div> : null}

            <button type="submit" disabled={submitting} style={{ ...btn("primary"), opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "Saving…" : "Create Listing"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
