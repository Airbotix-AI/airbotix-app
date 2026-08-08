// Creative Code Challenge — the parent's PRIVATE report
// (`/portal/challenge/:slug/report`; creative-code-challenge-prd.md §5 flow 10,
// §6 "airbotix-app — Portal" row; backend shipped v0.25).
//
// This is the one screen in the competition that hands a family a judgement
// about their own child, so what it REFUSES to do matters as much as what it
// renders:
//
//   • **Nothing before the results are locked.** The backend answers
//     `409 RESULTS_NOT_LOCKED` and this page shows a plain "not published yet"
//     card — never a preview, never a partial, never a number that could still
//     change. A provisional mark is one a family would remember after it stopped
//     being true.
//   • **A failed request is never rendered as "no report".** A 500, an offline
//     tab or an unrecognised code lands on an explicit failure card with a retry.
//     Telling a parent there is no report because a connection dropped would
//     read as their child having been left out of the judging.
//   • **No ranking, no comparison, no other child.** The backend sends none of
//     those, and this page computes none: no percentage, no percentile, no
//     placing, no "top N". Marks are printed only against their own dimension's
//     maximum, exactly as the backend banded them.
//   • **No wording of our own about what the marks mean.** The framing, the band
//     descriptions and the capability sentences are all served — see
//     `ChallengeReportSections.tsx`.
//   • **No mark printed against a rubric it was not given under.** The response
//     carries today's rubric next to marks frozen under `scored_under_version`;
//     when those disagree every marked section is held back and named rather
//     than shown against the wrong maximum (PRD §7 v0.19).
//
// Nothing here is logged: the payload carries a child's project name and the
// judges' written comments about their work.

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';

import { getChallengeReport, type ChallengeParentReport } from './challengeReportApi';
import {
  classifyReportError,
  rubricVersionsAgree,
  type ChallengeReportRefusal,
} from './challengeReportState';
import {
  ReportAggregateCard,
  ReportCapabilityPicture,
  ReportFramingCard,
  ReportJudgeCards,
  ReportNextSteps,
  ReportVersionMismatchCard,
} from './ChallengeReportSections';

interface Kid {
  id: string;
  nickname: string;
  age: number;
}

const PROJECT_TYPE_LABELS: Record<ChallengeParentReport['submission']['project_type'], string> = {
  game: 'Game',
  interactive_web: 'Interactive web project',
};

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

