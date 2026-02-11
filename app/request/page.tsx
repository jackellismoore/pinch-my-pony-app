"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RequestPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const horseId = searchParams.get("horseId");

  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!horseId) {
      router.push("/browse");
    }
  }, [horseId, router]);

  const submitRequest = async () => {
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase.from("borrow_requests").insert({
      horse_id: horseId,
      borrower_id: user.id,
      message,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setMessage("");
    }
  };

  return (
    <main style={{ padding: 40, maxWidth: 500 }}>
      <h1>Request to Borrow</h1>

      <textarea
        placeholder="Write a short message to the owner..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ width: "100%", height: 120, marginBottom: 16 }}
      />

      <button onClick={submitRequest}>Send Request</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>Request sent!</p>}
    </main>
  );
}
