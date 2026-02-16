"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ConversationRow = {
  id: string;
  request_id: string;
  created_at: string;
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [debug, setDebug] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        setDebug({ authErr });
        return;
      }
      const userId = authData.user.id;

      // 1) requests where I'm borrower OR I'm the horse owner
      const { data: reqs, error: reqErr } = await supabase
        .from("borrow_requests")
        .select("id, horse:horses!inner(owner_id)")
        .or(`borrower_id.eq.${userId},horse.owner_id.eq.${userId}`);

      if (reqErr) {
        setDebug({ reqErr });
        return;
      }

      const requestIds = (reqs ?? []).map((r: any) => r.id);
      if (requestIds.length === 0) {
        setConversations([]);
        setDebug({ userId, requestIds, note: "No matching requests" });
        return;
      }

      // 2) conversations for those requests
      const { data: convs, error: convErr } = await supabase
        .from("conversations")
        .select("id, request_id, created_at")
        .in("request_id", requestIds)
        .order("created_at", { ascending: false });

      setDebug({ userId, requestIds, convErr, convs });
      if (!convErr) setConversations(convs ?? []);
    };

    load();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Messages</h1>

      <pre style={{ background: "#111", color: "#0f0", padding: 16, borderRadius: 10 }}>
        {JSON.stringify(debug, null, 2)}
      </pre>

      {conversations.map((c) => (
        <div key={c.id} style={{ marginTop: 12 }}>
          <Link href={`/messages/${c.request_id}`}>Open Conversation</Link>
        </div>
      ))}
    </div>
  );
}
