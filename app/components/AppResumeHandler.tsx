"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabaseClient";

// Keeps the hosted Capacitor shell healthy across iOS background/foreground transitions.
export default function AppResumeHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;

    const resume = () => {
      if (!active) return;
      supabase.auth.startAutoRefresh();
      window.dispatchEvent(new Event("pmp:app-resume"));
      router.refresh();
    };

    const pause = () => {
      supabase.auth.stopAutoRefresh();
    };

    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) resume();
      else pause();
    });

    const onVisibility = () => {
      if (document.visibilityState === "visible") resume();
      else pause();
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibility);
      void listener.then((handle) => handle.remove());
    };
  }, [router]);

  return null;
}
