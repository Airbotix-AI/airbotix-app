import { Link } from 'react-router-dom';

import { formatAud } from '@/lib/money';
import type { AvailableClass } from './availableClasses';

export interface PlannedTimetableClass {
  slug: string;
  title: string;
  ageRange: string | null;
  city: string;
  state: string;
  periodLabel: string;
  deliveryLabel: string;
}

interface ClassesTimetableProps {
  bookable: AvailableClass[];
  planned: PlannedTimetableClass[];
}

interface TimetableRow {
  slug: string;
  title: string;
  ageRange: string | null;
  bookable: AvailableClass[];
  planned: PlannedTimetableClass[];
}

const OPEN_NOW = 'Open for booking';
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const AUSTRALIAN_STATE_TIME_ZONES: Record<string, string> = {
  ACT: 'Australia/Sydney',
  NSW: 'Australia/Sydney',
  NT: 'Australia/Darwin',
  QLD: 'Australia/Brisbane',
  SA: 'Australia/Adelaide',
  TAS: 'Australia/Hobart',
  VIC: 'Australia/Melbourne',
  WA: 'Australia/Perth',
};

const DEFAULT_CLASS_TIME_ZONE = 'Australia/Brisbane';

// Keep this slug contract aligned with the marketing timetable. Both surfaces
// use the same transparent course-sticker artwork rather than course covers.
const courseStickerPath = (slug: string) => `/media/course-stickers/${slug}.webp`;

const STICKER_CLASS =
  'pointer-events-none absolute -bottom-3 -right-3 z-0 h-24 w-24 rotate-3 select-none object-contain opacity-30 saturate-125 transition-all duration-300 group-hover:rotate-0 group-hover:scale-105 group-hover:opacity-40';

const dateLabel = (iso: string, state?: string) => {
  const date = new Date(iso);
  const timeZone = (state && AUSTRALIAN_STATE_TIME_ZONES[state]) || DEFAULT_CLASS_TIME_ZONE;
  const dateParts = new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'numeric',
    timeZone,
  }).formatToParts(date);
  const day = dateParts.find((part) => part.type === 'day')?.value ?? String(date.getDate());
  const monthIndex = Number(dateParts.find((part) => part.type === 'month')?.value ?? 1) - 1;

  return `${day} ${MONTH_NAMES[monthIndex]} · ${date.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  })}`;
};

const periodRank = (label: string, termYears: number[]) => {
  if (label === OPEN_NOW) return 0;
  const term = label.match(/Term\s+(\d+)\s+(\d{4})/i);
  if (term) return Number(term[2]) * 10 + Number(term[1]) * 2;
  if (/holiday/i.test(label)) {
    const earliestYear = termYears.length > 0 ? Math.min(...termYears) : new Date().getFullYear();
    return earliestYear * 10 + 9;
  }
  return Number.MAX_SAFE_INTEGER;
};

const cityForClass = (item: AvailableClass) => item.venue?.city ?? 'Online';

const classState = (item: AvailableClass) => item.venue?.state ?? '';

function UpcomingCell({ item }: { item: PlannedTimetableClass }) {
  return (
    <div className="group relative min-h-[172px] overflow-hidden rounded-2xl border border-hairline bg-canvas-pure p-4">
      <img
        src={courseStickerPath(item.slug)}
        alt=""
        aria-hidden="true"
        className={STICKER_CLASS}
      />
      <div className="relative z-10 max-w-[68%]">
        <span className="inline-flex rounded-full bg-wash-sunshine px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink">
          Upcoming
        </span>
        <p className="mt-3 text-[13px] font-bold leading-snug text-ink">{item.deliveryLabel}</p>
        <p className="mt-2 text-[12px] leading-relaxed text-slate2">
          Dates, venue and teacher coming soon.
        </p>
        <Link
          to={`/portal/courses/${encodeURIComponent(item.slug)}`}
          className="mt-3 inline-flex text-[12px] font-extrabold text-brand-coral underline underline-offset-4"
        >
          Course details
        </Link>
      </div>
    </div>
  );
}

