"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PlaceSelected = {
  locationText: string;
  lat: number;
  lng: number;
};

type Props = {
  value: string;
  onChange: (v: string) => void;
  onPlaceSelected: (p: PlaceSelected) => void;
  placeholder?: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function toSafeString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  // if an object sneaks in, try to stringify safely
  try {
    return String(v);
  } catch {
    return "";
  }
}

function loadGooglePlaces(apiKey: string) {
  return new Promise<void>((resolve, reject) => {
    // already loaded
    if (typeof window !== "undefined" && (window as any).google?.maps?.places) return resolve();

    // already loading
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-places="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Places")));
      return;
    }

    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.dataset.googlePlaces = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Places"));
    document.head.appendChild(s);
  });
}

export default function LocationAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder = "Type a location…",
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [preds, setPreds] = useState<Array<{ description: string; place_id: string }>>([]);

  const svcRef = useRef<any>(null);
  const detailsRef = useRef<any>(null);

  const safeValue = useMemo(() => toSafeString(value), [value]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setErr(null);

      if (!isNonEmptyString(apiKey)) {
        setErr("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
        return;
      }

      try {
        await loadGooglePlaces(apiKey);
        if (cancelled) return;

        const g = (window as any).google;
        svcRef.current = new g.maps.places.AutocompleteService();
        detailsRef.current = new g.maps.places.PlacesService(document.createElement("div"));
        setReady(true);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load Google Places");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!ready) return;

    const q = safeValue.trim();
    if (!q) {
      setPreds([]);
      setOpen(false);
      return;
    }

    let cancelled = false;

    svcRef.current.getPlacePredictions(
      { input: q, types: ["geocode"] },
      (results: any[] | null, status: string) => {
        if (cancelled) return;
        if (status !== "OK" || !results?.length) {
          setPreds([]);
          setOpen(false);
          return;
        }
        setPreds(results.map((r) => ({ description: r.description, place_id: r.place_id })));
        setOpen(true);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [safeValue, ready]);

  async function pick(placeId: string, description: string) {
    if (!ready) return;

    setOpen(false);
    setPreds([]);

    detailsRef.current.getDetails(
      { placeId, fields: ["geometry", "formatted_address", "name"] },
      (place: any, status: string) => {
        if (status !== "OK" || !place?.geometry?.location) {
          // still set text at least
          onChange(description);
          return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        const text =
          (typeof place.formatted_address === "string" && place.formatted_address.trim()) ||
          (typeof place.name === "string" && place.name.trim()) ||
          description;

        onChange(text);
        onPlaceSelected({ locationText: text, lat, lng });
      }
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        value={safeValue}
        onChange={(e) => onChange(e.target.value)} // always string
        placeholder={placeholder}
        style={{
          border: "1px solid rgba(15,23,42,0.12)",
          borderRadius: 12,
          padding: "12px 12px",
          fontSize: 14,
          outline: "none",
          background: "white",
          width: "100%",
        }}
        onFocus={() => {
          if (preds.length) setOpen(true);
        }}
        onBlur={() => {
          // tiny delay so click can register
          setTimeout(() => setOpen(false), 120);
        }}
      />

      {err ? (
        <div style={{ marginTop: 8, fontSize: 12, color: "#b91c1c", fontWeight: 800 }}>{err}</div>
      ) : null}

      {open && preds.length ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 46,
            zIndex: 50,
            background: "white",
            border: "1px solid rgba(15,23,42,0.12)",
            borderRadius: 12,
            boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
            overflow: "hidden",
          }}
        >
          {preds.slice(0, 6).map((p) => (
            <button
              key={p.place_id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(p.place_id, p.description)}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "white",
                padding: "10px 12px",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {p.description}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
