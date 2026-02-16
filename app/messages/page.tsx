"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function MessagesPage() {
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log("Logged in user:", user);

    const { data, error } = await supabase
      .from("conversations")
      .select(`
        *,
        borrow_requests (
          *,
          horses (
            *
          )
        )
      `);

    console.log("Conversations RAW:", data);
    console.log("Error:", error);

    setRawData(data || []);
    setLoading(false);
  };

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Messages Debug</h1>

      <pre
        style={{
          background: "#111",
          color: "#0f0",
          padding: 20,
          borderRadius: 10,
          overflowX: "auto",
        }}
      >
        {JSON.stringify(rawData, null, 2)}
      </pre>
    </div>
  );
}
