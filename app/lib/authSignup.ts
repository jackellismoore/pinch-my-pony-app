type SignupUserLike = {
  identities?: unknown[] | null;
} | null;

/**
 * With email confirmation enabled, Supabase returns an obfuscated user with no
 * identities when a confirmed email is submitted to sign-up again. Using that
 * signal avoids exposing the private auth.users table to the browser.
 */
export function isExistingSignupEmail(user: SignupUserLike): boolean {
  return Array.isArray(user?.identities) && user.identities.length === 0;
}
