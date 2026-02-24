"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const palette = {
  forest: "#1F3D2B",
  navy: "#1F2A44",
};

const STORAGE_BUCKET = "horse-images"; // <-- change if your bucket name differs

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

function loadGooglePlacesScript(apiKey: string) {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    // already loaded
    // @ts-ignore
    if (window.google?.maps?.places) return resolve();

    const existing = document.querySelector<HTMLScriptElement>('script[data-pmp-google="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps script")));
      return;
    }

    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.dataset.pmpGoogle = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(s);
  });
}

export default function AddHorsePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [age, setAge] = useState<string>("");
  const [size, setSize] = useState("");
  const [temperament, setTemperament] = useState("");
  const [bio, setBio] = useState("");

  const [location, setLocation] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [isActive, setIsActive] = useState(true);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locationInputRef = useRef<HTMLInputElement | null>(null);

  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    let cancelled = false;

    async function initPlaces() {
      try {
        if (!googleKey) return; // no key set

        await loadGooglePlacesScript(googleKey);
        if (cancelled) return;

        // @ts-ignore
        const google = window.google;
        if (!google?.maps?.places || !locationInputRef.current) return;

        const ac = new google.maps.places.Autocomplete(locationInputRef.current, {
          fields: ["formatted_address", "geometry"],
          types: ["geocode"],
        });

        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const addr = place?.formatted_address ?? "";
          const g = place?.geometry?.location;
          setLocation(addr);
          if (g) {
            setLat(typeof g.lat === "function" ? g.lat() : null);
            setLng(typeof g.lng === "function" ? g.lng() : null);
          }
        });
      } catch {
        // silently fail; user can still type location
      }
    }

    initPlaces();
    return () => {
      cancelled = true;
    };
  }, [googleKey]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const canSubmit = useMemo(() => {
    return name.trim().length > 0 && !submitting;
  }, [name, submitting]);

  async function uploadImage(userId: string, file: File) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

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

    if (!name.trim()) return;

    try {
      setSubmitting(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) throw new Error("Not authenticated");

      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage(user.id, imageFile);
      }

      const ageNum = age.trim() ? Number(age) : null;
      if (age.trim() && Number.isNaN(ageNum)) throw new Error("Age must be a number.");

      const { error: insErr } = await supabase.from("horses").insert({
        owner_id: user.id,
        name: name.trim(),
        age: ageNum,
        size: size.trim() ? size.trim() : null,
        temperament: temperament.trim() ? temperament.trim() : null,
        bio: bio.trim() ? bio.trim() : null,

        location: location.trim() ? location.trim() : null,
        lat,
        lng,

        image_url: imageUrl,
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
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: -0.3, color: palette.navy, fontWeight: 950 }}>
            Add a horse
          </h1>
          <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.62)", lineHeight: 1.6 }}>
            Create a listing with details and an optional image.
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
              Age (optional)
              <input value={age} onChange={(e) => setAge(e.target.value)} style={input} placeholder="e.g. 7" inputMode="numeric" />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
              Size (optional)
              <input value={size} onChange={(e) => setSize(e.target.value)} style={input} placeholder="e.g. 15.2hh" />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
            Temperament (optional)
            <input value={temperament} onChange={(e) => setTemperament(e.target.value)} style={input} placeholder="e.g. Calm, friendly, forward" />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
            Bio (optional)
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              style={{ ...input, resize: "vertical" }}
              placeholder="Short description, experience, quirks, requirements…"
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
            Location (search) (optional)
            <input
              ref={locationInputRef}
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                // if user manually edits, coords might be wrong
                setLat(null);
                setLng(null);
              }}
              style={input}
              placeholder={googleKey ? "Start typing an address…" : "Enter location (set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for search)"}
            />
            <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
              {lat && lng ? `Coordinates set: ${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Pick a suggestion to set map coordinates automatically."}
            </div>
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.75)", fontWeight: 800 }}>
            Image upload (optional)
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setImageFile(f);
              }}
              style={{ fontSize: 13 }}
            />
            {imagePreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
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
        </div>
      </form>

      <div style={{ height: 24 }} />
    </div>
  );
}