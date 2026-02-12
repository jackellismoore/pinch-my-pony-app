"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";

const libraries: ("places")[] = ["places"];

export default function EditHorsePage() {
  const { id } = useParams();
  const router = useRouter();
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries,
  });

  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    loadHorse();
  }, []);

  const loadHorse = async () => {
    const { data } = await supabase
      .from("horses")
      .select("*")
      .eq("id", id)
      .single();

    setForm(data);
  };

  const handleImageUpload = async (file: File) => {
    const fileName = `${Date.now()}-${file.name}`;

    await supabase.storage
      .from("horse-images")
      .upload(fileName, file);

    const { data } = supabase.storage
      .from("horse-images")
      .getPublicUrl(fileName);

    setForm({ ...form, image_url: data.publicUrl });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await supabase
      .from("horses")
      .update(form)
      .eq("id", id);

    router.push("/dashboard/owner/horses");
  };

  if (!isLoaded || !form)
    return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1>Edit Horse</h1>

      <form onSubmit={handleSubmit}
        style={{ maxWidth: 500, display: "flex", flexDirection: "column", gap: 10 }}
      >
        <input value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <Autocomplete
          onLoad={(auto) => (autocompleteRef.current = auto)}
          onPlaceChanged={() => {
            const place = autocompleteRef.current?.getPlace();
            if (!place?.geometry) return;

            setForm({
              ...form,
              location: place.formatted_address,
              lat: place.geometry.location?.lat(),
              lng: place.geometry.location?.lng(),
            });
          }}
        >
          <input value={form.location} />
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
          <img src={form.image_url}
            style={{ width: "100%", borderRadius: 8 }}
          />
        )}

        <button
          style={{
            padding: "10px",
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
