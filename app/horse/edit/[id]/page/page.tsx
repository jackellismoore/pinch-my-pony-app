"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { LoadScript, Autocomplete } from "@react-google-maps/api";

const libraries: ("places")[] = ["places"];

export default function EditHorsePage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [autocomplete, setAutocomplete] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    breed: "",
    age: "",
    height_hh: "",
    temperament: "",
    location: "",
    description: "",
    image_url: "",
    lat: null as number | null,
    lng: null as number | null,
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

    if (data) {
      setForm({
        ...data,
        age: data.age?.toString() || "",
        height_hh: data.height_hh?.toString() || "",
      });
    }

    setLoading(false);
  };

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onPlaceChanged = () => {
    if (!autocomplete) return;

    const place = autocomplete.getPlace();
    if (!place.geometry) return;

    setForm({
      ...form,
      location: place.formatted_address,
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    });
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

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1>Edit Horse</h1>

      <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>

        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Horse Name"
          required
        />

        <input
          name="breed"
          value={form.breed}
          onChange={handleChange}
          placeholder="Breed"
          required
        />

        <input
          name="age"
          value={form.age}
          onChange={handleChange}
          placeholder="Age"
          type="number"
          required
        />

        <input
          name="height_hh"
          value={form.height_hh}
          onChange={handleChange}
          placeholder="Height (hh)"
          type="number"
          required
        />

        <input
          name="temperament"
          value={form.temperament}
          onChange={handleChange}
          placeholder="Temperament"
          required
        />

        <LoadScript
          googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
          libraries={libraries}
        >
          <Autocomplete
            onLoad={(auto) => setAutocomplete(auto)}
            onPlaceChanged={onPlaceChanged}
          >
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Search Location"
              required
            />
          </Autocomplete>
        </LoadScript>

        <input
          name="image_url"
          value={form.image_url}
          onChange={handleChange}
          placeholder="Image URL"
        />

        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Description"
        />

        <button
          type="submit"
          style={{
            marginTop: 20,
            padding: "8px 14px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6,
          }}
        >
          Update Horse
        </button>
      </form>
    </div>
  );
}
