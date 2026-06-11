// Payload field helpers shared by the audit copy builders (auditCopy.ts /
// auditCopyKids.ts). Defensive by design: payloads are untyped JSON.

export type Payload = Record<string, unknown>;

export const asNum = (v: unknown): number | null => (typeof v === 'number' ? v : null);
export const asStr = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v : null;
export const asBool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);

/** `1000` → `"$10.00 AUD"` */
export function formatAud(cents: unknown): string | null {
  const c = asNum(cents);
  if (c == null) return null;
  return `$${(c / 100).toFixed(2)} AUD`;
}

/** `10` → `"10 Stars"`, `1` → `"1 Star"` */
export function formatStars(n: unknown): string | null {
  const s = asNum(n);
  if (s == null) return null;
  return `${s} ${s === 1 ? 'Star' : 'Stars'}`;
}

/** `"first_visit"` → `"First visit"` */
export function humanize(raw: string): string {
  const words = raw.replace(/[._-]+/g, ' ').trim().split(/\s+/);
  if (words.length === 0) return raw;
  const joined = words.join(' ');
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

/** Join non-empty fragments with a middot. */
export function line(...parts: Array<string | null | undefined>): string | undefined {
  const kept = parts.filter((p): p is string => !!p);
  return kept.length > 0 ? kept.join(' · ') : undefined;
}

/** `"VISA"` + `"4242"` → `"Visa ···· 4242"` */
export function cardLabel(p: Payload): string | undefined {
  const brand = asStr(p.brand);
  const last4 = asStr(p.last4);
  const pretty = brand
    ? brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase()
    : null;
  if (pretty && last4) return `${pretty} ···· ${last4}`;
  return pretty ?? (last4 ? `···· ${last4}` : undefined);
}
