// How a challenge date is shown to a family.
//
// ⚠️ RENDERED IN UTC ON PURPOSE. The edition's windows are stored as the
// competition's own calendar days (creative-code-challenge-prd.md §1 locks them
// in Australia/Brisbane) — `submission_close` is `2026-08-31T23:59:59Z`, i.e.
// "the end of 31 August". Formatting that with the viewer's local timezone
// pushes it to 1 September for anyone at UTC+n, so an Australian parent was
// shown a deadline one day LATER than the real one, on the single date where
// being wrong costs a child their entry.
//
// Using UTC makes the displayed day equal the stored day everywhere, and match
// the "24–31 August 2026" the public landing page states.
const DAY_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
};

/** A challenge window date as a family should read it. Falls back to the raw
 *  string rather than rendering "Invalid Date" if the API sends something odd. */
export function challengeDayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-AU', DAY_FORMAT);
}

/** Same instant, long month — for headline copy where "31 August 2026" reads
 *  better than "31 Aug 2026". */
export function challengeDayLabelLong(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-AU', { ...DAY_FORMAT, month: 'long' });
}
