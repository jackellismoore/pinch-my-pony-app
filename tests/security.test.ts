import assert from "node:assert/strict";
import test from "node:test";
import { bearerToken, safeInternalRedirect } from "../app/lib/security.ts";

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
