/**
 * Family Guides catalogue logic (parent-portal-family-guides-prd.md §5.1–§5.2).
 *
 * Types mirror the frozen manifest contract served by
 * `GET /portal/resource-guides` (platform-backend proxies the marketing-site
 * `manifest.json` and absolutises the asset paths). Pure helpers here — no
 * React, no fetch — so filtering and the Phase 1 recommendation rule are
 * deterministic and unit-testable in the node test env.
 */

/** One catalogue entry, camelCase straight from the manifest (§5.4 contract). */
export interface ResourceGuideItem {
  slug: string;
  title: string;
  summary: string;
  language: string;
  categories: string[];
  locations: string[];
  ageStages: string[];
  formats: string[];
  edition: string;
  lastVerified: string;
  sourceStatus: string;
  /** manifest may omit it — the backend defaults it to false */
  featured: boolean;
  /** ABSOLUTE URL (backend prefixes the manifest origin) */
  htmlPath: string;
  /** ABSOLUTE URL */
  pdfPath: string;
  /** ABSOLUTE URL */
  coverImagePath: string;
}

export interface ResourceGuidesResponse {
  fetchedAt: string;
  items: ResourceGuideItem[];
}

/** Public fallback when the portal endpoint is down / has never synced (503). */
export const RESOURCES_HUB_URL = 'https://airbotix.ai/resources';

const PORTAL_SRC_PARAM = 'src=portal';

