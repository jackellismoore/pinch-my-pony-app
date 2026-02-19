"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

export type MapHorse = {
  id: string;
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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Lightweight “no API key” map:
 * - If horses have lat/lng → place pins in a normalized box.
 * - Clicking a pin/card routes to /horse/[id] (fixes your wrong routing).
 * - Keeps your current BrowsePage call signature so the red TS error goes away.
 */
export default function HorseMap({ horses, userLocation = null, highlightedId = null }: Props) {
  const router = useRouter();

  const points = useMemo(() => {
    const withCoords = horses
      .map((h) => ({
        ...h,
        lat: typeof h.lat === "number" ? h.lat : null,
        lng: typeof h.lng === "number" ? h.lng : null,
      }))
      .filter((h) => h.lat != null && h.lng != null) as Array<MapHorse & { lat: number; lng: number }>;

    if (!withCoords.length) return { withCoords: [], bounds: null as null | { minLat: number; maxLat: number; minLng: number; maxLng: number } };

    let minLat = withCoords[0].lat!;
    let maxLat = withCoords[0].lat!;
    let minLng = withCoords[0].lng!;
    let maxLng = withCoords[0].lng!;

    for (const p of withCoords) {
      minLat = Math.min(minLat, p.lat!);
      maxLat = Math.max(maxLat, p.lat!);
      minLng = Math.min(minLng, p.lng!);
      maxLng = Math.max(maxLng, p.lng!);
    }

    // pad bounds so pins aren’t glued to edges
    const padLat = Math.max(0.01, (maxLat - minLat) * 0.15);
    const padLng = Math.max(0.01, (maxLng - minLng) * 0.15);

    return {
      withCoords,
      bounds: {
        minLat: minLat - padLat,
        maxLat: maxLat + padLat,
        minLng: minLng - padLng,
        maxLng: maxLng + padLng,
      },
    };
  }, [horses]);

  const openHorse = (id: string) => {
    // ✅ This is the important routing fix:
    router.push(`/horse/${id}`);
  };

  const hasCoords = points.withCoords.length > 0;

  return (
    <div
      style={{
        border: "1px solid rgba(15,23,42,0.10)",
        borderRadius: 18,
        background: "white",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: 14, fontWeight: 950, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>Map</div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>
          Click a pin (or card) to view the horse
        </div>
      </div>

      {/* Map surface */}
      <div
        style={{
          position: "relative",
          height: 360,
          background:
            "radial-gradient(900px 600px at 15% 15%, rgba(59,130,246,0.10), transparent 60%), radial-gradient(700px 500px at 90% 20%, rgba(14,165,233,0.08), transparent 60%), linear-gradient(180deg, rgba(15,23,42,0.03), rgba(15,23,42,0.02))",
          borderTop: "1px solid rgba(15,23,42,0.08)",
          borderBottom: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        {!hasCoords ? (
          <div style={{ padding: 14, fontSize: 13, opacity: 0.7 }}>
            No horses with latitude/longitude yet. Add lat/lng (or later we can geocode from location).
          </div>
        ) : (
          <>
            {/* Optional: user location dot */}
            {userLocation && points.bounds ? (
              (() => {
                const { minLat, maxLat, minLng, maxLng } = points.bounds!;
                const x = ((userLocation.lng - minLng) / (maxLng - minLng)) * 100;
                const y = (1 - (userLocation.lat - minLat) / (maxLat - minLat)) * 100;
                const cx = clamp(x, 2, 98);
                const cy = clamp(y, 2, 98);
                return (
                  <div
                    title="You"
                    style={{
                      position: "absolute",
                      left: `${cx}%`,
                      top: `${cy}%`,
                      transform: "translate(-50%,-50%)",
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: "#2563eb",
                      boxShadow: "0 0 0 6px rgba(37,99,235,0.18)",
                    }}
                  />
                );
              })()
            ) : null}

            {/* Horse pins */}
            {points.bounds
              ? points.withCoords.map((h) => {
                  const { minLat, maxLat, minLng, maxLng } = points.bounds!;
                  const x = ((h.lng - minLng) / (maxLng - minLng)) * 100;
                  const y = (1 - (h.lat - minLat) / (maxLat - minLat)) * 100;

                  const px = clamp(x, 3, 97);
                  const py = clamp(y, 3, 97);

                  const active = highlightedId && h.id === highlightedId;

                  return (
                    <button
                      key={h.id}
                      onClick={() => openHorse(h.id)}
                      title={h.name ?? "Horse"}
                      style={{
                        position: "absolute",
                        left: `${px}%`,
                        top: `${py}%`,
                        transform: "translate(-50%,-50%)",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      <div
                        style={{
                          width: active ? 18 : 14,
                          height: active ? 18 : 14,
                          borderRadius: 999,
                          background: "black",
                          boxShadow: active ? "0 0 0 8px rgba(0,0,0,0.12)" : "0 0 0 6px rgba(0,0,0,0.10)",
                          border: "2px solid white",
                        }}
                      />
                    </button>
                  );
                })
              : null}
          </>
        )}
      </div>

      {/* Quick list under the map */}
      <div style={{ padding: 14, display: "grid", gap: 10 }}>
        {horses.length === 0 ? (
          <div style={{ fontSize: 13, opacity: 0.7 }}>No horses to show.</div>
        ) : (
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {horses.map((h) => (
              <button
                key={h.id}
                onClick={() => openHorse(h.id)}
                style={{
                  textAlign: "left",
                  border: "1px solid rgba(15,23,42,0.10)",
                  borderRadius: 14,
                  background: "white",
                  padding: 10,
                  cursor: "pointer",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "rgba(15,23,42,0.06)",
                      overflow: "hidden",
                      flex: "0 0 auto",
                    }}
                  >
                    {h.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={h.image_url} alt={h.name ?? "Horse"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : null}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 950, lineHeight: 1.2 }}>{h.name ?? "Horse"}</div>
                    <div style={{ fontSize: 12, opacity: 0.7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {h.location ?? "No location"}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {typeof h.lat === "number" && typeof h.lng === "number" ? (
                    <span>
                      {h.lat.toFixed(4)}, {h.lng.toFixed(4)}
                    </span>
                  ) : (
                    <span>No coordinates</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
