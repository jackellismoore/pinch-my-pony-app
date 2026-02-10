import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default async function BrowsePage() {
  const { data: horses } = await supabase
    .from("horses")
    .select("*")
    .eq("active", true);

  return (
    <main style={{ padding: 32 }}>
      <h1>Browse Horses 🐎</h1>

      {!horses || horses.length === 0 ? (
        <p>No horses available yet.</p>
      ) : (
        <ul style={{ marginTop: 24 }}>
          {horses.map((horse) => (
            <li key={horse.id} style={{ marginBottom: 16 }}>
              <strong>{horse.name}</strong> — {horse.location}
              <br />
              <Link href={`/horse?id=${horse.id}`}>
                View horse
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
