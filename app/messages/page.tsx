"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type LatestMessageRow = {
  request_id: string;
  created_at: string;
  content: string;
};

export default function MessagesPage() {
  const [threads, setThreads] = useState<LatestMessageRow[]>([]);
  const [debug, setDebug] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        setDebug({ step: "auth", authErr });
        return;
      }
      const userId = authData.user.id;

      // Requests where I'm borrower
      const { data: borrowerReqs, error: borrowerReqErr } = await supabase
        .from("borrow_requests")
        .select("id")
        .eq("borrower_id", userId);

      if (borrowerReqErr) {
        setDebug({ step: "borrower_requests", userId, borrowerReqErr });
        return;
      }

      // Horses I own
      const { data: myHorses, error: horsesErr } = await supabase
        .from("horses")
        .select("id")
        .eq("owner_id", userId);

      if (horsesErr) {
        setDebug({ step: "my_horses", userId, horsesErr });
        return;
      }

      const myHorseIds = (myHorses ?? []).map((h: any) => h.id);

      // Requests for my horses
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

      // Unique request ids
      const requestIdSet = new Set<string>();
      (borrowerReqs ?? []).forEach((r: any) => requestIdSet.add(r.id));
      (ownerReqs ?? []).forEach((r: any) => requestIdSet.add(r.id));
      const requestIds = Array.from(requestIdSet);

      if (requestIds.length === 0) {
        setThreads([]);
        setDebug({ step: "no_requests", userId });
        return;
      }

      // Load messages for those requests (we’ll pick latest per request_id in JS)
      const { data: msgs, error: msgErr } = await supabase
        .from("messages")
        .select("request_id, created_at, content")
        .in("request_id", requestIds)
        .order("created_at", { ascending: false });

      if (msgErr) {
        setDebug({ step: "messages", userId, requestIds, msgErr });
        return;
      }

      // Take latest per request_id
      const latestByRequest = new Map<string, LatestMessageRow>();
      (msgs ?? []).forEach((m: any) => {
        if (!latestByRequest.has(m.request_id)) {
          latestByRequest.set(m.request_id, m);
        }
      });

      const latestThreads = Array.from(latestByRequest.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setThreads(latestThreads);
      setDebug({
        step: "done",
        userId,
        requestIdsCount: requestIds.length,
        threadsCount: latestThreads.length,
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

      {threads.length === 0 ? (
        <p>No conversations yet.</p>
      ) : (
        threads.map((t) => (
          <div
            key={t.request_id}
            sty
