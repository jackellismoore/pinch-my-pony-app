"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

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
      console.error(error);
      setLoading(false);
      return;
    }

    const filtered =
      (data || []).filter((conv: any) => {
        const request = conv.borrow_requests?.[0];
        if (!request) return false;

        const horse = request.horses?.[0];
        if (!horse) return false;

        const isOwner = horse.owner_id === user.id;
        const isBorrower = request.borrower_id === user.id;

        return isOwner || isBorrower;
      }) || [];

    setConversations(filtered as Conversation[]);
    setLoading(false);
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1>Messages</h1>

      {conversations.length === 0 && (
        <p>No conversations yet.</p>
      )}

      {conversations.map((conv) => {
        const request = conv.borrow_requests?.[0];
        const horse = request?.horses?.[0];

        return (
          <Link
            key={conv.id}
            href={`/messages/${conv.request_id}`}
            style={{
              display: "block",
              border: "1px solid #ddd",
              padding: 20,
              borderRadius: 8,
              marginBottom: 15,
              textDecoration: "none",
              color: "black",
            }}
          >
            <h3>{horse?.name || "Conversation"}</h3>
          </Link>
        );
      })}
    </div>
  );
}
