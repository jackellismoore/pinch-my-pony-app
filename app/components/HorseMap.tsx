"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Horse = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  image_url: string;
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
  const center = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [51.505, -0.09];

  const defaultIcon = new L.Icon({
    iconUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  const highlightedIcon = new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  return (
    <MapContainer
      center={center as any}
      zoom={7}
      style={{ height: "600px", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MarkerClusterGroup>
        {horses.map((horse) =>
          horse.lat && horse.lng ? (
            <Marker
              key={horse.id}
              position={[horse.lat, horse.lng]}
              icon={
                highlightedId === horse.id
                  ? highlightedIcon
                  : defaultIcon
              }
            >
              <Popup>
                <strong>{horse.name}</strong>
                {horse.distance && (
                  <div>{horse.distance.toFixed(1)} miles away</div>
                )}
              </Popup>
            </Marker>
          ) : null
        )}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
