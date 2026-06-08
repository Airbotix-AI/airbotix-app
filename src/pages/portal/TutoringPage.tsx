import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';

// Mirrors platform-backend TutoringPlan (src/tutoring). Prices in AUD cents.
interface TutoringPlan {
  id: string;
  sku: string;
  name: string;
  group_size: number;
  hours: number;
  price_aud_cents: number;
  per_hour_aud_cents: number;
}

interface Entitlement {
  id: string;
  hours_total: number;
  hours_remaining: number;
  status: string;
  plan?: { name: string; sku: string };
}

interface PurchaseResponse {
  payment_id: string;
  checkout_url: string;
  sku: string;
  hours_pending: number;
}

const aud = (cents: number) => `A$${(cents / 100).toFixed(0)}`;
const COLORS = ['sky', 'mint', 'bubblegum', 'coral'] as const;

export function TutoringPage() {
  const me = useMe();
  const nav = useNavigate();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;

  const [plans, setPlans] = useState<TutoringPlan[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [p, e] = await Promise.all([
          api<TutoringPlan[]>('/tutoring/plans'),
          api<Entitlement[]>(`/tutoring/families/${familyId}/entitlements`),
        ]);
        if (!cancelled) {
          setPlans(p);
          setEntitlements(e);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load tutoring.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId]);

  const buy = async (plan: TutoringPlan) => {
    if (!familyId) return;
    setBusy(plan.sku);
    setError(null);
    try {
      const res = await api<PurchaseResponse>(`/tutoring/families/${familyId}/purchase`, {
        method: 'POST',
        body: { sku: plan.sku },
      });
      window.location.href = res.checkout_url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start checkout.');
      setBusy(null);
    }
  };

  if (!familyId) {
    return (
      <div>
        <div className="eyebrow">Private tutoring</div>
        <h1 className="section-heading">Set up your family first</h1>
        <p className="lead-text mt-3">You need a family before you can buy tutoring hours.</p>
        <button onClick={() => nav('/portal/register')} className="btn-pill-primary mt-6">
          Start setup →
        </button>
      </div>
    );
  }

  const hoursRemaining = entitlements
    .filter((e) => e.status === 'active')
    .reduce((sum, e) => sum + e.hours_remaining, 0);

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow">Private tutoring</div>
        <h1 className="section-heading">Tutoring hours</h1>
        <p className="lead-text mt-3">
          1-on-1 and small-group private sessions. Buy a pack of hours; your tutor draws from it
          each session.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-coral/10 px-4 py-3 text-[14px] font-semibold text-coral">
          {error}
        </div>
      )}

      <div className="mb-8 rounded-3xl bg-surface p-6 shadow-sm">
        <div className="text-[12px] font-bold uppercase tracking-[0.14em] opacity-70">
          Hours remaining
        </div>
        <div className="mt-1 text-[44px] font-extrabold leading-none">{hoursRemaining}</div>
        {entitlements.length > 0 && (
          <ul className="mt-4 space-y-1 text-[14px] opacity-80">
            {entitlements.map((e) => (
              <li key={e.id}>
                {e.plan?.name ?? 'Pack'} — {e.hours_remaining}/{e.hours_total} hrs
                {e.status !== 'active' && <span className="ml-2 opacity-60">({e.status})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 className="mb-4 text-[18px] font-bold">Buy hours</h2>
      {loading ? (
        <p className="lead-text">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {plans.map((plan, i) => {
            const isBusy = busy === plan.sku;
            return (
              <button
                key={plan.id}
                type="button"
                disabled={busy !== null}
                onClick={() => buy(plan)}
                className={`pack-card ${COLORS[i % COLORS.length]}`}
              >
                <span className="pack-blob" />
                <div className="relative">
                  <div className="text-[12px] font-bold uppercase tracking-[0.14em] opacity-85">
                    {plan.group_size === 1 ? '1-on-1' : `Group of ${plan.group_size}`}
                  </div>
                  <div className="mt-2 font-extrabold leading-none" style={{ fontSize: '48px', letterSpacing: '-0.03em' }}>
                    {plan.hours}
                    <span className="ml-2 text-[18px] font-semibold opacity-80">hrs</span>
                  </div>
                  <div className="mt-1 text-[14px] font-semibold opacity-90">{plan.name}</div>
                  <div className="mt-4 text-[20px] font-extrabold">
                    {aud(plan.price_aud_cents)}
                    <span className="ml-2 text-[13px] font-semibold opacity-70">
                      ({aud(plan.per_hour_aud_cents)}/hr)
                    </span>
                  </div>
                  <div className="mt-3 text-[13px] font-bold opacity-80">
                    {isBusy ? 'Starting checkout…' : 'Buy →'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
