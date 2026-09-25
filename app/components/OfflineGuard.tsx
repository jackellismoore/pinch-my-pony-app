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
