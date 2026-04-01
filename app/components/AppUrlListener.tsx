"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { useRouter } from "next/navigation";

export default function AppUrlListener() {
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    App.addListener("appUrlOpen", (event) => {
      try {
        const incoming = event?.url;
        if (!incoming) return;

        const url = new URL(incoming);
        const path = `${url.pathname}${url.search}${url.hash}`;

        if (
          path.startsWith("/auth/") ||
          path.startsWith("/reset-password") ||
          path.startsWith("/verify") ||
          path.startsWith("/login")
        ) {
          router.replace(path);
        }
      } catch (err) {
        console.error("AppUrlListener error:", err);
      }
    }).then((listener) => {
      cleanup = () => listener.remove();
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [router]);

  return null;
}