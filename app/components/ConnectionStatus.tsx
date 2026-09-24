"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/components/Icon";

type ConnectionState = "reconnecting" | "connected" | "lost" | "restored";

const VISIBLE_MS = 2200;
const LOSS_VISIBLE_MS = 4000;
const FADE_OUT_MS = 450;
const CHECK_TIMEOUT_MS = 6000;
const RETRY_DELAY_MS = 2500;
const WEB_START_DELAY_MS = 5000;

let currentConnectionState: ConnectionState = "reconnecting";

function isNativeApp() {
  if (typeof window === "undefined") return false;
  const capacitor = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;
  return capacitor?.isNativePlatform?.() === true;
}

export function ConnectionIndicator() {
  const [state, setState] = useState<ConnectionState>(currentConnectionState);

  useEffect(() => {
    const onState = (event: Event) => {
      const next = (event as CustomEvent<ConnectionState>).detail;
      if (next) setState(next);
    };
    window.addEventListener("pmp:connection-state", onState);
    return () => window.removeEventListener("pmp:connection-state", onState);
  }, []);

  const tone =
    state === "lost" ? "#B91C1C" : state === "reconnecting" ? "#D97706" : "#15803D";
  const label =
    state === "lost"
      ? "Connection lost"
      : state === "reconnecting"
        ? "Connecting to Pinch My Pony"
        : "Connected to Pinch My Pony";

  return (
    <span title={label} aria-label={label} role="status" style={{ width: 44, height: 44, borderRadius: 14, border: "1px solid rgba(15,23,42,0.12)", background: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", color: tone, flexShrink: 0, padding: 0, boxSizing: "border-box" }}>
      <Icon name="wifi" size={18} decorative={false} style={{ color: tone, animation: state === "reconnecting" ? "pmp-connection-pulse 1.2s ease-in-out infinite" : undefined }} />
    </span>
  );
}

export default function ConnectionStatus() {
  const [state, setState] = useState<ConnectionState | null>(null);
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checking = useRef(false);
  const hadConnection = useRef<boolean | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const showTransient = useCallback((next: ConnectionState) => {
    clearHideTimer();
    setFadingOut(false);
    currentConnectionState = next;
    window.dispatchEvent(new CustomEvent("pmp:connection-state", { detail: next }));
    setState(next);
    setVisible(true);

    const duration =
      next === "lost" ? LOSS_VISIBLE_MS : next === "reconnecting" ? undefined : VISIBLE_MS;

    if (duration) {
      hideTimer.current = setTimeout(() => {
        setFadingOut(true);
        hideTimer.current = setTimeout(() => {
          setVisible(false);
          setState(null);
          setFadingOut(false);
          hideTimer.current = null;
        }, FADE_OUT_MS);
      }, Math.max(0, duration - FADE_OUT_MS));
    }
  }, [clearHideTimer]);

  const checkConnection = useCallback(async (initial = false) => {
    if (checking.current || typeof window === "undefined") return;
    checking.current = true;

    if (!navigator.onLine) {
      hadConnection.current = false;
      showTransient("lost");
      checking.current = false;
      return;
    }

    if (initial || hadConnection.current !== true) showTransient("reconnecting");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    try {
      const { error } = await supabase.from("horses").select("id").limit(1).abortSignal(controller.signal);
      if (error) throw error;

      const wasConnected = hadConnection.current;
      hadConnection.current = true;
      showTransient(wasConnected === false ? "restored" : "connected");
    } catch {
      const wasConnected = hadConnection.current;
      hadConnection.current = false;
      showTransient("lost");
      if (wasConnected !== false) setTimeout(() => void checkConnection(false), RETRY_DELAY_MS);
    } finally {
      controller.abort();
      clearTimeout(timeout);
      checking.current = false;
    }
  }, [showTransient]);

  useEffect(() => {
    const native = isNativeApp();
    hadConnection.current = navigator.onLine;

    // Do not touch Supabase auth/database during web startup. The login/auth
    // flow must be allowed to establish its session first. The monitor remains
    // active on web, but starts its real probe after the page has settled.
    if (!navigator.onLine) showTransient("lost");

    startTimer.current = setTimeout(() => {
      void checkConnection(true);
    }, native ? 0 : WEB_START_DELAY_MS);

    const onOnline = () => void checkConnection(false);
    const onOffline = () => {
      hadConnection.current = false;
      showTransient("lost");
    };
    const onResume = () => void checkConnection(false);
    const onVisibility = () => {
      if (document.visibilityState === "visible") onResume();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("pmp:app-resume", onResume);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearHideTimer();
      if (startTimer.current) {
        clearTimeout(startTimer.current);
        startTimer.current = null;
      }
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("pmp:app-resume", onResume);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [checkConnection, clearHideTimer, showTransient]);

  if (!visible || !state) return null;

  const copy =
    state === "reconnecting"
      ? "Reconnecting to Pinch My Pony…"
      : state === "connected"
        ? "Connected"
        : state === "restored"
          ? "Connection restored"
          : "Connection to Pinch My Pony lost";

  const isPositive = state === "connected" || state === "restored";
  const isConnecting = state === "reconnecting";

  return (
    <>
      <style>{`@keyframes pmp-connection-pulse{0%,100%{opacity:.55}50%{opacity:1}}`}</style>
      <div role="status" aria-live="polite" style={{
        position: "fixed", top: "calc(env(safe-area-inset-top, 0px) + 10px)", left: "50%", zIndex: 10000,
        maxWidth: "calc(100vw - 24px)", padding: "9px 14px", borderRadius: 999,
        border: isPositive ? "1px solid rgba(31,61,43,0.22)" : isConnecting ? "1px solid rgba(217,119,6,0.24)" : "1px solid rgba(185,28,28,0.20)",
        background: isPositive ? "rgba(238,248,242,0.96)" : isConnecting ? "rgba(255,249,235,0.97)" : "rgba(255,247,247,0.97)",
        color: isPositive ? "#1F3D2B" : isConnecting ? "#B45309" : "#991B1B",
        boxShadow: "0 10px 28px rgba(15,23,42,0.14)", fontSize: 12, fontWeight: 900, whiteSpace: "nowrap",
        pointerEvents: "none", backdropFilter: "blur(12px)", opacity: fadingOut ? 0 : 1,
        transform: `translateX(-50%) translateY(${fadingOut ? -4 : 0}px)`,
        transition: `opacity ${FADE_OUT_MS}ms ease, transform ${FADE_OUT_MS}ms ease`,
      }}>{copy}</div>
    </>
  );
}
