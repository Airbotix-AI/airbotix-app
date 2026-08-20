// How a challenge date is shown to a family.
//
// Challenge windows are real instants authored in Australia/Brisbane. Prisma
// serialises `2026-08-24T00:00:00+10:00` as `2026-08-23T14:00:00Z`; formatting
// that UTC value in UTC incorrectly shows 23 August. Always render the instant
// back in the competition timezone so every family sees the locked 24–31
// August window regardless of their device timezone.
const DAY_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Australia/Brisbane',
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
