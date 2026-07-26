// Pure-logic tests for the Family Guides helpers (parent-portal-family-guides-prd
// §5.1 filters + §5.2 Phase 1 recommendation rule). Node env — no DOM needed.

import { describe, expect, it } from 'vitest';

import {
  EMPTY_GUIDE_FILTERS,
  NO_FAMILY_LOCATION,
  ageMatchesStage,
  filterGuides,
  guideFilterOptions,
  languageLabel,
  locationMatchesFamily,
  selectRecommendedGuides,
  withPortalSrc,
  type ResourceGuideItem,
  DEFAULT_GUIDE_LANGUAGE,
  languageToggleOptions,
} from './resourceGuides';

const guide = (overrides: Partial<ResourceGuideItem> & { slug: string }): ResourceGuideItem => ({
  title: overrides.slug,
  summary: 'A guide.',
  language: 'zh-CN',
  categories: ['family-guides'],
  locations: ['Australia'],
  ageStages: ['5-8'],
  formats: ['html', 'pdf'],
  edition: '',
  lastVerified: '2026-07-01',
  sourceStatus: 'verified',
  featured: false,
  htmlPath: `https://airbotix.ai/resources/${overrides.slug}/`,
  pdfPath: `https://airbotix.ai/resources/${overrides.slug}/guide.pdf`,
  coverImagePath: `https://airbotix.ai/resources/${overrides.slug}/assets/cover.jpg`,
  ...overrides,
});

describe('withPortalSrc', () => {
  it('appends ?src=portal to a bare URL', () => {
    expect(withPortalSrc('https://airbotix.ai/resources/x/')).toBe(
      'https://airbotix.ai/resources/x/?src=portal',
    );
  });

  it('appends &src=portal when the URL already has a query', () => {
    expect(withPortalSrc('https://airbotix.ai/resources/x/?v=1')).toBe(
      'https://airbotix.ai/resources/x/?v=1&src=portal',
    );
  });
});

describe('ageMatchesStage', () => {
  it('matches inclusive numeric ranges', () => {
    expect(ageMatchesStage(5, '5-8')).toBe(true);
    expect(ageMatchesStage(8, '5-8')).toBe(true);
    expect(ageMatchesStage(9, '5-8')).toBe(false);
    expect(ageMatchesStage(4, '5-8')).toBe(false);
  });

  it('matches open-ended stages', () => {
    expect(ageMatchesStage(12, '12+')).toBe(true);
    expect(ageMatchesStage(15, '12+')).toBe(true);
    expect(ageMatchesStage(11, '12+')).toBe(false);
  });

  it('never matches non-numeric stages', () => {
    expect(ageMatchesStage(0, 'Pregnancy / Newborn')).toBe(false);
  });
});

describe('filterGuides', () => {
  const items = [
    guide({ slug: 'a', categories: ['school-education'], locations: ['NSW / Sydney'] }),
    guide({ slug: 'b', categories: ['childcare-early-years'], language: 'en-AU', ageStages: ['0-3'] }),
  ];

  it('returns everything with empty filters', () => {
    expect(filterGuides(items, EMPTY_GUIDE_FILTERS)).toHaveLength(2);
  });

  it('filters by each dimension', () => {
    expect(
      filterGuides(items, { ...EMPTY_GUIDE_FILTERS, category: 'school-education' }).map((i) => i.slug),
    ).toEqual(['a']);
    expect(
      filterGuides(items, { ...EMPTY_GUIDE_FILTERS, location: 'NSW / Sydney' }).map((i) => i.slug),
    ).toEqual(['a']);
    expect(
      filterGuides(items, { ...EMPTY_GUIDE_FILTERS, ageStage: '0-3' }).map((i) => i.slug),
    ).toEqual(['b']);
    expect(
      filterGuides(items, { ...EMPTY_GUIDE_FILTERS, language: 'en-AU' }).map((i) => i.slug),
    ).toEqual(['b']);
  });

  it('ANDs multiple dimensions', () => {
    expect(
      filterGuides(items, { ...EMPTY_GUIDE_FILTERS, category: 'school-education', language: 'en-AU' }),
    ).toHaveLength(0);
  });
});

describe('guideFilterOptions', () => {
  it('returns distinct sorted values per dimension', () => {
    const options = guideFilterOptions([
      guide({ slug: 'a', categories: ['b-cat', 'a-cat'], locations: ['Sydney'] }),
      guide({ slug: 'b', categories: ['a-cat'], locations: ['Adelaide'], language: 'en-AU' }),
    ]);
    expect(options.categories).toEqual(['a-cat', 'b-cat']);
    expect(options.locations).toEqual(['Adelaide', 'Sydney']);
    expect(options.languages).toEqual(['en-AU', 'zh-CN']);
  });
});

