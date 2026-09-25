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
    // Browsers provide a reliable online/offline signal. Do not block the
    // website on a Supabase probe during startup; auth/session setup and API
    // availability are separate from the browser's network connection.
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
      if (!cancelled) setState("online");
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Only native WebViews need the real Supabase connectivity probe.
    if (native) {
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
    <main role="status" aria-live="polite" style={{
      minHeight: "100dvh", display: "grid", placeItems: "center",
      padding: "32px 20px", boxSizing: "border-box",
      background: "linear-gradient(180deg, #F5F1E8 0%, #fafafa 100%)",
      color: "#1F2A44",
    }}>
      <section style={{
        width: "min(100%, 430px)", textAlign: "center",
        padding: "34px 26px 30px", borderRadius: 28,
        background: "rgba(255,255,255,0.94)",
        border: "1px solid rgba(31,42,68,0.10)",
        boxShadow: "0 24px 70px rgba(31,42,68,0.12)",
      }}>
        <img src="/pmp-logo-web.png" alt="Pinch My Pony"
          style={{ width: 92, height: 92, objectFit: "contain", margin: "0 auto 20px", display: "block" }} />
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15 }}>
          {checking ? "Checking your connection" : "You’re offline"}
        </h1>
        <p style={{ margin: "12px auto 0", maxWidth: 340, fontSize: 15, lineHeight: 1.65, opacity: 0.76 }}>
          {checking
            ? "Just a moment — we’re checking that Pinch My Pony can reach the service."
            : "It looks like your internet connection has dropped. Pinch My Pony needs a connection to load your account and listings."}
        </p>
        {!checking && (
          <button type="button" onClick={() => void checkConnection()} style={{
            width: "100%", minHeight: 48, marginTop: 24, border: 0,
            borderRadius: 15, background: "linear-gradient(180deg, #1F3D2B, #173223)",
            color: "white", fontWeight: 900, fontSize: 15, cursor: "pointer",
          }}>Try again</button>
        )}
      </section>
    </main>
  );
}
