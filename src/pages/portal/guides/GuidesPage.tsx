import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { api } from '@/lib/api';
import {
  DEFAULT_GUIDE_LANGUAGE,
  RESOURCES_HUB_URL,
  filterGuides,
  guideFilterOptions,
  languageLabel,
  languageToggleOptions,
  withPortalSrc,
  type GuideFilters,
  type ResourceGuideItem,
  type ResourceGuidesResponse,
} from './resourceGuides';
import { GuideCard } from './GuideCard';

// URL query keys for the filters (shareable / revisitable per PRD §5.1).
// `language` is special: absent = DEFAULT_GUIDE_LANGUAGE (D-PFG-04), so plain
// /portal/guides links always open the English catalogue.
const PARAM_KEYS = {
  category: 'category',
  location: 'location',
  ageStage: 'age',
  language: 'language',
} as const;

type FilterKey = keyof typeof PARAM_KEYS;
type SelectKey = Exclude<FilterKey, 'language'>;

const SELECT_LABELS: Record<SelectKey, { label: string; all: string }> = {
  category: { label: 'Topic', all: 'All topics' },
  location: { label: 'Location', all: 'All locations' },
  ageStage: { label: 'Age', all: 'All ages' },
};

/**
 * `/portal/guides` — Family Guides catalogue (parent-portal-family-guides-prd
 * §5.1). Card grid over `GET /portal/resource-guides`, opening in English by
 * default with a prominent EN/中文 toggle (D-PFG-04) plus topic / location /
 * age selects, all reflected in the URL query. Cards + PDF buttons open the
 * marketing-site reading pages in a new tab with `?src=portal` attribution.
 */
export function GuidesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const guides = useQuery<ResourceGuidesResponse>({
    queryKey: ['resource-guides'],
    queryFn: () => api<ResourceGuidesResponse>('/portal/resource-guides'),
  });

  const language = searchParams.get(PARAM_KEYS.language) ?? DEFAULT_GUIDE_LANGUAGE;
  const filters: GuideFilters = {
    category: searchParams.get(PARAM_KEYS.category),
    location: searchParams.get(PARAM_KEYS.location),
    ageStage: searchParams.get(PARAM_KEYS.ageStage),
    language,
  };
  const hasActiveFilters =
    filters.category !== null ||
    filters.location !== null ||
    filters.ageStage !== null ||
    searchParams.get(PARAM_KEYS.language) !== null;

  const items = useMemo(() => guides.data?.items ?? [], [guides.data?.items]);
  const languages = useMemo(() => languageToggleOptions(items), [items]);
  // Topic / location / age options follow the selected language so the selects
  // never offer a value that dead-ends into "No matches" purely by language.
  const options = useMemo(
    () => guideFilterOptions(items.filter((item) => item.language === language)),
    [items, language],
  );
  const visible = filterGuides(items, filters);

  const setParam = (key: FilterKey, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(PARAM_KEYS[key], value);
    else next.delete(PARAM_KEYS[key]);
    setSearchParams(next, { replace: true });
  };
  // The default language keeps the URL clean (no param) so shared links stay
  // canonical; picking anything else lands in the query like the other filters.
  const setLanguage = (value: string) =>
    setParam('language', value === DEFAULT_GUIDE_LANGUAGE ? '' : value);
  const clearFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  const optionValues: Record<SelectKey, string[]> = {
    category: options.categories,
    location: options.locations,
    ageStage: options.ageStages,
  };

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow eyebrow-mint">Family Guides</div>
        <h1 className="section-heading">Guides for your family&apos;s next step.</h1>
        <p className="lead-text mt-3 max-w-3xl">
          Free, verified guides for Australian families — school, childcare, government support
          and more. They open on our website, ready to read or download as PDF.
        </p>
      </div>

      {languages.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Guide language">
          {languages.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setLanguage(value)}
              aria-pressed={language === value}
              className={language === value ? 'btn-pill-primary' : 'btn-pill-secondary'}
            >
              {languageLabel(value)}
            </button>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(Object.keys(SELECT_LABELS) as SelectKey[]).map((key) => (
            <label key={key}>
              <span className="label-k12">{SELECT_LABELS[key].label}</span>
              <select
                className="input-k12"
                value={filters[key] ?? ''}
                onChange={(event) => setParam(key, event.target.value)}
              >
                <option value="">{SELECT_LABELS[key].all}</option>
                {optionValues[key].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}

      {guides.isLoading && <p className="lead-text">Loading guides…</p>}

      {!guides.isLoading && (guides.isError || items.length === 0) && (
        <div className="card-base text-center">
          <span className="sticker-sunshine">Guides are catching their breath</span>
          <p className="lead-text mt-4">
            We couldn&apos;t load the guide library just now — the rest of the Portal is fine.
            You can browse every guide on our website instead.
          </p>
          <a
            href={withPortalSrc(RESOURCES_HUB_URL)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-pill-secondary mt-6"
          >
            Visit the resources hub →
          </a>
        </div>
      )}

      {!guides.isLoading && !guides.isError && items.length > 0 && visible.length === 0 && (
        <div className="card-base text-center">
          <span className="sticker-sky">No matches</span>
          <p className="lead-text mt-4">No guides match these filters yet — try widening them.</p>
          <button type="button" onClick={clearFilters} className="btn-pill-secondary mt-6">
            Clear filters
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((item: ResourceGuideItem) => (
          <GuideCard key={item.slug} item={item} />
        ))}
      </div>

      {hasActiveFilters && visible.length > 0 && (
        <div className="mt-8 text-center">
          <button type="button" onClick={clearFilters} className="btn-pill-ghost">
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
