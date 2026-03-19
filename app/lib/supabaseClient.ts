import { createClient } from "@supabase/supabase-js";

export const SUPABASE_ENV_OK =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://invalid.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "invalid-anon-key";

function getProjectRef(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname;
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

    if (ref) {
      window.localStorage.removeItem(`sb-${ref}-auth-token`);
    }

    Object.keys(window.localStorage).forEach((k) => {
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        if (!ref || k.includes(`sb-${ref}-`)) {
          window.localStorage.removeItem(k);
        }
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
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

let guardRunning = false;

async function guardAgainstStuckSession() {
  if (typeof window === "undefined") return;
  if (guardRunning) return;
  guardRunning = true;

  const timeoutMs = 2500;

  try {
    const sessionPromise = supabase.auth.getSession();

    const timed = await Promise.race([
      sessionPromise,
      new Promise<{ data: any; error: Error }>((_, rej) =>
        setTimeout(() => rej(new Error("getSession_timeout")), timeoutMs)
      ),
    ]);

    const err = (timed as any)?.error as Error | null | undefined;
    if (err) {
      purgeSupabaseAuthStorage();
      window.location.assign("/");
      return;
    }
  } catch {
    purgeSupabaseAuthStorage();
    window.location.assign("/");
    return;
  } finally {
    guardRunning = false;
  }
}

if (typeof window !== "undefined") {
  guardAgainstStuckSession();

  let lastFocusAt = 0;
  window.addEventListener("focus", () => {
    const now = Date.now();
    if (now - lastFocusAt < 1500) return;
    lastFocusAt = now;
    guardAgainstStuckSession();
  });

  supabase.auth.onAuthStateChange(() => {
    guardAgainstStuckSession();
  });
}