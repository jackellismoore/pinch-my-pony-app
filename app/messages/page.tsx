"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Conversation = {
  id: string;
  status: string;
  horses: { name: string }[];
  profiles: { full_name: string }[];
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) return;

    const { data } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        status,
        horses(name, owner_id),
        profiles!borrow_requests_borrower_id_fkey(full_name)
      `)
      .or(`borrower_id.eq.${userId},horses.owner_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (data) {
      setConversations(data as Conversation[]);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Messages</h1>

      {conversations.length === 0 && (
        <p>No conversations yet.</p>
      )}

      {conversations.map((conv) => (
        <div
          key={conv.id}
          style={{
            border: "1px solid #ddd",
            padding: 20,
            marginBottom: 15,
            borderRadius: 8,
            background: "#fff",
          }}
        >
          <h3>{conv.horses?.[0]?.name}</h3>

          <p>
            With:{" "}
            <strong>
              {conv.profiles?.[0]?.full_name || "User"}
            </strong>
          </p>

          <p>Status: {conv.status}</p>

          <Link href={`/messages/${conv.id}`}>
            <button style={{ marginTop: 8 }}>
              Open Chat
            </button>
          </Link>
        </div>
      ))}
    </div>
  );
}
