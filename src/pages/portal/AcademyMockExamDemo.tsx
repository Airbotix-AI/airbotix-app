import { useMemo, useState } from 'react';

import { AcademyDemoVisual, type AcademyDemoVisualKind } from './AcademyDemoVisual';

type DemoQuestion = {
  id: string;
  stem: string;
  visual?: AcademyDemoVisualKind;
  options?: string[];
  answer?: string;
  marks: number;
};

const QUESTIONS: DemoQuestion[] = [
  {
    id: 'groups',
    stem: 'A roller-coaster has 6 cars with 3 people in each car. How many people are riding?',
    visual: 'groups',
    options: ['9', '12', '15', '18'],
    answer: '18',
    marks: 1,
  },
  {
    id: 'data',
    stem: 'Eight students chose dogs and three chose fish. How many more chose dogs?',
    visual: 'data',
    options: ['3', '5', '8', '11'],
    answer: '5',
    marks: 1,
  },
  {
    id: 'worked',
    stem: 'A library packs 48 books equally into 6 boxes. Show how you find the number of books in each box.',
    marks: 2,
  },
];

export function AcademyMockExamDemo() {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [rubricHits, setRubricHits] = useState<number[]>([]);
  const objective = useMemo(
    () =>
      QUESTIONS.filter((question) => question.answer).reduce(
        (score, question) => score + (answers[question.id] === question.answer ? question.marks : 0),
        0,
      ),
    [answers],
  );
  const selfMarks = rubricHits.length;

  if (!started) {
    return (
      <div className="card-base p-5 sm:p-7" data-testid="academy-mock-demo-start">
        <span className="sticker-sunshine">5-minute sample paper</span>
        <h3 className="mt-4 text-[24px] font-black text-ink">Try the full mock-exam loop.</h3>
        <p className="mt-3 max-w-2xl text-[14px] font-semibold leading-relaxed text-ink-soft">
          Three original questions: two are marked automatically and one is self-assessed against
          a rubric after submission. Answers and marking guidance stay locked during the paper.
        </p>
        <button type="button" className="btn-pill-primary mt-5" onClick={() => setStarted(true)}>
          Start sample paper
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="grid gap-5" data-testid="academy-mock-demo-report">
        <section className="grid gap-3 sm:grid-cols-3">
          <ScoreCard label="Objective marks" value={`${objective}/2`} copy="Automatically marked" />
          <ScoreCard
            label="Self-assessed marks"
            value={`${selfMarks}/2`}
            copy="Based on rubric ticks"
          />
          <ScoreCard label="Total marks" value={`${objective + selfMarks}/4`} copy="Kept separate" />
        </section>
        <section className="card-base p-5 sm:p-7">
          <span className="sticker-mint">Post-submit marking guide</span>
          <h3 className="mt-4 text-[20px] font-black text-ink">Question 3 · Worked response</h3>
          <p className="mt-2 text-[14px] font-semibold text-ink-soft">
            Your response: {answers.worked || 'No response'}
          </p>
          <div className="mt-4 rounded-2xl bg-wash-mint p-4 text-[14px] font-semibold text-ink">
            <strong>Sample solution:</strong> 48 ÷ 6 = 8, so each box contains 8 books.
          </div>
          <fieldset className="mt-4 grid gap-3">
            <legend className="font-black text-ink">Tick each point your working demonstrates</legend>
            {['Chooses division or equal grouping: 48 ÷ 6', 'Finds 8 and states 8 books per box'].map(
              (criterion, criterionIndex) => (
                <label key={criterion} className="flex gap-3 rounded-2xl bg-canvas-pure p-3">
                  <input
                    type="checkbox"
                    checked={rubricHits.includes(criterionIndex)}
                    onChange={() =>
                      setRubricHits((current) =>
                        current.includes(criterionIndex)
                          ? current.filter((hit) => hit !== criterionIndex)
                          : [...current, criterionIndex],
                      )
                    }
                  />
                  <span className="font-semibold text-ink">{criterion} · 1 mark</span>
                </label>
              ),
            )}
          </fieldset>
          <button
            type="button"
            className="btn-pill-secondary mt-5"
            onClick={() => {
              setStarted(false);
              setSubmitted(false);
              setIndex(0);
              setAnswers({});
              setRubricHits([]);
            }}
          >
            Restart demo
          </button>
        </section>
      </div>
    );
  }

  const question = QUESTIONS[index];
  return (
    <div className="card-base p-5 sm:p-7" data-testid="academy-mock-demo-player">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="sticker-sky alt">Mock exam mode</span>
          <div className="mt-2 text-[12px] font-black uppercase tracking-wider text-slate2">
            Question {index + 1} of {QUESTIONS.length} · {question.marks} marks
          </div>
        </div>
        <div className="rounded-full bg-wash-sun px-4 py-2 font-black text-ink">04:59 remaining</div>
      </div>
      <h3 className="mt-5 text-[20px] font-black leading-snug text-ink">{question.stem}</h3>
      {question.visual && <AcademyDemoVisual visual={question.visual} />}
      {question.options ? (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {question.options.map((option) => (
            <button
              key={option}
              type="button"
              className={`rounded-2xl border-2 px-4 py-3 font-black ${
                answers[question.id] === option
                  ? 'border-brand-sky bg-wash-sky'
                  : 'border-hairline bg-white'
              }`}
              onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <textarea
          className="input-k12 mt-5 min-h-32 w-full"
          aria-label="Worked response"
          placeholder="Show your working here…"
          value={answers[question.id] ?? ''}
          onChange={(event) =>
            setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
          }
        />
      )}
      <p className="mt-4 text-[12px] font-bold text-slate2">
        No correctness or marking guide is shown until the whole paper is submitted.
      </p>
      <div className="mt-5 flex justify-between gap-3">
        <button
          type="button"
          className="btn-pill-secondary"
          disabled={index === 0}
          onClick={() => setIndex((current) => current - 1)}
        >
          Previous
        </button>
        {index < QUESTIONS.length - 1 ? (
          <button
            type="button"
            className="btn-pill-primary"
            onClick={() => setIndex((current) => current + 1)}
          >
            Save and next
          </button>
        ) : (
          <button type="button" className="btn-pill-primary" onClick={() => setSubmitted(true)}>
            Submit sample paper
          </button>
        )}
      </div>
    </div>
  );
}

function ScoreCard({ label, value, copy }: { label: string; value: string; copy: string }) {
  return (
    <div className="rounded-[22px] bg-wash-sky p-5">
      <div className="text-[11px] font-black uppercase tracking-wider text-slate2">{label}</div>
      <div className="mt-2 text-[28px] font-black text-ink">{value}</div>
      <div className="mt-1 text-[12px] font-bold text-slate2">{copy}</div>
    </div>
  );
}
