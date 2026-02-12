"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
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
  image_url: string;
};

export default function AddHorsePage() {
  const router = useRouter();
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries,
  });

  const [loading, setLoading] = useState(false);

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
    image_url: "",
  });

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();

    if (!place || !place.geometry || !place.geometry.location) {
      alert("Please select a valid location from the dropdown.");
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    setForm((prev) => ({
      ...prev,
      location: place.formatted_address ?? "",
      lat: lat ?? null,
      lng: lng ?? null,
    }));
  };

  const handleImageUpload = async (file: File) => {
    const fileName = `${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("horse-images")
      .upload(fileName, file);

    if (error) {
      alert("Image upload failed");
      return;
    }

    const { data } = supabase.storage
      .from("horse-images")
      .getPublicUrl(fileName);

    setForm((prev) => ({
      ...prev,
      image_url: data.publicUrl,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.lat === null || form.lng === null) {
      alert("Please select a valid location.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Not logged in");
      setLoading(false);
      return;
    }

    await supabase.from("horses").insert({
      owner_id: user.id,
      name: form.name,
      breed: form.breed,
      age: Number(form.age),
      height_hh: Number(form.height_hh),
      temperament: form.temperament,
      description: form.description,
      location: form.location,
      lat: form.lat,
      lng: form.lng,
      image_url: form.image_url,
      is_active: true,
    });

    router.push("/dashboard/owner/horses");
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
          required
          placeholder="Horse Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          required
          placeholder="Breed"
          value={form.breed}
          onChange={(e) => setForm({ ...form, breed: e.target.value })}
        />

        <input
          required
          type="number"
          placeholder="Age"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
        />

        <input
          required
          type="number"
          placeholder="Height (hh)"
          value={form.height_hh}
          onChange={(e) =>
            setForm({ ...form, height_hh: e.target.value })
          }
        />

        <input
          required
          placeholder="Temperament"
          value={form.temperament}
          onChange={(e) =>
            setForm({ ...form, temperament: e.target.value })
          }
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
            required
            placeholder="Search Location"
            value={form.location}
            onChange={(e) =>
              setForm({ ...form, location: e.target.value })
            }
          />
        </Autocomplete>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files) {
              handleImageUpload(e.target.files[0]);
            }
          }}
        />

        {form.image_url && (
          <img
            src={form.image_url}
            style={{ width: "100%", borderRadius: 8 }}
          />
        )}

        <button
          disabled={loading}
          style={{
            padding: "10px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6,
          }}
        >
          {loading ? "Saving..." : "Add Horse"}
        </button>
      </form>
    </div>
  );
}
