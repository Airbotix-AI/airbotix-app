// Shared UI primitives for Journey to the West story-part pages.

import clsx from 'clsx';

import type { JtwEvidenceOption } from './journeyWestSeason1';

export function EvidenceGroup({
  title,
  options,
  selected,
  onToggle,
  done,
  testId,
}: {
  title: string;
  options: JtwEvidenceOption[];
  selected: string[];
  onToggle: (id: string) => void;
  done: boolean;
  testId: string;
}) {
  return (
    <section data-testid={testId}>
      <h2 className="mb-2 text-[15px] font-bold text-ink">
        {title}
        {done && <span className="ml-2 text-brand-mint">✓</span>}
      </h2>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected.includes(option.id)}
            className={clsx(
              'rounded-full border px-4 py-2 text-[14px] font-semibold transition',
              selected.includes(option.id)
                ? 'border-brand-mint bg-wash-mint text-ink'
                : 'border-hairline bg-canvas-pure text-ink-soft hover:border-brand-mint/60',
            )}
            onClick={() => onToggle(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function Choice({
  option,
  active,
  onPick,
}: {
  option: JtwEvidenceOption;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={clsx(
        'rounded-2xl border px-4 py-2 text-left text-[14px] font-semibold transition',
        active
          ? 'border-brand-sky bg-wash-sky text-ink'
          : 'border-hairline bg-canvas-pure text-ink-soft hover:border-brand-sky/60',
      )}
      onClick={onPick}
    >
      {option.label}
    </button>
  );
}

/** Tap-to-order cards: each tap appends the card to the sequence (badge shows
 *  its position); tapping a placed card removes it. */
export function OrderCards({
  title,
  options,
  order,
  onChange,
  done,
  testId,
}: {
  title: string;
  options: JtwEvidenceOption[];
  order: string[];
  onChange: (order: string[]) => void;
  done: boolean;
  testId: string;
}) {
  return (
    <section data-testid={testId}>
      <h2 className="mb-2 text-[15px] font-bold text-ink">
        {title}
        {done && <span className="ml-2 text-brand-mint">✓</span>}
      </h2>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const position = order.indexOf(option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={position >= 0}
              className={clsx(
                'relative rounded-2xl border px-4 py-3 text-[14px] font-semibold transition',
                position >= 0
                  ? 'border-brand-sky bg-wash-sky text-ink'
                  : 'border-hairline bg-canvas-pure text-ink-soft hover:border-brand-sky/60',
              )}
              onClick={() =>
                onChange(
                  position >= 0 ? order.filter((id) => id !== option.id) : [...order, option.id],
                )
              }
            >
              {position >= 0 && (
                <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-sky text-[12px] font-black text-white">
                  {position + 1}
                </span>
              )}
              {option.label}
            </button>
          );
        })}
        {order.length > 0 && (
          <button type="button" className="btn-pill-ghost text-[13px]" onClick={() => onChange([])}>
            重新排
          </button>
        )}
      </div>
    </section>
  );
}
