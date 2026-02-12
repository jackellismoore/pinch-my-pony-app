"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";

const libraries: any = ["places"];

export default function EditHorsePage() {
  const { id } = useParams();
  const router = useRouter();
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  const [autocomplete, setAutocomplete] = useState<any>(null);

  const [form, setForm] = useState<any>({
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

  useEffect(() => {
    loadHorse();
  }, []);

  const loadHorse = async () => {
    const { data } = await supabase
      .from("horses")
      .select("*")
      .eq("id", id)
      .single();

    if (data) setForm(data);
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

    await supabase
      .from("horses")
      .update({
        ...form,
        age: Number(form.age),
        height_hh: Number(form.height_hh),
      })
      .eq("id", id);

    router.push("/dashboard/owner/horses");
  };

  if (!isLoaded) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1>Edit Horse</h1>

      <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
        <input name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input name="breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
        <input name="age" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
        <input name="height_hh" type="number" value={form.height_hh} onChange={(e) => setForm({ ...form, height_hh: e.target.value })} />
        <input name="temperament" value={form.temperament} onChange={(e) => setForm({ ...form, temperament: e.target.value })} />

        <Autocomplete
          onLoad={(auto) => setAutocomplete(auto)}
          onPlaceChanged={onPlaceChanged}
        >
          <input value={form.location} placeholder="Search Location" />
        </Autocomplete>

        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

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
          Update Horse
        </button>
      </form>
    </div>
  );
}
