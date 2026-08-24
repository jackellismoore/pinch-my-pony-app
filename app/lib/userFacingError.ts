export function userFacingError(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const message = raw.toLowerCase();

  if (message.includes("not authenticated") || message.includes("jwt") || message.includes("session")) {
    return "Your session has expired. Please sign in again.";
  }
  if (message.includes("network") || message.includes("fetch") || message.includes("offline")) {
    return "We couldn’t connect. Check your internet connection and try again.";
  }
  if (message.includes("permission") || message.includes("row-level security") || message.includes("policy")) {
    return "You don’t have permission to complete that action.";
  }
  if (message.includes("duplicate") || message.includes("unique constraint")) {
    return "That has already been added.";
  }
  return fallback;
}
