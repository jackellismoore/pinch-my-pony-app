"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ConnectionState = "reconnecting" | "connected" | "lost" | "restored";

const VISIBLE_MS = 1600;
const CHECK_TIMEOUT_MS = 6000;
const RETRY_DELAY_MS = 2500;
let currentConnectionState: ConnectionState = "reconnecting";

export default function ConnectionStatus() {
  const [state, setState] = useState<ConnectionState | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checking = useRef(false);
  const hadConnection = useRef<boolean | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const showTransient = useCallback(
    (next: ConnectionState) => {
      clearHideTimer();
      setState(next);
      setVisible(true);

      if (next === "connected" || next === "restored" || next === "lost") {
        hideTimer.current = setTimeout(() => {
          setVisible(false);
          setState(null);
        }, next === "lost" ? LOSS_VISIBLE_MS : VISIBLE_MS);
      }
    },
    [clearHideTimer]
  );

  const checkConnection = useCallback(
    async (initial = false) => {
      if (checking.current || typeof window === "undefined") return;
      checking.current = true;

      if (!navigator.onLine) {
        hadConnection.current = false;
        showTransient("lost");
        checking.current = false;
        return;
      }

      if (initial || hadConnection.current !== true) {
        showTransient("reconnecting");
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

      try {
        const { error } = await supabase.from("horses").select("id").limit(1);
        if (error) throw error;

        const wasConnected = hadConnection.current;
        hadConnection.current = true;
        showTransient(wasConnected === false ? "restored" : "connected");
      } catch {
        const wasConnected = hadConnection.current;
        hadConnection.current = false;
        showTransient("lost");

        if (wasConnected !== false) {
          setTimeout(() => void checkConnection(false), RETRY_DELAY_MS);
        }
      } finally {
        clearTimeout(timeout);
        checking.current = false;
      }
    },
    [showTransient]
  );

  useEffect(() => {
    void checkConnection(true);

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

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 10px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10000,
        maxWidth: "calc(100vw - 24px)",
        padding: "9px 14px",
        borderRadius: 999,
        border: isPositive
          ? "1px solid rgba(31,61,43,0.22)"
          : "1px solid rgba(185,28,28,0.20)",
        background: isPositive ? "rgba(238,248,242,0.96)" : "rgba(255,247,247,0.97)",
        color: isPositive ? "#1F3D2B" : "#991B1B",
        boxShadow: "0 10px 28px rgba(15,23,42,0.14)",
        fontSize: 12,
        fontWeight: 900,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        backdropFilter: "blur(12px)",
      }}
    >
      {copy}
    </div>
  );
}
