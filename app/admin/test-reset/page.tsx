"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestResetPage() {
  const [status, setStatus] = useState("Ready to remove every account except owner@test.com.");
  const [running, setRunning] = useState(false);

  async function runReset() {
    setRunning(true);
    setStatus("Checking owner account and removing test users…");

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const session = data.session;
      if (!session) throw new Error("You must be signed in as owner@test.com first.");

      const email = session.user.email?.trim().toLowerCase() ?? "";
      if (email !== "owner@test.com") {
        throw new Error("Sign in as owner@test.com before using this page.");
      }

      const res = await fetch("/api/admin/test-reset", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Reset failed.");

      const failed = Array.isArray(body.failed) ? body.failed.length : 0;
      setStatus(
        `Done. Kept owner@test.com. Deleted ${body.deletedCount ?? 0} account(s)` +
          (failed ? `; ${failed} failed.` : ".")
      );
    } catch (error: any) {
      setStatus(error?.message || "Reset failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main style={{ maxWidth: 620, margin: "0 auto", padding: "48px 18px 120px" }}>
      <div
        style={{
          border: "1px solid rgba(31,42,68,.12)",
          borderRadius: 22,
          background: "white",
          padding: 24,
          boxShadow: "0 18px 50px rgba(31,42,68,.10)",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Test account reset</h1>
        <p style={{ lineHeight: 1.6 }}>
          This temporary owner-only tool deletes all Supabase Auth users except <strong>owner@test.com</strong>.
        </p>
        <button
          type="button"
          onClick={runReset}
          disabled={running}
          style={{
            width: "100%",
            minHeight: 48,
            border: 0,
            borderRadius: 14,
            background: running ? "#94a3b8" : "#173d2c",
            color: "white",
            fontWeight: 900,
            fontSize: 15,
          }}
        >
          {running ? "Resetting…" : "Delete all test accounts"}
        </button>
        <p style={{ marginBottom: 0, marginTop: 16, lineHeight: 1.5 }}>{status}</p>
      </div>
    </main>
  );
}
