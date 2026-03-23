"use client";

import { useEffect } from "react";

export default function PushBootstrap() {
  useEffect(() => {
    let cancelled = false;

    async function cleanupBrowserServiceWorkers() {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator)) return;

      try {
        const regs = await navigator.serviceWorker.getRegistrations();

        await Promise.all(
          regs.map(async (reg) => {
            try {
              await reg.unregister();
            } catch {}
          })
        );

        if (cancelled) return;

        if ("caches" in window) {
          try {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map((key) => caches.delete(key)));
          } catch {}
        }

        console.log("[push-bootstrap] browser service workers cleared");
      } catch (error) {
        console.warn("[push-bootstrap] failed to clear service workers", error);
      }
    }

    cleanupBrowserServiceWorkers();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}