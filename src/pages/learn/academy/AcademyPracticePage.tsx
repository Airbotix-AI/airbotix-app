// Product-scoped Academy practice. The route determines the entitled product;
// there is deliberately no exam/year switch inside the question player.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import {
  getMyAcademyProduct,
  getProductProgress,
  listProductQuestions,
  submitProductAttempt,
  type AcademyProgress,
  type AcademyQuestion,
} from './academyApi';
import { AcademyChoiceVisual, AcademyQuestionVisual } from './AcademyQuestionVisual';

// Choice questions map option index → letter; the LETTER is what we submit.
const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;
const FALLBACK_CHOICE_COUNT = 4;

type AnsweredResult = { is_correct: boolean; correct_answer: string; submitted: string };

export function AcademyPracticePage() {
  const { productSlug = '' } = useParams<{ productSlug: string }>();
  const [setNo, setSetNo] = useState(0);

  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<Record<number, AnsweredResult>>({});
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'practice' | 'summary'>('practice');
  const startedAt = useRef<number>(Date.now());
  const questionTop = useRef<HTMLDivElement>(null);

  const product = useQuery({
    queryKey: ['academy-product', productSlug],
    queryFn: () => getMyAcademyProduct(productSlug),
    enabled: productSlug !== '',
    retry: false,
  });

  const questions = useQuery<AcademyQuestion[]>({
    queryKey: ['academy-product-questions', productSlug, setNo],
    queryFn: () => listProductQuestions(productSlug),
    enabled: productSlug !== '',
    retry: false,
  });

  const progress = useQuery<AcademyProgress>({
    queryKey: ['academy-product-progress', productSlug, setNo],
    queryFn: () => getProductProgress(productSlug),
    enabled: phase === 'summary' && productSlug !== '',
  });

  // Start each set/question fresh: reset the walk whenever the loaded set changes.
  useEffect(() => {
    setIdx(0);
    setResults({});
    setDraft('');
    setSubmitError(null);
    setPhase('practice');
  }, [setNo]);

  // Reset the per-question timer + typed draft when the question changes.
  useEffect(() => {
    startedAt.current = Date.now();
    setDraft('');
    setSubmitError(null);
    questionTop.current?.scrollIntoView?.({ block: 'start' });
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
      const res = await submitProductAttempt({
        productSlug,
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
  const productInfo = product.data?.product;

  return (
    <div>
      <header className="mb-8 max-w-3xl">
        <div className="eyebrow eyebrow-sky">
          {productInfo
            ? `${productInfo.exam.title} · ${productInfo.level_key} · ${productInfo.subject_key}`
            : 'My Exam Prep'}
        </div>
        <h1 className="hero-display">
          Topic <span className="squiggle-word">practice</span>.
        </h1>
        <p className="lead-text mt-4">
          Work through your questions one at a time. You get the answer straight after each try.
        </p>
      </header>

      {(product.isLoading || questions.isLoading) && (
        <p className="lead-text">Loading questions…</p>
      )}

      {(product.isError || questions.isError) && (
        <div className="card-base text-center">
          <span className="sticker-sunshine">Not unlocked</span>
          <p className="lead-text mt-4">
            This exam prep product is not available for this account. Ask a parent to check My Exam
            Prep in the Parent Portal.
          </p>
          <Link to="/learn/exams" className="btn-pill-primary mt-6 inline-block">
            Back to My Exam Prep
          </Link>
        </div>
      )}

      {!questions.isLoading && !questions.isError && total === 0 && (
        <div className="card-base text-center">
          <span className="sticker-sunshine">Coming soon</span>
          <p className="lead-text mt-4">Your reviewed practice questions are being prepared.</p>
          <Link to={`/learn/exams/${productSlug}`} className="btn-pill-primary mt-6 inline-block">
            Back to product
          </Link>
        </div>
      )}

      {!questions.isLoading &&
        !questions.isError &&
        total > 0 &&
        phase === 'practice' &&
        current && (
          <div ref={questionTop} className="max-w-3xl">
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
          productSlug={productSlug}
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

function QuestionBody({ question }: { question: AcademyQuestion }) {
  return (
    <div>
      <p data-testid="academy-stem" className="text-[20px] font-bold leading-snug text-ink">
        {question.stem_text}
      </p>
      <AcademyQuestionVisual spec={question.render_spec} />
    </div>
  );
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

  const letters =
    question.options && question.options.length > 0
      ? question.options.map((text, i) => ({ letter: CHOICE_LETTERS[i], text }))
      : CHOICE_LETTERS.slice(0, FALLBACK_CHOICE_COUNT).map((letter) => ({ letter, text: null }));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {letters.map(({ letter, text }, choiceIndex) => {
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
            <AcademyChoiceVisual spec={question.render_spec} choiceIndex={choiceIndex} />
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
  productSlug,
}: {
  setCorrect: number;
  setTotal: number;
  progress: AcademyProgress | undefined;
  loading: boolean;
  onPractiseMore: () => void;
  productSlug: string;
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
          <Link to={`/learn/exams/${productSlug}`} className="btn-pill-secondary">
            Back to product
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
      <div className="mt-1 text-[12px] font-bold uppercase tracking-[0.1em] text-slate2">
        {label}
      </div>
    </div>
  );
}
