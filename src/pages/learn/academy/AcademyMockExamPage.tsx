import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import {
  createAcademySession,
  getAcademySession,
  getAcademySessionReport,
  getAcademySessionSolutions,
  getAcademyStimulus,
  getMyAcademyProduct,
  saveAcademySessionState,
  selfGradeAcademyAttempt,
  submitAcademySession,
  type AcademyPaperQuestion,
  type AcademySession,
  type AcademySessionReport,
  type AcademySolution,
} from './academyApi';
import { AcademyQuestionVisual } from './AcademyQuestionVisual';

const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export function AcademyMockExamPage() {
  const { productSlug = '', paperId = '' } = useParams<{
    productSlug: string;
    paperId: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = searchParams.get('session') ?? '';
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const product = useQuery({
    queryKey: ['academy-product', productSlug],
    queryFn: () => getMyAcademyProduct(productSlug),
    enabled: productSlug !== '',
    retry: false,
  });
  const session = useQuery({
    queryKey: ['academy-session', sessionId],
    queryFn: () => getAcademySession(sessionId),
    enabled: sessionId !== '',
    retry: false,
  });

  const paper = product.data?.product.papers?.find((item) => item.id === paperId);
  const start = async () => {
    if (!product.data || !paper) return;
    setStarting(true);
    setStartError(null);
    try {
      const row = await createAcademySession({
        entitlementId: product.data.id,
        paperId: paper.id,
      });
      setSearchParams({ session: row.id }, { replace: true });
    } catch {
      setStartError('We could not start this paper. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  if (product.isLoading || (sessionId && session.isLoading)) {
    return <p className="lead-text">Loading your mock exam…</p>;
  }
  if (product.isError || !product.data || !paper) {
    return (
      <ExamMessage
        title="Paper unavailable"
        copy="This paper is not available in your unlocked exam product."
        productSlug={productSlug}
      />
    );
  }
  if (!sessionId) {
    return (
      <MockStart
        title={paper.title}
        minutes={paper.time_limit_minutes}
        questionCount={paper._count.questions}
        starting={starting}
        error={startError}
        onStart={start}
        productSlug={productSlug}
      />
    );
  }
  if (session.isError || !session.data || !session.data.paper) {
    return (
      <ExamMessage
        title="Session unavailable"
        copy="This session does not belong to the signed-in learner, or it no longer exists."
        productSlug={productSlug}
      />
    );
  }
  return (
    <MockSessionPlayer
      initialSession={session.data}
      productSlug={productSlug}
      onSessionChanged={() => session.refetch()}
    />
  );
}

function MockSessionPlayer({
  initialSession,
  productSlug,
  onSessionChanged,
}: {
  initialSession: AcademySession;
  productSlug: string;
  onSessionChanged: () => Promise<unknown>;
}) {
  const [session, setSession] = useState(initialSession);
  const [answers, setAnswers] = useState<Record<string, string>>(
    initialSession.state.answers ?? {},
  );
  const [index, setIndex] = useState(initialSession.state.current_question_index ?? 0);
  const [remaining, setRemaining] = useState(
    initialSession.state.remaining_seconds ??
      (initialSession.paper?.time_limit_minutes ?? 0) * 60,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solutions, setSolutions] = useState<AcademySolution[] | null>(null);
  const [report, setReport] = useState<AcademySessionReport | null>(null);
  const remainingRef = useRef(remaining);
  const questions = session.paper?.questions ?? [];
  const current = questions[index];
  const stimulusId = current?.question.stimulus_id ?? '';
  const stimulus = useQuery({
    queryKey: ['academy-stimulus', stimulusId],
    queryFn: () => getAcademyStimulus(stimulusId),
    enabled: stimulusId !== '' && session.status === 'in_progress',
    retry: false,
  });

  useEffect(() => {
    if (questions.length > 0 && index >= questions.length) {
      setIndex(questions.length - 1);
    }
  }, [index, questions.length]);

  useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  const refreshReview = useCallback(async () => {
    const [solutionRows, reportRow] = await Promise.all([
      getAcademySessionSolutions(session.id),
      getAcademySessionReport(session.id),
    ]);
    setSolutions(solutionRows);
    setReport(reportRow);
  }, [session.id]);

  useEffect(() => {
    if (session.status !== 'in_progress') void refreshReview();
  }, [refreshReview, session.status]);

  const save = useCallback(
    async (
      nextAnswers = answers,
      nextIndex = index,
      nextRemaining = remainingRef.current,
    ) => {
      const row = await saveAcademySessionState(session.id, {
        answers: nextAnswers,
        current_question_index: nextIndex,
        remaining_seconds: nextRemaining,
      });
      setSession((currentSession) => ({ ...currentSession, state: row.state }));
    },
    [answers, index, session.id],
  );

  useEffect(() => {
    if (session.status !== 'in_progress' || !current) return;
    const handle = window.setTimeout(() => {
      void save().catch(() => setError('Autosave paused. Check your connection.'));
    }, 800);
    return () => window.clearTimeout(handle);
  }, [answers, current, index, save, session.status]);

  const finish = useCallback(async () => {
    if (submitting || session.status !== 'in_progress') return;
    setSubmitting(true);
    setError(null);
    try {
      await save();
      const nextReport = await submitAcademySession(session.id);
      setReport(nextReport);
      setSession((currentSession) => ({ ...currentSession, status: 'submitted' }));
      await refreshReview();
      await onSessionChanged();
    } catch {
      setError('We could not submit this paper. Your saved answers are still here.');
    } finally {
      setSubmitting(false);
    }
  }, [onSessionChanged, refreshReview, save, session.id, session.status, submitting]);

  useEffect(() => {
    if (session.status !== 'in_progress') return;
    const handle = window.setInterval(() => {
      setRemaining((value) => Math.max(value - 1, 0));
    }, 1000);
    return () => window.clearInterval(handle);
  }, [session.status]);

  useEffect(() => {
    if (remaining === 0 && session.status === 'in_progress') void finish();
  }, [finish, remaining, session.status]);

  if (session.status !== 'in_progress') {
    return (
      <AcademySelfReview
        solutions={solutions}
        report={report}
        onRefresh={refreshReview}
        productSlug={productSlug}
      />
    );
  }
  if (!current) {
    return (
      <ExamMessage
        title="This paper has no questions"
        copy="Ask an adult to report this paper so it can be reviewed."
        productSlug={productSlug}
      />
    );
  }

  const updateAnswer = (value: string) => {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [current.question.id]: value }));
    setError(null);
  };
  const go = async (nextIndex: number) => {
    setIndex(nextIndex);
    try {
      await save(answers, nextIndex, remaining);
    } catch {
      setError('This answer has not saved yet. Please try again before leaving.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl" data-testid="academy-mock-session">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow eyebrow-sky">{session.paper?.title}</div>
          <p className="mt-2 font-black text-slate2">
            Question {index + 1} of {questions.length}
          </p>
        </div>
        <div
          className="rounded-2xl bg-wash-sun px-5 py-3 text-xl font-black text-ink"
          data-testid="academy-mock-timer"
        >
          {formatTime(remaining)}
        </div>
      </header>

      <section className="card-base" data-testid="academy-mock-question">
        <div className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-slate2">
          {current.section ?? current.question.section ?? 'Exam paper'} · {current.marks}{' '}
          {current.marks === 1 ? 'mark' : 'marks'}
        </div>
        {stimulus.data?.body_text && (
          <aside
            className="mb-5 whitespace-pre-wrap rounded-2xl bg-wash-sky p-5 font-bold leading-relaxed text-ink"
            data-testid="academy-question-stimulus"
          >
            {stimulus.data.body_text}
          </aside>
        )}
        <p className="text-xl font-black leading-relaxed text-ink">{current.question.stem_text}</p>
        <AcademyQuestionVisual spec={current.question.render_spec} />
        <AnswerEditor
          item={current}
          value={answers[current.question.id] ?? ''}
          onChange={updateAnswer}
        />
      </section>

      {error && <p className="mt-4 font-bold text-danger">{error}</p>}
      <div className="mt-5 flex flex-wrap justify-between gap-3">
        <button
          type="button"
          className="btn-pill-secondary"
          disabled={index === 0}
          onClick={() => void go(Math.max(index - 1, 0))}
        >
          ← Previous
        </button>
        {index < questions.length - 1 ? (
          <button
            type="button"
            className="btn-pill-primary"
            onClick={() => void go(index + 1)}
          >
            Save & next →
          </button>
        ) : (
          <button
            type="button"
            className="btn-pill-primary"
            disabled={submitting}
            onClick={() => void finish()}
            data-testid="academy-submit-paper"
          >
            {submitting ? 'Submitting…' : 'Submit paper'}
          </button>
        )}
      </div>
    </div>
  );
}

function AnswerEditor({
  item,
  value,
  onChange,
}: {
  item: AcademyPaperQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  const question = item.question;
  if (question.answer_type === 'choice' || question.answer_type === 'multi_choice') {
    const selected = value ? value.split(',') : [];
    return (
      <div className="mt-6 grid gap-3">
        {(question.options ?? []).map((option, optionIndex) => {
          const letter = CHOICE_LETTERS[optionIndex] ?? String(optionIndex + 1);
          const active = selected.includes(letter);
          return (
            <button
              key={letter}
              type="button"
              aria-pressed={active}
              className={`rounded-2xl border-2 p-4 text-left font-bold ${
                active ? 'border-brand-sky bg-wash-sky' : 'border-line bg-white'
              }`}
              onClick={() => {
                if (question.answer_type === 'choice') onChange(letter);
                else {
                  const next = active
                    ? selected.filter((itemValue) => itemValue !== letter)
                    : [...selected, letter];
                  onChange(next.sort().join(','));
                }
              }}
            >
              {letter}. {option}
            </button>
          );
        })}
      </div>
    );
  }
  if (question.answer_type === 'worked' || question.answer_type === 'extended') {
    return (
      <label className="mt-6 block font-black text-ink">
        Your response
        <textarea
          className="mt-2 min-h-48 w-full rounded-2xl border-2 border-line bg-white p-4 font-medium"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Write your full working or response here."
          data-testid="academy-subjective-answer"
        />
      </label>
    );
  }
  return (
    <label className="mt-6 block font-black text-ink">
      Your answer
      <input
        className="mt-2 w-full rounded-2xl border-2 border-line bg-white p-4 font-bold"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function AcademySelfReview({
  solutions,
  report,
  onRefresh,
  productSlug,
}: {
  solutions: AcademySolution[] | null;
  report: AcademySessionReport | null;
  onRefresh: () => Promise<void>;
  productSlug: string;
}) {
  const [saving, setSaving] = useState(false);
  const [hits, setHits] = useState<number[]>([]);
  const subjective = useMemo(
    () =>
      solutions?.find(
        (item) =>
          (item.answer_type === 'worked' || item.answer_type === 'extended') &&
          item.marks_awarded === null,
      ),
    [solutions],
  );

  if (!solutions || !report) return <p className="lead-text">Loading the marking guide…</p>;
  if (!subjective) {
    return <AcademyReport report={report} productSlug={productSlug} />;
  }
  const rubric = subjective.rubric;
  if (!rubric) {
    return (
      <ExamMessage
        title="Marking guide unavailable"
        copy="This response cannot be self-assessed until its official marking guide is reviewed."
        productSlug={productSlug}
      />
    );
  }
  const rows = rubric.kind === 'per_mark' ? rubric.criteria : rubric.bands;
  const submitGrade = async () => {
    setSaving(true);
    try {
      await selfGradeAcademyAttempt(subjective.attempt_id, hits);
      setHits([]);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl" data-testid="academy-self-review">
      <div className="eyebrow eyebrow-bubblegum">Official marking guide</div>
      <h1 className="section-heading mt-3">Check your response honestly</h1>
      <p className="lead-text mt-3">
        This is your own assessment against the official guide. It will never be counted as
        objective accuracy.
      </p>
      {subjective.official_solution && (
        <section className="card-base mt-6 whitespace-pre-wrap">
          <h2 className="text-lg font-black text-ink">Official solution</h2>
          <p className="mt-3 font-medium leading-relaxed">{subjective.official_solution}</p>
        </section>
      )}
      <section className="card-base mt-5">
        <h2 className="text-lg font-black text-ink">Marking criteria</h2>
        <div className="mt-4 grid gap-3">
          {rows.map((row, rowIndex) => {
            const checked = hits.includes(rowIndex);
            return (
              <label key={`${rowIndex}-${row.text}`} className="flex gap-3 rounded-2xl bg-wash-sky p-4">
                <input
                  type={rubric.kind === 'per_mark' ? 'checkbox' : 'radio'}
                  checked={checked}
                  onChange={() => {
                    if (rubric.kind === 'banded') setHits([rowIndex]);
                    else {
                      setHits((currentHits) =>
                        checked
                          ? currentHits.filter((value) => value !== rowIndex)
                          : [...currentHits, rowIndex],
                      );
                    }
                  }}
                />
                <span className="font-bold">
                  {row.text} <span className="text-slate2">({row.marks})</span>
                </span>
              </label>
            );
          })}
        </div>
        <button
          type="button"
          className="btn-pill-primary mt-5"
          disabled={saving}
          onClick={() => void submitGrade()}
        >
          {saving ? 'Saving…' : 'Save self-assessment'}
        </button>
      </section>
    </div>
  );
}

export function AcademyReport({
  report,
  productSlug,
}: {
  report: AcademySessionReport;
  productSlug: string;
}) {
  return (
    <div className="mx-auto max-w-4xl" data-testid="academy-session-report">
      <div className="eyebrow eyebrow-mint">Paper complete</div>
      <h1 className="hero-display mt-3">Your results</h1>
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        <ReportScore
          label="Objective score"
          value={`${report.objective.marks_awarded}/${report.objective.marks_total}`}
          copy={`${Math.round(report.objective.accuracy * 100)}% objective accuracy`}
        />
        <ReportScore
          label="Self-assessed score"
          value={`${report.self_assessed.marks_awarded}/${report.self_assessed.marks_total}`}
          copy="Checked by the learner against the official guide"
        />
        <ReportScore
          label="Combined marks"
          value={`${report.total.marks_awarded}/${report.total.marks_total}`}
          copy="Objective and self-assessed marks remain separate above"
        />
      </div>
      <p className="card-base mt-5 border-2 border-brand-sun font-bold">
        {report.self_assessed.notice}
      </p>
      <Link to={`/learn/exams/${productSlug}`} className="btn-pill-primary mt-6 inline-block">
        Back to exam prep
      </Link>
    </div>
  );
}

function ReportScore({ label, value, copy }: { label: string; value: string; copy: string }) {
  return (
    <section className="card-base">
      <div className="text-xs font-black uppercase tracking-[0.12em] text-slate2">{label}</div>
      <div className="mt-3 text-4xl font-black text-ink">{value}</div>
      <p className="mt-3 text-sm font-bold text-slate2">{copy}</p>
    </section>
  );
}

function MockStart({
  title,
  minutes,
  questionCount,
  starting,
  error,
  onStart,
  productSlug,
}: {
  title: string;
  minutes: number;
  questionCount: number;
  starting: boolean;
  error: string | null;
  onStart: () => Promise<void>;
  productSlug: string;
}) {
  return (
    <div className="card-base mx-auto max-w-2xl text-center" data-testid="academy-mock-start">
      <span className="sticker-sunshine">Timed paper</span>
      <h1 className="section-heading mt-5">{title}</h1>
      <p className="lead-text mt-4">
        {questionCount} questions · {minutes} minutes · Answers stay hidden until submission.
      </p>
      {error && <p className="mt-4 font-bold text-danger">{error}</p>}
      <button
        type="button"
        className="btn-pill-primary mt-6"
        disabled={starting}
        onClick={() => void onStart()}
      >
        {starting ? 'Starting…' : 'Start paper'}
      </button>
      <Link to={`/learn/exams/${productSlug}`} className="btn-pill-secondary ml-3 mt-6 inline-block">
        Not yet
      </Link>
    </div>
  );
}

function ExamMessage({
  title,
  copy,
  productSlug,
}: {
  title: string;
  copy: string;
  productSlug: string;
}) {
  return (
    <div className="card-base mx-auto max-w-2xl text-center">
      <h1 className="section-heading">{title}</h1>
      <p className="lead-text mt-4">{copy}</p>
      <Link to={`/learn/exams/${productSlug}`} className="btn-pill-primary mt-6 inline-block">
        Back to exam prep
      </Link>
    </div>
  );
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}
