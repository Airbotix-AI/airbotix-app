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
  const supportedModes = p.exam.brand_config?.supported_modes ?? ['practice'];
  const supportsMock = supportedModes.includes('mock');
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

      <section className="mb-6 rounded-[24px] bg-ink p-5 text-white sm:p-7">
        <div className="eyebrow eyebrow-sky">Choose how to learn</div>
        <h2 className="mt-2 text-[26px] font-black">Practice or sit a real paper.</h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-white/75">
          Practice mode gives feedback after every question. Mock exam mode is timed, saves your
          place, and locks answers and marking guides until you submit the whole paper.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Link
          to={`/learn/exams/${productSlug}/practice`}
          className="pack-card mint block"
          data-testid="academy-topic-practice"
        >
          <span className="pack-blob" />
          <div className="relative">
            <div className="text-[11px] font-black uppercase tracking-[0.13em] opacity-80">
              Practice mode
            </div>
            <h2 className="mt-3 text-[26px] font-black">刷题练习 · Topic practice</h2>
            <p className="mt-3 text-[14px] font-bold opacity-85">
              Untimed · immediate marking · Tutor feedback
            </p>
            <p className="mt-2 text-[14px] font-bold opacity-85">
              {p._count?.question_links ?? 0} reviewed questions · Start practice →
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
        {supportsMock && (p.papers ?? []).length > 0 ? (
          <section className="card-base" data-testid="academy-mock-papers">
            <div className="eyebrow eyebrow-bubblegum">模拟考试 · Mock exam mode</div>
            <p className="mt-2 text-sm font-semibold text-slate2">
              Timed fixed papers · resume on another visit · marking guide after submission
            </p>
            <div className="mt-4 grid gap-3">
              {(p.papers ?? []).map((paper) => (
                <Link
                  key={paper.id}
                  to={`/learn/exams/${productSlug}/mock/${paper.id}`}
                  className="rounded-2xl bg-wash-bubblegum p-4 font-black text-ink"
                >
                  <span className="block">{paper.title}</span>
                  <span className="mt-1 block text-sm text-slate2">
                    {paper._count.questions} questions · {paper.time_limit_minutes} minutes
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : supportsMock ? (
          <ComingSoon title="Mock tests" copy="Timed papers built for this exact exam product." />
        ) : (
          <section className="card-base opacity-75">
            <span className="sticker-mint">Practice-only series</span>
            <h2 className="section-heading mt-4">No fixed exam-paper mode</h2>
            <p className="lead-text mt-3">
              This question library supports刷题 practice, not a fixed official-paper simulation.
            </p>
          </section>
        )}
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
