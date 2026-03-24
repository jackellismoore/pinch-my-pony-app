"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AppResumeHandler() {
  useEffect(() => {
    let refreshing = false;

    const refreshSession = async () => {
      if (refreshing) return;
      refreshing = true;

      try {
        await supabase.auth.getSession();
      } catch (e) {
        console.error("Session refresh failed", e);
      }

      refreshing = false;
    };

    // 🔑 1. Listen to auth changes (CRITICAL)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth event:", event);

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          // Force UI to update
          window.location.reload();
        }
      }
    );

    // 🔑 2. Handle app resume (mobile + browser tab switch)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    // 🔑 3. Initial sync on load
    refreshSession();

    return () => {
      listener.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}