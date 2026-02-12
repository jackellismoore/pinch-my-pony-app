"use client";

import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

type Horse = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export default function Map({ horses }: { horses: Horse[] }) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <GoogleMap
      zoom={6}
      center={{ lat: 51.5, lng: -0.12 }}
      mapContainerStyle={{ width: "100%", height: "100%" }}
    >
      {horses.map(
        (horse) =>
          horse.lat &&
          horse.lng && (
            <Marker
              key={horse.id}
              position={{ lat: horse.lat, lng: horse.lng }}
              title={horse.name}
            />
          )
      )}
    </GoogleMap>
  );
}
