"use client";

import { useEffect, useState, type ReactNode } from "react";

type GuardState = "online" | "offline";

function isNativeApp() {
  if (typeof window === "undefined") return false;
  const capacitor = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;
  return capacitor?.isNativePlatform?.() === true;
}

export default function OfflineGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GuardState>(() => {
    if (typeof window === "undefined") return "online";
    return navigator.onLine ? "online" : "offline";
  });

  useEffect(() => {
    const handleOffline = () => setState("offline");
    const handleOnline = () => setState("online");

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
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
          padding: "34px 26px 30px",
          borderRadius: 28,
          background: "rgba(255,255,255,0.94)",
          border: "1px solid rgba(31,42,68,0.10)",
          boxShadow: "0 24px 70px rgba(31,42,68,0.12)",
        }}
      >
        <img
          src="/pmp-logo-web.png"
          alt="Pinch My Pony"
          style={{
            width: 92,
            height: 92,
            objectFit: "contain",
            margin: "0 auto 20px",
            display: "block",
          }}
        />
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
          It looks like your internet connection has dropped. Pinch My Pony
          needs a connection to load your account and listings.
        </p>
        <button
          type="button"
          onClick={() => setState(navigator.onLine ? "online" : "offline")}
          style={{
            width: "100%",
            minHeight: 48,
            marginTop: 24,
            border: 0,
            borderRadius: 15,
            background: "linear-gradient(180deg, #1F3D2B, #173223)",
            color: "white",
            fontWeight: 900,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </section>
    </main>
  );
}