describe('languageLabel', () => {
  it('maps known codes and falls back to the raw code', () => {
    expect(languageLabel('zh-CN')).toBe('中文');
    expect(languageLabel('en-AU')).toBe('English');
    expect(languageLabel('fr-FR')).toBe('fr-FR');
  });
});

describe('locationMatchesFamily', () => {
  it('matches the family city anywhere in the location entry', () => {
    expect(locationMatchesFamily('NSW / Sydney', { city: 'Sydney' })).toBe(true);
    expect(locationMatchesFamily('NSW / Greater Sydney', { city: 'sydney' })).toBe(true);
    expect(locationMatchesFamily('Gold Coast', { city: 'Gold Coast' })).toBe(true);
    expect(locationMatchesFamily('Victoria / Melbourne', { city: 'Sydney' })).toBe(false);
  });

  it('matches the state by code or full name', () => {
    expect(locationMatchesFamily('NSW / Sydney', { state: 'NSW' })).toBe(true);
    expect(locationMatchesFamily('Victoria / Greater Melbourne', { state: 'VIC' })).toBe(true);
    expect(locationMatchesFamily('Queensland / Brisbane', { state: 'qld' })).toBe(true);
    expect(locationMatchesFamily('Victoria / Melbourne', { state: 'NSW' })).toBe(false);
  });

  it('never matches country-level entries or an empty profile', () => {
    // "SA" must not word-match inside "Australia".
    expect(locationMatchesFamily('Australia', { state: 'SA' })).toBe(false);
    expect(locationMatchesFamily('Australia / Online', { city: 'Sydney', state: 'NSW' })).toBe(
      false,
    );
    expect(locationMatchesFamily('NSW / Sydney', NO_FAMILY_LOCATION)).toBe(false);
    expect(locationMatchesFamily('NSW / Sydney', { city: '  ', state: '' })).toBe(false);
  });
});