/** Append the `?src=portal` attribution param to an (absolute) guide URL. */
export function withPortalSrc(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}${PORTAL_SRC_PARAM}`;
}

const LANGUAGE_LABELS: Record<string, string> = {
  'zh-CN': '中文',
  'en-AU': 'English',
};

/** Human label for a manifest language code (falls back to the raw code). */
export function languageLabel(language: string): string {
  return LANGUAGE_LABELS[language] ?? language;
}

/**
 * The catalogue language `/portal/guides` opens in when the URL carries no
 * `language` param (D-PFG-04: English-first, with a visible 中文 toggle).
 */
export const DEFAULT_GUIDE_LANGUAGE = 'en-AU';

// Toggle order: English first (the default), then 中文, then anything new the
// manifest grows — so an unexpected language never becomes unreachable.
const LANGUAGE_TOGGLE_ORDER = ['en-AU', 'zh-CN'];

/** Languages present in the catalogue, ordered for the EN/中文 toggle. */
export function languageToggleOptions(items: ResourceGuideItem[]): string[] {
  const present = [...new Set(items.map((item) => item.language))];
  const preferred = LANGUAGE_TOGGLE_ORDER.filter((language) => present.includes(language));
  const extras = present
    .filter((language) => !LANGUAGE_TOGGLE_ORDER.includes(language))
    .sort((a, b) => a.localeCompare(b));
  return [...preferred, ...extras];
}

/** Active filter state — `null` means "all" for that dimension. */
export interface GuideFilters {
  category: string | null;
  location: string | null;
  ageStage: string | null;
  language: string | null;
}

export const EMPTY_GUIDE_FILTERS: GuideFilters = {
  category: null,
  location: null,
  ageStage: null,
  language: null,
};

export function filterGuides(
  items: ResourceGuideItem[],
  filters: GuideFilters,
): ResourceGuideItem[] {
  return items.filter(
    (item) =>
      (filters.category === null || item.categories.includes(filters.category)) &&
      (filters.location === null || item.locations.includes(filters.location)) &&
      (filters.ageStage === null || item.ageStages.includes(filters.ageStage)) &&
      (filters.language === null || item.language === filters.language),
  );
}

export interface GuideFilterOptions {
  categories: string[];
  locations: string[];
  ageStages: string[];
  languages: string[];
}

/** Distinct, sorted option lists for the four filter dimensions. */
export function guideFilterOptions(items: ResourceGuideItem[]): GuideFilterOptions {
  const uniqueSorted = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));
  return {
    categories: uniqueSorted(items.flatMap((i) => i.categories)),
    locations: uniqueSorted(items.flatMap((i) => i.locations)),
    ageStages: uniqueSorted(items.flatMap((i) => i.ageStages)),
    languages: uniqueSorted(items.map((i) => i.language)),
  };
}

/**
 * Does a kid of `age` (whole years) fall inside a manifest age stage?
 * Stages are `"a-b"` (inclusive), `"12+"`, or non-numeric labels like
 * `"Pregnancy / Newborn"` (never matched by a kid age).
 */
export function ageMatchesStage(age: number, stage: string): boolean {
  const range = /^(\d+)-(\d+)$/.exec(stage);
  if (range) return age >= Number(range[1]) && age <= Number(range[2]);
  const openEnded = /^(\d+)\+$/.exec(stage);
  if (openEnded) return age >= Number(openEnded[1]);
  return false;
}

const overlapsKidAges = (item: ResourceGuideItem, kidAges: number[]): boolean =>
  kidAges.some((age) => item.ageStages.some((stage) => ageMatchesStage(age, stage)));

/**
 * The family's known location for the §5.2 city tier — the `city`/`state`
 * fields of `GET /families/:id` (both optional in the profile).
 */
export interface FamilyLocation {
  city?: string | null;
  state?: string | null;
}

export const NO_FAMILY_LOCATION: FamilyLocation = { city: null, state: null };

// Family.state stores AU state codes (see familyProfile.ts AU_STATES) while
// manifest `locations` mostly spell states out ("Victoria / Melbourne").
const AU_STATE_NAMES: Record<string, string> = {
  NSW: 'New South Wales',
  VIC: 'Victoria',
  QLD: 'Queensland',
  SA: 'South Australia',
  WA: 'Western Australia',
  TAS: 'Tasmania',
  ACT: 'Australian Capital Territory',
  NT: 'Northern Territory',
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whole-word, case-insensitive containment — so state code "SA" never matches
// inside "Australia" and "Sydney" still matches "NSW / Greater Sydney".
const containsWord = (haystack: string, word: string): boolean =>
  new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i').test(haystack);

/**
 * Does one manifest `locations` entry (e.g. "NSW / Sydney",
 * "Victoria / Greater Melbourne") cover the family's city or state?
 * City matches on the word appearing anywhere in the entry; state matches the
 * code ("NSW") or its full name ("Queensland"). Country-level entries like
 * "Australia" never count as a location match.
 */
export function locationMatchesFamily(location: string, family: FamilyLocation): boolean {
  const city = family.city?.trim();
  if (city && containsWord(location, city)) return true;
  const stateCode = family.state?.trim().toUpperCase();
  if (!stateCode) return false;
  const stateName = AU_STATE_NAMES[stateCode];
  return (
    containsWord(location, stateCode) ||
    (stateName !== undefined && containsWord(location, stateName))
  );
}

const matchesFamilyLocation = (item: ResourceGuideItem, family: FamilyLocation): boolean =>
  item.locations.some((location) => locationMatchesFamily(location, family));

// Newest lastVerified first; slug ascending as the deterministic tie-break.
const byNewestVerified = (a: ResourceGuideItem, b: ResourceGuideItem): number =>
  b.lastVerified.localeCompare(a.lastVerified) || a.slug.localeCompare(b.slug);

export const RECOMMENDED_GUIDE_COUNT = 3;

// One past the last same-language tier (0–4), so ANY guide in the preferred
// language outranks EVERY guide in another language.
const LANGUAGE_TIER_OFFSET = 5;

/**
 * Phase 1 dashboard recommendation rule (PRD §5.2, frontend-only).
 *
 * Language first (D-PFG-05): the Portal is an English product, so guides in
 * `preferredLanguage` (default `en-AU`, D-PFG-04) always rank above other
 * languages — a 中文 guide can only appear when fewer than `count` English
 * guides exist, keeping the block full rather than empty.
 *
 * Within each language band, among `featured` guides prefer entries matching
 * the family's known city/state (`locations`) and the kids' ages
 * (`ageStages`), city above age — mirroring the §6 Phase 2 backend ordering
 * (城市匹配 > 年龄段匹配):
 * 1. featured + location match + age match,
 * 2. featured + location match,
 * 3. featured + age match,
 * 4. remaining featured,
 * 5. everything else, newest `lastVerified` first.
 * Each tier is itself ordered newest-first with a slug tie-break, so the
 * result is deterministic. `kidAges` may be empty and `familyLocation` may be
 * empty/omitted (profile fields unset) — the rule then degrades tier by tier
 * down to featured-then-newest.
 */
export function selectRecommendedGuides(
  items: ResourceGuideItem[],
  kidAges: number[],
  familyLocation: FamilyLocation = NO_FAMILY_LOCATION,
  count: number = RECOMMENDED_GUIDE_COUNT,
  preferredLanguage: string = DEFAULT_GUIDE_LANGUAGE,
): ResourceGuideItem[] {
  const tier = (item: ResourceGuideItem): number => {
    const languageOffset = item.language === preferredLanguage ? 0 : LANGUAGE_TIER_OFFSET;
    if (!item.featured) return languageOffset + 4;
    const locationMatch = matchesFamilyLocation(item, familyLocation);
    const ageMatch = overlapsKidAges(item, kidAges);
    if (locationMatch && ageMatch) return languageOffset;
    if (locationMatch) return languageOffset + 1;
    if (ageMatch) return languageOffset + 2;
    return languageOffset + 3;
  };
  return [...items].sort((a, b) => tier(a) - tier(b) || byNewestVerified(a, b)).slice(0, count);
}
