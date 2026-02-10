import { supabase } from "@/lib/supabaseClient";

export default async function HorsePage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  if (!searchParams.id) {
    return <p>Horse not found.</p>;
  }

  const { data: horse } = await supabase
    .from("horses")
    .select("*")
    .eq("id", searchParams.id)
    .single();

  if (!horse) {
    return <p>Horse not found.</p>;
  }

  return (
    <main style={{ padding: 32, maxWidth: 600 }}>
      <h1>{horse.name} 🐴</h1>
      <p><strong>Location:</strong> {horse.location}</p>
      <p><strong>Temperament:</strong> {horse.temperament}</p>
      <p>{horse.description}</p>
    </main>
  );
}