describe('selectRecommendedGuides (Phase 1 rule)', () => {
  const items = [
    guide({ slug: 'plain-new', lastVerified: '2026-07-18' }),
    guide({ slug: 'featured-old', featured: true, ageStages: ['0-3'], lastVerified: '2026-06-01' }),
    guide({ slug: 'featured-age-match', featured: true, ageStages: ['5-8'], lastVerified: '2026-05-01' }),
    guide({ slug: 'featured-new', featured: true, ageStages: ['0-3'], lastVerified: '2026-07-10' }),
    guide({ slug: 'plain-old', lastVerified: '2026-01-01' }),
  ];

  it('prefers featured guides matching kid ages, then remaining featured, then newest', () => {
    expect(selectRecommendedGuides(items, [6]).map((i) => i.slug)).toEqual([
      'featured-age-match',
      'featured-new',
      'featured-old',
    ]);
  });

  it('degrades to featured-then-newest when kid ages are unknown', () => {
    expect(selectRecommendedGuides(items, []).map((i) => i.slug)).toEqual([
      'featured-new',
      'featured-old',
      'featured-age-match',
    ]);
  });

  it('prefers featured guides matching the family city, above age-only matches', () => {
    const withCity = [
      ...items,
      guide({
        slug: 'featured-city-age',
        featured: true,
        locations: ['NSW / Sydney'],
        ageStages: ['5-8'],
        lastVerified: '2026-02-01',
      }),
      guide({
        slug: 'featured-city-only',
        featured: true,
        locations: ['NSW / Greater Sydney'],
        ageStages: ['0-3'],
        lastVerified: '2026-03-01',
      }),
    ];
    // city+age > city-only > age-only, regardless of lastVerified.
    expect(selectRecommendedGuides(withCity, [6], { city: 'Sydney' }).map((i) => i.slug)).toEqual([
      'featured-city-age',
      'featured-city-only',
      'featured-age-match',
    ]);
  });

  it('matches on the family state when the city gives no match', () => {
    const withState = [
      ...items,
      guide({
        slug: 'featured-state',
        featured: true,
        locations: ['Victoria / Melbourne'],
        ageStages: ['0-3'],
        lastVerified: '2026-02-01',
      }),
    ];
    expect(
      selectRecommendedGuides(withState, [6], { city: 'Geelong', state: 'VIC' }).map((i) => i.slug),
    ).toEqual(['featured-state', 'featured-age-match', 'featured-new']);
  });

  it('fills from non-featured newest-first when featured runs out', () => {
    const sparse = [
      guide({ slug: 'plain-new', lastVerified: '2026-07-18' }),
      guide({ slug: 'plain-old', lastVerified: '2026-01-01' }),
      guide({ slug: 'featured-age-match', featured: true, ageStages: ['5-8'] }),
    ];
    expect(selectRecommendedGuides(sparse, [6]).map((i) => i.slug)).toEqual([
      'featured-age-match',
      'plain-new',
      'plain-old',
    ]);
  });

  it('is deterministic on ties (slug ascending)', () => {
    const tied = [
      guide({ slug: 'b-guide', featured: true }),
      guide({ slug: 'a-guide', featured: true }),
    ];
    expect(selectRecommendedGuides(tied, []).map((i) => i.slug)).toEqual(['a-guide', 'b-guide']);
    expect(selectRecommendedGuides([...tied].reverse(), []).map((i) => i.slug)).toEqual([
      'a-guide',
      'b-guide',
    ]);
  });

  it('does not mutate the input and caps at the requested count', () => {
    const input = [...items];
    const result = selectRecommendedGuides(input, [6], NO_FAMILY_LOCATION, 2);
    expect(result).toHaveLength(2);
    expect(input.map((i) => i.slug)).toEqual(items.map((i) => i.slug));
  });

  it('ranks English guides above every 中文 guide, even featured city+age matches (D-PFG-05)', () => {
    const mixed = [
      guide({
        slug: 'zh-featured-city-age',
        featured: true,
        locations: ['NSW / Sydney'],
        ageStages: ['5-8'],
        lastVerified: '2026-07-18',
      }),
      guide({ slug: 'en-plain', language: 'en-AU', lastVerified: '2026-01-01' }),
      guide({ slug: 'en-featured', language: 'en-AU', featured: true, lastVerified: '2026-02-01' }),
    ];
    expect(
      selectRecommendedGuides(mixed, [6], { city: 'Sydney', state: 'NSW' }).map((i) => i.slug),
    ).toEqual(['en-featured', 'en-plain', 'zh-featured-city-age']);
  });

  it('applies the featured/city/age tiers within the English band', () => {
    const english = [
      guide({
        slug: 'en-featured-new',
        language: 'en-AU',
        featured: true,
        ageStages: ['0-3'],
        lastVerified: '2026-07-01',
      }),
      guide({
        slug: 'en-featured-city',
        language: 'en-AU',
        featured: true,
        locations: ['NSW / Sydney'],
        ageStages: ['0-3'],
        lastVerified: '2026-01-01',
      }),
      guide({
        slug: 'en-featured-age',
        language: 'en-AU',
        featured: true,
        ageStages: ['5-8'],
        lastVerified: '2026-03-01',
      }),
    ];
    expect(
      selectRecommendedGuides(english, [6], { city: 'Sydney', state: 'NSW' }).map((i) => i.slug),
    ).toEqual(['en-featured-city', 'en-featured-age', 'en-featured-new']);
  });

  it('back-fills with 中文 guides only when the English pool runs short', () => {
    const shortEnglish = [
      guide({ slug: 'zh-a', featured: true, lastVerified: '2026-07-01' }),
      guide({ slug: 'zh-b', lastVerified: '2026-07-02' }),
      guide({ slug: 'en-only', language: 'en-AU', lastVerified: '2026-01-01' }),
    ];
    expect(selectRecommendedGuides(shortEnglish, []).map((i) => i.slug)).toEqual([
      'en-only',
      'zh-a',
      'zh-b',
    ]);
  });
});

describe('languageToggleOptions', () => {
  it('orders English (the default) first, then 中文, then extras', () => {
    const result = languageToggleOptions([
      guide({ slug: 'a', language: 'zh-CN' }),
      guide({ slug: 'b', language: 'en-AU' }),
      guide({ slug: 'c', language: 'fr-FR' }),
      guide({ slug: 'd', language: 'zh-CN' }),
    ]);
    expect(result).toEqual(['en-AU', 'zh-CN', 'fr-FR']);
    expect(result[0]).toBe(DEFAULT_GUIDE_LANGUAGE);
  });

  it('only offers languages actually present', () => {
    expect(languageToggleOptions([guide({ slug: 'a', language: 'zh-CN' })])).toEqual(['zh-CN']);
    expect(languageToggleOptions([])).toEqual([]);
  });
});
