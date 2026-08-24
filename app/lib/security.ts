export function bearerToken(value: string | null): string | null {
  const match = (value ?? "").match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function safeInternalRedirect(value: string | null, fallback = "/") {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
