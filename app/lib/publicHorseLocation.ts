const UK_POSTCODE_RE = /\\b[A-Z]{1,2}\\d[A-Z\\d]?\\s*\\d[A-Z]{2}\\b/i;

export function publicHorseLocation(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Nearby area";

  const parts = raw
    .split(",")
    .map((part) => part.replace(UK_POSTCODE_RE, "").trim())
    .filter(Boolean);

  if (parts.length >= 3) {
    return parts[parts.length - 2] || "Nearby area";
  }

  if (parts.length === 2) {
    return parts[0] || "Nearby area";
  }

  return UK_POSTCODE_RE.test(raw) ? "Nearby area" : "Nearby area";
}

export function publicHorseCoordinate(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}
