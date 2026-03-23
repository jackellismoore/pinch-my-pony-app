"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { supabase } from "@/lib/supabaseClient";

export default function AppResumeHandler() {
  const router = useRouter();
  const hiddenAtRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const resumeInFlightRef = useRef(false);

  useEffect(() => {
    let removeAppListener: (() => void) | null = null;

    function clearRefreshTimer() {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }

    async function softResumeSync() {
      if (resumeInFlightRef.current) return;
      resumeInFlightRef.current = true;

      try {
        try {
          await supabase.auth.getSession();
        } catch {}

        router.refresh();

        clearRefreshTimer();
        refreshTimerRef.current = window.setTimeout(() => {
          router.refresh();
          resumeInFlightRef.current = false;
          refreshTimerRef.current = null;
        }, 350);
      } catch {
        resumeInFlightRef.current = false;
      }
    }

    async function setupNative() {
      if (!Capacitor.isNativePlatform()) return;

      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch {}

      try {
        await StatusBar.setStyle({ style: Style.Default });
      } catch {}

      try {
        const handle = await CapacitorApp.addListener("appStateChange", async ({ isActive }) => {
          if (isActive) {
            await softResumeSync();
          } else {
            hiddenAtRef.current = Date.now();
          }
        });

        removeAppListener = () => {
          handle.remove();
        };
      } catch {}
    }

    setupNative();

    async function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }

      if (document.visibilityState === "visible") {
        await softResumeSync();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearRefreshTimer();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (removeAppListener) removeAppListener();
    };
  }, [router]);

  return null;
}