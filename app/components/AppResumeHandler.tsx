"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";

export default function AppResumeHandler() {
  const router = useRouter();
  const hiddenAtRef = useRef<number | null>(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    let removeAppListener: (() => void) | null = null;

    async function setupNative() {
      if (!Capacitor.isNativePlatform()) return;

      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch {}

      try {
        await StatusBar.setStyle({ style: Style.Default });
      } catch {}

      try {
        const handle = await CapacitorApp.addListener("appStateChange", ({ isActive }) => {
          if (isActive) {
            if (reloadingRef.current) return;

            const hiddenForMs = hiddenAtRef.current
              ? Date.now() - hiddenAtRef.current
              : 0;

            router.refresh();

            if (hiddenForMs > 1500) {
              reloadingRef.current = true;
              window.location.reload();
            }
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

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }

      if (document.visibilityState === "visible") {
        if (reloadingRef.current) return;

        const hiddenForMs = hiddenAtRef.current
          ? Date.now() - hiddenAtRef.current
          : 0;

        router.refresh();

        if (hiddenForMs > 1500) {
          reloadingRef.current = true;
          window.location.reload();
        }
      }
    }

    window.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("visibilitychange", onVisibilityChange);
      if (removeAppListener) removeAppListener();
    };
  }, [router]);

  return null;
}