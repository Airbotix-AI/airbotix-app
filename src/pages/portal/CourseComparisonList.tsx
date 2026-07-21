import { useEffect, useMemo, useState } from 'react';

import { CourseBookingActions } from './CourseBookingActions';
import { COURSE_CTA_SIZE } from './courseCtaStyles';
import { CourseRecommendations } from './CourseRecommendations';
import {
  buildComparisonRows,
  matchesCommitment,
  matchesKid,
  sortComparisonRows,
  type CommitmentFilter,
  type CourseComparisonRow,
  type CoursePack,
  type CourseSortKey,
  type Kid,
  type MarketingCourseCard,
} from './courseComparison';

const ALL = 'all';
const MAX_DIFFICULTY = 4;

const COMMITMENT_OPTIONS: Array<{ value: CommitmentFilter; label: string }> = [
  { value: 'any', label: 'Any length' },
  { value: 'taster', label: 'Just trying it' },
  { value: 'short', label: 'A few weeks' },
  { value: 'full', label: 'A full term' },
];

const SORT_OPTIONS: Array<{ value: CourseSortKey; label: string }> = [
  { value: 'difficulty', label: 'Gentlest first' },
  { value: 'price', label: 'Lowest price' },
  { value: 'length', label: 'Shortest first' },
];

const DifficultyStars = ({ level }: { level: number | null }) => {
  if (level == null) return <span className="text-slate2">—</span>;
  const label = `Difficulty ${level} out of ${MAX_DIFFICULTY}`;
  return (
    <span title={label} className="whitespace-nowrap">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="tracking-[0.08em] text-brand-coral">
        {'★'.repeat(level)}
        <span className="text-slate2/30">{'★'.repeat(MAX_DIFFICULTY - level)}</span>
      </span>
    </span>
  );
};

function FilterButtons<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate2">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`rounded-full border px-3 py-2 text-[12px] font-bold transition-colors ${
                active
                  ? 'border-brand-coral bg-brand-coral text-white'
                  : 'border-hairline bg-canvas-pure text-ink hover:border-brand-coral'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ComparisonCell({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'col-span-2 lg:col-span-1' : ''} aria-label={label}>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate2 lg:hidden">
        {label}
      </div>
      <div className="text-[13px] leading-snug text-ink">{children}</div>
    </div>
  );
}

function CourseRow({
  row,
  kids,
  selectedKid,
  familyId,
  contactEmail,
  expanded,
  onToggle,
}: {
  row: CourseComparisonRow;
  kids: Kid[];
  selectedKid: Kid | null;
  familyId: string | null;
  contactEmail?: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <article
      id={`course-${row.pack.id}`}
      className="overflow-hidden rounded-2xl border border-hairline bg-canvas-pure lg:rounded-none lg:border-x-0 lg:border-t-0"
      data-testid="course-comparison-row"
      data-course-slug={row.pack.slug}
      data-age-min={row.ageMin ?? undefined}
      data-age-max={row.ageMax ?? undefined}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 p-4 lg:min-w-[880px] lg:grid-cols-[minmax(150px,1.2fr)_48px_74px_80px_74px_minmax(110px,1fr)_minmax(110px,1fr)_176px] lg:items-start lg:gap-x-2 lg:px-5">
        <div className="col-span-2 lg:col-span-1" aria-label="Course">
          <div className="text-[11px] font-bold uppercase tracking-[0.09em] text-brand-bubblegum">
            {row.series}
          </div>
          <h2 className="mt-1 text-[15px] font-bold leading-snug text-ink">{row.title}</h2>
          {selectedKid && (
            <div className="mt-2 inline-flex rounded-full bg-brand-mint/15 px-2.5 py-1 text-[11px] font-bold text-ink">
              Good age fit for {selectedKid.nickname}
            </div>
          )}
        </div>
        <ComparisonCell label="Ages">{row.ageLabel}</ComparisonCell>
        <ComparisonCell label="Difficulty">
          <DifficultyStars level={row.difficulty} />
        </ComparisonCell>
        <ComparisonCell label="Time">
          {row.lengthLabel}
          {row.sessionLength && (
            <span className="mt-0.5 block text-[11px] text-slate2">{row.sessionLength} each</span>
          )}
        </ComparisonCell>
        <ComparisonCell label="Price">
          <span className="font-bold">{row.priceLabel}</span>
          {row.priceNote && (
            <span className="mt-0.5 block text-[11px] text-slate2">{row.priceNote}</span>
          )}
        </ComparisonCell>
        <ComparisonCell label="What they make" wide>
          {row.ship}
        </ComparisonCell>
        <ComparisonCell label="Best for" wide>
          <strong>{row.bestFor}</strong>
        </ComparisonCell>
        <div className="col-span-2 self-center lg:col-span-1" aria-label="Course actions">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={`course-options-${row.pack.id}`}
            onClick={onToggle}
            className={`btn-pill-secondary ${COURSE_CTA_SIZE}`}
          >
            {expanded ? 'Hide options' : 'Choose this course'}
          </button>
        </div>
      </div>
      {expanded && (
        <div id={`course-options-${row.pack.id}`}>
          <CourseBookingActions
            pack={row.pack}
            kids={kids}
            suggestedKidId={selectedKid?.id ?? ''}
            familyId={familyId}
            contactEmail={contactEmail}
          />
        </div>
      )}
    </article>
  );
}

