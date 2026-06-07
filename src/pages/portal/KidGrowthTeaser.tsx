import { useQuery } from '@tanstack/react-query';

import { TrendBars } from '@/components/TrendBars';
import { api } from '@/lib/api';
import { GROWTH_WINDOW_DAYS, summarize, studioMeta } from './kidGrowth';
import type { KidUsageDetail, UsageTrendPoint } from './walletTypes';

/** 28-day window, matched to `KidGrowthPage` / `KidUsagePage` so queries share cache. */
function growthBounds(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - GROWTH_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/**
 * One-line recent-growth teaser shown inside each kid card on the family list.
 * Always resilient: while loading shows a skeleton; on error or zero activity it
 * shows an encouraging "Ready to start" line — never a raw error.
 */
export function KidGrowthTeaser({ kidId, name }: { kidId: string; name: string }) {
  const { from, to } = growthBounds();

  const detail = useQuery<KidUsageDetail>({
    queryKey: ['kid', kidId, 'usage', from, to],
    queryFn: () => api<KidUsageDetail>(`/kids/${kidId}/usage?from=${from}&to=${to}`),
    enabled: !!kidId,
    retry: false,
  });

  const trend = useQuery<UsageTrendPoint[]>({
    queryKey: ['kid', kidId, 'usage-trend', from, to],
    queryFn: () => api<UsageTrendPoint[]>(`/kids/${kidId}/usage/trend?from=${from}&to=${to}&metric=stars`),
    enabled: !!kidId,
    retry: false,
  });

  if (detail.isLoading) {
    return <div className="mt-4 h-4 w-2/3 animate-pulse rounded-full bg-ink/10" aria-hidden="true" />;
  }

  const summary = summarize(detail.data, trend.data);

  if (detail.isError || summary.isEmpty) {
    return (
      <div className="mt-4 text-[14px] font-semibold text-ink-soft">
        <span aria-hidden="true">✨ </span>Ready to start — help {name} sign in
      </div>
    );
  }

  const emoji = summary.favourite?.emoji ?? studioMeta('image').emoji;
  const parts: string[] = [`${summary.creations} creation${summary.creations === 1 ? '' : 's'}`];
  if (summary.streak >= 2) parts.push(`🔥 ${summary.streak}-day streak`);
  else if (summary.activeDays >= 1) parts.push(`${summary.activeDays} active day${summary.activeDays === 1 ? '' : 's'}`);

  return (
    <div className="mt-4">
      <div className="text-[14px] font-semibold text-ink">
        <span aria-hidden="true">{emoji} </span>
        {parts.join(' · ')}
      </div>
      {trend.data && trend.data.length > 0 && (
        <div className="mt-2">
          <TrendBars points={trend.data} className="h-10" />
          <div className="mt-1 text-[11px] font-medium text-slate2">last 4 weeks</div>
        </div>
      )}
    </div>
  );
}
