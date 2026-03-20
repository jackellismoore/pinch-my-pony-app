"use client";

import { useEffect } from "react";
import {
  registerPushForCurrentUser,
  syncPushTokenAfterAuth,
} from "@/lib/push/registerPush";
import { supabase } from "@/lib/supabaseClient";

export default function PushBootstrap() {
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await registerPushForCurrentUser();

        const { data } = await supabase.auth.getSession();
        const user = data.session?.user ?? null;

        if (cancelled) return;

        if (user) {
          await syncPushTokenAfterAuth();
        }
      } catch (error) {
        console.warn("[push-bootstrap] init failed:", error);
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (cancelled) return;

        await registerPushForCurrentUser();

        if (session?.user) {
          await syncPushTokenAfterAuth();
        }
      } catch (error) {
        console.warn("[push-bootstrap] auth sync failed:", error);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}