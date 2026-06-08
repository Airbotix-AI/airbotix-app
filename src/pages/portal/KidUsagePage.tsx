import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { getToken } from '@/auth/authStore';
import { api } from '@/lib/api';
import type { KidUsageDetail, UsageTrendPoint } from './walletTypes';
import { TrendBars } from '@/components/TrendBars';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const DEFAULT_DAYS = 28;

function defaultBounds(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - DEFAULT_DAYS * 24 * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** Per-kid usage drill-down — `/portal/usage/:kidId` (parent-portal-prd §4.9). */
export function KidUsagePage() {
  const { kidId } = useParams<{ kidId: string }>();
  const { from, to } = defaultBounds();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const detail = useQuery<KidUsageDetail>({
    queryKey: ['kid', kidId, 'usage', from, to],
    queryFn: () => api<KidUsageDetail>(`/kids/${kidId}/usage?from=${from}&to=${to}`),
    enabled: !!kidId,
  });

  const trend = useQuery<UsageTrendPoint[]>({
    queryKey: ['kid', kidId, 'usage-trend', from, to],
    queryFn: () => api<UsageTrendPoint[]>(`/kids/${kidId}/usage/trend?from=${from}&to=${to}&metric=stars`),
    enabled: !!kidId,
  });

  const exportCsv = async () => {
    if (!kidId) return;
    setExporting(true);
    setExportError(null);
    try {
      const token = getToken('user');
      const res = await fetch(
        `${BASE_URL}/kids/${kidId}/usage/export.csv?from=${from}&to=${to}`,
        { headers: token ? { authorization: `Bearer ${token}` } : {}, credentials: 'include' },
      );
      if (res.status === 202) {
        setExportError('Your export is large — we’ll email you a download link.');
        return;
      }
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usage-${kidId}-${from}-to-${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError('Could not export. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const d = detail.data;

  return (
    <div>
      <Link to="/portal/usage" className="btn-pill-ghost mb-4 -ml-3">← Usage</Link>

      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow eyebrow-sky">Usage</div>
          <h1 className="section-heading">{d?.nickname ?? 'Kid'} — AI usage</h1>
          <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
            Last {DEFAULT_DAYS} days. Stars, requests, time, and what they used the AI for.
          </p>
        </div>
        <button onClick={exportCsv} disabled={exporting} className="btn-pill-secondary">
          {exporting ? 'Exporting…' : '⬇ Export CSV'}
        </button>
      </div>

      {exportError && (
        <div className="rounded-2xl bg-wash-sunshine border border-brand-sunshine/40 px-4 py-3 mb-6 text-[13px] font-medium text-ink">
          {exportError}
        </div>
      )}

      {detail.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : !d ? (
        <div className="card-base text-center">
          <span className="sticker-sky">No data</span>
          <p className="lead-text mt-4">No usage for this kid in the last {DEFAULT_DAYS} days.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 mb-8">
            <div className="stat-tile sky">
              <div className="stat-num text-brand-sky">{d.stars}</div>
              <div className="stat-label">Stars</div>
            </div>
            <div className="stat-tile mint">
              <div className="stat-num text-brand-mint">{d.requests}</div>
              <div className="stat-label">Requests</div>
            </div>
            <div className="stat-tile bubblegum">
              <div className="stat-num text-brand-bubblegum">{Math.round(d.active_seconds / 60)}</div>
              <div className="stat-label">Minutes</div>
            </div>
            <div className="stat-tile sunshine">
              <div className="stat-num text-brand-sunshine">{(d.tokens_in + d.tokens_out).toLocaleString()}</div>
              <div className="stat-label">Tokens</div>
            </div>
          </div>

          {/* Trend timeline */}
          {trend.data && trend.data.length > 0 && (
            <div className="card-base mb-8">
              <div className="eyebrow eyebrow-sky mb-3">Daily Stars</div>
              <TrendBars points={trend.data} />
            </div>
          )}

          {/* Tool breakdown */}
          <h2 className="section-heading mb-4" style={{ fontSize: '22px' }}>What they made</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
            <BreakdownCard
              title="By tool"
              rows={Object.entries(d.by_task_type ?? {}).map(([k, v]) => ({
                label: k,
                primary: `${v.stars}★`,
                secondary: `${v.requests} requests`,
              }))}
            />
            <BreakdownCard
              title="By model"
              rows={Object.entries(d.by_model ?? {}).map(([k, v]) => ({
                label: k,
                primary: `${v.stars}★`,
                secondary: `${v.calls} calls`,
              }))}
            />
          </div>

          {(d.flagged_count > 0 || d.approvals_asked > 0) && (
            <div className="card-base flex flex-wrap gap-6">
              <div>
                <div className="text-[11px] uppercase tracking-[0.10em] text-slate2 font-bold">Flagged responses</div>
                <div className="text-[18px] font-bold text-ink mt-1">{d.flagged_count}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.10em] text-slate2 font-bold">Approvals</div>
                <div className="text-[18px] font-bold text-ink mt-1">
                  {d.approvals_granted}/{d.approvals_asked} granted
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; primary: string; secondary: string }>;
}) {
  return (
    <div className="card-base">
      <div className="eyebrow eyebrow-mint mb-3">{title}</div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-slate2">Nothing yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-ink capitalize truncate">{r.label}</span>
              <span className="text-[13px] text-slate2 shrink-0 ml-3">
                <span className="font-bold text-ink">{r.primary}</span> · {r.secondary}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
