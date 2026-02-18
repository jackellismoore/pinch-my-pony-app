import { createClient } from '@supabase/supabase-js';

export const SUPABASE_ENV_OK =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// If env is missing (often on Vercel), still create a client so pages can render
// and show a clear error instead of hanging/crashing.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://invalid.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'invalid-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
