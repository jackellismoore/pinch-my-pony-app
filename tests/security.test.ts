import assert from "node:assert/strict";
import test from "node:test";
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
