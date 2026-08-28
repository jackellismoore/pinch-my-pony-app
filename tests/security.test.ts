import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { bearerToken, safeInternalRedirect } from "../app/lib/security.ts";
import { launchFeatureEnabled } from "../app/lib/launchFeatures.ts";
import { userFacingError } from "../app/lib/userFacingError.ts";
import { formatHorseHeight, parseHorseHeight } from "../app/lib/horseHeight.ts";
import { isExistingSignupEmail } from "../app/lib/authSignup.ts";
import { brandedEmail, escapeEmailHtml } from "../app/lib/emailTemplate.ts";

test("bearerToken accepts a normal bearer token", () => {
  assert.equal(bearerToken("Bearer abc123"), "abc123");
});

test("bearerToken rejects missing and malformed values", () => {
  assert.equal(bearerToken(null), null);
  assert.equal(bearerToken("Basic abc123"), null);
  assert.equal(bearerToken("Bearer   "), null);
});

test("safeInternalRedirect permits local paths only", () => {
  assert.equal(safeInternalRedirect("/dashboard"), "/dashboard");
  assert.equal(safeInternalRedirect("https://evil.example"), "/");
  assert.equal(safeInternalRedirect("//evil.example"), "/");
});

test("launch features remain disabled unless explicitly enabled", () => {
  assert.equal(launchFeatureEnabled(undefined), false);
  assert.equal(launchFeatureEnabled("false"), false);
  assert.equal(launchFeatureEnabled("TRUE"), false);
  assert.equal(launchFeatureEnabled("true"), true);
});

test("user-facing errors do not expose backend details", () => {
  assert.equal(
    userFacingError(new Error("new row violates row-level security policy"), "Try again."),
    "You don’t have permission to complete that action."
  );
  assert.equal(
    userFacingError(new Error("TypeError: Failed to fetch"), "Try again."),
    "We couldn’t connect. Check your internet connection and try again."
  );
  assert.equal(userFacingError(new Error("database internals"), "Try again."), "Try again.");
});

test("release migration keeps paid borrowing and identity off by default", () => {
  const sql = readFileSync(resolve("supabase/migrations/202608240002_release_security_and_entitlements.sql"), "utf8");
  assert.match(sql, /borrowing_membership_required boolean not null default false/i);
  assert.match(sql, /borrowing_identity_required boolean not null default false/i);
  assert.match(sql, /complimentary_access_until > now\(\)/i);
});

test("request decisions use an owner-only atomic RPC", () => {
  const sql = readFileSync(resolve("supabase/migrations/202608240002_release_security_and_entitlements.sql"), "utf8");
  assert.match(sql, /drop policy if exists "requests_participant_update"/i);
  assert.match(sql, /Only the listing owner can decide this request/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /Those dates are no longer available/i);
});

test("public profile directory excludes billing identifiers", () => {
  const sql = readFileSync(resolve("supabase/migrations/202608240002_release_security_and_entitlements.sql"), "utf8");
  const view = sql.match(/create or replace view public\.public_profiles[\s\S]*?from public\.profiles;/i)?.[0] ?? "";
  assert.ok(view.length > 0);
  assert.doesNotMatch(view, /stripe_customer_id|stripe_subscription_id|membership_status/i);
});

