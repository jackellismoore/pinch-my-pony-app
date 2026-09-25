"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

type GuardState = "checking" | "offline" | "online";

function isNativeApp() {
  if (typeof window === "undefined") return false;
  const capacitor = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;
  return capacitor?.isNativePlatform?.() === true;
}

export default function OfflineGuard({ children }: { children: ReactNode }) {
  const native = isNativeApp();
  const [state, setState] = useState<GuardState>(() => {
    if (typeof window === "undefined") return "checking";
    // Native WebViews can report navigator.onLine as true even when there is
    // no usable internet connection, so verify connectivity before rendering
    // the app on launch. Web keeps the normal fast path when the browser knows
    // it is online.
    if (native) return "checking";
    return navigator.onLine ? "online" : "offline";
  });

  const checkConnection = useCallback(async () => {
    if (typeof window === "undefined") return false;

    setState("checking");

    if (!navigator.onLine && !native) {
      setState("offline");
      return false;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);

    try {
      const { error } = await supabase
        .from("public_horses")
        .select("id")
        .limit(1)
        .abortSignal(controller.signal);

      if (error) throw error;

      setState("online");
      return true;
    } catch {
      setState("offline");
      return false;
    } finally {
      window.clearTimeout(timeout);
      controller.abort();
    }
  }, [native]);

  useEffect(() => {
    let cancelled = false;

    const handleOffline = () => setState("offline");
    const handleOnline = () => {
      if (!cancelled) void checkConnection();
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Native launch is verified against the actual Supabase connection.
    // Web only probes at startup when navigator reports offline.
    if (native) {
      void checkConnection();
    } else if (!navigator.onLine) {
      void checkConnection();
    }

    return () => {
      cancelled = true;
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [checkConnection, native]);

  if (state === "online") return <>{children}</>;

  const checking = state === "checking";

  return (
    <main
      role="status"
      aria-live="polite"
      style={{
        minHeight: "100dvh",
        width: "100%",
        display: "grid",
        placeItems: "center",
        boxSizing: "border-box",
        padding: "32px 20px",
        background:
          "radial-gradient(900px 500px at 50% 0%, rgba(200,162,77,0.18), transparent 58%), linear-gradient(180deg, #F5F1E8 0%, #fafafa 100%)",
        color: "#1F2A44",
      }}
    >
      <section
        style={{
          width: "min(100%, 430px)",
          textAlign: "center",
          padding: "34px 26px 30px",
          borderRadius: 28,
          background: "rgba(255,255,255,0.94)",
          border: "1px solid rgba(31,42,68,0.10)",
          boxShadow: "0 24px 70px rgba(31,42,68,0.12)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            width: 92,
            height: 92,
            margin: "0 auto 20px",
            borderRadius: 26,
            display: "grid",
            placeItems: "center",
            background: "rgba(31,61,43,0.07)",
            border: "1px solid rgba(31,61,43,0.12)",
            overflow: "hidden",
          }}
        >
          <img
            src="/pmp-logo-web.png"
            alt="Pinch My Pony"
            style={{ width: "88%", height: "88%", objectFit: "contain", display: "block" }}
          />
        </div>

        <div
          style={{
            width: 48,
            height: 48,
            margin: "0 auto 16px",
            borderRadius: 16,
            display: "grid",
            placeItems: "center",
            background: checking ? "rgba(217,119,6,0.10)" : "rgba(185,28,28,0.08)",
            border: checking ? "1px solid rgba(217,119,6,0.18)" : "1px solid rgba(185,28,28,0.15)",
            color: checking ? "#B45309" : "#991B1B",
            fontSize: 22,
            fontWeight: 900,
          }}
          aria-hidden="true"
        >
          {checking ? "…" : "⌁"}
        </div>

        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15, letterSpacing: -0.4 }}>
          {checking ? "Checking your connection" : "You’re offline"}
        </h1>

        <p style={{ margin: "12px auto 0", maxWidth: 340, fontSize: 15, lineHeight: 1.65, opacity: 0.76 }}>
          {checking
            ? "Just a moment — we’re checking that Pinch My Pony can reach the service."
            : "It looks like your internet connection has dropped. Pinch My Pony needs a connection to load your account and listings."}
        </p>

        {!checking && (
          <button
            type="button"
            onClick={() => void checkConnection()}
            style={{
              width: "100%",
              minHeight: 48,
              marginTop: 24,
              border: 0,
              borderRadius: 15,
              background: "linear-gradient(180deg, #1F3D2B, #173223)",
              color: "white",
              fontWeight: 900,
              fontSize: 15,
              cursor: "pointer",
              boxShadow: "0 14px 34px rgba(31,61,43,0.18)",
            }}
          >
            Try again
          </button>
        )}

        <p style={{ margin: "14px 0 0", fontSize: 12, lineHeight: 1.5, opacity: 0.58 }}>
          {checking
            ? "If the connection is unavailable, you’ll stay on this screen."
            : "We’ll automatically reconnect when your connection returns."}
        </p>
      </section>
    </main>
  );
}
