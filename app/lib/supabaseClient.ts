import { createClient } from "@supabase/supabase-js";

export const SUPABASE_ENV_OK =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://invalid.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "invalid-anon-key";

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        ...(init?.headers ?? {}),
        "cache-control": "no-cache",
        pragma: "no-cache",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "pinch-my-pony-auth",
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});