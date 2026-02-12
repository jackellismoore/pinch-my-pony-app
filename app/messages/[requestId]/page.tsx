"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Conversation = {
  id: string;
  horses: { name: string }[];
  status: string;
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        status,
        horses(name, owner_id),
        borrower_id
      `)
      .or(`borrower_id.eq.${user.id},horses.owner_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    setConversations((data as Conversation[]) || []);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Messages</h1>

      {conversations.length === 0 && <p>No conversations yet.</p>}

      {conversations.map((conv) => (
        <div
          key={conv.id}
          style={{
            border: "1px solid #ddd",
            padding: 20,
            marginBottom: 20,
            borderRadius: 8,
            background: "#fff",
          }}
        >
          <h3>{conv.horses?.[0]?.name}</h3>
          <p>Status: {conv.status}</p>

          <Link href={`/messages/${conv.id}`}>
            <button
              style={{
                marginTop: 10,
                padding: "8px 14px",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 6,
              }}
            >
              Open Conversation
            </button>
          </Link>
        </div>
      ))}
    </div>
  );
}
