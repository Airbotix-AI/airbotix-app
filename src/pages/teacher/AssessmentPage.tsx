import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { getKidAssessment, type Criterion, type KidAssessment, type ProcessEvent } from './classApi';

const SOURCE_LABEL: Record<ProcessEvent['source'], string> = {
  kid_edit: 'Kid edit',
  ai_turn: 'AI turn',
  prediction: 'Prediction',
  debug: 'Debug',
};

const SOURCE_STICKER: Record<ProcessEvent['source'], string> = {
  kid_edit: 'sticker-mint',
  ai_turn: 'sticker-sky',
  prediction: 'sticker-sunshine',
  debug: 'sticker-coral',
};

const COVERAGE_LABEL: Record<Criterion['coverage'], string> = {
  none: 'No evidence yet',
  suggested: 'Auto-suggested (unconfirmed)',
  confirmed: 'Evidence confirmed',
};

const COVERAGE_STICKER: Record<Criterion['coverage'], string> = {
  none: 'sticker-coral',
  suggested: 'sticker-sunshine',
  confirmed: 'sticker-mint',
};

/**
 * Per-kid assessment — `/teacher/classes/:classId/kids/:kidId/assessment`
 * (PRD §17.12 J12 + §17.16/§17.17). Shows the kid's prompt history, the
 * process/authorship TIMELINE (explicitly "evidence of the child's process",
 * NOT a kid-vs-AI percentage), and a rubric criterion-coverage view so a grade
 * is moderation-defensible (auto-suggested ≠ teacher-confirmed). Read-only and
 * exportable as evidence.
 */
export function AssessmentPage() {
  const { classId, kidId } = useParams<{ classId: string; kidId: string }>();

  const assessment = useQuery<KidAssessment>({
    queryKey: ['teacher', 'assessment', classId, kidId],
    queryFn: () => getKidAssessment(classId!, kidId!),
    enabled: !!classId && !!kidId,
  });

  if (assessment.isLoading) return <p className="lead-text">Loading assessment…</p>;
  if (assessment.isError || !assessment.data)
    return <p className="lead-text text-brand-coral">Could not load this assessment.</p>;

  const a = assessment.data;
  const exportRows = a.timeline.map((e) => `${e.at},${e.source},"${e.summary.replace(/"/g, '""')}"`);
  const exportBlob = `at,source,summary\n${exportRows.join('\n')}`;

  return (
    <div data-testid="assessment-view">
      <Link to={`/teacher/classes/${classId}`} className="btn-pill-ghost mb-4 -ml-3 text-[13px]">
        ← Class dashboard
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow eyebrow-sky">Assessment</div>
          <h1 className="hero-display">{a.nickname}</h1>
        </div>
        <a
          data-testid="export-evidence"
          download={`assessment-${a.kidId}.csv`}
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(exportBlob)}`}
          className="btn-pill-secondary text-[13px]"
        >
          Export evidence
        </a>
      </div>

      <p className="lead-text mb-6 text-[14px]">
        This is evidence of the child&apos;s <strong>process</strong> — not a contribution
        percentage. Writing prompts is the child&apos;s work too.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Prompt history (the kid's own authoring). */}
        <section className="card-base p-4" data-testid="prompt-history">
          <h2 className="section-heading mb-3" style={{ fontSize: '18px' }}>
            Prompt history
          </h2>
          {a.promptHistory.length === 0 ? (
            <p className="text-[14px] text-ink-soft">No prompts yet.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {a.promptHistory.map((p, i) => (
                <li
                  key={i}
                  data-testid="prompt-entry"
                  className="rounded-xl bg-wash-sky px-3 py-2 text-[14px] text-ink"
                >
                  {p}
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Process / authorship timeline. */}
        <section className="card-base p-4" data-testid="contribution-breakdown">
          <h2 className="section-heading mb-3" style={{ fontSize: '18px' }}>
            Process timeline
          </h2>
          <ul className="flex flex-col gap-2">
            {a.timeline.map((e) => (
              <li key={e.id} data-testid="timeline-event" className="flex items-start gap-2">
                <span className={SOURCE_STICKER[e.source]}>{SOURCE_LABEL[e.source]}</span>
                <span className="text-[14px] text-ink">{e.summary}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Rubric criterion-coverage (moderation-defensible). */}
      <section className="card-base mt-6 p-4" data-testid="criterion-coverage">
        <h2 className="section-heading mb-3" style={{ fontSize: '18px' }}>
          Success criteria
        </h2>
        <ul className="flex flex-col gap-2">
          {a.criteria.map((c) => (
            <li
              key={c.id}
              data-testid="criterion-row"
              data-coverage={c.coverage}
              className="flex items-center justify-between gap-3 rounded-xl border border-hairline px-3 py-2"
            >
              <span className="text-[14px] font-medium text-ink">{c.label}</span>
              <span className={COVERAGE_STICKER[c.coverage]}>{COVERAGE_LABEL[c.coverage]}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
