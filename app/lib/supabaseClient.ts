import { createClient } from "@supabase/supabase-js";

export const SUPABASE_ENV_OK =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// If env is missing (often on Vercel), still create a client so pages can render
// and show a clear error instead of hanging/crashing.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://invalid.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "invalid-anon-key";

// supabaseUrl looks like: https://<PROJECT_REF>.supabase.co
function getProjectRef(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname; // <ref>.supabase.co
    const ref = host.split(".")[0];
    return ref || null;
  } catch {
    return null;
  }
}

function purgeSupabaseAuthStorage() {
  if (typeof window === "undefined") return;

  try {
    const ref = getProjectRef(supabaseUrl);

    // Primary key used by supabase-js v2
    if (ref) {
      window.localStorage.removeItem(`sb-${ref}-auth-token`);
    }

    // Extra safety: remove any other sb-*-auth-token keys for this site
    Object.keys(window.localStorage).forEach((k) => {
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        if (!ref || k.includes(`sb-${ref}-`)) window.localStorage.removeItem(k);
      }
    });
  } catch {
    // no-op
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Explicit: in the browser, use localStorage; on server, undefined
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

/**
 * Hardening:
 * Some users get stuck on refresh because a stale/invalid refresh token lives in localStorage.
 * In incognito it's fine because storage starts clean.
 *
 * Strategy:
 * - On first load in the browser, attempt getSession() with a short timeout.
 * - If it errors or hangs, purge the stored auth token and reload to "/".
 */
async function guardAgainstStuckSession() {
  if (typeof window === "undefined") return;

  // Don’t loop forever: only attempt this recovery once per page load.
  const guardKey = "__pmp_session_guard_ran__";
  if ((window as any)[guardKey]) return;
  (window as any)[guardKey] = true;

  const timeoutMs = 2500;

  try {
    const sessionPromise = supabase.auth.getSession();

    const timed = await Promise.race([
      sessionPromise,
      new Promise<{ data: any; error: Error }>((_, rej) =>
        setTimeout(() => rej(new Error("getSession_timeout")), timeoutMs)
      ),
    ]);

    // If Supabase returned an auth error, treat it as a poisoned session
    const err = (timed as any)?.error as Error | null | undefined;
    if (err) {
      purgeSupabaseAuthStorage();
      window.location.assign("/");
    }
  } catch (e: any) {
    // Timeout/hang or thrown error => purge and reload
    purgeSupabaseAuthStorage();
    window.location.assign("/");
  }
}

if (typeof window !== "undefined") {
  // Run once on initial bundle load
  guardAgainstStuckSession();

  // Also re-run lightly when auth state changes (covers edge cases after sign-in/out)
  supabase.auth.onAuthStateChange((_event) => {
    // If storage becomes corrupted again, next refresh would hang;
    // this keeps things resilient without relying on a non-existent event constant.
    // (No-op unless getSession hangs/errors.)
    guardAgainstStuckSession();
  });
}