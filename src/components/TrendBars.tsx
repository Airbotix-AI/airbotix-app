import type { UsageTrendPoint } from '@/pages/portal/walletTypes';

/**
 * Tiny daily-activity sparkline (brand-sky bars). Shared by the parent usage
 * dashboard (`KidUsagePage`) and the kid growth report (`KidGrowthPage`).
 */
export function TrendBars({ points, className = 'h-28' }: { points: UsageTrendPoint[]; className?: string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div className={`flex items-end gap-1 ${className}`} aria-hidden="true">
      {points.map((p) => (
        <div
          key={p.local_date}
          className="flex-1 flex flex-col items-center justify-end"
          title={`${p.local_date}: ${p.value}★`}
        >
          <div
            className="w-full rounded-t bg-brand-sky"
            style={{ height: `${Math.max(4, (p.value / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  );
}
