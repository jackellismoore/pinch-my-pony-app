"use client";

import { useEffect, useRef } from "react";
import { useLoadScript } from "@react-google-maps/api";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onPlaceSelected: (place: { locationText: string; lat: number; lng: number }) => void;
  placeholder?: string;
};

const libraries: ("places")[] = ["places"];

export default function LocationAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder = "Start typing a location…",
}: Props) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const inputRef = useRef<HTMLInputElement | null>(null);
  const autoRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!inputRef.current) return;
    if (autoRef.current) return;

    autoRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "name"],
      types: ["geocode"],
    });

    autoRef.current.addListener("place_changed", () => {
      const place = autoRef.current?.getPlace();
      const geom = place?.geometry?.location;
      const lat = geom?.lat?.();
      const lng = geom?.lng?.();

      const formatted = (place?.formatted_address || place?.name || "").trim();

      if (typeof lat === "number" && typeof lng === "number" && formatted) {
        onChange(formatted);
        onPlaceSelected({ locationText: formatted, lat, lng });
      }
    });
  }, [isLoaded, onPlaceSelected, onChange]);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        border: "1px solid rgba(15,23,42,0.12)",
        borderRadius: 12,
        padding: "12px 12px",
        fontSize: 14,
        outline: "none",
        background: "white",
      }}
    />
  );
}
