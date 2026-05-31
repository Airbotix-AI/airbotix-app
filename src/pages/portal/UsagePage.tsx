import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import type { FamilyUsage, UsageSummary } from './walletTypes';

type Range = '24h' | '7d' | '28d';

const RANGE_DAYS: Record<Range, number> = { '24h': 1, '7d': 7, '28d': 28 };

function rangeBounds(range: Range): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** Family AI usage analytics — `/portal/usage` (parent-portal-prd §4.9). */
export function UsagePage() {
  const me = useMe();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;
  const [range, setRange] = useState<Range>('7d');
  const { from, to } = rangeBounds(range);

  const summary = useQuery<UsageSummary>({
    queryKey: ['family', familyId, 'usage-summary', range],
    queryFn: () => api<UsageSummary>(`/families/${familyId}/usage/summary?range=${range}`),
    enabled: !!familyId,
  });

  const usage = useQuery<FamilyUsage>({
    queryKey: ['family', familyId, 'usage', from, to],
    queryFn: () => api<FamilyUsage>(`/families/${familyId}/usage?from=${from}&to=${to}&group_by=kid`),
    enabled: !!familyId,
  });

  if (!familyId) {
    return (
      <div>
        <div className="eyebrow">Usage</div>
        <h1 className="section-heading">Set up your family first</h1>
        <Link to="/portal/register" className="btn-pill-primary mt-6">Start setup →</Link>
      </div>
    );
  }

  const s = summary.data;
  const u = usage.data;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow eyebrow-sky">Usage</div>
          <h1 className="section-heading">AI usage</h1>
          <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
            How much AI your family used — Stars, requests, and which kid. No prompts or content stored here.
          </p>
        </div>
        <div className="flex gap-1.5">
          {(['24h', '7d', '28d'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors ${
                range === r ? 'bg-brand-sky text-white' : 'bg-surface text-ink-soft hover:bg-wash-sky hover:text-ink'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="stat-tile sky">
          <div className="stat-num text-brand-sky">{s?.total_stars ?? '—'}</div>
          <div className="stat-label">Stars spent</div>
        </div>
        <div className="stat-tile mint">
          <div className="stat-num text-brand-mint">{s?.total_requests ?? '—'}</div>
          <div className="stat-label">AI requests</div>
        </div>
        <div className="stat-tile bubblegum">
          <div className="stat-num text-brand-bubblegum">
            {s?.wow_delta_pct != null ? `${s.wow_delta_pct > 0 ? '+' : ''}${s.wow_delta_pct}%` : '—'}
          </div>
          <div className="stat-label">vs last week</div>
        </div>
      </div>

      {s && (s.top_model || s.top_kid) && (
        <div className="card-base mb-8 flex flex-wrap gap-6">
          {s.top_kid && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.10em] text-slate2 font-bold">Top kid</div>
              <div className="text-[15px] font-bold text-ink mt-1">
                {s.top_kid.nickname} · {s.top_kid.stars}★
              </div>
            </div>
          )}
          {s.top_model && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.10em] text-slate2 font-bold">Top model</div>
              <div className="text-[15px] font-bold text-ink mt-1 font-mono">{s.top_model}</div>
            </div>
          )}
        </div>
      )}

      <h2 className="section-heading mb-4" style={{ fontSize: '22px' }}>Per kid</h2>
      {usage.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : u && u.by_kid.length > 0 ? (
        <div className="card-base p-0 overflow-hidden">
          <ul className="divide-y divide-hairline">
            {u.by_kid.map((k) => (
              <li key={k.kid_id} className="flex items-center justify-between px-6 py-4">
                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-ink truncate">{k.nickname}</div>
                  <div className="text-[12px] text-slate2 mt-0.5">
                    {k.requests} requests · {Math.round(k.active_seconds / 60)} min active
                    {k.flagged_count > 0 ? ` · ${k.flagged_count} flagged` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[18px] font-bold tabular-nums text-brand-sky">{k.stars}★</span>
                  <Link to={`/portal/usage/${k.kid_id}`} className="btn-pill-secondary text-[13px]">
                    Details →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="card-base text-center">
          <span className="sticker-sky">No usage yet</span>
          <p className="lead-text mt-4">Once your kids start creating, their AI usage shows up here.</p>
        </div>
      )}
    </div>
  );
}
