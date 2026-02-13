"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Conversation = {
  id: string;
  request_id: string;
  horse_name: string;
};

type RequestData = {
  id: string;
  status: string;
  borrower_id: string;
  horses: { name: string; owner_id: string }[];
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    loadApprovedRequests();
  }, []);

  const loadApprovedRequests = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        status,
        borrower_id,
        horses(name, owner_id)
      `)
      .eq("status", "approved");

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
        horse_name: request.horses?.[0]?.name || "Horse",
      });
    }

    setConversations(filtered);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Messages</h1>

      {conversations.length === 0 && (
        <p>No approved conversations yet.</p>
      )}

      {conversations.map((conv) => (
        <div
          key={conv.id}
          style={{
            padding: 20,
            marginBottom: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "white",
          }}
        >
          {conv.horse_name}
        </div>
      ))}
    </div>
  );
}
