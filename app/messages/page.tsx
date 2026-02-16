"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Conversation = {
  id: string;
  request_id: string;
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [debug, setDebug] = useState<any>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*");

    if (error) {
      console.error(error);
      return;
    }

    setDebug(data);
    setConversations(data || []);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Messages Debug</h1>

      <div
        style={{
          background: "#000",
          color: "#00ff00",
          padding: 20,
          borderRadius: 10,
          marginBottom: 30,
          fontFamily: "monospace",
          fontSize: 14,
        }}
      >
        {JSON.stringify(debug, null, 2)}
      </div>

      {conversations.map((conv) => (
        <div
          key={conv.id}
          style={{
            border: "1px solid #ddd",
            padding: 15,
            borderRadius: 8,
            marginBottom: 15,
          }}
        >
          <Link href={`/messages/${conv.request_id}`}>
            Open Conversation
          </Link>
        </div>
      ))}
    </div>
  );
}
