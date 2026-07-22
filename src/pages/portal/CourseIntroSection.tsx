import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { api } from '@/lib/api';

interface CoursePack {
  id: string;
  slug: string;
  title: string;
  description: string;
  target_age_min: number;
  target_age_max: number;
  product_line: 'line_a_creative' | 'line_b_coding';
  lessons: Array<{ id: string }>;
}

interface MarketingCourseCard {
  slug: string;
  title: string;
  series: string | null;
  format: 'workshop' | 'weekly' | null;
  weeks_count: number | null;
  age_range: string | null;
  price_label: string | null;
  compare_ship: string | null;
  compare_best_for: string | null;
}

interface CoursePreview {
  pack: CoursePack;
  title: string;
  series: string;
  ageLabel: string;
  lengthLabel: string;
  priceLabel: string;
  ship: string;
  bestFor: string;
}

const BOOKABLE_COURSE_PACKS_ENDPOINT = '/course-packs?bookable=true';
const MARKETING_COURSES_ENDPOINT = '/courses';
const COURSE_PREVIEW_LIMIT = 3;

const COURSE_INTRO_COPY = {
  eyebrow: 'Explore courses',
  heading: 'See what your child could make next.',
  lead: 'A quick look at age fit, time, and what each course helps your child create.',
  viewAll: 'Browse all courses →',
  loading: 'Loading course ideas…',
  error: 'Course previews are taking a moment to load. You can still browse the full catalogue.',
  empty: 'New course dates are on the way. Browse the catalogue to see what is coming next.',
} as const;

const COURSE_LINE_STYLES: Record<CoursePack['product_line'], string> = {
  line_a_creative: 'bg-wash-coral text-brand-coral',
  line_b_coding: 'bg-wash-sky text-brand-sky',
};

const fallbackSeries = (pack: CoursePack) =>
  pack.product_line === 'line_a_creative' ? 'Creative courses' : 'Coding courses';

const buildCoursePreviews = (
  packs: CoursePack[],
  catalog: MarketingCourseCard[],
): CoursePreview[] => {
  const catalogBySlug = new Map(catalog.map((card) => [card.slug, card]));

  return packs.map((pack) => {
    const card = catalogBySlug.get(pack.slug);
    const ageLabel = card?.age_range ?? `${pack.target_age_min}–${pack.target_age_max}`;
    const weeks = card?.weeks_count ?? null;

    return {
      pack,
      title: card?.title ?? pack.title,
      series: card?.series ?? fallbackSeries(pack),
      ageLabel,
      lengthLabel:
        card?.format === 'workshop'
          ? 'One session'
          : weeks != null
            ? `${weeks} weeks`
            : `${pack.lessons.length} ${pack.lessons.length === 1 ? 'lesson' : 'lessons'}`,
      priceLabel: card?.price_label ?? 'Ask us',
      ship: card?.compare_ship ?? pack.description,
      bestFor: card?.compare_best_for ?? `Kids aged ${ageLabel}`,
    };
  });
};

export function CourseIntroSection() {
  const packs = useQuery<CoursePack[]>({
    queryKey: ['course-packs', 'bookable'],
    queryFn: () => api<CoursePack[]>(BOOKABLE_COURSE_PACKS_ENDPOINT),
  });
  const marketingCatalog = useQuery<MarketingCourseCard[]>({
    queryKey: ['marketing-courses', 'comparison'],
    queryFn: () => api<MarketingCourseCard[]>(MARKETING_COURSES_ENDPOINT),
  });
  const previews = buildCoursePreviews(packs.data ?? [], marketingCatalog.data ?? []).slice(
    0,
    COURSE_PREVIEW_LIMIT,
  );

  return (
    <section className="mt-10" aria-labelledby="dashboard-course-intros-heading">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="eyebrow eyebrow-bubblegum">{COURSE_INTRO_COPY.eyebrow}</div>
          <h2 id="dashboard-course-intros-heading" className="section-heading">
            {COURSE_INTRO_COPY.heading}
          </h2>
          <p className="lead-text mt-3">{COURSE_INTRO_COPY.lead}</p>
        </div>
        <Link to="/portal/courses" className="btn-pill-secondary shrink-0 self-start md:self-auto">
          {COURSE_INTRO_COPY.viewAll}
        </Link>
      </div>

      {packs.isLoading && (
        <div className="card-base mt-6" role="status">
          <p className="text-[15px] font-medium text-ink-soft">{COURSE_INTRO_COPY.loading}</p>
        </div>
      )}

      {packs.isError && (
        <div className="card-base mt-6">
          <p className="text-[15px] font-medium text-ink-soft">{COURSE_INTRO_COPY.error}</p>
        </div>
      )}

      {!packs.isLoading && !packs.isError && previews.length === 0 && (
        <div className="card-base mt-6">
          <p className="text-[15px] font-medium text-ink-soft">{COURSE_INTRO_COPY.empty}</p>
        </div>
      )}

      {previews.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {previews.map((row) => (
            <article
              key={row.pack.id}
              className="overflow-hidden rounded-3xl bg-canvas-pure shadow-card-soft transition-transform duration-200 hover:-translate-y-1"
            >
              <div
                className={`flex min-h-28 items-center justify-between px-6 py-5 ${COURSE_LINE_STYLES[row.pack.product_line]}`}
              >
                <span className="text-[12px] font-bold uppercase tracking-[0.12em]">
                  {row.series}
                </span>
                <span className="text-[44px] font-extrabold opacity-70" aria-hidden="true">
                  ✦
                </span>
              </div>

              <div className="p-6">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold uppercase tracking-[0.1em] text-slate2">
                  <span>Ages {row.ageLabel}</span>
                  <span>{row.lengthLabel}</span>
                  <span>{row.priceLabel}</span>
                </div>
                <h3 className="mt-3 text-[22px] font-bold leading-tight text-ink">{row.title}</h3>
                <p className="mt-3 line-clamp-3 text-[15px] font-medium leading-relaxed text-ink-soft">
                  {row.ship}
                </p>
                <div className="mt-4 rounded-2xl bg-surface px-4 py-3 text-[13px] font-semibold text-ink">
                  <span className="text-brand-coral">Best for:</span> {row.bestFor}
                </div>
                <Link
                  to="/portal/courses"
                  aria-label={`View ${row.title} in Courses`}
                  className="mt-5 inline-flex text-[14px] font-bold text-ink underline decoration-brand-coral decoration-2 underline-offset-4"
                >
                  See course options →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
