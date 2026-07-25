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
  asks: string;
  firstStep: string;
  secondStep: string;
  whyCorrect: string;
  success: string;
  misconceptions: Record<string, string>;
  checkQuestion: string;
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
    asks: 'Find the total number of people across all 6 cars.',
    firstStep: 'Notice the equal groups: 6 cars, with 3 people in every car.',
    secondStep: 'Use multiplication for equal groups: 6 × 3 = 18 people.',
    whyCorrect: '18 represents every person in all six cars, counted once.',
    success: 'You matched the number of groups with the number in each group.',
    misconceptions: {
      '9': 'You may have added 6 + 3. The 3 people repeat in every one of the 6 cars.',
      '12': 'You may have counted only 2 people in each car instead of all 3.',
      '15': 'You may have counted 5 cars and missed the sixth group of 3.',
    },
    checkQuestion: 'If there were 4 cars with 3 people in each, how many people would there be?',
    visual: 'groups',
  },
  {
    id: 'money',
    skill: 'Money',
    stem: 'Mia has one $2 coin, one 50c coin and two 20c coins. How much money does she have altogether?',
    options: ['$2.70', '$2.90', '$3.10', '$4.90'],
    answer: '$2.90',
    hint: 'Put the dollars and cents into the same unit, then add all four coins.',
    asks: 'Find the combined value of all four coins, not the number of coins.',
    firstStep: 'Put every amount in cents so the units match: $2 becomes 200 cents.',
    secondStep: 'Add 200 + 50 + 20 + 20 = 290 cents, then write it as $2.90.',
    whyCorrect: '$2.90 includes the $2 coin, the 50c coin and both 20c coins.',
    success: 'You kept dollars and cents in the same unit and included every coin.',
    misconceptions: {
      '$2.70': 'You may have counted only one 20c coin and missed the second one.',
      '$3.10': 'You may have made a place-value error when regrouping 290 cents into dollars.',
      '$4.90': 'You may have treated the four coins as $4, then added 90c. The number of coins is not their dollar value.',
    },
    checkQuestion: 'Mia adds another 10c coin. How much money would she have now?',
    visual: 'money',
  },
  {
    id: 'data',
    skill: 'Data',
    stem: 'A class voted for a favourite pet. How many more students chose dogs than fish?',
    options: ['3', '5', '8', '11'],
    answer: '5',
    hint: 'Compare the two bars named in the question. “How many more” means find the difference.',
    asks: 'Compare Dogs and Fish and find how much larger the Dogs result is.',
    firstStep: 'Read the two relevant bars only: Dogs is 8 and Fish is 3.',
    secondStep: '“How many more” asks for the difference, so calculate 8 − 3 = 5.',
    whyCorrect: 'A gap of 5 takes the Fish result of 3 up to the Dogs result of 8.',
    success: 'You recognised that “how many more” means compare by subtraction.',
    misconceptions: {
      '3': 'You may have copied the Fish value instead of comparing it with Dogs.',
      '8': 'You may have copied the Dogs value instead of finding the difference.',
      '11': 'You may have added 8 + 3. Adding finds the total; “how many more” asks for the gap.',
    },
    checkQuestion: 'If 6 students chose cats and 2 chose fish, how many more chose cats?',
    visual: 'data',
  },
  {
    id: 'time',
    skill: 'Time',
    stem: 'What time is shown on the clock?',
    options: ['3:20', '4:03', '4:15', '5:15'],
    answer: '4:15',
    hint: 'Read the long minute hand first, then the short hour hand.',
    asks: 'Read the hour and minutes shown by the two clock hands.',
    firstStep: 'Read the long minute hand: pointing to 3 means 3 groups of 5 minutes, or 15 minutes.',
    secondStep:
      'Read the short hour hand: it sits just after 4. The time is quarter past 4, or 4:15.',
    whyCorrect: 'At quarter past four, the minute hand points to 3 and the hour hand has moved just beyond 4.',
    success: 'You used each hand for its correct job: long for minutes and short for hours.',
    misconceptions: {
      '3:20': 'You may have swapped the jobs of the hour and minute hands.',
      '4:03': 'You may have read the numeral 3 as 3 minutes. Each clock number represents 5 minutes.',
      '5:15': 'You may have rounded the short hand up to 5, but it has only just moved past 4.',
    },
    checkQuestion: 'Where would the long minute hand point at 4:30?',
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
                <TutorSection title="What is the question asking?">
                  {question.asks}
                </TutorSection>
                <TutorSection title="Step 1 · How to think">
                  {question.firstStep}
                </TutorSection>
                <TutorSection title="Step 2 · Work it out">
                  {question.secondStep}
                </TutorSection>
                <TutorSection title="Why this answer is correct">
                  {question.whyCorrect}
                </TutorSection>
                <TutorSection
                  title={isCorrect ? 'What you understood' : 'Where your thinking may have slipped'}
                  tone={isCorrect ? 'mint' : 'coral'}
                >
                  {isCorrect
                    ? question.success
                    : question.misconceptions[selected] ??
                      'You may have used the right information with the wrong operation. Compare each step with the question wording.'}
                </TutorSection>
                <TutorSection title="Quick check" tone="white">
                  {question.checkQuestion}
                </TutorSection>
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

function TutorSection({
  title,
  children,
  tone,
}: {
  title: string;
  children: string;
  tone?: 'mint' | 'coral' | 'white';
}) {
  const background =
    tone === 'mint'
      ? 'bg-wash-mint'
      : tone === 'coral'
        ? 'bg-white/80 ring-2 ring-brand-coral/20'
        : tone === 'white'
          ? 'bg-white/70'
          : '';

  return (
    <div className={`rounded-2xl p-3 ${background}`}>
      <h4 className="text-[11px] font-black uppercase tracking-wider text-ink-soft">{title}</h4>
      <p className="mt-1">{children}</p>
    </div>
  );
}
