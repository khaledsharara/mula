/** Normalizes a raw merchant/sender string for alias lookup: "PAYMOB  Sample Coffee Co " -> "PAYMOB SAMPLE COFFEE CO". */
export function normalizeRaw(raw: string): string {
  return raw
    .replace(/[^A-Za-z0-9؀-ۿ &'.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/** Turns "SAMPLE CORNER MARKE" into "Sample Corner Marke" for a first-time display name. */
export function titleCase(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|[\s(/&-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Case-insensitive contains match used by pickers' search. */
export function matches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}
