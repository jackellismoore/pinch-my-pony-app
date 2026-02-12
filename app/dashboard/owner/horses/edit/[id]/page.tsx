"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function EditHorsePage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    breed: "",
    age: "",
    height_hh: "",
    temperament: "",
    location: "",
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

    if (data) {
      setForm({
        name: data.name || "",
        breed: data.breed || "",
        age: data.age?.toString() || "",
        height_hh: data.height_hh?.toString() || "",
        temperament: data.temperament || "",
        location: data.location || "",
        description: data.description || "",
        image_url: data.image_url || "",
      });
    }

    setLoading(false);
  };

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
        <input name="name" value={form.name} onChange={handleChange} required />
        <input name="breed" value={form.breed} onChange={handleChange} required />
        <input name="age" value={form.age} onChange={handleChange} type="number" required />
        <input name="height_hh" value={form.height_hh} onChange={handleChange} type="number" required />
        <input name="temperament" value={form.temperament} onChange={handleChange} required />
        <input name="location" value={form.location} onChange={handleChange} required />
        <input name="image_url" value={form.image_url} onChange={handleChange} />
        <textarea name="description" value={form.description} onChange={handleChange} />

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
