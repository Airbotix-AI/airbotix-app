import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useMe, useParentKidLogin } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { TrendBars } from '@/components/TrendBars';
import { GROWTH_WINDOW_DAYS, summarize, growthHeadline, studioMeta } from './kidGrowth';
import type { KidUsageDetail, UsageTrendPoint } from './walletTypes';

interface Kid {
  id: string;
  nickname: string;
  age: number;
  is_active: boolean;
  family_id: string | null;
}

interface FamilyData {
  id: string;
  code: string;
}

/** 28-day window, matched to `KidUsagePage` / `KidGrowthTeaser` so queries share cache. */
function growthBounds(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - GROWTH_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/**
 * Kid growth report — the landing when a parent taps a kid in My Family.
 * Story-first: a warm headline, highlight tiles, a daily-activity sparkline and a
 * friendly "what they've been making" breakdown. Profile/PIN/Delete live one tap
 * away at `/portal/family/:kidId/settings`. See `parent-portal-growth-report-prd.md`.
 */
export function KidGrowthPage() {
  const { kidId } = useParams<{ kidId: string }>();
  const navigate = useNavigate();
  const me = useMe();
  const parentKidLogin = useParentKidLogin();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;
  const [copied, setCopied] = useState(false);
  const [openingKidPage, setOpeningKidPage] = useState(false);
  const [kidLoginError, setKidLoginError] = useState('');
  const { from, to } = growthBounds();

  const kid = useQuery<Kid>({
    queryKey: ['kid', kidId],
    queryFn: () => api<Kid>(`/kids/${kidId}`),
    enabled: !!kidId,
  });

  const detail = useQuery<KidUsageDetail>({
    queryKey: ['kid', kidId, 'usage', from, to],
    queryFn: () => api<KidUsageDetail>(`/kids/${kidId}/usage?from=${from}&to=${to}`),
    enabled: !!kidId,
    retry: false,
  });

  const trend = useQuery<UsageTrendPoint[]>({
    queryKey: ['kid', kidId, 'usage-trend', from, to],
    // /usage/trend returns { metric, series: [...] } — unwrap to the array.
    queryFn: () =>
      api<{ series: UsageTrendPoint[] }>(
        `/kids/${kidId}/usage/trend?from=${from}&to=${to}&metric=stars`,
      ).then((r) => r.series ?? []),
    enabled: !!kidId,
    retry: false,
  });

  const family = useQuery<FamilyData>({
    queryKey: ['family', familyId],
    queryFn: () => api<FamilyData>(`/families/${familyId}`),
    enabled: !!familyId,
  });

  if (kid.isLoading) return <p className="lead-text">Loading…</p>;
  if (!kid.data) {
    return (
      <div>
        <div className="eyebrow">Kid</div>
        <h1 className="section-heading">Not found</h1>
        <Link to="/portal/family" className="btn-pill-secondary mt-6">← Back</Link>
      </div>
    );
  }

  const name = kid.data.nickname;
  const isActive = kid.data.is_active;
  const summary = summarize(detail.data, trend.data);
  const breakdown = Object.entries(detail.data?.by_task_type ?? {})
    .filter(([, v]) => v.requests > 0)
    .sort((a, b) => b[1].requests - a[1].requests);

  const copyCode = () => {
    const code = family.data?.code;
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const openKidPage = async () => {
    if (!kidId || openingKidPage) return;
    setOpeningKidPage(true);
    setKidLoginError('');
    try {
      await parentKidLogin(kidId);
      navigate('/learn');
    } catch {
      setKidLoginError(`Could not open ${name}'s page. Please try again.`);
      setOpeningKidPage(false);
    }
  };

  return (
    <div>
      <Link to="/portal/family" className="btn-pill-ghost mb-4 -ml-3">← Family</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-bubblegum">Growth</div>
          <h1 className="section-heading">{name}&apos;s growth</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            to={`/portal/family/${kidId}/settings`}
            aria-label={`Edit ${name}'s profile`}
            className="btn-pill-primary"
          >
            Edit profile
          </Link>
          <button
            type="button"
            className="btn-pill-secondary"
            onClick={openKidPage}
            disabled={openingKidPage || !isActive}
          >
            {openingKidPage ? 'Opening…' : `Open ${name}'s kids page`}
          </button>
          <span className={`sticker-${isActive ? 'mint' : 'sunshine'}`}>
            {isActive ? 'Active' : 'Paused'}
          </span>
        </div>
      </div>
      {kidLoginError && (
        <p role="alert" className="mb-4 text-[13px] font-semibold text-danger-600">
          {kidLoginError}
        </p>
      )}

      {detail.isLoading ? (
        <p className="lead-text">Loading {name}&apos;s growth…</p>
      ) : summary.isEmpty ? (
        <div className="card-base">
          <div className="text-[40px] leading-none" aria-hidden="true">🌱</div>
          <h2 className="section-heading mt-3" style={{ fontSize: '24px' }}>
            {name}&apos;s journey starts here
          </h2>
          <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
            Once {name} signs in and makes their first picture, song, or story, you&apos;ll see their
            creations and progress grow right here.
          </p>

          {familyId && family.data?.code && (
            <div className="mt-5 rounded-2xl border border-brand-mint/30 bg-wash-mint p-5">
              <div className="text-[15px] font-bold text-ink">Get {name} signed in</div>
              <p className="mt-2 text-[14px] text-ink-soft">
                1. On {name}&apos;s device, open{' '}
                <span className="font-mono font-semibold">app.airbotix.ai/learn/login</span>
              </p>
              <p className="mt-2 text-[14px] text-ink-soft">2. Enter your family code:</p>
              <div className="mt-2 flex items-center gap-3">
                <span
                  className="font-mono font-extrabold text-ink"
                  style={{ fontSize: '28px', letterSpacing: '0.2em' }}
                >
                  {family.data.code}
                </span>
                <button onClick={copyCode} className="btn-pill-secondary">Copy</button>
                {copied && (
                  <span aria-live="polite" className="text-[12px] font-semibold text-brand-mint">
                    Copied ✓
                  </span>
                )}
              </div>
              <p className="mt-2 text-[14px] text-ink-soft">
                3. {name} types their nickname and 4-digit PIN — that&apos;s it! 🎉
              </p>
            </div>
          )}

          <div className="mt-6 border-t border-ink/10 pt-5">
            <div className="eyebrow eyebrow-sky mb-2">What you&apos;ll see as {name} grows</div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[14px] font-medium text-slate2">
              <span><span aria-hidden="true">🎨 </span>creations made</span>
              <span><span aria-hidden="true">🔥 </span>day streaks</span>
              <span><span aria-hidden="true">✨ </span>favourite studios</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="lead-text mb-6">{growthHeadline(name, summary)}</p>

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 mb-8">
            <div className="stat-tile sky">
              <div className="stat-num text-brand-sky">{summary.creations}</div>
              <div className="stat-label">creations</div>
            </div>
            <div className="stat-tile coral">
              <div className="stat-num text-brand-coral">{summary.streak}</div>
              <div className="stat-label">day streak</div>
            </div>
            <div className="stat-tile bubblegum">
              <div className="stat-num text-brand-bubblegum">{summary.minutes}</div>
              <div className="stat-label">minutes exploring</div>
            </div>
            <div className="stat-tile mint">
              <div className="stat-num text-brand-mint">{summary.studiosTried}</div>
              <div className="stat-label">studios tried</div>
            </div>
          </div>

          {trend.data && trend.data.length > 0 && (
            <div className="card-base mb-8">
              <div className="eyebrow eyebrow-sky mb-3">This month</div>
              <TrendBars points={trend.data} />
            </div>
          )}

          {breakdown.length > 0 && (
            <div className="card-base mb-8">
              <div className="eyebrow eyebrow-mint mb-3">What {name}&apos;s been making</div>
              <ul className="space-y-3">
                {breakdown.map(([key, v]) => {
                  const meta = studioMeta(key);
                  const noun = v.requests === 1 ? meta.noun.replace(/s$/, '') : meta.noun;
                  return (
                    <li key={key} className="flex items-center justify-between">
                      <span className="text-[15px] font-semibold text-ink">
                        <span aria-hidden="true">{meta.emoji} </span>
                        {meta.label}
                      </span>
                      <span className="text-[14px] text-slate2">
                        <span className="font-bold text-ink">{v.requests}</span> {noun}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="card-base flex flex-col gap-3" style={{ maxWidth: '520px' }}>
        <Link
          to={`/portal/family/${kidId}/images`}
          className="text-[14px] font-semibold text-brand-bubblegum"
        >
          <span aria-hidden="true">🎨 </span>Art Studio pictures — see what {name} made →
        </Link>
        <Link to={`/portal/usage/${kidId}`} className="text-[14px] font-semibold text-brand-coral">
          <span aria-hidden="true">⭐ </span>Want the detailed usage &amp; spend? View AI usage →
        </Link>
        <Link to={`/portal/family/${kidId}/settings`} className="text-[14px] font-semibold text-ink-soft">
          <span aria-hidden="true">⚙ </span>Profile, PIN &amp; safety settings →
        </Link>
      </div>
    </div>
  );
}
