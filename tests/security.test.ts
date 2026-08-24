import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { bearerToken, safeInternalRedirect } from "../app/lib/security.ts";
import { launchFeatureEnabled } from "../app/lib/launchFeatures.ts";
import { userFacingError } from "../app/lib/userFacingError.ts";

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
