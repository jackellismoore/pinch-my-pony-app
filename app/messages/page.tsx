"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Conversation = {
  id: string;
  request_id: string;
  borrow_requests: {
    borrower_id: string;
    horses: {
      name: string;
      owner_id: string;
    }[];
  }[];
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("conversations")
      .select(`
        id,
        request_id,
        borrow_requests (
          borrower_id,
          horses (
            name,
            owner_id
          )
        )
      `);

    if (error) {
      console.error("Conversation load error:", error);
      setLoading(false);
      return;
    }

    if (!data) {
      setLoading(false);
      return;
    }

    const filtered: Conversation[] = [];

    for (const convo of data as Conversation[]) {
      const request = convo.borrow_requests?.[0];
      if (!request) continue;

      const horse = request.horses?.[0];
      if (!horse) continue;

      const isOwner = horse.owner_id === user.id;
      const isBorrower = request.borrower_id === user.id;

      if (isOwner || isBorrower) {
        filtered.push(convo);
      }
    }

    setConversations(filtered);
    setLoading(false);
  };

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, marginBottom: 30 }}>Messages</h1>

      {conversations.length === 0 && (
        <p>No conversations yet.</p>
      )}

      {conversations.map((convo) => {
        const horseName =
          convo.borrow_requests?.[0]?.horses?.[0]?.name || "Conversation";

        return (
          <Link
            key={convo.id}
            href={`/messages/${convo.request_id}`}
            style={{
              display: "block",
              padding: 20,
              marginBottom: 15,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              textDecoration: "none",
              color: "black",
              background: "white",
            }}
          >
            <h3 style={{ margin: 0 }}>{horseName}</h3>
          </Link>
        );
      })}
    </div>
  );
}
