"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  GoogleMap,
  LoadScript,
  Autocomplete,
} from "@react-google-maps/api";

const libraries: ("places")[] = ["places"];

export default function AddHorsePage() {
  const router = useRouter();
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

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

    setForm({
      ...form,
      location: place.formatted_address || "",
      lat: lat || null,
      lng: lng || null,
    });
  };

  const handleSubmit = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return alert("Not logged in");

    const { error } = await supabase.from("horses").insert({
      ...form,
      age: Number(form.age),
      height_hh: Number(form.height_hh),
      owner_id: user.id,
      is_active: true,
    });

    if (error) {
      console.error(error);
      alert("Error adding horse");
    } else {
      router.push("/dashboard/owner/horses");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Add Horse</h1>

      <div style={{ maxWidth: 500 }}>
        <input
          placeholder="Horse Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          placeholder="Breed"
          value={form.breed}
          onChange={(e) => setForm({ ...form, breed: e.target.value })}
        />

        <input
          placeholder="Age"
          type="number"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
        />

        <input
          placeholder="Height (hh)"
          type="number"
          value={form.height_hh}
          onChange={(e) =>
            setForm({ ...form, height_hh: e.target.value })
          }
        />

        <input
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

        <LoadScript
          googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
          libraries={libraries}
        >
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
              style={{ width: "100%", marginTop: 10 }}
            />
          </Autocomplete>
        </LoadScript>

        <button
          onClick={handleSubmit}
          style={{
            marginTop: 20,
            padding: "10px 18px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6,
          }}
        >
          Add Horse
        </button>
      </div>
    </div>
  );
}
