import { supabase } from "../lib/supabaseClient";
import Link from "next/link";

export default async function BrowsePage() {
  const { data: horses, error } = await supabase
    .from("horses")
    .select("id, name, description, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Browse Horses</h1>
        <p>Error loading horses.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h1>Browse Horses 🐎</h1>

      {horses.length === 0 && <p>No horses yet.</p>}

      <ul style={{ marginTop: 24 }}>
        {horses.map((horse) => (
          <li
            key={horse.id}
            style={{
              border: "1px solid #eee",
              padding: 16,
              marginBottom: 16,
              borderRadius: 6,
            }}
          >
            <h2>{horse.name}</h2>
            <p>{horse.description}</p>

            <Link href={`/horse?id=${horse.id}`}>
              View horse
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
