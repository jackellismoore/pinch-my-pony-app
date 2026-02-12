"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";

const libraries: any = ["places"];

export default function AddHorsePage() {
  const router = useRouter();
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  const [autocomplete, setAutocomplete] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    breed: "",
    age: "",
    height_hh: "",
    temperament: "",
    location: "",
    lat: 0,
    lng: 0,
    description: "",
    image_url: "",
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      const location = place.geometry.location;

      setForm({
        ...form,
        location: place.formatted_address,
        lat: location.lat(),
        lng: location.lng(),
      });
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("horses").insert([
      {
        ...form,
        age: Number(form.age),
        height_hh: Number(form.height_hh),
        owner_id: user.id,
        is_active: true,
      },
    ]);

    router.push("/dashboard/owner/horses");
  };

  if (!isLoaded) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1>Add Horse</h1>

      <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
        <input name="name" placeholder="Name" onChange={handleChange} required />
        <input name="breed" placeholder="Breed" onChange={handleChange} required />
        <input name="age" placeholder="Age" type="number" onChange={handleChange} required />
        <input name="height_hh" placeholder="Height (hh)" type="number" onChange={handleChange} required />
        <input name="temperament" placeholder="Temperament" onChange={handleChange} required />

        <Autocomplete
          onLoad={(auto) => setAutocomplete(auto)}
          onPlaceChanged={onPlaceChanged}
        >
          <input
            placeholder="Search Location"
            style={{ width: "100%", marginBottom: 10 }}
          />
        </Autocomplete>

        <input
          name="image_url"
          placeholder="Image URL"
          onChange={handleChange}
        />

        <textarea
          name="description"
          placeholder="Description"
          onChange={handleChange}
        />

        <button
          type="submit"
          style={{
            marginTop: 20,
            padding: "10px 16px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
          }}
        >
          Save Horse
        </button>
      </form>
    </div>
  );
}
