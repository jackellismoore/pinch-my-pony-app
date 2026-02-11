"use client";

import {
  GoogleMap,
  Marker,
  InfoWindow,
  useLoadScript,
} from "@react-google-maps/api";
import { useState, useMemo } from "react";

type Horse = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance?: number;
};

export default function HorseMap({
  horses,
  userLocation,
  highlightedId,
}: {
  horses: Horse[];
  userLocation: { lat: number; lng: number } | null;
  highlightedId: string | null;
}) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [selected, setSelected] = useState<string | null>(null);

  const center = useMemo(() => {
    if (userLocation) return userLocation;
    return { lat: 51.505, lng: -0.09 };
  }, [userLocation]);

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <GoogleMap
      zoom={7}
      center={center}
      mapContainerStyle={{ width: "100%", height: "600px" }}
    >
      {horses.map((horse) =>
        horse.lat && horse.lng ? (
          <Marker
            key={horse.id}
            position={{ lat: horse.lat, lng: horse.lng }}
            onClick={() => setSelected(horse.id)}
            icon={
              highlightedId === horse.id
                ? "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                : undefined
            }
          />
        ) : null
      )}

      {selected && (
        <InfoWindow
          position={{
            lat: horses.find((h) => h.id === selected)!.lat,
            lng: horses.find((h) => h.id === selected)!.lng,
          }}
          onCloseClick={() => setSelected(null)}
        >
          <div>
            <strong>
              {horses.find((h) => h.id === selected)!.name}
            </strong>
            {horses.find((h) => h.id === selected)!.distance && (
              <div>
                {horses
                  .find((h) => h.id === selected)!
                  .distance!.toFixed(1)}{" "}
                miles away
              </div>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
