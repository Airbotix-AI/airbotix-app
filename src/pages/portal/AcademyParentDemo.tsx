import { useState } from 'react';

import {
  AcademyDemoVisual,
  type AcademyDemoVisualKind,
} from './AcademyDemoVisual';

type DemoQuestion = {
  id: string;
  skill: string;
  stem: string;
  options: string[];
  answer: string;
  hint: string;
  steps: string[];
  check: string;
  visual: AcademyDemoVisualKind;
};

const DEMO_QUESTIONS: DemoQuestion[] = [
  {
    id: 'groups',
    skill: 'Equal groups',
    stem: 'A roller-coaster has 6 cars. Each car has 3 people. How many people are riding altogether?',
    options: ['9', '12', '15', '18'],
    answer: '18',
    hint: 'Look for equal groups. How many groups can you see, and how many people are in each group?',
    steps: [
      'There are 6 equal groups because there are 6 cars.',
      'Each group has 3 people.',
      'Multiply: 6 × 3 = 18 people.',
    ],
    check: 'Count by threes: 3, 6, 9, 12, 15, 18.',
    visual: 'groups',
  },
  {
    id: 'money',
    skill: 'Money',
    stem: 'Mia has one $2 coin, one 50c coin and two 20c coins. How much money does she have altogether?',
    options: ['$2.70', '$2.90', '$3.10', '$4.90'],
    answer: '$2.90',
    hint: 'Put the dollars and cents into the same unit, then add all four coins.',
    steps: [
      '$2 is 200 cents.',
      'Add the coins: 200 + 50 + 20 + 20 = 290 cents.',
      '290 cents is $2.90.',
    ],
    check: '$2.00 + $0.50 + $0.40 = $2.90.',
    visual: 'money',
  },
  {
    id: 'data',
    skill: 'Data',
    stem: 'A class voted for a favourite pet. How many more students chose dogs than fish?',
    options: ['3', '5', '8', '11'],
    answer: '5',
    hint: 'Compare the two bars named in the question. “How many more” means find the difference.',
    steps: [
      'The Dogs bar shows 8 students.',
      'The Fish bar shows 3 students.',
      'Find the difference: 8 − 3 = 5 students.',
    ],
    check: 'Start at 3 and count up to 8: 4, 5, 6, 7, 8 — five steps.',
    visual: 'data',
  },
  {
    id: 'time',
    skill: 'Time',
    stem: 'What time is shown on the clock?',
    options: ['3:20', '4:03', '4:15', '5:15'],
    answer: '4:15',
    hint: 'Read the long minute hand first, then the short hour hand.',
    steps: [
      'The long hand points to 3, which means 15 minutes past the hour.',
      'The short hand is just past 4.',
      'The time is quarter past 4, or 4:15.',
    ],
    check: 'At 4:15, the minute hand points to 3 and the hour hand sits just after 4.',
    visual: 'time',
  },
];

export function AcademyParentDemo() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const question = DEMO_QUESTIONS[questionIndex];
  const answered = selected !== null;
  const isCorrect = selected === question.answer;

  const changeQuestion = (index: number) => {
    setQuestionIndex(index);
    setSelected(null);
  };

  return (
    <div className="mt-5">
      <div
        className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
        aria-label="Choose a sample question"
      >
        {DEMO_QUESTIONS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => changeQuestion(index)}
            className={`rounded-2xl border-2 px-3 py-2 text-left text-[12px] font-black sm:px-4 sm:text-[14px] ${
              index === questionIndex
                ? 'border-ink bg-ink text-white'
                : 'border-hairline bg-canvas-pure text-ink'
            }`}
            aria-pressed={index === questionIndex}
            data-testid={`academy-demo-question-${item.id}`}
          >
            <span className="mr-2 opacity-60">{index + 1}</span>
            {item.skill}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <article className="card-base p-5 sm:p-7" data-testid="academy-parent-demo">
          <div className="flex items-center justify-between gap-3">
            <span className="sticker-sky alt">{question.skill}</span>
            <span className="text-[11px] font-black uppercase tracking-wider text-ink-soft">
              Question {questionIndex + 1} of {DEMO_QUESTIONS.length}
            </span>
          </div>
          <h3 className="mt-4 text-[19px] font-black leading-snug text-ink sm:text-[22px]">
            {question.stem}
          </h3>
          <AcademyDemoVisual visual={question.visual} />
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSelected(option)}
                className={`rounded-2xl border-2 px-4 py-3 text-[16px] font-black ${
                  selected === option
                    ? 'border-brand-sky bg-wash-sky text-ink'
                    : 'border-hairline bg-canvas-pure text-ink'
                }`}
                aria-pressed={selected === option}
              >
                {option}
              </button>
            ))}
          </div>
          <p className="mt-4 text-[12px] font-bold text-ink-soft">
            Tap an answer to see how Airo Tutor explains it.
          </p>
          {answered && (
            <p
              className={`mt-3 rounded-2xl px-4 py-3 text-[14px] font-bold text-ink ${
                isCorrect ? 'bg-wash-mint' : 'bg-wash-sun'
              }`}
              data-testid="academy-demo-feedback"
              aria-live="polite"
            >
              {isCorrect
                ? `Correct — ${question.answer} is the answer.`
                : `${selected} isn’t the answer yet — let’s work it out together.`}
            </p>
          )}
        </article>

        <aside className="rounded-[24px] bg-wash-sun p-5 sm:p-7" aria-label="Airo Tutor demo">
          <div className="flex items-center gap-3">
            <div
              className="grid h-11 w-11 place-items-center rounded-full bg-brand-sun text-[22px]"
              aria-hidden="true"
            >
              ✦
            </div>
            <div>
              <div className="text-[12px] font-black uppercase tracking-wider text-ink-soft">
                Airo Tutor
              </div>
              <h3 className="text-[20px] font-black text-ink">Let&apos;s make it click.</h3>
            </div>
          </div>
          <div
            className="mt-6 space-y-3 text-[14px] font-semibold leading-relaxed text-ink"
            data-testid="academy-demo-tutor"
            aria-live="polite"
          >
            {!answered ? (
              <>
                <div className="text-[12px] font-black uppercase tracking-wider text-ink-soft">
                  A hint before you answer
                </div>
                <p>{question.hint}</p>
              </>
            ) : (
              <>
                <div className="text-[12px] font-black uppercase tracking-wider text-ink-soft">
                  {isCorrect ? 'Correct — here’s why' : 'Good try — here’s how'}
                </div>
                {question.steps.map((step, index) => (
                  <p key={step}>
                    <strong>{index + 1}.</strong> {step}
                  </p>
                ))}
                <p className="rounded-2xl bg-white/70 p-3">
                  <strong>Check it:</strong> {question.check}
                </p>
              </>
            )}
          </div>
          <p className="mt-6 text-[11px] font-bold leading-relaxed text-ink-soft">
            In the purchased product, this explanation appears automatically after each attempt.
          </p>
        </aside>
      </div>
    </div>
  );
}
