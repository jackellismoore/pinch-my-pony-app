"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

type ConnectionState = "connected" | "lost" | "restored";

let currentConnectionState: ConnectionState = "connected";

export function ConnectionIndicator() {
  const [state, setState] = useState<ConnectionState>(currentConnectionState);

  useEffect(() => {
    const onState = (event: Event) => {
      const next = (event as CustomEvent<ConnectionState>).detail;
      if (next) setState(next);
    };
    const onOnline = () => setState("restored");
    const onOffline = () => setState("lost");
    window.addEventListener("pmp:connection-state", onState);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("pmp:connection-state", onState);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const tone = state === "lost" ? "#B91C1C" : "#15803D";
  const label = state === "lost" ? "Connection lost" : "Connected to Pinch My Pony";

  return (
    <span
      title={label}
      aria-label={label}
      role="status"
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        border: "1px solid rgba(15,23,42,0.12)",
        background: "white",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: tone,
        flexShrink: 0,
        padding: 0,
        boxSizing: "border-box",
      }}
    >
      <Icon name="wifi" size={18} decorative={false} style={{ color: tone }} />
    </span>
  );
}

export default function ConnectionStatus() {
  const [state, setState] = useState<ConnectionState | null>(null);
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const clearHide = () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    const showTransient = (next: ConnectionState) => {
      clearHide();
      currentConnectionState = next;
      window.dispatchEvent(new CustomEvent("pmp:connection-state", { detail: next }));
      setState(next);
      setFadingOut(false);
      setVisible(true);

      if (next === "lost") return;

      hideTimer = setTimeout(() => {
        setFadingOut(true);
        hideTimer = setTimeout(() => {
          setVisible(false);
          setState(null);
          setFadingOut(false);
          hideTimer = null;
        }, 350);
      }, 1850);
    };

    const onOnline = () => showTransient("restored");
    const onOffline = () => showTransient("lost");
    const onResume = () => {
      if (navigator.onLine) {
        currentConnectionState = "connected";
        window.dispatchEvent(new CustomEvent("pmp:connection-state", { detail: "connected" }));
        setVisible(false);
        setState(null);
        setFadingOut(false);
      } else {
        showTransient("lost");
      }
    };

    if (!navigator.onLine) showTransient("lost");

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("pmp:app-resume", onResume);

    return () => {
      clearHide();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("pmp:app-resume", onResume);
    };
  }, []);

  if (!visible || !state) return null;

  const lost = state === "lost";
  const copy = lost ? "You’re offline" : "Connection restored";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 14px)",
        left: "50%",
        zIndex: 10000,
        width: "min(calc(100vw - 28px), 360px)",
        boxSizing: "border-box",
        padding: "13px 16px",
        borderRadius: 18,
        border: lost
          ? "1px solid rgba(185,28,28,0.18)"
          : "1px solid rgba(31,61,43,0.18)",
        background: lost ? "rgba(255,248,248,0.98)" : "rgba(244,250,246,0.98)",
        color: lost ? "#991B1B" : "#1F3D2B",
        boxShadow: "0 14px 36px rgba(15,23,42,0.16)",
        backdropFilter: "blur(14px)",
        opacity: fadingOut ? 0 : 1,
        transform: `translateX(-50%) translateY(${fadingOut ? -6 : 0}px)`,
        transition: "opacity 350ms ease, transform 350ms ease",
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            background: lost ? "rgba(185,28,28,0.09)" : "rgba(31,61,43,0.09)",
            flexShrink: 0,
          }}
        >
          <Icon name={lost ? "wifi" : "check"} size={20} decorative={true} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, lineHeight: 1.2 }}>{copy}</div>
          <div style={{ marginTop: 3, fontSize: 12, lineHeight: 1.35, opacity: 0.72 }}>
            {lost ? "Check your internet connection." : "You’re back online."}
          </div>
        </div>
      </div>
    </div>
  );
}
