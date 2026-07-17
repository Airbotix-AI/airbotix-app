// Academy — NAPLAN Maths practice (`/learn/academy`). A kid picks a year level,
// works through ~20 Numeracy questions one at a time, answers each (multiple
// choice or a typed value), sees instant feedback with the official answer, and
// finishes on a summary of their running progress. Kid surface: shared `api`
// client + kid session (`useMe`) + K-12 design tokens, like every other Learn page.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import {
  ACADEMY_DEFAULT_YEAR,
  ACADEMY_SUBJECT,
  ACADEMY_YEAR_LEVELS,
  academyAssetUrl,
  getAcademyProgress,
  listAcademyQuestions,
  submitAcademyAttempt,
  type AcademyProgress,
  type AcademyQuestion,
  type AcademyYearLevel,
} from './academyApi';

// Choice questions map option index → letter; the LETTER is what we submit.
const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;
const FALLBACK_CHOICE_COUNT = 4;

type AnsweredResult = { is_correct: boolean; correct_answer: string; submitted: string };

export function AcademyPracticePage() {
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;

  const [yearLevel, setYearLevel] = useState<AcademyYearLevel>(ACADEMY_DEFAULT_YEAR);
  // Bumped by "Practise more" to pull a fresh set + fresh progress.
  const [setNo, setSetNo] = useState(0);

  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<Record<number, AnsweredResult>>({});
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'practice' | 'summary'>('practice');
  const startedAt = useRef<number>(Date.now());

  const questions = useQuery<AcademyQuestion[]>({
    queryKey: ['academy-questions', yearLevel, setNo],
    queryFn: () => listAcademyQuestions({ yearLevel }),
  });

  const progress = useQuery<AcademyProgress>({
    queryKey: ['academy-progress', kidId, setNo],
    queryFn: () => getAcademyProgress(kidId!),
    enabled: phase === 'summary' && !!kidId,
  });

  // Start each set/question fresh: reset the walk whenever the loaded set changes.
  useEffect(() => {
    setIdx(0);
    setResults({});
    setDraft('');
    setSubmitError(null);
    setPhase('practice');
  }, [yearLevel, setNo]);

  // Reset the per-question timer + typed draft when the question changes.
  useEffect(() => {
    startedAt.current = Date.now();
    setDraft('');
    setSubmitError(null);
  }, [idx]);

  const all = useMemo(() => questions.data ?? [], [questions.data]);
  const total = all.length;
  const current: AcademyQuestion | undefined = all[idx];
  const answered = results[idx];
  const doneCount = Object.keys(results).length;
  const correctCount = Object.values(results).filter((r) => r.is_correct).length;

  const submit = async (submitted: string) => {
    if (!current || answered || submitting || submitted.trim() === '') return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submitAcademyAttempt({
        questionId: current.id,
        submitted,
        timeMs: Date.now() - startedAt.current,
      });
      setResults((prev) => ({ ...prev, [idx]: { ...res, submitted } }));
    } catch {
      setSubmitError("Couldn't check your answer — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (idx + 1 < total) setIdx(idx + 1);
    else setPhase('summary');
  };

  const practiseMore = () => setSetNo((n) => n + 1);

  return (
    <div>
      <header className="mb-8 max-w-3xl">
        <div className="eyebrow eyebrow-sky">Academy · NAPLAN Maths</div>
        <h1 className="hero-display">
          Practise <span className="squiggle-word">Numeracy</span>.
        </h1>
        <p className="lead-text mt-4">
          Pick your year, then work through real NAPLAN-style questions one at a time. You get the
          answer straight after each try.
        </p>
      </header>

      <div className="mb-8">
        <div className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate2">
          Choose your year · {ACADEMY_SUBJECT}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Year level">
          {ACADEMY_YEAR_LEVELS.map((y) => {
            const active = y === yearLevel;
            return (
              <button
                key={y}
                type="button"
                data-testid={`academy-year-${y}`}
                aria-pressed={active}
                onClick={() => setYearLevel(y)}
                className={`rounded-full px-5 py-3 text-[14px] font-black transition ${
                  active
                    ? 'bg-brand-sky text-white shadow-brand-sky'
                    : 'border border-hairline bg-canvas-pure text-ink hover:-translate-y-0.5'
                }`}
              >
                {y}
              </button>
            );
          })}
        </div>
      </div>

      {questions.isLoading && <p className="lead-text">Loading questions…</p>}

      {questions.isError && (
        <div className="card-base text-center">
          <span className="sticker-sunshine">Hmm</span>
          <p className="lead-text mt-4">We couldn&apos;t load the questions. Try again in a moment.</p>
          <button type="button" onClick={() => void questions.refetch()} className="btn-pill-primary mt-6">
            Try again
          </button>
        </div>
      )}

      {!questions.isLoading && !questions.isError && total === 0 && (
        <div className="card-base text-center">
          <span className="sticker-sunshine">Coming soon</span>
          <p className="lead-text mt-4">No questions for {yearLevel} yet. Try another year!</p>
          <Link to="/learn" className="btn-pill-primary mt-6">
            ← Back home
          </Link>
        </div>
      )}

      {!questions.isLoading && !questions.isError && total > 0 && phase === 'practice' && current && (
        <div className="max-w-3xl">
          <Scoreboard done={doneCount} correct={correctCount} idx={idx} total={total} />

          <section className="card-base mt-6" data-testid="academy-question">
            <QuestionBody question={current} />

            <div className="mt-6">
              <AnswerArea
                question={current}
                answered={answered}
                submitting={submitting}
                draft={draft}
                onDraft={setDraft}
                onSubmit={(value) => void submit(value)}
              />
            </div>

            {submitError && (
              <p className="mt-4 text-[14px] font-semibold text-brand-coral">{submitError}</p>
            )}

            {answered && (
              <div className="mt-6" data-testid="academy-feedback">
                <div
                  className={`rounded-2xl px-4 py-3 text-[15px] font-black ${
                    answered.is_correct ? 'bg-wash-mint text-ink' : 'bg-wash-coral text-ink'
                  }`}
                >
                  {answered.is_correct ? '🎉 Correct!' : '💡 Not quite.'}{' '}
                  <span className="font-semibold">The answer is {answered.correct_answer}.</span>
                </div>
                <button
                  type="button"
                  data-testid="academy-next"
                  onClick={next}
                  className="btn-pill-primary mt-5"
                >
                  {idx + 1 < total ? 'Next question →' : 'See my results →'}
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {phase === 'summary' && (
        <Summary
          setCorrect={correctCount}
          setTotal={total}
          progress={progress.data}
          loading={progress.isLoading}
          onPractiseMore={practiseMore}
        />
      )}
    </div>
  );
}

function Scoreboard({
  done,
  correct,
  idx,
  total,
}: {
  done: number;
  correct: number;
  idx: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round(((idx + 1) / total) * 100) : 0;
  return (
    <div className="rounded-[26px] border border-hairline bg-canvas-pure p-5">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-black text-ink">
          Question {Math.min(idx + 1, total)} of {total}
        </div>
        <div className="flex gap-4 text-[14px] font-black">
          <span data-testid="academy-done" className="text-slate2">
            Done {done}
          </span>
          <span data-testid="academy-correct" className="text-brand-mint">
            ★ {correct}
          </span>
        </div>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-wash-sky">
        <div
          className="h-full rounded-full bg-brand-sky transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Some questions carry their data IN a figure (a table of values, a bar graph, a
// grid, a clock) — flattening that to text yields garbage. And PDF-layout extraction
// occasionally bleeds the next question's text into this one (>1 question mark).
// In both cases prefer the scanned question image over the extracted text.
function needsImage(q: AcademyQuestion): boolean {
  const s = q.stem_text ?? '';
  if (!s) return true;
  const figureEssential =
    /\b(table|graph|chart|diagram|scale|grid|clock|column|axis|shaded|net|shapes?|balloons?|balanced|below)\b/i.test(
      s,
    );
  const mergedQuestions = (s.match(/\?/g)?.length ?? 0) > 1;
  // A run of many small isolated numbers is the tell-tale of a bar-graph/table's
  // axis labels flattened into text ("8 students 7 6 5 4 of 3 Number 2 1 0 …").
  const noisyNumbers = (s.match(/\b\d{1,2}\b/g)?.length ?? 0) >= 6;
  const hasImage = (q.figure_keys?.length ?? 0) > 0 || Boolean(q.q_image_key ?? q.page_image_key);
  return (figureEssential || mergedQuestions || noisyNumbers) && hasImage;
}

function QuestionBody({ question }: { question: AcademyQuestion }) {
  // Primary path: real question text + inline figure images — but only when the
  // text is trustworthy (see needsImage).
  if (question.stem_text && !needsImage(question)) {
    return (
      <div>
        <p data-testid="academy-stem" className="text-[20px] font-bold leading-snug text-ink">
          {question.stem_text}
        </p>
        {question.figure_keys && question.figure_keys.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {question.figure_keys.map((key) => (
              <img
                key={key}
                data-testid="academy-figure"
                src={academyAssetUrl(key)}
                alt="Question figure"
                className="max-h-40 rounded-xl border border-hairline bg-canvas-pure"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Fallback: no text — show the scanned question (or full page) image.
  const imageKey = question.q_image_key ?? question.page_image_key;
  if (imageKey) {
    return (
      <img
        data-testid="academy-question-image"
        src={academyAssetUrl(imageKey)}
        alt="Question"
        className="max-h-[60vh] w-full rounded-xl border border-hairline bg-canvas-pure object-contain"
      />
    );
  }

  return <p className="lead-text">This question can&apos;t be shown right now.</p>;
}

function AnswerArea({
  question,
  answered,
  submitting,
  draft,
  onDraft,
  onSubmit,
}: {
  question: AcademyQuestion;
  answered: AnsweredResult | undefined;
  submitting: boolean;
  draft: string;
  onDraft: (v: string) => void;
  onSubmit: (value: string) => void;
}) {
  if (question.answer_type === 'value') {
    return (
      <form
        className="flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(draft);
        }}
      >
        <input
          type="text"
          inputMode="numeric"
          data-testid="academy-value-input"
          value={draft}
          disabled={!!answered || submitting}
          onChange={(e) => onDraft(e.target.value)}
          placeholder="Type your answer"
          className="w-48 rounded-2xl border border-hairline bg-canvas-pure px-4 py-3 text-[18px] font-bold text-ink outline-none focus:border-brand-sky disabled:opacity-60"
        />
        <button
          type="submit"
          data-testid="academy-value-submit"
          disabled={!!answered || submitting || draft.trim() === ''}
          className="btn-pill-primary disabled:opacity-60"
        >
          {submitting ? 'Checking…' : 'Check answer'}
        </button>
      </form>
    );
  }

  // Choice: prefer the real option text (submitting the LETTER); otherwise fall
  // back to generic A/B/C/D buttons. When the question is shown as an image
  // (needsImage), the options live in the image too — don't risk garbled text.
  const letters =
    question.options && question.options.length > 0 && !needsImage(question)
      ? question.options.map((text, i) => ({ letter: CHOICE_LETTERS[i], text }))
      : CHOICE_LETTERS.slice(0, FALLBACK_CHOICE_COUNT).map((letter) => ({ letter, text: null }));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {letters.map(({ letter, text }) => {
        const isCorrect = !!answered && answered.correct_answer === letter;
        const isWrongPick = !!answered && answered.submitted === letter && !answered.is_correct;
        const tone = isCorrect
          ? 'border-brand-mint bg-wash-mint'
          : isWrongPick
            ? 'border-brand-coral bg-wash-coral'
            : 'border-hairline bg-canvas-pure hover:-translate-y-0.5';
        return (
          <button
            key={letter}
            type="button"
            data-testid={`academy-option-${letter}`}
            disabled={!!answered || submitting}
            onClick={() => onSubmit(letter)}
            className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-[16px] font-bold text-ink transition disabled:cursor-default ${tone}`}
          >
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-sky/15 text-[14px] font-black text-brand-sky">
              {letter}
            </span>
            {text !== null && <span>{text}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Summary({
  setCorrect,
  setTotal,
  progress,
  loading,
  onPractiseMore,
}: {
  setCorrect: number;
  setTotal: number;
  progress: AcademyProgress | undefined;
  loading: boolean;
  onPractiseMore: () => void;
}) {
  return (
    <div className="max-w-2xl" data-testid="academy-summary">
      <section className="card-base text-center">
        <span className="sticker-sunshine">Nice work!</span>
        <h2 className="section-heading mt-4" style={{ fontSize: '28px' }}>
          You got {setCorrect} of {setTotal} this round
        </h2>

        {loading && <p className="lead-text mt-4">Adding up your progress…</p>}

        {progress && (
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="Questions" value={String(progress.attempts)} />
            <Stat label="Correct" value={String(progress.correct)} />
            <Stat label="Accuracy" value={`${Math.round(progress.accuracy * 100)}%`} />
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            data-testid="academy-practise-more"
            onClick={onPractiseMore}
            className="btn-pill-primary"
          >
            Practise more →
          </button>
          <Link to="/learn" className="btn-pill-secondary">
            Back home
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-canvas-pure p-4">
      <div className="text-[26px] font-black text-ink">{value}</div>
      <div className="mt-1 text-[12px] font-bold uppercase tracking-[0.1em] text-slate2">{label}</div>
    </div>
  );
}
