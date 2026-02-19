"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GoogleMap, Marker, InfoWindow, useLoadScript } from "@react-google-maps/api";

export type MapHorse = {
  id: string;
  owner_id?: string;
  name?: string | null;
  location?: string | null;
  image_url?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type Props = {
  horses: MapHorse[];
  userLocation?: { lat: number; lng: number } | null;
  highlightedId?: string | null;
};

export default function HorseMap({ horses, userLocation = null, highlightedId = null }: Props) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const withCoords = useMemo(
    () => horses.filter((h) => typeof h.lat === "number" && typeof h.lng === "number") as Array<MapHorse & { lat: number; lng: number }>,
    [horses]
  );

  const center = useMemo(() => {
    if (userLocation) return userLocation;
    if (withCoords.length) return { lat: withCoords[0].lat, lng: withCoords[0].lng };
    return { lat: 51.5072, lng: -0.1276 }; // London default
  }, [userLocation, withCoords]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return withCoords.find((h) => h.id === selectedId) ?? null;
  }, [selectedId, withCoords]);

  if (!isLoaded) {
    return (
      <div
        style={{
          border: "1px solid rgba(15,23,42,0.10)",
          borderRadius: 18,
          background: "white",
          padding: 14,
          fontSize: 13,
          opacity: 0.7,
        }}
      >
        Loading map…
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid rgba(15,23,42,0.10)", borderRadius: 18, overflow: "hidden", background: "white" }}>
      <div style={{ padding: 14, fontWeight: 950, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>Map</div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>Click a pin to view the horse</div>
      </div>

      <GoogleMap zoom={8} center={center} mapContainerStyle={{ width: "100%", height: 420 }}>
        {withCoords.map((h) => (
          <Marker
            key={h.id}
            position={{ lat: h.lat, lng: h.lng }}
            onClick={() => setSelectedId(h.id)}
            icon={
              highlightedId === h.id
                ? "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                : undefined
            }
          />
        ))}

        {selected ? (
          <InfoWindow position={{ lat: selected.lat, lng: selected.lng }} onCloseClick={() => setSelectedId(null)}>
            <div style={{ width: 220 }}>
              {selected.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.image_url}
                  alt={selected.name ?? "Horse"}
                  style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 10 }}
                />
              ) : null}

              <div style={{ marginTop: 8, fontWeight: 950, fontSize: 14 }}>
                {selected.name ?? "Horse"}
              </div>

              {selected.location ? (
                <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>{selected.location}</div>
              ) : null}

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link
                  href={`/horse/${selected.id}`}
                  style={{
                    textDecoration: "none",
                    border: "1px solid rgba(15,23,42,0.14)",
                    borderRadius: 10,
                    padding: "8px 10px",
                    fontSize: 12,
                    fontWeight: 900,
                    color: "#0f172a",
                    background: "white",
                  }}
                >
                  View Horse
                </Link>

                <Link
                  href={`/request?horseId=${selected.id}`}
                  style={{
                    textDecoration: "none",
                    border: "1px solid rgba(0,0,0,0.14)",
                    borderRadius: 10,
                    padding: "8px 10px",
                    fontSize: 12,
                    fontWeight: 950,
                    color: "white",
                    background: "black",
                  }}
                >
                  Request →
                </Link>
              </div>
            </div>
          </InfoWindow>
        ) : null}
      </GoogleMap>

      {withCoords.length === 0 ? (
        <div style={{ padding: 14, fontSize: 13, opacity: 0.7 }}>
          No horses have coordinates yet. Add a location on the horse listing to place pins.
        </div>
      ) : null}
    </div>
  );
}
