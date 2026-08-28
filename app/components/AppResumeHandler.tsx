"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabaseClient";

export default function AppResumeHandler() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;

    const resume = () => {
      if (!active) return;
      supabase.auth.startAutoRefresh();
      supabase.realtime.connect();
      window.dispatchEvent(new Event("pmp:app-resume"));
    };

    const pause = () => {
      supabase.auth.stopAutoRefresh();
      supabase.realtime.disconnect();
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
  }, []);

  return null;
}
