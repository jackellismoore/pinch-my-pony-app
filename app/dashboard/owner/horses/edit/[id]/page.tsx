"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { LoadScript, Autocomplete } from "@react-google-maps/api";

const libraries: ("places")[] = ["places"];

export default function EditHorsePage() {
  const { id } = useParams();
  const router = useRouter();
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (id) loadHorse();
  }, [id]);

  const loadHorse = async () => {
    const { data } = await supabase
      .from("horses")
      .select("*")
      .eq("id", id)
      .single();

    if (data) setForm(data);
  };

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();

    if (!place?.geometry) return;

    const lat = place.geometry.location?.lat();
    const lng = place.geometry.location?.lng();

    setForm((prev: any) => ({
      ...prev,
      location: place.formatted_address,
      lat,
      lng,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

  if (!form) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1>Edit Horse</h1>

      <form
        onSubmit={handleSubmit}
        style={{ maxWidth: 500, display: "flex", flexDirection: "column", gap: 10 }}
      >
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          value={form.breed}
          onChange={(e) => setForm({ ...form, breed: e.target.value })}
        />

        <input
          type="number"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
        />

        <input
          type="number"
          value={form.height_hh}
          onChange={(e) =>
            setForm({ ...form, height_hh: e.target.value })
          }
        />

        <input
          value={form.temperament}
          onChange={(e) =>
            setForm({ ...form, temperament: e.target.value })
          }
        />

        <textarea
          value={form.description}
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
        />

        <LoadScript
          googleMapsApiKey={
            process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string
          }
          libraries={libraries}
        >
          <Autocomplete
            onLoad={(auto) => (autocompleteRef.current = auto)}
            onPlaceChanged={handlePlaceChanged}
          >
            <input
              value={form.location || ""}
              placeholder="Search Location"
              onChange={(e) =>
                setForm({ ...form, location: e.target.value })
              }
            />
          </Autocomplete>
        </LoadScript>

        <button
          type="submit"
          style={{
            marginTop: 10,
            padding: "10px 18px",
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
