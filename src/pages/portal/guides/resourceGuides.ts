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

// Newest lastVerified first; slug ascending as the deterministic tie-break.
const byNewestVerified = (a: ResourceGuideItem, b: ResourceGuideItem): number =>
  b.lastVerified.localeCompare(a.lastVerified) || a.slug.localeCompare(b.slug);

export const RECOMMENDED_GUIDE_COUNT = 3;

/**
 * Phase 1 dashboard recommendation rule (PRD §5.2, frontend-only):
 * 1. featured guides whose ageStages overlap the family's kids' ages,
 * 2. remaining featured guides,
 * 3. everything else, newest `lastVerified` first.
 * Each tier is itself ordered newest-first with a slug tie-break, so the
 * result is deterministic. `kidAges` may be empty (ages unknown) — the rule
 * then degrades to featured-then-newest.
 */
export function selectRecommendedGuides(
  items: ResourceGuideItem[],
  kidAges: number[],
  count: number = RECOMMENDED_GUIDE_COUNT,
): ResourceGuideItem[] {
  const tier = (item: ResourceGuideItem): number => {
    if (item.featured && overlapsKidAges(item, kidAges)) return 0;
    if (item.featured) return 1;
    return 2;
  };
  return [...items].sort((a, b) => tier(a) - tier(b) || byNewestVerified(a, b)).slice(0, count);
}
