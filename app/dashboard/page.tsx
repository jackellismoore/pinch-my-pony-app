import { supabase } from "@/lib/supabaseClient";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "borrower") {
    redirect("/browse");
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>Owner Dashboard</h1>

      <p>Welcome! You are logged in as a horse owner.</p>

      <p style={{ marginTop: 16 }}>
        From here you’ll be able to:
      </p>

      <ul>
        <li>Add and manage your horses</li>
        <li>Review borrower requests</li>
        <li>Pause or activate listings</li>
      </ul>
    </main>
  );
}
