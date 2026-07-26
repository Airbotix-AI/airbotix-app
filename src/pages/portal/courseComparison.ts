export interface Lesson {
  id: string;
}

export interface CoursePack {
  id: string;
  slug: string;
  title: string;
  description: string;
  target_age_min: number;
  target_age_max: number;
  product_line: 'line_a_creative' | 'line_b_coding';
  lessons: Lesson[];
  estimated_stars: number;
  default_price_aud_cents?: number | null;
  default_session_count?: number | null;
  default_session_minutes?: number | null;
  owner_teacher: { id: string; display_name: string | null } | null;
}

export interface MarketingCourseCard {
  slug: string;
  title: string;
  series: string | null;
  format: 'workshop' | 'weekly' | null;
  weeks_count: number | null;
  age_range: string | null;
  price_label: string | null;
  price_note: string | null;
  session_length: string | null;
  difficulty: number | null;
  compare_ship: string | null;
  compare_best_for: string | null;
}

export interface Kid {
  id: string;
  nickname: string;
  age: number;
}

export interface CourseComparisonRow {
  pack: CoursePack;
  title: string;
  series: string;
  ageLabel: string;
  ageMin: number | null;
  ageMax: number | null;
  difficulty: number | null;
  weeks: number | null;
  lengthLabel: string;
  sessionLength: string | null;
  priceLabel: string;
  priceNote: string | null;
  priceAud: number | null;
  ship: string;
  bestFor: string;
}

export interface CourseRecommendation {
  row: CourseComparisonRow;
  ageDistance: number;
}

export type CommitmentFilter = 'any' | 'taster' | 'short' | 'full';
export type CourseSortKey = 'difficulty' | 'price' | 'length';

const parseAgeRange = (label: string): { min: number | null; max: number | null } => {
  const range = label.match(/(\d+)\s*[–—-]\s*(\d+)/);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const open = label.match(/(\d+)\s*\+/);
  if (open) return { min: Number(open[1]), max: null };
  return { min: null, max: null };
};

const parsePriceAud = (label: string): number | null => {
  const amount = label.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return amount ? Number(amount[1]) : null;
};

const formatAudCents = (cents: number): string => {
  const dollars = cents / 100;
  const hasCents = cents % 100 !== 0;
  return `A$${dollars.toLocaleString('en-AU', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  })}`;
};

const standardPriceForPack = (
  pack: CoursePack,
): { label: string; note: string | null; priceAud: number } | null => {
  const hourlyCents = pack.default_price_aud_cents;
  if (hourlyCents == null) return null;

  const sessions = pack.default_session_count;
  const minutes = pack.default_session_minutes;
  if (sessions != null && minutes != null) {
    const sessionCents = Math.round((hourlyCents * minutes) / 60);
    const totalCents = sessionCents * sessions;
    return {
      label: formatAudCents(totalCents),
      note: `${sessions} ${sessions === 1 ? 'session' : 'sessions'} · ${formatAudCents(sessionCents)} per session`,
      priceAud: totalCents / 100,
    };
  }

  return {
    label: `${formatAudCents(hourlyCents)} / hour`,
    note: 'Standard teaching rate',
    priceAud: hourlyCents / 100,
  };
};

const fallbackSeries = (pack: CoursePack) =>
  pack.product_line === 'line_a_creative' ? 'Creative courses' : 'Coding courses';

