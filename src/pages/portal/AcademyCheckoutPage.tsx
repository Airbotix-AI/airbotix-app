import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { ApiError, api } from '@/lib/api';
import {
  getAcademyProduct,
  getAcademyOrder,
  listFamilyAcademyEntitlements,
  startAcademyCheckout,
} from '@/pages/learn/academy/academyApi';
import { startHostedCheckout } from './airwallex';

interface Kid {
  id: string;
  nickname: string;
  age: number;
}

const money = (cents: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);

export function AcademyCheckoutPage() {
  const { sku = '' } = useParams<{ sku: string }>();
  const location = useLocation();
  const me = useMe();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;
  const [kidId, setKidId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingIntent, setPendingIntent] = useState(() =>
    sku ? sessionStorage.getItem(`academy-intent:${sku}`) : null,
  );

  const product = useQuery({
    queryKey: ['academy-public-product', sku],
    queryFn: () => getAcademyProduct(sku),
    enabled: sku !== '',
    retry: false,
  });
  const kids = useQuery<Kid[]>({
    queryKey: ['families', familyId, 'kids'],
    queryFn: () => api<Kid[]>(`/families/${familyId}/kids`),
    enabled: !!familyId,
  });
  const entitlements = useQuery({
    queryKey: ['academy-family-entitlements', familyId],
    queryFn: () => listFamilyAcademyEntitlements(familyId!),
    enabled: !!familyId,
  });
  const order = useQuery({
    queryKey: ['academy-order', pendingIntent],
    queryFn: () => getAcademyOrder(pendingIntent!),
    enabled: !!pendingIntent,
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' || query.state.data === undefined ? 2_000 : false,
  });

  useEffect(() => {
    if (!pendingIntent) return;
    if (order.data?.status === 'failed' || order.data?.status === 'cancelled') {
      sessionStorage.removeItem(`academy-intent:${sku}`);
      setPendingIntent(null);
    }
  }, [order.data?.status, pendingIntent, sku]);

  if (me.data?.kind === 'user' && !familyId) {
    return <Navigate to="/portal/register" state={{ from: location }} replace />;
  }

  if (product.isLoading) return <p className="lead-text">Loading order…</p>;
  if (product.isError || !product.data) {
    return (
      <div className="card-base max-w-2xl">
        <span className="sticker-sunshine">Not available</span>
        <p className="lead-text mt-4">This exam product is not available for purchase.</p>
        <Link to="/portal/academy" className="btn-pill-secondary mt-6 inline-block">
          Browse exam prep
        </Link>
      </div>
    );
  }

  const p = product.data;
  const ownedKidIds = new Set(
    (entitlements.data ?? [])
      .filter(
        (entitlement) =>
          entitlement.status === 'active' && entitlement.product.id === p.id && entitlement.kid,
      )
      .map((entitlement) => entitlement.kid!.id),
  );
  const submit = async () => {
    if (!kidId) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await startAcademyCheckout(p.id, kidId);
      sessionStorage.setItem(`academy-intent:${p.slug}`, order.payment_intent_id);
      await startHostedCheckout(order);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start checkout.');
      setSubmitting(false);
    }
  };

  if (order.data?.status === 'succeeded' && order.data.entitlement?.status === 'active') {
    return (
      <div className="card-base max-w-2xl text-center" data-testid="academy-checkout-unlocked">
        <span className="sticker-mint">Unlocked</span>
        <h1 className="section-heading mt-4">{p.title} is ready ✓</h1>
        <p className="lead-text mt-3">
          Payment is confirmed. The selected child can now open it from My Exam Prep.
        </p>
        <Link to="/portal/academy" className="btn-pill-primary mt-6 inline-block">
          My exam products
        </Link>
      </div>
    );
  }

  if (pendingIntent) {
    return (
      <div className="card-base max-w-2xl text-center" data-testid="academy-checkout-confirming">
        <span className="sticker-sky alt">Confirming payment…</span>
        <h1 className="section-heading mt-4">Unlocking {p.title}</h1>
        <p className="lead-text mt-3">
          We&apos;re waiting for payment confirmation. Don&apos;t pay again; access unlocks
          automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="eyebrow eyebrow-sky">Exam prep checkout</div>
      <h1 className="hero-display mt-3">{p.title}</h1>
      <section className="card-base mt-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <div className="label-k12">Product</div>
            <p className="mt-2 text-[18px] font-black text-ink">
              {p.exam.title} · {p.level_key} · {p.subject_key}
            </p>
            <p className="mt-2 text-[14px] text-slate2">
              {p._count.question_links} reviewed questions · {p.access_days} days access
            </p>
          </div>
          <div className="sm:text-right">
            <div className="label-k12">Total</div>
            <div className="mt-2 text-[30px] font-black text-ink">{money(p.price_aud_cents)}</div>
          </div>
        </div>

        <label className="mt-7 block">
          <span className="label-k12">Who is this exam prep for?</span>
          <select
            className="input-k12 mt-2"
            value={kidId}
            onChange={(event) => setKidId(event.target.value)}
            data-testid="academy-checkout-kid"
          >
            <option value="">Choose a child</option>
            {(kids.data ?? []).map((kid) => (
              <option key={kid.id} value={kid.id} disabled={ownedKidIds.has(kid.id)}>
                {kid.nickname} (age {kid.age}){ownedKidIds.has(kid.id) ? ' — already unlocked' : ''}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="mt-4 font-bold text-brand-coral">{error}</p>}
        <button
          type="button"
          disabled={!kidId || submitting}
          onClick={() => void submit()}
          className="btn-pill-primary mt-6 disabled:opacity-50"
          data-testid="academy-checkout-pay"
        >
          {submitting ? 'Opening secure checkout…' : `Pay ${money(p.price_aud_cents)} →`}
        </button>
        <p className="mt-4 text-[12px] leading-relaxed text-slate2">
          Access is granted to the selected child only after payment is confirmed.
        </p>
      </section>
    </div>
  );
}
