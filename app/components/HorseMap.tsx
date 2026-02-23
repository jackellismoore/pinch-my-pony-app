"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  GoogleMap,
  InfoWindow,
  OverlayView,
  useLoadScript,
} from "@react-google-maps/api";

export type MapHorse = {
  id: string;
  owner_id?: string;
  name?: string | null;
  location?: string | null;
  image_url?: string | null;
  lat?: number | null;
  lng?: number | null;

  // ✅ NEW: rating snippet for badge on pin
  rating_avg?: number | null;
  rating_count?: number | null;
};

type Props = {
  horses: MapHorse[];
  userLocation?: { lat: number; lng: number } | null;
  highlightedId?: string | null;
};

function badgeText(avg?: number | null, count?: number | null) {
  const c = Number(count ?? 0);
  if (!c || c <= 0) return "New";
  const a = Number(avg ?? 0);
  return `★ ${a.toFixed(1)}`;
}

function badgeStyle(hasReviews: boolean): React.CSSProperties {
  return {
    position: "absolute",
    top: -10,
    right: -10,
    borderRadius: 999,
    padding: "5px 7px",
    fontSize: 11,
    fontWeight: 950,
    background: hasReviews ? "black" : "rgba(0,0,0,0.70)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.90)",
    boxShadow: "0 10px 22px rgba(0,0,0,0.18)",
    lineHeight: 1,
    whiteSpace: "nowrap",
  };
}

function pinWrapStyle(isHighlighted: boolean): React.CSSProperties {
  return {
    position: "relative",
    width: 40,
    height: 40,
    cursor: "pointer",
    transform: isHighlighted ? "scale(1.05)" : "scale(1)",
    transition: "transform 120ms ease",
    userSelect: "none",
  };
}

function pinStyle(isHighlighted: boolean): React.CSSProperties {
  // Simple “pin” look using a circle + small pointer
  return {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
  };
}

function pinCircleStyle(isHighlighted: boolean): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    borderRadius: 999,
    background: isHighlighted ? "#2563eb" : "black",
    border: "2px solid rgba(255,255,255,0.92)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.20)",
  };
}

function pinPointerStyle(isHighlighted: boolean): React.CSSProperties {
  return {
    position: "absolute",
    left: "50%",
    top: 23,
    width: 0,
    height: 0,
    transform: "translateX(-50%)",
    borderLeft: "6px solid transparent",
    borderRight: "6px solid transparent",
    borderTop: `10px solid ${isHighlighted ? "#2563eb" : "black"}`,
    filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.18))",
  };
}

export default function HorseMap({
  horses,
  userLocation = null,
  highlightedId = null,
}: Props) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const withCoords = useMemo(
    () =>
      horses.filter(
        (h) => typeof h.lat === "number" && typeof h.lng === "number"
      ) as Array<MapHorse & { lat: number; lng: number }>,
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
    <div
      style={{
        border: "1px solid rgba(15,23,42,0.10)",
        borderRadius: 18,
        overflow: "hidden",
        background: "white",
      }}
    >
      <div
        style={{
          padding: 14,
          fontWeight: 950,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div>Map</div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>
          Click a pin to view the horse
        </div>
      </div>

      <GoogleMap zoom={8} center={center} mapContainerStyle={{ width: "100%", height: 420 }}>
        {withCoords.map((h) => {
          const isHighlighted = highlightedId === h.id;
          const count = Number(h.rating_count ?? 0);
          const hasReviews = count > 0;

          // Center the overlay so the “tip” points roughly at the lat/lng
          const getPixelPositionOffset = (_width: number, _height: number) => ({
            x: -20, // half of 40
            y: -38, // lift so pointer tip is on coordinate
          });

          return (
            <OverlayView
              key={h.id}
              position={{ lat: h.lat, lng: h.lng }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={getPixelPositionOffset}
            >
              <div
                role="button"
                aria-label={`View ${h.name ?? "Horse"}`}
                tabIndex={0}
                onClick={() => setSelectedId(h.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedId(h.id);
                }}
                style={pinWrapStyle(isHighlighted)}
              >
                {/* pin */}
                <div style={pinStyle(isHighlighted)}>
                  <div style={pinCircleStyle(isHighlighted)} />
                  <div style={pinPointerStyle(isHighlighted)} />
                </div>

                {/* ✅ rating badge */}
                <div style={badgeStyle(hasReviews)}>
                  {badgeText(h.rating_avg, h.rating_count)}
                </div>
              </div>
            </OverlayView>
          );
        })}

        {selected ? (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => setSelectedId(null)}
          >
            <div style={{ width: 220 }}>
              {selected.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.image_url}
                  alt={selected.name ?? "Horse"}
                  style={{
                    width: "100%",
                    height: 120,
                    objectFit: "cover",
                    borderRadius: 10,
                  }}
                />
              ) : null}

              <div style={{ marginTop: 8, fontWeight: 950, fontSize: 14 }}>
                {selected.name ?? "Horse"}
              </div>

              {selected.location ? (
                <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                  {selected.location}
                </div>
              ) : null}

              {/* rating line in the popup too (small + consistent) */}
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
                {Number(selected.rating_count ?? 0) > 0
                  ? `★ ${Number(selected.rating_avg ?? 0).toFixed(1)} (${Number(selected.rating_count ?? 0)})`
                  : "New • No reviews yet"}
              </div>

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
          No horses have coordinates yet. Add a location on the horse listing to
          place pins.
        </div>
      ) : null}
    </div>
  );
}