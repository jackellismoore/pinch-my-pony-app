"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";

type GuardState = "online" | "offline";

export default function OfflineGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GuardState>(() => {
    if (typeof window === "undefined") return "online";
    return navigator.onLine ? "online" : "offline";
  });

  useEffect(() => {
    const syncConnection = () => setState(navigator.onLine ? "online" : "offline");

    window.addEventListener("offline", syncConnection);
    window.addEventListener("online", syncConnection);
    window.addEventListener("pmp:app-resume", syncConnection);
    document.addEventListener("visibilitychange", syncConnection);

    return () => {
      window.removeEventListener("offline", syncConnection);
      window.removeEventListener("online", syncConnection);
      window.removeEventListener("pmp:app-resume", syncConnection);
      document.removeEventListener("visibilitychange", syncConnection);
    };
  }, []);

  if (state === "online") return <>{children}</>;

  return (
    <main
      role="status"
      aria-live="polite"
      style={{
        minHeight: "100dvh",
        width: "100%",
        display: "grid",
        placeItems: "center",
        boxSizing: "border-box",
        padding: "32px 20px",
        background: "linear-gradient(180deg, #F5F1E8 0%, #fafafa 100%)",
        color: "#1F2A44",
      }}
    >
      <section
        style={{
          width: "min(100%, 430px)",
          textAlign: "center",
          padding: "38px 26px 30px",
          borderRadius: 28,
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(31,42,68,0.10)",
          boxShadow: "0 24px 70px rgba(31,42,68,0.12)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 150,
            height: 82,
            margin: "0 auto 20px",
            borderRadius: 24,
            display: "grid",
            placeItems: "center",
            background: "rgba(31,61,43,0.08)",
            overflow: "hidden",
          }}
        >
          <img
            src="/pmp-logo-web.png"
            alt=""
            width={132}
            height={54}
            style={{ objectFit: "contain", display: "block" }}
          />
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#8B5E3C",
            marginBottom: 8,
          }}
        >
          Pinch My Pony
        </div>

        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15 }}>
          You’re offline
        </h1>

        <p
          style={{
            margin: "12px auto 0",
            maxWidth: 340,
            fontSize: 15,
            lineHeight: 1.65,
            opacity: 0.76,
          }}
        >
          It looks like your internet connection has dropped. We’ll reconnect
          automatically when you’re back online.
        </p>

        <div
          style={{
            marginTop: 24,
            minHeight: 48,
            display: "grid",
            placeItems: "center",
            borderRadius: 15,
            background: "rgba(31,61,43,0.07)",
            color: "#1F3D2B",
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          Waiting for connection…
        </div>
      </section>
    </main>
  );
}
