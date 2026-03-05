// app/lib/supabaseAdmin.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _admin: SupabaseClient | null = null;

/**
 * Lazy (runtime-only) Supabase admin client.
 * Important: do NOT throw at module import time, otherwise Next "collect page data" will fail in CI.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;

  // Prefer service env vars (do NOT use NEXT_PUBLIC_* for admin)
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  if (!url) {
    throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL).");
  }
  if (!serviceRole) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  _admin = createClient(url, serviceRole, {
    auth: { persistSession: false },
  });

  return _admin;
}