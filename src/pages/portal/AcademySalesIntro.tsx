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
      <section className="overflow-hidden rounded-[32px] bg-ink px-6 py-8 text-white shadow-card-soft sm:px-10 sm:py-12">
        <div className="grid items-center gap-9 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="eyebrow eyebrow-sunshine">NAPLAN Numeracy prep for families</div>
            <h1 className="max-w-3xl text-[42px] font-bold leading-[1.04] tracking-[-0.03em] text-white sm:text-[58px]">
              Help your child practise with the questions that match their Year.
            </h1>
            <p className="mt-5 max-w-2xl text-[18px] font-medium leading-relaxed text-white/80">
              Airbotix Academy gives your child a focused place to build Numeracy confidence at
              home. Choose their NAPLAN Year, unlock it for one child, and let them work through
              practice at their own pace.
            </p>
            <a
              href="#choose-naplan-year"
              className="btn-pill-primary mt-7"
              data-testid="academy-hero-cta"
            >
              Choose your child&apos;s Year ↓
            </a>
          </div>

          <div
            className="rounded-[28px] bg-canvas-pure p-5 text-ink shadow-brand-sky sm:p-7"
            aria-label="How NAPLAN practice works"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.13em] text-brand-sky">
              A simple routine at home
            </div>
            <ol className="mt-5 space-y-4">
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

      <section className="py-12" aria-labelledby="academy-included-heading">
        <div className="max-w-3xl">
          <div className="eyebrow eyebrow-mint">What you are buying</div>
          <h2 id="academy-included-heading" className="section-heading">
            Focused practice, without mixing Years.
          </h2>
          <p className="lead-text mt-3">
            This is a self-paced practice product for home use. It supports regular Numeracy
            practice; it does not replace your child&apos;s school or guarantee an exam result.
          </p>
        </div>
        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, copy }) => (
            <article key={title} className="card-base">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-wash-sky text-brand-sky">
                <Icon aria-hidden="true" size={22} strokeWidth={2.4} />
              </span>
              <h3 className="mt-5 text-[20px] font-black leading-tight text-ink">{title}</h3>
              <p className="mt-3 text-[14px] font-medium leading-relaxed text-ink-soft">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="mb-8 flex items-start gap-3 rounded-2xl bg-wash-mint px-5 py-4 text-[14px] font-semibold leading-relaxed text-ink">
        <LockKeyhole className="mt-0.5 shrink-0 text-brand-mint" aria-hidden="true" size={20} />
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
    <li className="flex items-start gap-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-sunshine text-[15px] font-black text-ink">
        {number}
      </span>
      <div>
        <h2 className="text-[16px] font-black text-ink">{title}</h2>
        <p className="mt-0.5 text-[13px] font-medium leading-relaxed text-slate2">{copy}</p>
      </div>
    </li>
  );
}
