import { COURSE_CTA_SIZE } from './courseCtaStyles';
import { recommendCoursesForKid, type CourseComparisonRow, type Kid } from './courseComparison';

const difficultyLabel = (level: number | null): string => {
  if (level == null) return 'Difficulty to be confirmed';
  if (level <= 1) return 'Gentle first step';
  if (level === 2) return 'Beginner-friendly challenge';
  if (level === 3) return 'A bigger challenge';
  return 'Advanced challenge';
};

export function CourseRecommendations({
  rows,
  kids,
  selectedKid,
  onSelectKid,
  onChooseCourse,
}: {
  rows: CourseComparisonRow[];
  kids: Kid[];
  selectedKid: Kid | null;
  onSelectKid: (kidId: string) => void;
  onChooseCourse: (row: CourseComparisonRow) => void;
}) {
  if (kids.length === 0 || !selectedKid) return null;

  const recommendations = recommendCoursesForKid(rows, selectedKid);

  return (
    <section
      className="mb-5 rounded-3xl border border-brand-mint/30 bg-brand-mint/10 p-5 shadow-card-soft"
      aria-labelledby="course-recommendations-title"
      data-testid="course-recommendations"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-mint">Recommended for your child</div>
          <h2 id="course-recommendations-title" className="section-heading">
            Top picks for {selectedKid.nickname}
          </h2>
          <p className="mt-2 max-w-3xl text-[14px] font-medium leading-relaxed text-ink-soft">
            Based on {selectedKid.nickname}&apos;s age ({selectedKid.age}) and the courses currently
            open for booking. Choose an interest or time preference below to refine these picks.
          </p>
        </div>

        {kids.length > 1 && (
          <div aria-label="Choose a child for recommendations" className="flex flex-wrap gap-2">
            {kids.map((kid) => (
              <button
                key={kid.id}
                type="button"
                aria-pressed={kid.id === selectedKid.id}
                onClick={() => onSelectKid(kid.id)}
                className={`rounded-full border px-3 py-2 text-[12px] font-bold transition-colors ${
                  kid.id === selectedKid.id
                    ? 'border-brand-mint bg-brand-mint text-ink'
                    : 'border-hairline bg-canvas-pure text-ink hover:border-brand-mint'
                }`}
              >
                {kid.nickname} · age {kid.age}
              </button>
            ))}
          </div>
        )}
      </div>

      {recommendations.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-hairline bg-canvas-pure p-4">
          <div className="text-[15px] font-bold text-ink">No exact age match is open yet</div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            We are not guessing with an unsuitable course. Use the full list below or request help
            finding the right next class for {selectedKid.nickname}.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-3" aria-label="Recommended courses">
          {recommendations.map(({ row }, index) => (
            <article
              key={row.pack.id}
              className="flex h-full flex-col rounded-2xl border border-hairline bg-canvas-pure p-4"
              data-testid="course-recommendation-card"
              data-course-slug={row.pack.slug}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-brand-mint/20 px-2.5 py-1 text-[11px] font-bold text-ink">
                  {index === 0 ? 'Best age match' : `Also suits ${selectedKid.nickname}`}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-bubblegum">
                  {row.series}
                </span>
              </div>
              <h3 className="mt-3 text-[18px] font-bold leading-snug text-ink">{row.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{row.bestFor}</p>
              <div className="mt-3 text-[12px] font-semibold text-slate2">
                Ages {row.ageLabel} · {difficultyLabel(row.difficulty)} · {row.lengthLabel}
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
                <strong className="text-ink">They will make:</strong> {row.ship}
              </p>
              <div className="mt-auto pt-4">
                <button
                  type="button"
                  onClick={() => onChooseCourse(row)}
                  className={`btn-pill-primary ${COURSE_CTA_SIZE}`}
                >
                  View course options
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
