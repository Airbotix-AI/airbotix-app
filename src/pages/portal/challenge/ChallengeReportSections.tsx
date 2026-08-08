// The report's sections (creative-code-challenge-prd.md §5 flow 10, §7).
//
// ⚠️ **Almost every sentence on this screen is SERVED, not authored here.** The
// band descriptions, the capability wording, the framing constraint, the rubric
// dimensions and the "why this course" line all come from the backend, which is
// what keeps a copy edit in a React file from turning "what this one entry
// showed the judges" into a grade, a qualification, or a label about a child.
// Where this file does write copy it describes the SHAPE of the data ("what the
// judges wrote"), never what the marks mean about the child.
//
// ⚠️ **Nothing here compares one child with another.** No percentage, no
// percentile, no rank, no cohort statistic and no placing — including this
// child's own, which the backend deliberately does not send. A mark is only ever
// printed against its own dimension's maximum, exactly as the backend banded it.

import { Link } from 'react-router-dom';

import type {
  ChallengeReportAggregate,
  ChallengeReportBand,
  ChallengeReportBandId,
  ChallengeReportCapabilityPart,
  ChallengeReportFraming,
  ChallengeReportJudge,
  ChallengeReportNextStep,
  ChallengeReportRubric,
} from './challengeReportApi';
import { judgeMark, markOutOf } from './challengeReportState';

/**
 * Chip colour per band. Deliberately NOT a traffic-light scale (no coral, which
 * on every other Portal screen means "something went wrong"): the bands describe
 * where a piece of work got to, and a red chip would read as a failing grade —
 * exactly the framing the served copy exists to prevent.
 */
const BAND_STICKER: Record<ChallengeReportBandId, string> = {
  starting: 'sticker-sky',
  developing: 'sticker-sunshine',
  capable: 'sticker-mint',
  extending: 'sticker-bubblegum',
};

const bandSticker = (band: ChallengeReportBandId) => BAND_STICKER[band] ?? 'sticker-sky';

/**
 * The framing constraint, rendered verbatim from the response.
 *
 * First on the page and never collapsible: a parent reads what this is before
 * they read a single number.
 */
export function ReportFramingCard({ framing }: { framing: ChallengeReportFraming }) {
  return (
    <section className="card-base mt-6" data-testid="report-framing">
      <span className="sticker-sky">What this is</span>
      <p className="lead-text mt-4">{framing.scope}</p>
      <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-ink">
        {framing.not_a.map((line) => (
          <li key={line}>• {line}</li>
        ))}
      </ul>
      <p className="mt-4 text-[13px] leading-relaxed text-slate2">{framing.rubric_note}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-slate2">{framing.privacy_note}</p>
    </section>
  );
}

/**
 * What the page shows INSTEAD of every mark when the served rubric is not the
 * one these marks were given under.
 *
 * The backend serves the rubric published TODAY next to marks frozen under
 * `scored_under_version` (`challenge-parent-report.service.ts`), so after a
 * version bump — PRD §7 v0.19 calls that "a one-line diff" — pairing the two
 * prints a mark against a maximum this child was never scored on, and a
 * dimension the rubric only gained afterwards prints as a mark of zero. PRD §7
 * v0.19 already requires aggregation to REFUSE across mixed versions rather
 * than average them; this is the same refusal on the one screen that hands a
 * family a judgement about their own child.
 *
 * It names both versions, because a family who rings up needs to be able to say
 * which two numbers did not line up, and it offers a retry so a stale cached
 * response is not mistaken for this.
 */
