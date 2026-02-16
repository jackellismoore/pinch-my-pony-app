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
      // 0) Auth
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        setDebug({ step: "auth", authErr });
        return;
      }
      const userId = authData.user.id;

      // 1) Find borrow_requests where:
      // - I'm the borrower, OR
      // - I'm the owner of the horse on that request
      //
      // IMPORTANT: Use "horses" relationship name in the OR filter (not an alias),
      // and use !inner to allow filtering across the join.
      const { data: reqs, error: reqErr } = await supabase
        .from("borrow_requests")
        .select("id, borrower_id, horse_id, horses!inner(owner_id)")
        .or(`borrower_id.eq.${userId},horses.owner_id.eq.${userId}`);

      if (reqErr) {
        setDebug({ step: "borrow_requests", userId, reqErr });
        return;
      }

      const requestIds = (reqs ?? []).map((r: any) => r.id);

      if (requestIds.length === 0) {
        setConversations([]);
        setDebug({
          step: "borrow_requests",
          userId,
          requestIds,
          note: "No borrow_requests matched this user as borrower or owner.",
          reqs,
        });
        return;
      }

      // 2) Fetch conversations for those request_ids
      const { data: convs, error: convErr } = await supabase
        .from("conversations")
        .select("id, request_id, created_at")
        .in("request_id", requestIds)
        .order("created_at", { ascending: false });

      if (convErr) {
        setDebug({ step: "conversations", userId, requestIds, convErr });
        return;
      }

      setConversations(convs ?? []);
      setDebug({
        step: "done",
        userId,
        requestIds,
        borrow_requests_count: reqs?.length ?? 0,
        conversations_count: convs?.length ?? 0,
        reqs,
        convs,
      });
    };

    load();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Messages</h1>

      <div
        style={{
          background: "#111",
          color: "#0f0",
          padding: 16,
          borderRadius: 10,
          fontFamily: "monospace",
          fontSize: 13,
          marginBottom: 20,
          whiteSpace: "pre-wrap",
          overflowX: "auto",
        }}
      >
        {JSON.stringify(debug, null, 2)}
      </div>

      {conversations.length === 0 ? (
        <p>No conversations yet.</p>
      ) : (
        conversations.map((c) => (
          <div
            key={c.id}
            style={{
              border: "1px solid #ddd",
              padding: 12,
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
            <div style={{ fontFamily: "monospace", fontSize: 12 }}>
              request_id: {c.request_id}
            </div>
            <Link href={`/messages/${c.request_id}`}>Open Conversation</Link>
          </div>
        ))
      )}
    </div>
  );
}
