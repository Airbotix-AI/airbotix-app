import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'

import { getAcademyProduct } from '@/pages/learn/academy/academyApi'

const DEMO_OPTIONS = ['9', '12', '15', '18'] as const
const DEMO_ANSWER = '18'

const money = (cents: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100)

export function AcademyProductDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const product = useQuery({
    queryKey: ['academy-public-product', slug],
    queryFn: () => getAcademyProduct(slug),
    enabled: slug !== '',
    retry: false,
  })

  if (product.isLoading) return <p className="lead-text">Loading product details…</p>

  if (product.isError || !product.data) {
    return (
      <div className="card-base max-w-2xl">
        <span className="sticker-sunshine">Please try again</span>
        <p className="lead-text mt-4">We couldn&apos;t load this exam product right now.</p>
        <Link to="/portal/academy" className="btn-pill-secondary mt-6 inline-block">
          Back to Exam Prep
        </Link>
      </div>
    )
  }

  const item = product.data

  return (
    <div data-testid="academy-product-detail">
      <Link
        to="/portal/academy"
        className="text-[13px] font-black text-brand-sky hover:underline sm:text-[14px]"
      >
        ← All exam products
      </Link>

      <section className="mt-4 rounded-[24px] bg-ink px-5 py-7 text-canvas-pure sm:mt-6 sm:rounded-[32px] sm:px-10 sm:py-11">
        <div className="eyebrow eyebrow-sky mb-3 text-[10px] sm:text-[12px]">
          {item.exam.title} · {item.level_key}
        </div>
        <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <h1 className="text-[32px] font-black leading-[1.04] sm:text-[52px]">
              {item.level_key} {item.subject_key} practice with help when they get stuck.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] font-medium leading-relaxed text-white/75 sm:text-[18px]">
              Your child works through reviewed, Year-specific questions and gets immediate
              feedback. After every attempt, Airo Tutor automatically explains the thinking in
              small steps.
            </p>
          </div>
          <div className="rounded-[22px] bg-white/10 p-5 lg:min-w-[240px]">
            <div className="text-[28px] font-black">{money(item.price_aud_cents)}</div>
            <div className="mt-1 text-[12px] font-bold text-white/70">
              {item.access_days} days · one child
            </div>
            <Link
              to={`/portal/academy/checkout/${item.slug}`}
              className="btn-pill-primary mt-5 inline-block w-full text-center"
              data-testid="academy-detail-buy"
            >
              Choose a child →
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 sm:mt-12" aria-labelledby="try-demo-title">
        <div className="max-w-3xl">
          <div className="eyebrow eyebrow-mint mb-2 text-[10px] sm:text-[12px]">Try the experience</div>
          <h2 id="try-demo-title" className="text-[25px] font-black text-ink sm:text-[38px]">
            See the question and the Tutor together.
          </h2>
          <p className="mt-2 text-[14px] font-medium leading-relaxed text-ink-soft sm:text-[16px]">
            This prepared sample shows how the product works. It does not expose a paid question.
          </p>
        </div>
        <AcademyParentDemo />
      </section>

      <section className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-3">
        <ValueCard
          title={`${item._count.question_links} questions available`}
          body={`Practice stays inside ${item.level_key} ${item.subject_key}; there is no Year switching inside the player.`}
        />
        <ValueCard
          title="Feedback after every answer"
          body="The answer is checked immediately, and every attempt contributes to the child’s progress."
        />
        <ValueCard
          title="Airo Tutor is included"
          body="After the child attempts a question, a short explanation appears automatically at no extra Stars cost."
        />
      </section>

      <section className="card-feature mt-8 p-5 sm:mt-12 sm:p-8">
        <h2 className="text-[22px] font-black text-ink sm:text-[28px]">What happens after purchase?</h2>
        <ol className="mt-5 grid gap-4 text-[14px] font-medium leading-relaxed text-ink-soft sm:grid-cols-3">
          <li><strong className="block text-ink">1. Assign one child</strong>The product is fixed to that child and Year.</li>
          <li><strong className="block text-ink">2. Start in My Exam Prep</strong>Your child opens the product from their own account.</li>
          <li><strong className="block text-ink">3. Practise and ask why</strong>Answers, progress, and Tutor explanations stay in one flow.</li>
        </ol>
      </section>
    </div>
  )
}

function AcademyParentDemo() {
  const [selected, setSelected] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  const choose = (option: string) => {
    setSelected(option)
    setChecked(false)
  }

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
      <article className="card-base p-5 sm:p-7" data-testid="academy-parent-demo">
        <span className="sticker-sky alt">Sample question</span>
        <h3 className="mt-4 text-[19px] font-black leading-snug text-ink sm:text-[22px]">
          A roller-coaster has 6 cars. Each car has 3 people. How many people are riding altogether?
        </h3>
        <div
          className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6"
          role="img"
          aria-label="6 cars with 3 people in each"
        >
          {Array.from({ length: 6 }, (_, car) => (
            <div key={car} className="rounded-xl border-2 border-brand-sky bg-wash-sky p-2">
              <div className="flex justify-center gap-1" aria-hidden="true">
                {Array.from({ length: 3 }, (_, person) => (
                  <span key={person} className="h-3 w-3 rounded-full bg-brand-coral" />
                ))}
              </div>
              <div className="mt-1 text-center text-[10px] font-black text-ink">car {car + 1}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DEMO_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => choose(option)}
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
        <button
          type="button"
          onClick={() => setChecked(true)}
          disabled={!selected}
          className="btn-pill-primary mt-5 disabled:opacity-50"
        >
          Check answer
        </button>
        {checked && (
          <p className="mt-4 rounded-2xl bg-wash-mint px-4 py-3 text-[14px] font-bold text-ink">
            {selected === DEMO_ANSWER ? 'Correct — 6 × 3 = 18.' : 'Not quite — Airo can show the equal-groups step.'}
          </p>
        )}
      </article>

      <aside className="rounded-[24px] bg-wash-sun p-5 sm:p-7" aria-label="Airo Tutor demo">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-sun text-[22px]" aria-hidden="true">✦</div>
          <div>
            <div className="text-[12px] font-black uppercase tracking-wider text-ink-soft">Airo Tutor</div>
            <h3 className="text-[20px] font-black text-ink">Let&apos;s make it click.</h3>
          </div>
        </div>
        <div className="mt-6 space-y-3 text-[14px] font-semibold leading-relaxed text-ink" data-testid="academy-demo-tutor">
          <p><strong>1.</strong> Six cars means 6 equal groups.</p>
          <p><strong>2.</strong> Each group has 3 people.</p>
          <p><strong>3.</strong> Multiply: 6 × 3 = 18 people.</p>
          <p className="rounded-2xl bg-white/70 p-3">Can you check it by counting 3, 6, 9 … up to 18?</p>
        </div>
        <p className="mt-6 text-[11px] font-bold leading-relaxed text-ink-soft">
          In the purchased product, this explanation appears automatically after each attempt.
        </p>
      </aside>
    </div>
  )
}

function ValueCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="card-base p-5 sm:p-6">
      <h3 className="text-[18px] font-black text-ink">{title}</h3>
      <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink-soft sm:text-[14px]">{body}</p>
    </article>
  )
}