function BookableCell({ items, slug }: { items: AvailableClass[]; slug: string }) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="group relative min-h-[172px] overflow-hidden rounded-2xl border border-brand-mint/60 bg-wash-mint/40 p-4"
        >
          <img
            src={courseStickerPath(slug)}
            alt=""
            aria-hidden="true"
            className={STICKER_CLASS}
          />
          <div className="relative z-10 max-w-[70%]">
            <span className="inline-flex rounded-full bg-brand-mint px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink">
              Seats open
            </span>
            <p className="mt-3 text-[13px] font-bold text-ink">
              {dateLabel(item.starts_at, item.venue?.state)}
            </p>
            {item.venue?.suburb && <p className="mt-1 text-[12px] text-slate2">{item.venue.suburb}</p>}
            <p className="mt-2 text-[12px] font-bold text-ink">
              {item.course_total_aud_cents == null
                ? 'Price available at checkout'
                : formatAud(item.course_total_aud_cents)}
              {' · '}
              {item.seats_remaining} seats left
            </p>
            <Link
              to={`/portal/checkout/class/${item.id}`}
              className="mt-3 inline-flex text-[12px] font-extrabold text-brand-coral underline underline-offset-4"
            >
              Book this class
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function CityTimetable({
  city,
  state,
  bookable,
  planned,
}: {
  city: string;
  state: string;
  bookable: AvailableClass[];
  planned: PlannedTimetableClass[];
}) {
  const termYears = planned
    .map((item) => item.periodLabel.match(/\b(\d{4})\b/)?.[1])
    .filter((year): year is string => Boolean(year))
    .map(Number);
  const periods = [
    ...(bookable.length > 0 ? [OPEN_NOW] : []),
    ...new Set(planned.map((item) => item.periodLabel)),
  ].sort((a, b) => periodRank(a, termYears) - periodRank(b, termYears) || a.localeCompare(b));

  const rows = new Map<string, TimetableRow>();
  for (const item of planned) {
    const row = rows.get(item.slug) ?? {
      slug: item.slug,
      title: item.title,
      ageRange: item.ageRange,
      bookable: [],
      planned: [],
    };
    row.planned.push(item);
    rows.set(item.slug, row);
  }
  for (const item of bookable) {
    const slug = item.course_pack?.slug ?? item.id;
    const row = rows.get(slug) ?? {
      slug,
      title: item.course_pack?.title ?? item.name,
      ageRange: null,
      bookable: [],
      planned: [],
    };
    row.bookable.push(item);
    rows.set(slug, row);
  }

  return (
    <section aria-labelledby={`timetable-${city.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className="mb-3 flex items-baseline gap-2">
        <h2
          id={`timetable-${city.replace(/\s+/g, '-').toLowerCase()}`}
          className="text-[22px] font-extrabold text-ink"
        >
          {city}
        </h2>
        {state && <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate2">{state}</span>}
      </div>

      <div
        className="max-w-full overflow-x-auto rounded-2xl border border-hairline bg-canvas-pure shadow-card-soft"
        data-testid="classes-timetable-scroll"
      >
        <table className="min-w-[780px] border-collapse text-left">
          <caption className="sr-only">{city} classes by course and school period</caption>
          <thead className="border-b border-hairline bg-wash-sky/50">
            <tr>
              <th className="sticky left-0 z-20 min-w-[230px] border-r border-hairline bg-canvas-pure px-4 py-4 text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate2">
                Course
              </th>
              {periods.map((period) => (
                <th key={period} className="min-w-[250px] px-4 py-4 text-[13px] font-extrabold text-ink">
                  {period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...rows.values()].map((row) => (
              <tr key={row.slug} className="border-b border-hairline align-top last:border-0">
                <th className="sticky left-0 z-10 border-r border-hairline bg-canvas-pure px-4 py-5">
                  <Link
                    to={`/portal/courses/${encodeURIComponent(row.slug)}`}
                    className="text-[14px] font-extrabold leading-snug text-ink hover:text-brand-coral"
                  >
                    {row.title}
                  </Link>
                  {row.ageRange && <span className="mt-2 block text-[12px] font-semibold text-slate2">Ages {row.ageRange}</span>}
                </th>
                {periods.map((period) => {
                  const plannedItem = row.planned.find((item) => item.periodLabel === period);
                  return (
                    <td key={period} className="p-3">
                      {period === OPEN_NOW && row.bookable.length > 0 ? (
                        <BookableCell items={row.bookable} slug={row.slug} />
                      ) : plannedItem ? (
                        <UpcomingCell item={plannedItem} />
                      ) : (
                        <span className="px-2 text-slate2" aria-label="Nothing scheduled">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ClassesTimetable({ bookable, planned }: ClassesTimetableProps) {
  const cities = new Map<string, { city: string; state: string }>();
  for (const item of planned) cities.set(item.city, { city: item.city, state: item.state });
  for (const item of bookable) {
    const city = cityForClass(item);
    cities.set(city, { city, state: classState(item) });
  }

  return (
    <div className="grid gap-10">
      {[...cities.values()]
        .sort((a, b) => a.city.localeCompare(b.city))
        .map(({ city, state }) => (
          <CityTimetable
            key={city}
            city={city}
            state={state}
            bookable={bookable.filter((item) => cityForClass(item) === city)}
            planned={planned.filter((item) => item.city === city)}
          />
        ))}
    </div>
  );
}
