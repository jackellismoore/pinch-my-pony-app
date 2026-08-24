export function parseHorseHeight(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{1,2}(?:\.[0-3])?$/.test(trimmed)) {
    throw new Error("Height must use hands, for example 15.2 hh (the final digit can only be 0–3).");
  }
  const height = Number(trimmed);
  if (height < 8 || height > 20.3) {
    throw new Error("Height must be between 8.0 hh and 20.3 hh.");
  }
  return height;
}

export function formatHorseHeight(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return `${String(value).replace(/\s*hh$/i, "")} hh`;
}
