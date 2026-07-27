import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { getAcademyProduct } from '@/pages/learn/academy/academyApi';
import { AcademyMockExamDemo } from './AcademyMockExamDemo';
import { AcademyParentDemo } from './AcademyParentDemo';

const money = (cents: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);

export function AcademyProductDetailPage() {
  const [demoMode, setDemoMode] = useState<'practice' | 'mock'>('practice');
  const { slug = '' } = useParams<{ slug: string }>();
  const product = useQuery({
    queryKey: ['academy-public-product', slug],
    queryFn: () => getAcademyProduct(slug),
    enabled: slug !== '',
    retry: false,
  });

  if (product.isLoading) return <p className="lead-text">Loading product details…</p>;

  if (product.isError || !product.data) {
    return (
      <div className="card-base max-w-2xl">
        <span className="sticker-sunshine">Please try again</span>
        <p className="lead-text mt-4">We couldn&apos;t load this exam product right now.</p>
        <Link to="/portal/academy" className="btn-pill-secondary mt-6 inline-block">
          Back to Exam Prep
        </Link>
      </div>
    );
  }

  const item = product.data;
  const supportsMock = (item.exam.brand_config?.supported_modes ?? ['practice']).includes('mock');

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
              feedback. After every attempt, Airo Tutor automatically explains the thinking in small
              steps.
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
          <div className="eyebrow eyebrow-mint mb-2 text-[10px] sm:text-[12px]">
            Try the experience
          </div>
          <h2 id="try-demo-title" className="text-[25px] font-black text-ink sm:text-[38px]">
            See the question and the Tutor together.
          </h2>
          <p className="mt-2 text-[14px] font-medium leading-relaxed text-ink-soft sm:text-[16px]">
            Switch between untimed practice with immediate Tutor feedback and a timed sample paper
            that keeps answers locked until submission.
          </p>
        </div>
        <div className="my-5 inline-flex rounded-2xl bg-canvas-pure p-1" aria-label="Demo mode">
          <button
            type="button"
            className={demoMode === 'practice' ? 'btn-pill-primary' : 'btn-pill-ghost'}
            aria-pressed={demoMode === 'practice'}
            onClick={() => setDemoMode('practice')}
          >
            Practice mode
          </button>
          {supportsMock && (
            <button
              type="button"
              className={demoMode === 'mock' ? 'btn-pill-primary' : 'btn-pill-ghost'}
              aria-pressed={demoMode === 'mock'}
              onClick={() => setDemoMode('mock')}
            >
              Mock exam mode
            </button>
          )}
        </div>
        {demoMode === 'practice' || !supportsMock ? <AcademyParentDemo /> : <AcademyMockExamDemo />}
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
          body="It explains what the question asks, why the method works, where thinking may have slipped, and what to try next."
        />
      </section>

      <section className="card-feature mt-8 p-5 sm:mt-12 sm:p-8">
        <h2 className="text-[22px] font-black text-ink sm:text-[28px]">
          What happens after purchase?
        </h2>
        <ol className="mt-5 grid gap-4 text-[14px] font-medium leading-relaxed text-ink-soft sm:grid-cols-3">
          <li>
            <strong className="block text-ink">1. Assign one child</strong>The product is fixed to
            that child and Year.
          </li>
          <li>
            <strong className="block text-ink">2. Start in My Exam Prep</strong>Your child opens the
            product from their own account.
          </li>
          <li>
            <strong className="block text-ink">3. Practise and ask why</strong>Answers, progress,
            and Tutor explanations stay in one flow.
          </li>
        </ol>
      </section>
    </div>
  );
}

function ValueCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="card-base p-5 sm:p-6">
      <h3 className="text-[18px] font-black text-ink">{title}</h3>
      <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink-soft sm:text-[14px]">
        {body}
      </p>
    </article>
  );
}
