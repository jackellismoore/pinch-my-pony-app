"use client";

import { useEffect } from "react";

const RESET_FLAG = "pmp_browser_cache_reset_v1";

export default function PushBootstrap() {
  useEffect(() => {
    let cancelled = false;

    async function runOnce() {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator)) return;

      const alreadyRan = window.localStorage.getItem(RESET_FLAG);
      if (alreadyRan === "done") return;

      try {
        const regs = await navigator.serviceWorker.getRegistrations();

        await Promise.all(
          regs.map(async (reg) => {
            try {
              await reg.unregister();
            } catch {}
          })
        );

        if ("caches" in window) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));
          } catch {}
        }

        if (!cancelled) {
          window.localStorage.setItem(RESET_FLAG, "done");
        }
      } catch (err) {
        console.warn("[PushBootstrap] cache/service worker reset failed", err);
      }
    }

    runOnce();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}