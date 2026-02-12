"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";

const libraries: ("places")[] = ["places"];

export default function AddHorsePage() {
  const router = useRouter();
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries,
  });

  const [form, setForm] = useState({
    name: "",
    breed: "",
    age: "",
    height_hh: "",
    temperament: "",
    description: "",
    location: "",
    lat: null as number | null,
    lng: null as number | null,
  });

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();

    if (!place?.geometry) return;

    const lat = place.geometry.location?.lat();
    const lng = place.geometry.location?.lng();

    setForm((prev) => ({
      ...prev,
      location: place.formatted_address || "",
      lat,
      lng,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Not logged in");
      return;
    }

    if (!form.lat || !form.lng) {
      alert("Please select a location from suggestions.");
      return;
    }

    const { error } = await supabase.from("horses").insert({
      name: form.name,
      breed: form.breed,
      age: Number(form.age),
      height_hh: Number(form.height_hh),
      temperament: form.temperament,
      description: form.description,
      location: form.location,
      lat: form.lat,
      lng: form.lng,
      owner_id: user.id,
      is_active: true,
    });

    if (error) {
      console.error(error);
      alert("Error adding horse.");
    } else {
      router.push("/dashboard/owner/horses");
    }
  };

  if (!isLoaded) {
    return <div style={{ padding: 40 }}>Loading Google Maps...</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Add Horse</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: 500,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <input
          placeholder="Horse Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <input
          placeholder="Breed"
          value={form.breed}
          onChange={(e) => setForm({ ...form, breed: e.target.value })}
          required
        />

        <input
          type="number"
          placeholder="Age"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
          required
        />

        <input
          type="number"
          placeholder="Height (hh)"
          value={form.height_hh}
          onChange={(e) =>
            setForm({ ...form, height_hh: e.target.value })
          }
          required
        />

        <input
          placeholder="Temperament"
          value={form.temperament}
          onChange={(e) =>
            setForm({ ...form, temperament: e.target.value })
          }
          required
        />

        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
        />

        <Autocomplete
          onLoad={(auto) => (autocompleteRef.current = auto)}
          onPlaceChanged={handlePlaceChanged}
        >
          <input
            placeholder="Search Location"
            value={form.location}
            onChange={(e) =>
              setForm({ ...form, location: e.target.value })
            }
            required
          />
        </Autocomplete>

        <button
          type="submit"
          style={{
            marginTop: 10,
            padding: "10px 18px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Add Horse
        </button>
      </form>
    </div>
  );
}