test("all request status changes in the app use the protected RPC", () => {
  const detail = readFileSync(resolve("app/dashboard/owner/[requestId]/page.tsx"), "utf8");
  assert.match(detail, /rpc\("set_borrow_request_status"/);
  assert.doesNotMatch(detail, /\.update\(\{\s*status:/);
});

test("mobile navigation keeps horse discovery one tap away", () => {
  const tabs = readFileSync(resolve("app/components/MobileTabBar.tsx"), "utf8");
  const icons = readFileSync(resolve("app/components/Icon.tsx"), "utf8");
  assert.match(tabs, /href:\s*["']\/browse["']/);
  assert.match(tabs, /icon:\s*["']horseshoe["']/);
  assert.match(icons, /horseshoe:/);
});

test("launch access copy has no fixed six-month deadline", () => {
  const membership = readFileSync(resolve("app/dashboard/membership/page.tsx"), "utf8");
  const faq = readFileSync(resolve("app/faq/page.tsx"), "utf8");
  assert.doesNotMatch(`${membership}\n${faq}`, /six[- ]month/i);
  assert.match(membership, /Free access continues until the community is ready/);
});

test("normal message bubbles use the product palette without red styling", () => {
  const bubbles = readFileSync(resolve("app/components/MessageBubble.tsx"), "utf8");
  assert.match(bubbles, /#174b38/);
  assert.doesNotMatch(bubbles, /239,68,68|#b91c1c/i);
});

test("horse request CTAs use the live request route", () => {
  const horse = readFileSync(resolve("app/horse/[id]/public-client.tsx"), "utf8");
  const list = readFileSync(resolve("app/browse/page.tsx"), "utf8");
  const legacy = readFileSync(resolve("app/dashboard/borrower/horses/[horseId]/request/page.tsx"), "utf8");
  assert.match(horse, /\/request\?horseId=/);
  assert.match(list, /\/request\?horseId=/);
  assert.match(legacy, /redirect\(`\/request\?horseId=/);
});

test("map ratings use the average with a star instead of Rated copy", () => {
  const map = readFileSync(resolve("app/components/HorseMap.tsx"), "utf8");
  const browse = readFileSync(resolve("app/browse/page.tsx"), "utf8");
  assert.match(map, /name="star"/);
  assert.match(map, /rating_avg/);
  assert.doesNotMatch(map, /`Rated \$\{/);
  assert.match(browse, /select\("horse_id,rating"\)/);
  assert.match(browse, /ratingByHorseId\[horse\.id\]/);
});

test("message removal is built into the card without swipe UI", () => {
  const inbox = readFileSync(resolve("app/messages/page.tsx"), "utf8");
  assert.doesNotMatch(inbox, /SwipeRow|onPointerMove|translateX/);
  assert.match(inbox, /setPendingDeleteId\(t\.request_id\)/);
  assert.match(inbox, /Removing…/);
});

test("horse heights use valid hands notation", () => {
  assert.equal(parseHorseHeight("15.2"), 15.2);
  assert.equal(parseHorseHeight(""), null);
  assert.equal(formatHorseHeight(16.1), "16.1 hh");
  assert.throws(() => parseHorseHeight("18.4"), /final digit can only be 0–3/);
});

test("duplicate signups use Supabase's empty identity signal", () => {
  assert.equal(isExistingSignupEmail({ identities: [] }), true);
  assert.equal(isExistingSignupEmail({ identities: [{ id: "new-identity" }] }), false);
  assert.equal(isExistingSignupEmail({ identities: null }), false);
  assert.equal(isExistingSignupEmail(null), false);
});

test("duplicate signup screen offers an immediate password reset", () => {
  const signup = readFileSync(resolve("app/signup/borrower/BorrowerSignupInner.tsx"), "utf8");
  assert.match(signup, /This email is already in use/);
  assert.match(signup, /resetPasswordForEmail\(existingEmail/);
  assert.match(signup, /Send password reset/);
});

test("branded emails escape user content and include support identity", () => {
  const html = brandedEmail({
    preheader: "Test",
    eyebrow: "Support",
    title: "Hello <member>",
    intro: "Safe & secure",
  });
  assert.match(html, /Hello &lt;member&gt;/);
  assert.match(html, /Safe &amp; secure/);
  assert.match(html, /support@pinchmypony\.com/);
  assert.equal(
    escapeEmailHtml('<script>alert("x")</script>'),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
  );
});

test("contact form sends a branded acknowledgement without hiding support delivery failures", () => {
  const contact = readFileSync(resolve("app/api/contact/route.ts"), "utf8");
  assert.match(contact, /We’ve received your Pinch My Pony message/);
  assert.match(contact, /Resend acknowledgement error/);
  assert.match(contact, /do not make the user submit again/);
});

test("account deletion removes request conversations without a nonexistent recipient column", () => {
  const deletion = readFileSync(resolve("app/api/delete/route.ts"), "utf8");
  assert.doesNotMatch(deletion, /recipient_id/);
  assert.match(deletion, /affectedRequestIds/);
  assert.match(deletion, /\.in\("request_id", affectedRequestIds\)/);
});

test("push registration atomically reassigns a device endpoint to the signed-in account", () => {
  const registration = readFileSync(resolve("app/lib/push/registerPush.ts"), "utf8");
  const migration = readFileSync(resolve("supabase/migrations/202608260001_push_subscription_isolation.sql"), "utf8");
  assert.match(registration, /claim_push_subscription/);
  assert.doesNotMatch(registration, /onConflict:\s*["']user_id,endpoint/);
  assert.match(migration, /unique index if not exists push_subscriptions_endpoint_unique/);
  assert.match(migration, /delete from public\.push_subscriptions where endpoint = p_endpoint/);
  assert.match(migration, /values \(auth\.uid\(\), p_endpoint/);
});

test("missing horse photos and the dashboard share the branded horseshoe", () => {
  const fallback = readFileSync(resolve("app/components/HorseImage.tsx"), "utf8");
  const tabs = readFileSync(resolve("app/components/MobileTabBar.tsx"), "utf8");
  assert.match(fallback, /name="horseshoe"/);
  assert.match(tabs, /icon:\s*["']horseshoe["']/);
});

test("unused legacy tables are protected by RLS", () => {
  const migration = readFileSync(resolve("supabase/migrations/202608260002_legacy_table_rls.sql"), "utf8");
  assert.match(migration, /alter table public\.bookings enable row level security/);
  assert.match(migration, /alter table public\.conversations enable row level security/);
  assert.doesNotMatch(migration, /create policy/);
});
