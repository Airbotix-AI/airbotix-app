import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { listMyAcademyProducts } from './academyApi';

export function MyExamPrepPage() {
  const me = useMe();
  const products = useQuery({
    queryKey: ['academy-my-products'],
    queryFn: listMyAcademyProducts,
  });

  return (
    <div>
      <header className="mb-8 max-w-3xl">
        <div className="eyebrow eyebrow-sky">Airbotix Academy</div>
        <h1 className="hero-display">
          My <span className="squiggle-word">Exam Prep</span>
        </h1>
        <p className="lead-text mt-4">
          {me.data?.kind === 'kid'
            ? `${me.data.nickname}, choose one of your unlocked exam products.`
            : 'Choose an unlocked exam product.'}
        </p>
      </header>

      {products.isLoading && <p className="lead-text">Loading your exam prep…</p>}
      {products.isError && (
        <div className="card-base max-w-2xl">
          <span className="sticker-sunshine">Hmm</span>
          <p className="lead-text mt-4">We couldn&apos;t load your exam products right now.</p>
        </div>
      )}
      {!products.isLoading && !products.isError && products.data?.length === 0 && (
        <div className="card-base max-w-2xl text-center" data-testid="academy-empty-products">
          <span className="sticker-sunshine">Ask a parent</span>
          <h2 className="section-heading mt-4">No exam prep unlocked yet</h2>
          <p className="lead-text mt-3">
            A parent can explore exam prep and choose the right exam and year in the Parent Portal.
          </p>
          <Link to="/learn" className="btn-pill-secondary mt-6 inline-block">
            Back home
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {(products.data ?? []).map((entitlement) => (
          <Link
            key={entitlement.id}
            to={`/learn/exams/${entitlement.product.slug}`}
            className="pack-card sky block"
            data-testid={`academy-product-${entitlement.product.slug}`}
          >
            <span className="pack-blob" />
            <div className="relative">
              <div className="text-[11px] font-black uppercase tracking-[0.13em] opacity-80">
                {entitlement.product.exam.title} · {entitlement.product.level_key}
              </div>
              <h2 className="mt-3 text-[25px] font-black leading-tight">
                {entitlement.product.title}
              </h2>
              <p className="mt-4 text-[14px] font-bold opacity-85">
                {entitlement.product.subject_key} · Open prep →
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
