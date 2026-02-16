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

      // 1) Requests where I'm the borrower
      const { data: borrowerReqs, error: borrowerReqErr } = await supabase
        .from("borrow_requests")
        .select("id")
        .eq("borrower_id", userId);

      if (borrowerReqErr) {
        setDebug({ step: "borrower_requests", userId, borrowerReqErr });
        return;
      }

      // 2) Horses I own
      const { data: myHorses, error: horsesErr } = await supabase
        .from("horses")
        .select("id")
        .eq("owner_id", userId);

      if (horsesErr) {
        setDebug({ step: "my_horses", userId, horsesErr });
        return;
      }

      const myHorseIds = (myHorses ?? []).map((h: any) => h.id);

      // 3) Requests where I'm the owner (requests for my horses)
      let ownerReqs: any[] = [];
      if (myHorseIds.length > 0) {
        const { data: ownerReqsData, error: ownerReqErr } = await supabase
          .from("borrow_requests")
          .select("id")
          .in("horse_id", myHorseIds);

        if (ownerReqErr) {
          setDebug({ step: "owner_requests", userId, myHorseIds, ownerReqErr });
          return;
        }
        ownerReqs = ownerReqsData ?? [];
      }

      // 4) Combine request ids (unique)
      const requestIdSet = new Set<string>();
      (borrowerReqs ?? []).forEach((r: any) => requestIdSet.add(r.id));
      (ownerReqs ?? []).forEach((r: any) => requestIdSet.add(r.id));
      const requestIds = Array.from(requestIdSet);

      if (requestIds.length === 0) {
        setConversations([]);
        setDebug({
          step: "no_requests",
          userId,
          borrowerReqsCount: borrowerReqs?.length ?? 0,
          myHorseIdsCount: myHorseIds.length,
          ownerReqsCount: ownerReqs?.length ?? 0,
          requestIds,
        });
        return;
      }

      // 5) Fetch conversations for those request_ids
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
        borrowerReqsCount: borrowerReqs?.length ?? 0,
        myHorseIdsCount: myHorseIds.length,
        ownerReqsCount: ownerReqs?.length ?? 0,
        requestIds,
        conversationsCount: convs?.length ?? 0,
        convs,
      });
    };

    load();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Messages</h1>

      <pre
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
      </pre>

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
