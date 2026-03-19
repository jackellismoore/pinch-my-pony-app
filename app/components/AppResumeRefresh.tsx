"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

export default function AppResumeRefresh() {
  const router = useRouter();
  const hiddenAtRef = useRef<number | null>(null);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const safeRefresh = () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;

      try {
        router.refresh();

        window.setTimeout(() => {
          refreshingRef.current = false;
        }, 1200);
      } catch {
        refreshingRef.current = false;
      }
    };

    const safeReload = () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      window.location.reload();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }

      if (document.visibilityState === "visible") {
        const hiddenFor =
          hiddenAtRef.current == null ? 0 : Date.now() - hiddenAtRef.current;

        if (hiddenFor > 3000) {
          safeRefresh();

          window.setTimeout(() => {
            if (document.visibilityState === "visible") {
              safeReload();
            }
          }, 2500);
        }
      }
    };

    const onPageshow = () => {
      safeRefresh();
    };

    window.addEventListener("pageshow", onPageshow);
    document.addEventListener("visibilitychange", onVisibilityChange);

    let cleanupNative: (() => void) | null = null;

    if (Capacitor.isNativePlatform()) {
      const subPromise = App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          safeRefresh();

          window.setTimeout(() => {
            safeReload();
          }, 2500);
        } else {
          hiddenAtRef.current = Date.now();
        }
      });

      subPromise.then((sub) => {
        cleanupNative = () => {
          sub.remove();
        };
      });
    }

    return () => {
      window.removeEventListener("pageshow", onPageshow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cleanupNative?.();
    };
  }, [router]);

  return null;
}