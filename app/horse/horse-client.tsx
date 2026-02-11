"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HorseClient() {
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [locationName, setLocationName] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLatitude(lat);
        setLongitude(lng);

        // Reverse geocode (OpenStreetMap)
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        );

        const data = await res.json();

        const place =
          data.address.city ||
          data.address.town ||
          data.address.village ||
          data.display_name;

        setLocationName(place);
      },
      () => {
        alert("Location permission denied.");
      }
    );
  };

  const handleSubmit = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("horses").insert({
      name,
      breed,
      description,
      image_url: imageUrl,
      owner_id: user.id,
      location_name: locationName,
      latitude,
      longitude,
    });

    setLoading(false);

    if (error) {
      alert("Error adding horse.");
    } else {
      alert("Horse added successfully!");
      setName("");
      setBreed("");
      setDescription("");
      setImageUrl("");
      setLocationName("");
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 20 }}>Add a Horse</h1>

      <input
        placeholder="Horse name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%" }}
      />

      <input
        placeholder="Breed"
        value={breed}
        onChange={(e) => setBreed(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%" }}
      />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%" }}
      />

      <input
        placeholder="Image URL"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%" }}
      />

      <button
        onClick={getLocation}
        style={{
          marginBottom: 10,
          padding: "8px 12px",
          borderRadius: 6,
          border: "1px solid #ddd",
        }}
      >
        📍 Use My Current Location
      </button>

      {locationName && (
        <p style={{ marginBottom: 20 }}>
          Location: <strong>{locationName}</strong>
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          padding: "10px 16px",
          borderRadius: 6,
          background: "#2563eb",
          color: "white",
          border: "none",
          width: "100%",
        }}
      >
        {loading ? "Adding..." : "Add Horse"}
      </button>
    </div>
  );
}
