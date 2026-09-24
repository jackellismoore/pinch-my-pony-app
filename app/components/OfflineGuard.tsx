"use client";

import { useEffect, useState, type ReactNode } from "react";

function getInitialOfflineState() {
  if (typeof window === "undefined") return false;
  return navigator.onLine === false;
}

export default function OfflineGuard({ children }: { children: ReactNode }) {
  const [offline, setOffline] = useState(getInitialOfflineState);

  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (!offline) return <>{children}</>;

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
        background:
          "radial-gradient(900px 500px at 50% 0%, rgba(200,162,77,0.18), transparent 58%), linear-gradient(180deg, #F5F1E8 0%, #fafafa 100%)",
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
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            width: 92,
            height: 92,
            margin: "0 auto 20px",
            borderRadius: 26,
            display: "grid",
            placeItems: "center",
            background: "rgba(31,61,43,0.07)",
            border: "1px solid rgba(31,61,43,0.12)",
            overflow: "hidden",
          }}
        >
          <img
            src="/pmp-logo-web.png"
            alt="Pinch My Pony"
            style={{ width: "88%", height: "88%", objectFit: "contain", display: "block" }}
          />
        </div>

        <div
          style={{
            width: 48,
            height: 48,
            margin: "0 auto 16px",
            borderRadius: 16,
            display: "grid",
            placeItems: "center",
            background: "rgba(217,119,6,0.10)",
            border: "1px solid rgba(217,119,6,0.18)",
            color: "#B45309",
            fontSize: 22,
            fontWeight: 900,
          }}
          aria-hidden="true"
        >
          ⌁
        </div>

        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15, letterSpacing: -0.4 }}>
          You&apos;re offline
        </h1>

        <p style={{ margin: "12px auto 0", maxWidth: 340, fontSize: 15, lineHeight: 1.65, opacity: 0.76 }}>
          It looks like your internet connection has dropped. Pinch My Pony needs a connection to load your account and listings.
        </p>

        <button
          type="button"
          onClick={() => {
            if (navigator.onLine) {
              setOffline(false);
              window.location.reload();
            }
          }}
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
            boxShadow: "0 14px 34px rgba(31,61,43,0.18)",
          }}
        >
          Try again
        </button>

        <p style={{ margin: "14px 0 0", fontSize: 12, lineHeight: 1.5, opacity: 0.58 }}>
          We&apos;ll automatically reconnect when your connection returns.
        </p>
      </section>
    </main>
  );
}
