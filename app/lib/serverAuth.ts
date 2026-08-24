import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { bearerToken } from "@/lib/security";

export function readBearerToken(req: Request): string | null {
  return bearerToken(req.headers.get("authorization"));
}

export async function requireApiUser(req: Request): Promise<User> {
  const token = readBearerToken(req);
  if (!token) throw new Error("UNAUTHENTICATED");

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHENTICATED");
  return data.user;
}

export function trustedAppOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return new URL(configured).origin;
  return new URL(req.url).origin;
}
