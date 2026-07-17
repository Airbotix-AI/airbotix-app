import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { getAcademyCatalog, listFamilyAcademyEntitlements } from '@/pages/learn/academy/academyApi';

const money = (cents: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);

export function AcademyPage() {
  const me = useMe();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;
  const catalog = useQuery({ queryKey: ['academy-catalog'], queryFn: getAcademyCatalog });
  const owned = useQuery({
    queryKey: ['academy-family-entitlements', familyId],
    queryFn: () => listFamilyAcademyEntitlements(familyId!),
    enabled: !!familyId,
  });

  const ownersByProduct = new Map<string, string[]>();
  for (const entitlement of owned.data ?? []) {
    if (entitlement.status !== 'active' || !entitlement.kid) continue;
    const owners = ownersByProduct.get(entitlement.product.id) ?? [];
    owners.push(entitlement.kid.nickname);
    ownersByProduct.set(entitlement.product.id, owners);
  }

  return (
    <div>
      <header className="mb-10 max-w-3xl">
        <div className="eyebrow eyebrow-sky">Airbotix Academy</div>
        <h1 className="hero-display">
          Choose the right <span className="squiggle-word">exam</span>.
        </h1>
        <p className="lead-text mt-4">
          Start with the exam series, then choose the year and subject your child is preparing for.
          Each card is a separate product for one child.
        </p>
      </header>

      {catalog.isLoading && <p className="lead-text">Loading exam products…</p>}
      {catalog.isError && <p className="lead-text">We couldn&apos;t load exam prep right now.</p>}

      {(catalog.data ?? []).map((exam) => (
        <section key={exam.slug} className="mb-10" data-testid={`academy-exam-${exam.slug}`}>
          <div className="mb-4">
            <div className="eyebrow eyebrow-bubblegum">Exam series</div>
            <h2 className="section-heading mt-2">{exam.title}</h2>
            <p className="lead-text mt-2">Which Year/Level is your child preparing for?</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {exam.products.map((product) => {
              const owners = ownersByProduct.get(product.id) ?? [];
              return (
                <article key={product.id} className="card-base">
                  <div className="text-[11px] font-black uppercase tracking-[0.13em] text-brand-sky">
                    {product.level_key} · {product.subject_key}
                  </div>
                  <h3 className="mt-3 text-[22px] font-black leading-tight text-ink">
                    {product.title}
                  </h3>
                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-[24px] font-black text-ink">
                        {money(product.price_aud_cents)}
                      </div>
                      <div className="text-[12px] font-bold text-slate2">
                        {product.access_days} days access
                      </div>
                    </div>
                    <div className="text-right">
                      {owners.length > 0 && (
                        <div className="mb-2 text-[12px] font-black text-brand-mint">
                          Owned by {owners.join(', ')}
                        </div>
                      )}
                      <Link
                        to={`/portal/academy/checkout/${product.slug}`}
                        className="btn-pill-primary"
                        data-testid={`academy-buy-${product.slug}`}
                      >
                        {owners.length > 0 ? 'Choose another child →' : 'Choose child →'}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {!catalog.isLoading && !catalog.isError && catalog.data?.length === 0 && (
        <div className="card-base max-w-2xl text-center">
          <span className="sticker-sunshine">Coming soon</span>
          <p className="lead-text mt-4">Exam products will appear here once they are ready.</p>
        </div>
      )}
    </div>
  );
}
