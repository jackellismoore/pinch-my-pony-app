"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";

const libraries: ("places")[] = ["places"];

type HorseForm = {
  name: string;
  breed: string;
  age: string;
  height_hh: string;
  temperament: string;
  description: string;
  location: string;
  lat: number | null;
  lng: number | null;
};

export default function EditHorsePage() {
  const { id } = useParams();
  const router = useRouter();
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries,
  });

  const [form, setForm] = useState<HorseForm>({
    name: "",
    breed: "",
    age: "",
    height_hh: "",
    temperament: "",
    description: "",
    location: "",
    lat: null,
    lng: null,
  });

  useEffect(() => {
    if (id) loadHorse();
  }, [id]);

  const loadHorse = async () => {
    const { data } = await supabase
      .from("horses")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setForm({
        name: data.name || "",
        breed: data.breed || "",
        age: String(data.age || ""),
        height_hh: String(data.height_hh || ""),
        temperament: data.temperament || "",
        description: data.description || "",
        location: data.location || "",
        lat: data.lat ?? null,
        lng: data.lng ?? null,
      });
    }
  };

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry) return;

    const lat = place.geometry.location?.lat();
    const lng = place.geometry.location?.lng();

    setForm((prev) => ({
      ...prev,
      location: place.formatted_address ?? "",
      lat: lat ?? null,
      lng: lng ?? null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.lat === null || form.lng === null) {
      alert("Please select a valid location from suggestions.");
      return;
    }

    await supabase
      .from("horses")
      .update({
        name: form.name,
        breed: form.breed,
        age: Number(form.age),
        height_hh: Number(form.height_hh),
        temperament: form.temperament,
        description: form.description,
        location: form.location,
        lat: form.lat,
        lng: form.lng,
      })
      .eq("id", id);

    router.push("/dashboard/owner/horses");
  };

  if (!isLoaded) {
    return <div style={{ padding: 40 }}>Loading Google Maps...</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Edit Horse</h1>

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
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <input
          value={form.breed}
          onChange={(e) => setForm({ ...form, breed: e.target.value })}
          required
        />

        <input
          type="number"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
          required
        />

        <input
          type="number"
          value={form.height_hh}
          onChange={(e) =>
            setForm({ ...form, height_hh: e.target.value })
          }
          required
        />

        <input
          value={form.temperament}
          onChange={(e) =>
            setForm({ ...form, temperament: e.target.value })
          }
          required
        />

        <textarea
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
            value={form.location}
            placeholder="Search Location"
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
          Update Horse
        </button>
      </form>
    </div>
  );
}
