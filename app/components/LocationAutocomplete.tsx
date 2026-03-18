"use client";

import { useEffect, useRef } from "react";

type LocationAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: {
    address: string;
    name: string;
    lat: number | null;
    lng: number | null;
  }) => void;
  placeholder?: string;
  disabled?: boolean;
};

function loadGooglePlacesScript(apiKey: string) {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    // @ts-ignore
    if (window.google?.maps?.places) return resolve();

    const existing = document.querySelector<HTMLScriptElement>('script[data-pmp-google="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps script")), {
        once: true,
      });
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

export default function LocationAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  disabled,
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    let cancelled = false;

    async function initPlaces() {
      try {
        if (!googleKey) return;
        await loadGooglePlacesScript(googleKey);
        if (cancelled || !inputRef.current) return;

        // @ts-ignore
        const google = window.google;
        if (!google?.maps?.places) return;

        const ac = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "geometry", "name"],
          types: ["geocode"],
        });

        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const address = place?.formatted_address ?? "";
          const name = place?.name ?? "";
          const g = place?.geometry?.location;

          const lat = g && typeof g.lat === "function" ? g.lat() : null;
          const lng = g && typeof g.lng === "function" ? g.lng() : null;

          onChange(address);
          onPlaceSelect?.({
            address,
            name,
            lat,
            lng,
          });
        });
      } catch {
        // allow plain manual entry if script fails
      }
    }

    initPlaces();
    return () => {
      cancelled = true;
    };
  }, [googleKey, onChange, onPlaceSelect]);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={
        placeholder ||
        (googleKey
          ? "Start typing an address…"
          : "Enter location (set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for search)")
      }
      style={{
        border: "1px solid rgba(0,0,0,0.14)",
        borderRadius: 12,
        padding: "12px 12px",
        fontSize: 14,
        width: "100%",
        background: disabled ? "rgba(0,0,0,0.03)" : "white",
      }}
    />
  );
}