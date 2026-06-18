const OPTIONS: { label: string; value: number; stars: number }[] = [
  { label: '15s', value: 15, stars: 2 },
  { label: '30s', value: 30, stars: 3 },
  { label: '60s', value: 60, stars: 5 },
  { label: '2min', value: 120, stars: 8 },
];

export function musicCostFor(durationSec: number): number {
  if (durationSec <= 15) return 2;
  if (durationSec <= 30) return 3;
  if (durationSec <= 60) return 5;
  return 8;
}

export function DurationPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold text-ink-soft shrink-0">Length</span>
      <div className="flex gap-1.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              value === opt.value
                ? 'rounded-full px-3 py-1 text-[11px] font-semibold bg-brand-mint text-ink ring-1 ring-brand-mint'
                : 'rounded-full px-3 py-1 text-[11px] font-semibold bg-surface text-ink-soft hover:bg-wash-mint transition-colors'
            }
          >
            {opt.label}
            <span className={value === opt.value ? 'ml-1 opacity-70' : 'ml-1 opacity-50'}>
              −{opt.stars}★
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
