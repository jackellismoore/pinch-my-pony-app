"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Conversation = {
  id: string;
  request_id: string;
};

type RequestData = {
  id: string; // ← FIXED
  borrower_id: string;
  horse_id: string;
  horses: { name: string; owner_id: string }[];
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUserId(user.id);

    const { data, error } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        borrower_id,
        horse_id,
        horses(name, owner_id)
      `);

    if (error || !data) return;

    const filtered: Conversation[] = [];

    for (const request of data as RequestData[]) {
      const horseOwnerId = request.horses?.[0]?.owner_id;

      const isOwner = horseOwnerId === user.id;
      const isBorrower = request.borrower_id === user.id;

      if (!isOwner && !isBorrower) continue;

      filtered.push({
        id: request.id,
        request_id: request.id,
      });
    }

    setConversations(filtered);
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
            padding: 20,
            marginBottom: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
          Conversation ID: {conv.id}
        </div>
      ))}
    </div>
  );
}
