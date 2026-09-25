"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

type ConnectionState = "connected" | "connecting" | "lost" | "restored";

let currentConnectionState: ConnectionState = "connected";

export function ConnectionIndicator() {
  const [state, setState] = useState<ConnectionState>(currentConnectionState);

  useEffect(() => {
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let lastOnline = navigator.onLine;

    const sync = (online: boolean, showRestored = false) => {
      const next: ConnectionState = online ? "connected" : "lost";
      currentConnectionState = next;
      setState(showRestored && online ? "restored" : next);
    };

    const onState = (event: Event) => {
      const next = (event as CustomEvent<ConnectionState>).detail;
      if (next) {
        currentConnectionState = next;
        setState(next);
      }
    };

    const onOnline = () => {
      lastOnline = true;
      sync(true, true);
    };

    const onOffline = () => {
      lastOnline = false;
      sync(false);
    };

    const onResume = () => {
      if (resumeTimer) clearTimeout(resumeTimer);
      // Do an immediate sync and repeat shortly afterwards because iOS/WKWebView
      // can update navigator.onLine a little after the native app resumes.
      sync(navigator.onLine);
      resumeTimer = setTimeout(() => {
        sync(navigator.onLine, navigator.onLine);
        resumeTimer = null;
      }, 750);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") onResume();
    };

    const poll = () => {
      const online = navigator.onLine;
      if (online !== lastOnline) {
        lastOnline = online;
        sync(online, online);
      }
    };

    window.addEventListener("pmp:connection-state", onState);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("pmp:app-resume", onResume);
    window.addEventListener("pageshow", onResume);
    document.addEventListener("visibilitychange", onVisibility);

    // WKWebView/iOS can miss online/offline events, so keep the small indicator
    // synchronised while the app is in the foreground.
    const pollTimer = window.setInterval(poll, 1000);

    sync(navigator.onLine);

    return () => {
      if (resumeTimer) clearTimeout(resumeTimer);
      window.clearInterval(pollTimer);
      window.removeEventListener("pmp:connection-state", onState);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("pmp:app-resume", onResume);
      window.removeEventListener("pageshow", onResume);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const tone = state === "lost" ? "#B91C1C" : state === "connecting" ? "#B45309" : "#15803D";
  const label = state === "lost" ? "Connection lost" : state === "connecting" ? "Connecting to Pinch My Pony" : "Connected to Pinch My Pony";

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

    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let suppressOfflineUntil = 0;

    const onOnline = () => showTransient("restored");
    const onOffline = () => {
      // iOS WebView can briefly report offline while the app is resuming.
      // If the device is already back online, don't leave the indicator red.
      if (Date.now() < suppressOfflineUntil && navigator.onLine) return;
      showTransient("lost");
    };
    const onResume = () => {
      if (resumeTimer) clearTimeout(resumeTimer);
      if (navigator.onLine) {
        suppressOfflineUntil = Date.now() + 3000;
        // Restore the banner behaviour used previously: show a short
        // "Connecting…" state, then a visible "Connection restored" message.
        currentConnectionState = "connecting";
        window.dispatchEvent(new CustomEvent("pmp:connection-state", { detail: "connecting" }));
        setState("connecting");
        setVisible(true);
        setFadingOut(false);

        resumeTimer = setTimeout(() => {
          if (!navigator.onLine) {
            showTransient("lost");
            return;
          }
          showTransient("restored");
          currentConnectionState = "connected";
          resumeTimer = null;
        }, 700);
      } else {
        showTransient("lost");
      }
    };

    if (!navigator.onLine) showTransient("lost");

    const onVisibility = () => {
      if (document.visibilityState === "visible") onResume();
    };

    let lastOnline = navigator.onLine;
    const poll = () => {
      const online = navigator.onLine;
      if (online !== lastOnline) {
        lastOnline = online;
        if (online) onOnline();
        else onOffline();
      }
    };

    // iOS/WKWebView can miss online/offline events. Poll while foregrounded so
    // reconnect feedback appears without requiring the user to switch apps.
    const pollTimer = window.setInterval(poll, 1000);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("pmp:app-resume", onResume);
    window.addEventListener("pageshow", onResume);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearHide();
      if (resumeTimer) clearTimeout(resumeTimer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("pmp:app-resume", onResume);
      window.removeEventListener("pageshow", onResume);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(pollTimer);
    };
  }, []);

  if (!visible || !state) return null;

  const lost = state === "lost";
  const connecting = state === "connecting";
  const copy = lost ? "You’re offline" : connecting ? "Connecting…" : "Connection restored";

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
            background: lost ? "rgba(185,28,28,0.09)" : connecting ? "rgba(180,83,9,0.10)" : "rgba(31,61,43,0.09)",
            flexShrink: 0,
          }}
        >
          <Icon name={lost ? "wifi" : connecting ? "wifi" : "check"} size={20} decorative={true} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, lineHeight: 1.2 }}>{copy}</div>
          <div style={{ marginTop: 3, fontSize: 12, lineHeight: 1.35, opacity: 0.72 }}>
            {lost ? "Check your internet connection." : connecting ? "Reconnecting to Pinch My Pony…" : "You’re back online."}
          </div>
        </div>
      </div>
    </div>
  );
}