export function ReportVersionMismatchCard({
  rubric,
  onRetry,
}: {
  rubric: ChallengeReportRubric;
  onRetry: () => void;
}) {
  return (
    <section className="card-base mt-6" role="alert" data-testid="report-version-mismatch">
      <span className="sticker-sunshine">Marks not shown</span>
      <p className="lead-text mt-4">
        These marks were given under{' '}
        {rubric.scored_under_version
          ? `version ${rubric.scored_under_version} of the judging rubric`
          : 'a version of the judging rubric that was not recorded'}
        , and the rubric published now is version {rubric.current_version}. Airbotix will not print
        a mark against a maximum your child was not scored on, so the marks are held back here
        rather than shown against the wrong scale.
      </p>
      <p className="mt-3 text-[13px] leading-relaxed text-slate2">
        Nothing about the judging has changed and nothing has been lost — this is a display rule,
        not a result. Please contact Airbotix and we will send this report against the rubric it
        was actually marked on.
      </p>
      <button type="button" onClick={onRetry} className="btn-pill-primary mt-6">
        Try again
      </button>
    </section>
  );
}

/** The six capability parts, plus the band scale they are read against. */
export function ReportCapabilityPicture({
  parts,
  bands,
}: {
  parts: ChallengeReportCapabilityPart[];
  bands: ChallengeReportBand[];
}) {
  return (
    <section className="card-base mt-6" data-testid="report-capability">
      <h2 className="section-heading">What this entry showed</h2>
      <p className="mt-2 text-[13px] text-slate2">
        One part for each of the six things the judges marked, banded against that part’s own
        maximum.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {parts.map((part) => (
          <div
            key={part.rubric_dimension}
            className="rounded-2xl border border-hairline bg-canvas p-4"
            data-testid={`report-band-${part.rubric_dimension}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[15px] font-bold text-ink">{part.title}</h3>
              <span className={bandSticker(part.band)}>{part.band_label}</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-slate2">{part.evidence_of}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink">{part.band_description}</p>
            <p className="mt-2 text-[12px] text-slate2">
              Judges’ average for this part: {markOutOf(part.mean, part.max_points)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-hairline pt-4" data-testid="report-band-scale">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate2">
          The four bands
        </h3>
        <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink">
          {bands.map((band) => (
            <li key={band.id}>
              <span className={bandSticker(band.id)}>{band.label}</span>{' '}
              <span className="ml-1">{band.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The aggregate the bands were read from — the frozen, locked numbers. */
export function ReportAggregateCard({ aggregate }: { aggregate: ChallengeReportAggregate }) {
  return (
    <section className="card-base mt-6" data-testid="report-aggregate">
      <h2 className="section-heading">The judges’ marks together</h2>
      <p className="mt-2 text-[14px] text-ink">
        {aggregate.judge_count === 1
          ? '1 judge’s marks stand behind this report.'
          : `${aggregate.judge_count} independent judges’ marks stand behind this report.`}{' '}
        Average total: {markOutOf(aggregate.mean_total, aggregate.total_points)}.
      </p>
      {/* Stated, not hidden: the platform refuses to award a placing on fewer
          than the minimum independent opinions, so a family reading a picture
          built on fewer should be told that is what they are reading. */}
      {aggregate.below_minimum_independent_scores && (
        <p
          className="mt-3 rounded-2xl border border-brand-sunshine/40 bg-wash-sunshine px-4 py-3 text-[13px] leading-relaxed text-ink"
          data-testid="report-below-minimum"
        >
          Fewer than {aggregate.minimum_independent_scores} judges’ marks stand behind this
          report. Airbotix normally looks for at least {aggregate.minimum_independent_scores}{' '}
          independent opinions, so please read this as a lighter picture than usual.
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-left text-slate2">
              <th className="pb-2 font-semibold">What was marked</th>
              <th className="pb-2 font-semibold">Judges’ average</th>
            </tr>
          </thead>
          <tbody>
            {aggregate.dimensions.map((dimension) => (
              <tr key={dimension.key} className="border-t border-hairline">
                <td className="py-2 text-ink">{dimension.label}</td>
                <td className="py-2 whitespace-nowrap text-ink">
                  {markOutOf(dimension.mean, dimension.max_points)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Each valid judge's six marks and their written comment.
 *
 * Judges are positions (`Judge 1`, `Judge 2`), never people — the backend does
 * not publish judge identity to the entrant's family (PRD §7), so there is
 * nothing here to correlate.
 */
export function ReportJudgeCards({
  judges,
  rubric,
}: {
  judges: ChallengeReportJudge[];
  /**
   * The WHOLE rubric, not just its dimensions: the judge total is printed
   * against `total_points` — the rubric's own published maximum — rather than a
   * sum recomputed from the dimension list, so a dimension the response happens
   * not to carry cannot quietly shrink the denominator a child is judged on.
   */
  rubric: ChallengeReportRubric;
}) {
  const { dimensions } = rubric;
  return (
    <section className="card-base mt-6" data-testid="report-judges">
      <h2 className="section-heading">What each judge wrote</h2>
      <p className="mt-2 text-[13px] text-slate2">
        Judges read entries independently. They are shown here as “Judge 1”, “Judge 2” and so on —
        Airbotix does not publish who judged an entry.
      </p>

      <div className="mt-5 space-y-4">
        {judges.map((judge) => (
          <article
            key={judge.label}
            className="rounded-2xl border border-hairline bg-canvas p-4"
            data-testid={`report-judge-${judge.label.replace(/\s+/g, '-').toLowerCase()}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[15px] font-bold text-ink">{judge.label}</h3>
              <span className="text-[13px] text-slate2">
                Total {markOutOf(judge.total, rubric.total_points)}
              </span>
            </div>
            <ul className="mt-3 space-y-1 text-[13px] text-ink">
              {dimensions.map((dimension) => (
                <li key={dimension.key} className="flex flex-wrap justify-between gap-2">
                  <span>{dimension.label}</span>
                  {/* `judgeMark`, never `?? 0`: a dimension this judge did not
                      score is "we don't know", and printing it as `0 / 15` puts
                      a mark on a child's report that nobody ever gave them. */}
                  <span className="whitespace-nowrap text-slate2">
                    {judgeMark(judge.scores, dimension.key, dimension.max_points)}
                  </span>
                </li>
              ))}
            </ul>
            {/* A judge who filed no comment is stated as such. An empty space
                where a comment should be reads as a comment we withheld. */}
            <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
              {judge.comments?.trim()
                ? judge.comments
                : 'This judge recorded marks without a written comment.'}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

/**
 * Next steps. A `course` step names a course that is genuinely published today
 * and quotes the catalogue's OWN evidence line; a `practice` step is what the
 * backend returns when nothing in the catalogue matched, and this page must not
 * dress it up as a recommendation.
 */
export function ReportNextSteps({ steps }: { steps: ChallengeReportNextStep[] }) {
  if (steps.length === 0) return null;
  return (
    <section className="card-base mt-6" data-testid="report-next-steps">
      <h2 className="section-heading">Ideas for what’s next</h2>
      <p className="mt-2 text-[13px] text-slate2">
        Suggestions that follow from the two parts of this entry with the most room to grow. They
        are ideas, not requirements.
      </p>
      <div className="mt-5 space-y-4">
        {steps.map((step) => (
          <div
            key={step.rubric_dimension}
            className="rounded-2xl border border-hairline bg-canvas p-4"
            data-testid={`report-next-step-${step.rubric_dimension}`}
          >
            <h3 className="text-[15px] font-bold text-ink">{step.focus_title}</h3>
            {step.kind === 'course' && step.course ? (
              <>
                <p className="mt-2 text-[14px] text-ink">{step.course.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate2">{step.course.why}</p>
                <p className="mt-1 text-[12px] text-slate2">
                  For ages {step.course.target_age_min}–{step.course.target_age_max}.
                </p>
                <Link
                  to={`/portal/courses/${step.course.slug}`}
                  className="btn-pill-secondary mt-3 inline-block"
                >
                  See this course →
                </Link>
              </>
            ) : (
              <ul className="mt-2 space-y-1 text-[13px] leading-relaxed text-ink">
                {step.practice.map((idea) => (
                  <li key={idea}>• {idea}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
