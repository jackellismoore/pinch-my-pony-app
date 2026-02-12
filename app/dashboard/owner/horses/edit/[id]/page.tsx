"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function EditHorsePage() {
  const { id } = useParams();
  const router = useRouter();

  const [form, setForm] = useState<any>({
    name: "",
    breed: "",
    age: "",
    height_hh: "",
    temperament: "",
    location: "",
    description: "",
    image_url: "",
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availability, setAvailability] = useState<string[]>([]);

  useEffect(() => {
    loadHorse();
    loadAvailability();
  }, []);

  const loadHorse = async () => {
    const { data } = await supabase
      .from("horses")
      .select("*")
      .eq("id", id)
      .single();

    if (data) setForm(data);
  };

  const loadAvailability = async () => {
    const { data } = await supabase
      .from("horse_availability")
      .select("*")
      .eq("horse_id", id);

    if (data) {
      setAvailability(data.map((d: any) => d.available_date));
    }
  };

  const addDate = async () => {
    if (!selectedDate) return;

    await supabase.from("horse_availability").insert([
      {
        horse_id: id,
        available_date: selectedDate.toISOString().split("T")[0],
        is_available: true,
      },
    ]);

    loadAvailability();
  };

  const removeDate = async (date: string) => {
    await supabase
      .from("horse_availability")
      .delete()
      .eq("horse_id", id)
      .eq("available_date", date);

    loadAvailability();
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

  return (
    <div style={{ padding: 40 }}>
      <h1>Edit Horse</h1>

      <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
        <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
        <input type="number" value={form.height_hh} onChange={(e) => setForm({ ...form, height_hh: e.target.value })} />
        <input value={form.temperament} onChange={(e) => setForm({ ...form, temperament: e.target.value })} />
        <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

        <button type="submit" style={saveButton}>
          Update Horse
        </button>
      </form>

      <div style={{ marginTop: 40 }}>
        <h2>Availability</h2>

        <DatePicker
          selected={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          minDate={new Date()}
        />

        <button onClick={addDate} style={addButton}>
          Add Available Date
        </button>

        <ul style={{ marginTop: 20 }}>
          {availability.map((date) => (
            <li key={date} style={{ marginBottom: 8 }}>
              {date}
              <button
                onClick={() => removeDate(date)}
                style={removeButton}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const saveButton = {
  marginTop: 20,
  padding: "10px 16px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 8,
};

const addButton = {
  marginLeft: 10,
  padding: "6px 12px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 6,
};

const removeButton = {
  marginLeft: 10,
  padding: "4px 8px",
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: 6,
};