export function ChallengeReportPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const location = useLocation();
  const me = useMe();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;

  // `?kid_id=` makes the report linkable per child (a family with three
  // entrants has three reports at the same route). It is only a hint: the
  // backend resolves the child against the signed-in family and 404s anything
  // that is not theirs, so a hand-edited id buys nothing.
  const [params] = useSearchParams();
  const [kidId, setKidId] = useState(params.get('kid_id') ?? '');

  const kids = useQuery<Kid[]>({
    queryKey: ['families', familyId, 'kids'],
    queryFn: () => api<Kid[]>(`/families/${familyId}/kids`),
    enabled: !!familyId,
  });

  // One child on the profile means there is nothing to choose — the picker
  // would be a step between a parent and the report they followed a link for.
  const onlyKidId = (kids.data ?? []).length === 1 ? (kids.data as Kid[])[0].id : null;
  useEffect(() => {
    if (kidId === '' && onlyKidId) setKidId(onlyKidId);
  }, [kidId, onlyKidId]);

  const report = useQuery<ChallengeParentReport>({
    queryKey: ['challenge-report', slug, kidId],
    queryFn: () => getChallengeReport(slug, kidId),
    enabled: slug !== '' && kidId !== '',
    // The refusals below are answers, not transient failures — retrying a
    // `RESULTS_NOT_LOCKED` three times just delays the same card.
    retry: false,
  });

  if (me.data?.kind === 'user' && !familyId) {
    return <Navigate to="/portal/register" state={{ from: location }} replace />;
  }

  const refusal: ChallengeReportRefusal | null = report.isError
    ? classifyReportError(report.error, 'We could not load this report. Please try again.')
    : null;

  return (
    <div>
      <Header />

      <KidPicker
        kids={kids.data ?? []}
        isLoading={kids.isLoading}
        isError={kids.isError}
        value={kidId}
        onChange={setKidId}
        // Hidden rather than disabled when there is nothing to pick: a select
        // holding one option is a control that cannot do anything.
        hidden={onlyKidId !== null && kidId === onlyKidId}
      />

      {kidId === '' && !kids.isLoading && !kids.isError && (kids.data ?? []).length > 1 && (
        <p className="lead-text mt-6" data-testid="report-choose-child">
          Choose a child above to see their report.
        </p>
      )}

      {kidId !== '' && report.isLoading && (
        <p className="lead-text mt-6" data-testid="report-loading">
          Loading this report…
        </p>
      )}

      {refusal && <RefusalCard refusal={refusal} onRetry={() => void report.refetch()} />}

      {report.data && (
        <ReportBody report={report.data} onRetry={() => void report.refetch()} />
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <div className="eyebrow eyebrow-mint">Creative Code Challenge</div>
      <h1 className="section-heading">Your child’s private report</h1>
      <p className="mt-2 text-[14px] text-slate2">
        Private to your family. Nobody else sees this page.
      </p>
    </div>
  );
}

function KidPicker({
  kids,
  isLoading,
  isError,
  value,
  onChange,
  hidden,
}: {
  kids: Kid[];
  isLoading: boolean;
  isError: boolean;
  value: string;
  onChange: (kidId: string) => void;
  hidden: boolean;
}) {
  if (hidden) return null;
  return (
    <section className="card-base mt-6">
      <label className="block">
        <span className="label-k12">Whose report?</span>
        <select
          className="input-k12 mt-2"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          data-testid="report-kid"
        >
          <option value="">Choose a child</option>
          {kids.map((kid) => (
            <option key={kid.id} value={kid.id}>
              {kid.nickname} (age {kid.age})
            </option>
          ))}
        </select>
      </label>
      {isError && (
        <p className="field-error mt-2" role="alert">
          We could not load your children. Reload the page and try again.
        </p>
      )}
      {!isLoading && !isError && kids.length === 0 && (
        <p className="mt-3 text-[13px] text-slate2">No children on your family profile yet.</p>
      )}
    </section>
  );
}

/**
 * The four refusals, each rendered as what it is.
 *
 * `failed` is the one that must never be mistaken for the others: it is the only
 * one that offers a retry, it says the request failed in those words, and it
 * does NOT say there is no report.
 */
function RefusalCard({
  refusal,
  onRetry,
}: {
  refusal: ChallengeReportRefusal;
  onRetry: () => void;
}) {
  if (refusal.kind === 'not_locked') {
    return (
      <section className="card-base mt-6" data-testid="report-not-published">
        <span className="sticker-sunshine">Not published yet</span>
        <p className="lead-text mt-4">{refusal.message}</p>
        {refusal.results_at && (
          <p className="mt-3 text-[13px] text-slate2">
            Results are expected on {dayLabel(refusal.results_at)}.
          </p>
        )}
        <Link to="/portal" className="btn-pill-secondary mt-6 inline-block">
          Back to the Portal →
        </Link>
      </section>
    );
  }

  if (refusal.kind === 'failed') {
    return (
      <section className="card-base mt-6" role="alert" data-testid="report-failed">
        <span className="sticker-coral">Could not load this report</span>
        <p className="lead-text mt-4">{refusal.message}</p>
        {/* Said in words, because the difference matters: a request that failed
            is not evidence that a report does not exist. */}
        <p className="mt-3 text-[13px] text-slate2">
          This is a failed request, not a missing report — please try again.
        </p>
        <button type="button" onClick={onRetry} className="btn-pill-primary mt-6">
          Try again
        </button>
      </section>
    );
  }

  return (
    <section
      className="card-base mt-6"
      data-testid={refusal.kind === 'not_found' ? 'report-not-found' : 'report-unavailable'}
    >
      <span className="sticker-sky">No report for this child</span>
      <p className="lead-text mt-4">{refusal.message}</p>
      <Link to="/portal" className="btn-pill-secondary mt-6 inline-block">
        Back to the Portal →
      </Link>
    </section>
  );
}

function ReportBody({
  report,
  onRetry,
}: {
  report: ChallengeParentReport;
  onRetry: () => void;
}) {
  // Every marks section below reads the SERVED rubric (today's dimensions,
  // today's maxima) against FROZEN marks. When the two versions disagree none
  // of them can be printed honestly — a dimension the rubric gained since would
  // read as a mark of zero, and a total would be printed against a maximum this
  // child was never scored on. So the whole marked half of the report is held
  // back and named, rather than one card being fixed while its neighbours keep
  // the same wrong denominator.
  const marksAreReadable = rubricVersionsAgree(report.rubric);
  return (
    <>
      <section className="card-base mt-6" data-testid="report-entry">
        <h2 className="section-heading">{report.edition.name}</h2>
        <p className="mt-2 text-[14px] text-ink">
          {report.submission.display_name} ·{' '}
          {PROJECT_TYPE_LABELS[report.submission.project_type] ?? report.submission.project_type}
        </p>
        <p className="mt-1 text-[13px] text-slate2">
          Results finalised {dayLabel(report.results_locked_at)}.
        </p>
        <div className="mt-4 border-t border-hairline pt-4">
          <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate2">
            The one change they made
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
            {report.submission.one_change_note}
          </p>
        </div>
      </section>

      <ReportFramingCard framing={report.framing} />

      {marksAreReadable ? (
        <>
          <ReportCapabilityPicture parts={report.capability_picture} bands={report.bands} />
          <ReportAggregateCard aggregate={report.aggregate} />
          <ReportJudgeCards judges={report.judges} rubric={report.rubric} />
          <ReportNextSteps steps={report.next_steps} />
        </>
      ) : (
        <ReportVersionMismatchCard rubric={report.rubric} onRetry={onRetry} />
      )}
    </>
  );
}