export function CourseComparisonList({
  packs,
  catalog,
  kids,
  familyId,
  contactEmail,
  comparisonUnavailable,
}: {
  packs: CoursePack[];
  catalog: MarketingCourseCard[];
  kids: Kid[];
  familyId: string | null;
  contactEmail?: string;
  comparisonUnavailable: boolean;
}) {
  const [kidId, setKidId] = useState<string | null>(null);
  const [series, setSeries] = useState(ALL);
  const [commitment, setCommitment] = useState<CommitmentFilter>('any');
  const [sortKey, setSortKey] = useState<CourseSortKey>('difficulty');
  const [expandedPackId, setExpandedPackId] = useState<string | null>(null);

  const rows = useMemo(() => buildComparisonRows(packs, catalog), [catalog, packs]);
  const effectiveKidId = kidId ?? kids[0]?.id ?? ALL;
  const selectedKid = kids.find((kid) => kid.id === effectiveKidId) ?? null;
  const seriesOptions = useMemo(
    () => [
      { value: ALL, label: 'Any interest' },
      ...Array.from(new Set(rows.map((row) => row.series))).map((value) => ({
        value,
        label: value,
      })),
    ],
    [rows],
  );
  const visibleRows = useMemo(
    () =>
      sortComparisonRows(
        rows.filter(
          (row) =>
            matchesKid(row, selectedKid) &&
            (series === ALL || row.series === series) &&
            matchesCommitment(row, commitment),
        ),
        sortKey,
      ),
    [commitment, rows, selectedKid, series, sortKey],
  );

  const clearFilters = () => {
    setSeries(ALL);
    setCommitment('any');
  };

  const chooseRecommendation = (row: CourseComparisonRow) => {
    if (selectedKid) setKidId(selectedKid.id);
    setSeries(ALL);
    setCommitment('any');
    setExpandedPackId(row.pack.id);
  };

  useEffect(() => {
    if (!expandedPackId) return;
    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(`course-${expandedPackId}`);
      if (typeof element?.scrollIntoView === 'function') {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [expandedPackId]);

  return (
    <section aria-labelledby="course-comparison-title">
      <CourseRecommendations
        rows={rows}
        kids={kids}
        selectedKid={selectedKid}
        onSelectKid={setKidId}
        onChooseCourse={chooseRecommendation}
      />

      <div className="rounded-3xl border border-hairline bg-surface p-5 shadow-card-soft">
        <div className="eyebrow eyebrow-sky">Compare courses</div>
        <h2 id="course-comparison-title" className="section-heading">
          Start with the course that fits your child.
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] font-medium leading-relaxed text-ink-soft">
          Compare age, difficulty, time, price, what they will make, and who each course suits —
          then open the class options you want.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <FilterButtons
            legend="Which child?"
            options={[
              { value: ALL, label: 'All children' },
              ...kids.map((kid) => ({ value: kid.id, label: `${kid.nickname} (age ${kid.age})` })),
            ]}
            value={effectiveKidId}
            onChange={setKidId}
          />
          <FilterButtons
            legend="What are they into?"
            options={seriesOptions}
            value={series}
            onChange={setSeries}
          />
          <FilterButtons
            legend="How much time?"
            options={COMMITMENT_OPTIONS}
            value={commitment}
            onChange={setCommitment}
          />
          <FilterButtons
            legend="Sort by"
            options={SORT_OPTIONS}
            value={sortKey}
            onChange={setSortKey}
          />
        </div>
      </div>

      {comparisonUnavailable && (
        <p className="mt-3 text-[12px] text-slate2">
          A few comparison details are temporarily unavailable. You can still choose a course and
          view its classes.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] font-semibold text-ink-soft">
          {selectedKid
            ? `${visibleRows.length} ${visibleRows.length === 1 ? 'course' : 'courses'} suitable for ${selectedKid.nickname}`
            : `${visibleRows.length} ${visibleRows.length === 1 ? 'course' : 'courses'} to compare`}
        </p>
        {(series !== ALL || commitment !== 'any') && (
          <button type="button" onClick={clearFilters} className="btn-pill-ghost">
            Clear interests and time
          </button>
        )}
      </div>

      {visibleRows.length === 0 ? (
        <div className="card-base mt-4 text-center">
          <span className="sticker-sunshine">No exact match</span>
          <p className="lead-text mt-4">Try a different age, interest, or course length.</p>
          <button type="button" onClick={clearFilters} className="btn-pill-primary mt-4">
            Show all courses
          </button>
        </div>
      ) : (
        <div
          className="mt-4 overflow-x-auto lg:rounded-2xl lg:border lg:border-hairline lg:bg-canvas-pure"
          aria-label="Course comparison list"
        >
          <div
            data-testid="course-comparison-header"
            className="mb-2 hidden min-w-[880px] grid-cols-[minmax(150px,1.2fr)_48px_74px_80px_74px_minmax(110px,1fr)_minmax(110px,1fr)_176px] gap-x-2 bg-wash-sky/50 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate2 lg:grid"
          >
            <div>Course</div>
            <div>Ages</div>
            <div>Difficulty</div>
            <div>Time</div>
            <div>Price</div>
            <div>What they make</div>
            <div>Best for</div>
            <div />
          </div>
          <div className="space-y-3 lg:space-y-0">
            {visibleRows.map((row) => (
              <CourseRow
                key={row.pack.id}
                row={row}
                kids={kids}
                selectedKid={selectedKid}
                familyId={familyId}
                contactEmail={contactEmail}
                expanded={expandedPackId === row.pack.id}
                onToggle={() =>
                  setExpandedPackId((current) => (current === row.pack.id ? null : row.pack.id))
                }
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
