import { BarChart3, CheckCircle2, LockKeyhole, Target } from 'lucide-react';

const BENEFITS = [
  {
    icon: Target,
    title: 'The right Year, every time',
    copy: 'Choose Year 3, 5, 7 or 9 before you buy. Your child practises only inside that product.',
  },
  {
    icon: CheckCircle2,
    title: 'Clear feedback after each answer',
    copy: 'Children can practise independently and see whether they understood the question.',
  },
  {
    icon: BarChart3,
    title: 'Progress that stays visible',
    copy: 'Completed questions, correct answers and accuracy are saved inside the chosen product.',
  },
] as const;

export function AcademySalesIntro() {
  return (
    <>
      <section
        className="overflow-hidden rounded-[24px] bg-ink px-5 py-6 text-white shadow-card-soft sm:rounded-[32px] sm:px-10 sm:py-12"
        data-testid="academy-sales-hero"
      >
        <div className="grid items-center gap-6 sm:gap-9 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="eyebrow eyebrow-sunshine mb-2 text-[10px] sm:mb-3 sm:text-[12px]">
              NAPLAN Numeracy prep for families
            </div>
            <h1 className="max-w-3xl text-[32px] font-bold leading-[1.08] tracking-[-0.03em] text-white sm:text-[58px] sm:leading-[1.04]">
              Help your child practise with the questions that match their Year.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] font-medium leading-relaxed text-white/80 sm:mt-5 sm:text-[18px]">
              Airbotix Academy gives your child a focused place to build Numeracy confidence at
              home. Choose their NAPLAN Year, unlock it for one child, and let them work through
              practice at their own pace.
            </p>
            <a
              href="#choose-naplan-year"
              className="btn-pill-primary mt-5 px-5 py-3 text-[14px] sm:mt-7 sm:px-7 sm:py-[14px] sm:text-[15px]"
              data-testid="academy-hero-cta"
            >
              Choose your child&apos;s Year ↓
            </a>
          </div>

          <div
            className="rounded-[20px] bg-canvas-pure p-4 text-ink shadow-brand-sky sm:rounded-[28px] sm:p-7"
            aria-label="How NAPLAN practice works"
          >
            <div className="text-[10px] font-black uppercase tracking-[0.13em] text-brand-sky sm:text-[11px]">
              A simple routine at home
            </div>
            <ol className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
              <Step number="1" title="You choose the Year" copy="No switching between levels." />
              <Step
                number="2"
                title="Your child answers"
                copy="One focused Numeracy question at a time."
              />
              <Step
                number="3"
                title="Progress is recorded"
                copy="See attempts, correct answers and accuracy."
              />
            </ol>
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-12" aria-labelledby="academy-included-heading">
        <div className="max-w-3xl">
          <div className="eyebrow eyebrow-mint mb-2 text-[10px] sm:mb-3 sm:text-[12px]">
            What you are buying
          </div>
          <h2
            id="academy-included-heading"
            className="text-[25px] font-bold leading-[1.15] text-ink sm:text-[40px]"
          >
            Focused practice, without mixing Years.
          </h2>
          <p className="mt-3 text-[15px] font-medium leading-relaxed text-ink-soft sm:text-[18px]">
            This is a self-paced practice product for home use. It supports regular Numeracy
            practice; it does not replace your child&apos;s school or guarantee an exam result.
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:mt-7 sm:gap-5 md:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, copy }) => (
            <article key={title} className="card-base p-5 sm:p-8">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-wash-sky text-brand-sky sm:h-11 sm:w-11 sm:rounded-2xl">
                <Icon aria-hidden="true" size={20} strokeWidth={2.4} />
              </span>
              <h3 className="mt-3 text-[17px] font-black leading-tight text-ink sm:mt-5 sm:text-[20px]">
                {title}
              </h3>
              <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink-soft sm:mt-3 sm:text-[14px]">
                {copy}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="mb-7 flex items-start gap-3 rounded-2xl bg-wash-mint px-4 py-3 text-[13px] font-semibold leading-relaxed text-ink sm:mb-8 sm:px-5 sm:py-4 sm:text-[14px]">
        <LockKeyhole className="mt-0.5 shrink-0 text-brand-mint" aria-hidden="true" size={18} />
        <p>
          Each purchase unlocks one Year-level product for one child. Your child opens it from
          <strong> My Exam Prep</strong> after payment is confirmed.
        </p>
      </div>
    </>
  );
}

function Step({ number, title, copy }: { number: string; title: string; copy: string }) {
  return (
    <li className="flex items-start gap-3 sm:gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-sunshine text-[13px] font-black text-ink sm:h-9 sm:w-9 sm:text-[15px]">
        {number}
      </span>
      <div>
        <h2 className="text-[14px] font-black text-ink sm:text-[16px]">{title}</h2>
        <p className="mt-0.5 text-[12px] font-medium leading-relaxed text-slate2 sm:text-[13px]">
          {copy}
        </p>
      </div>
    </li>
  );
}
