import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { getMyAcademyProduct, getProductProgress } from './academyApi';

export function AcademyProductPage() {
  const { productSlug = '' } = useParams<{ productSlug: string }>();
  const me = useMe();
  const product = useQuery({
    queryKey: ['academy-product', productSlug],
    queryFn: () => getMyAcademyProduct(productSlug),
    enabled: productSlug !== '',
    retry: false,
  });
  const progress = useQuery({
    queryKey: ['academy-product-progress', productSlug],
    queryFn: () => getProductProgress(productSlug),
    enabled: product.isSuccess,
  });

  if (product.isLoading) return <p className="lead-text">Loading exam prep…</p>;
  if (product.isError || !product.data) {
    return (
      <div className="card-base max-w-2xl text-center">
        <span className="sticker-sunshine">Not unlocked</span>
        <p className="lead-text mt-4">This exam product is not unlocked for this account.</p>
        <Link to="/learn/exams" className="btn-pill-primary mt-6 inline-block">
          My Exam Prep
        </Link>
      </div>
    );
  }

  const p = product.data.product;
  return (
    <div>
      <header className="mb-8 max-w-3xl">
        <div className="eyebrow eyebrow-sky">
          {p.exam.title} · {p.level_key} · {p.subject_key}
        </div>
        <h1 className="hero-display">
          {me.data?.kind === 'kid' ? `${me.data.nickname}'s` : 'My'}{' '}
          <span className="squiggle-word">exam prep</span>
        </h1>
        <p className="lead-text mt-4">
          Everything here belongs to {p.title}. Your year stays fixed.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Link
          to={`/learn/exams/${productSlug}/practice`}
          className="pack-card mint block"
          data-testid="academy-topic-practice"
        >
          <span className="pack-blob" />
          <div className="relative">
            <div className="text-[11px] font-black uppercase tracking-[0.13em] opacity-80">
              Ready now
            </div>
            <h2 className="mt-3 text-[26px] font-black">Topic practice</h2>
            <p className="mt-3 text-[14px] font-bold opacity-85">
              {p._count?.question_links ?? 0} reviewed questions · Start →
            </p>
          </div>
        </Link>
        <section className="card-base">
          <div className="eyebrow eyebrow-bubblegum">Your progress</div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat label="Done" value={String(progress.data?.attempts ?? 0)} />
            <Stat label="Right" value={String(progress.data?.correct ?? 0)} />
            <Stat label="Accuracy" value={`${Math.round((progress.data?.accuracy ?? 0) * 100)}%`} />
          </div>
        </section>
        <ComingSoon title="Mock tests" copy="Timed papers built for this exact exam product." />
        <ComingSoon title="Wrong questions" copy="Review only the questions you missed here." />
      </div>

      <Link to="/learn/exams" className="btn-pill-secondary mt-8 inline-block">
        ← My Exam Prep
      </Link>
    </div>
  );
}

function ComingSoon({ title, copy }: { title: string; copy: string }) {
  return (
    <section className="card-base opacity-75">
      <span className="sticker-sunshine">Coming next</span>
      <h2 className="section-heading mt-4">{title}</h2>
      <p className="lead-text mt-3">{copy}</p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-wash-sky p-3 text-center">
      <div className="text-[24px] font-black text-ink">{value}</div>
      <div className="text-[11px] font-black uppercase tracking-[0.1em] text-slate2">{label}</div>
    </div>
  );
}