export const buildComparisonRows = (
  packs: CoursePack[],
  catalog: MarketingCourseCard[],
): CourseComparisonRow[] => {
  const catalogBySlug = new Map(catalog.map((card) => [card.slug, card]));

  return packs.map((pack) => {
    const card = catalogBySlug.get(pack.slug);
    const ageLabel = card?.age_range ?? `${pack.target_age_min}–${pack.target_age_max}`;
    const parsedAge = parseAgeRange(ageLabel);
    const isWorkshop = card?.format === 'workshop';
    const weeks = card?.weeks_count ?? null;
    const marketingPriceAud = card?.price_label ? parsePriceAud(card.price_label) : null;
    const standardPrice = standardPriceForPack(pack);
    const priceLabel =
      marketingPriceAud != null
        ? card!.price_label!
        : (standardPrice?.label ?? card?.price_label ?? 'Ask us');
    const priceNote =
      marketingPriceAud != null ? (card?.price_note ?? null) : (standardPrice?.note ?? null);

    return {
      pack,
      title: card?.title ?? pack.title,
      series: card?.series ?? fallbackSeries(pack),
      ageLabel,
      ageMin: parsedAge.min ?? pack.target_age_min,
      ageMax: parsedAge.max ?? pack.target_age_max,
      difficulty: card?.difficulty ?? null,
      weeks,
      lengthLabel: isWorkshop
        ? 'One session'
        : weeks != null
          ? `${weeks} weeks`
          : `${pack.lessons.length} ${pack.lessons.length === 1 ? 'lesson' : 'lessons'}`,
      sessionLength: card?.session_length ?? null,
      priceLabel,
      priceNote,
      priceAud: marketingPriceAud ?? standardPrice?.priceAud ?? parsePriceAud(priceLabel),
      ship: card?.compare_ship ?? pack.description,
      bestFor: card?.compare_best_for ?? `Kids aged ${ageLabel}`,
    };
  });
};

export const matchesKid = (row: CourseComparisonRow, kid: Kid | null): boolean => {
  if (!kid || row.ageMin == null) return true;
  return kid.age >= row.ageMin && (row.ageMax == null || kid.age <= row.ageMax);
};

const ageDistanceFromCourseCentre = (row: CourseComparisonRow, kid: Kid): number => {
  if (row.ageMin == null) return Number.MAX_SAFE_INTEGER;
  const upper = row.ageMax ?? Math.max(row.ageMin, kid.age);
  return Math.abs(kid.age - (row.ageMin + upper) / 2);
};

/**
 * Rank only honest age matches from the protected, bookable course set.
 * We do not infer interests the family has not supplied: the closest age-band
 * centre wins, then the gentler and shorter option provides deterministic ties.
 */
export const recommendCoursesForKid = (
  rows: CourseComparisonRow[],
  kid: Kid,
  limit = 3,
): CourseRecommendation[] =>
  rows
    .filter((row) => matchesKid(row, kid))
    .map((row) => ({ row, ageDistance: ageDistanceFromCourseCentre(row, kid) }))
    .sort((a, b) => {
      const ageDistance = a.ageDistance - b.ageDistance;
      if (ageDistance !== 0) return ageDistance;
      const difficulty =
        (a.row.difficulty ?? Number.MAX_SAFE_INTEGER) -
        (b.row.difficulty ?? Number.MAX_SAFE_INTEGER);
      if (difficulty !== 0) return difficulty;
      const length =
        (a.row.weeks ?? Number.MAX_SAFE_INTEGER) - (b.row.weeks ?? Number.MAX_SAFE_INTEGER);
      return length !== 0 ? length : a.row.title.localeCompare(b.row.title);
    })
    .slice(0, limit);

export const matchesCommitment = (
  row: CourseComparisonRow,
  commitment: CommitmentFilter,
): boolean => {
  if (commitment === 'any' || row.weeks == null) return true;
  if (commitment === 'taster') return row.weeks <= 1;
  if (commitment === 'short') return row.weeks >= 2 && row.weeks <= 4;
  return row.weeks >= 5;
};

const sortValue = (row: CourseComparisonRow, key: CourseSortKey): number => {
  if (key === 'difficulty') return row.difficulty ?? Number.MAX_SAFE_INTEGER;
  if (key === 'price') return row.priceAud ?? Number.MAX_SAFE_INTEGER;
  return row.weeks ?? Number.MAX_SAFE_INTEGER;
};

export const sortComparisonRows = (
  rows: CourseComparisonRow[],
  key: CourseSortKey,
): CourseComparisonRow[] =>
  [...rows].sort((a, b) => {
    const primary = sortValue(a, key) - sortValue(b, key);
    if (primary !== 0) return primary;
    const difficulty = sortValue(a, 'difficulty') - sortValue(b, 'difficulty');
    return difficulty !== 0 ? difficulty : a.title.localeCompare(b.title);
  });
