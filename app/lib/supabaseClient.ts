import { createClient } from "@supabase/supabase-js";

export const SUPABASE_ENV_OK =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://invalid.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "invalid-anon-key";

const PUSH_ENDPOINT_STORAGE_KEY = "pmp-push-endpoint";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "pinch-my-pony-auth",
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

// All logout paths use this single Supabase client. Wrapping signOut here makes
// notification cleanup consistent whether the user signs out from the header,
// owner/borrower dashboard, profile flow, or a shared auth helper.
if (typeof window !== "undefined") {
  const auth = supabase.auth as typeof supabase.auth & {
    __pmpSignOutWrapped?: boolean;
    signOut: (...args: any[]) => Promise<any>;
  };

  if (!auth.__pmpSignOutWrapped) {
    const originalSignOut = auth.signOut.bind(auth) as (...args: any[]) => Promise<any>;

    auth.signOut = async (...args: any[]) => {
      let endpoint: string | null = null;

      try {
        endpoint = window.localStorage.getItem(PUSH_ENDPOINT_STORAGE_KEY);
      } catch {
        endpoint = null;
      }

      try {
        if (endpoint) {
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id ?? null;

          if (userId) {
            const { error } = await supabase
              .from("push_subscriptions")
              .delete()
              .eq("user_id", userId)
              .eq("endpoint", endpoint);

            if (error) {
              console.warn("[push] failed removing device subscription on sign out", error);
            }
          }

          // For browser push, also unsubscribe the local PushManager endpoint.
          // Native iOS/Android delivery stops as soon as the server-side endpoint
          // row is removed; it will be claimed again on the next authenticated login.
          if (
            !endpoint.startsWith("ios:") &&
            !endpoint.startsWith("android:") &&
            "serviceWorker" in navigator
          ) {
            const registration = await navigator.serviceWorker.getRegistration();
            const subscription = await registration?.pushManager.getSubscription();

            if (subscription?.endpoint === endpoint) {
              await subscription.unsubscribe();
            }
          }
        }
      } catch (error) {
        console.warn("[push] sign-out cleanup failed", error);
      } finally {
        try {
          window.localStorage.removeItem(PUSH_ENDPOINT_STORAGE_KEY);
        } catch {
          // Storage may be unavailable in restricted browser modes.
        }
      }

      return originalSignOut(...args);
    };

    auth.__pmpSignOutWrapped = true;
  }
}
