// Parent referral card (affiliate-partner-program-prd.md §10, §11.2).
//
// Shows this family's own code, what it has earned, and their tuition-credit
// balance. Portal only — Kids Learn must never carry a referral or reward
// surface (D-AFF-11), so nothing here is importable from a /learn route.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { api } from '@/lib/api';
import { formatAud } from '@/lib/money';

interface CreditStatement {
  balance_aud_cents: number;
  entries: Array<{
    id: string;
    type: string;
    delta_aud_cents: number;
    expires_at: string | null;
  }>;
}

interface MyReferral {
  eligible: boolean;
  reason?: 'no_purchase_yet';
  code: string | null;
  share_url: string | null;
  referred_count: number;
  qualified_count: number;
  credit_balance_aud_cents: number;
}

export function ReferralCard() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const referral = useQuery<MyReferral>({
    queryKey: ['me-referral'],
    queryFn: () => api<MyReferral>('/me/referral'),
  });

  // Only fetched once there is a balance worth expiring. The statement is a
  // second request, and a family with no credit has nothing for it to say.
  const statement = useQuery<CreditStatement>({
    queryKey: ['tuition-credit'],
    queryFn: () => api<CreditStatement>('/me/tuition-credit'),
    enabled: (referral.data?.credit_balance_aud_cents ?? 0) > 0,
  });

  const issue = useMutation({
    mutationFn: () => api<{ code: string; share_url: string }>('/me/referral/code', { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me-referral'] });
    },
  });

  if (referral.isLoading) {
    return (
      <div className="card-base" data-testid="referral-card">
        <div className="eyebrow eyebrow-mint">Refer a friend</div>
        <p className="lead-text mt-4">Loading…</p>
      </div>
    );
  }

  // A failed read hides the card rather than showing a broken one. This is a
  // nice-to-have panel on a dashboard that has to keep working.
  if (referral.isError || !referral.data) return null;

  const d = referral.data;

  // Not eligible yet. Say WHY rather than rendering an empty card — "you'll get
  // a code after your first class" is a reason a parent can act on; a blank
  // panel reads as broken.
  if (!d.eligible) {
    return (
      <div className="card-base" data-testid="referral-card">
        <div className="eyebrow eyebrow-mint">Refer a friend</div>
        <p className="lead-text mt-4">
          Once you've booked your first class, you'll get a code to share. Friends who use it get
          money off, and so do you.
        </p>
      </div>
    );
  }

  // The SOONEST expiry among grants that still have credit behind them — that
  // is the date the parent actually needs to act on. Showing the latest, or a
  // list, buries the deadline that is about to pass.
  const nextExpiry = (() => {
    const dates = (statement.data?.entries ?? [])
      .filter((e) => e.delta_aud_cents > 0 && e.expires_at)
      .map((e) => new Date(e.expires_at as string))
      .filter((dt) => dt.getTime() > Date.now())
      .sort((a, b) => a.getTime() - b.getTime());
    return dates.length
      ? dates[0].toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
  })();

  const copy = async () => {
    if (!d.share_url) return;
    try {
      await navigator.clipboard.writeText(d.share_url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is permission-gated and blocked outright in some embedded
      // browsers. The link is on screen and selectable, so failing quietly
      // leaves the parent no worse off than before they clicked.
    }
  };

  return (
    <div className="card-base" data-testid="referral-card">
      <div className="eyebrow eyebrow-mint">Refer a friend</div>

      {d.code ? (
        <>
          <p className="lead-text mt-4">
            Share your code. Your friend gets money off their first class, and you get credit
            towards yours.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <code className="rounded-2xl bg-wash-mint px-4 py-2 text-[18px] font-bold tracking-[0.2em] text-ink">
              {d.code}
            </code>
            <button type="button" onClick={copy} className="btn-pill-secondary">
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div>
              <dt className="stat-label">Invited</dt>
              <dd className="stat-num !text-[24px] tabular-nums">{d.referred_count}</dd>
            </div>
            <div>
              <dt className="stat-label">Joined</dt>
              <dd className="stat-num !text-[24px] tabular-nums">{d.qualified_count}</dd>
            </div>
            <div>
              <dt className="stat-label">Your credit</dt>
              <dd className="stat-num !text-[24px] tabular-nums">
                {formatAud(d.credit_balance_aud_cents)}
              </dd>
            </div>
          </dl>
          {d.credit_balance_aud_cents > 0 && (
            <p className="mt-4 text-[12px] leading-relaxed text-slate2">
              Your credit comes off automatically at your next class checkout.
              {nextExpiry && ` Use it by ${nextExpiry} or it expires.`}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="lead-text mt-4">
            You're eligible. Get your code and start sharing.
          </p>
          <button
            type="button"
            onClick={() => issue.mutate()}
            disabled={issue.isPending}
            className="btn-pill-primary mt-4"
          >
            {issue.isPending ? 'Getting your code…' : 'Get my referral code'}
          </button>
          {issue.isError && (
            <p className="mt-3 text-[12px] font-medium text-brand-coral">
              Couldn't get a code just now. Try again in a moment.
            </p>
          )}
        </>
      )}
    </div>
  );
}
