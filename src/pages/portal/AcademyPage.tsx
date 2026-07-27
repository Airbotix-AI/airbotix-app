import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { getAcademyCatalog, listFamilyAcademyEntitlements } from '@/pages/learn/academy/academyApi';
import { AcademyProductCard } from './AcademyProductCard';
import { AcademySalesIntro } from './AcademySalesIntro';

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
      <AcademySalesIntro />

      {(owned.data ?? []).some((entitlement) => (entitlement.sessions?.length ?? 0) > 0) && (
        <section className="card-base mb-9" data-testid="academy-family-reports">
          <div className="eyebrow eyebrow-mint">Recent mock exam reports</div>
          <div className="mt-4 grid gap-3">
            {(owned.data ?? []).flatMap((entitlement) =>
              (entitlement.sessions ?? []).map((session) => (
                <Link
                  key={session.id}
                  to={`/portal/academy/reports/${session.id}`}
                  className="rounded-2xl bg-wash-mint p-4 font-black text-ink"
                >
                  {entitlement.kid?.nickname ?? 'Your child'} ·{' '}
                  {session.paper?.title ?? entitlement.product.title}
                  <span className="mt-1 block text-sm text-slate2">
                    Objective and self-assessed marks shown separately →
                  </span>
                </Link>
              )),
            )}
          </div>
        </section>
      )}

      {catalog.isLoading && <p className="lead-text">Loading exam products…</p>}
      {catalog.isError && (
        <div className="card-base max-w-2xl">
          <span className="sticker-sunshine">Please try again</span>
          <p className="lead-text mt-4">We couldn&apos;t load NAPLAN products right now.</p>
        </div>
      )}

      {(catalog.data ?? []).map((exam) => (
        <section
          key={exam.slug}
          id={exam.slug === 'naplan' ? 'choose-naplan-year' : undefined}
          className="mb-9 scroll-mt-6 sm:mb-12 sm:scroll-mt-8"
          data-testid={`academy-exam-${exam.slug}`}
        >
          <div className="mb-5 max-w-3xl sm:mb-6">
            <div className="eyebrow eyebrow-bubblegum mb-2 text-[10px] sm:mb-3 sm:text-[12px]">
              {exam.title} Numeracy
            </div>
            <h2 className="text-[25px] font-bold leading-[1.15] text-ink sm:text-[40px]">
              Which Year is your child preparing for?
            </h2>
            <p className="mt-2.5 text-[15px] font-medium leading-relaxed text-ink-soft sm:mt-3 sm:text-[18px]">
              Choose carefully: each Year is a separate product and stays fixed for the child you
              select at checkout.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {exam.products.map((product) => {
              const owners = ownersByProduct.get(product.id) ?? [];
              return (
                <AcademyProductCard
                  key={product.id}
                  examTitle={exam.title}
                  owners={owners}
                  product={product}
                />
              );
            })}
          </div>
        </section>
      ))}

      {!catalog.isLoading && !catalog.isError && catalog.data?.length === 0 && (
        <div className="card-base max-w-2xl text-center">
          <span className="sticker-sunshine">Coming soon</span>
          <p className="lead-text mt-4">NAPLAN products will appear here once they are ready.</p>
        </div>
      )}

      <section className="card-feature mt-9 grid gap-4 p-5 sm:mt-12 sm:gap-5 sm:p-8 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <div className="eyebrow eyebrow-sky mb-2 text-[10px] sm:mb-3 sm:text-[12px]">
            Before you buy
          </div>
          <h2 className="text-[22px] font-black leading-tight text-ink sm:text-[26px]">
            What happens next?
          </h2>
        </div>
        <ol className="grid gap-3 text-[13px] font-medium leading-relaxed text-ink-soft sm:grid-cols-3 sm:gap-4 sm:text-[14px]">
          <li>
            <strong className="block text-ink">1. Choose a Year</strong>Pick the product that
            matches your child.
          </li>
          <li>
            <strong className="block text-ink">2. Choose a child</strong>Access belongs to that
            child&apos;s profile.
          </li>
          <li>
            <strong className="block text-ink">3. Start practising</strong>They open it from My Exam
            Prep.
          </li>
        </ol>
      </section>
    </div>
  );
}
