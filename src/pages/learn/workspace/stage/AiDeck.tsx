// "④ iterate" deck under the stage: AI bubble (template-assembled, PRD §3.3),
// version pills (0⭐ switch, PRD §3.5), suggestion cards (3⭐, PRD §3.4) and
// the 0⭐ instrument-style row for the selected instrument (PRD §5).

import clsx from 'clsx';

import {
  INSTRUMENT_STYLES,
  MUSIC_GENERATION_COST_STARS,
  STAGE_SLOTS,
  SUGGESTION_CARDS,
  type StageSlotId,
  type StageStyles,
  type SuggestionCard,
} from './stageData';

export interface VersionPill {
  label: string;
}

export function AiDeck({
  bubble,
  onRetry,
  versions,
  currentVersion,
  onSelectVersion,
  hasSong,
  busy,
  onSuggestion,
  selectedSlot,
  styles,
  onStyle,
}: {
  bubble: string;
  /** Set after a failed generation — renders the "Try again" button. */
  onRetry: (() => void) | null;
  versions: VersionPill[];
  currentVersion: number;
  onSelectVersion: (idx: number) => void;
  hasSong: boolean;
  busy: boolean;
  onSuggestion: (card: SuggestionCard) => void;
  selectedSlot: StageSlotId | null;
  styles: StageStyles;
  onStyle: (slot: StageSlotId, styleId: string) => void;
}) {
  const slotMeta = selectedSlot ? STAGE_SLOTS.find((s) => s.id === selectedSlot) : null;
  return (
    <div className="grid gap-4 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-grad-mint text-[20px] shadow-brand-mint" aria-hidden="true">
          🤖
        </div>
        <div
          className="flex-1 rounded-tl-md rounded-tr-3xl rounded-b-3xl bg-wash-mint px-4 py-3 text-[13.5px] leading-relaxed text-ink"
          data-testid="ai-bubble"
        >
          {bubble}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="ml-2 rounded-full border-2 border-brand-mint bg-canvas-pure px-3 py-1 text-[12px] font-bold text-ink transition hover:-translate-y-px"
              data-testid="bubble-retry"
            >
              🔁 Try again
            </button>
          )}
        </div>
      </div>

      {versions.length >= 2 && (
        <div className="flex flex-wrap items-center gap-2" data-testid="version-row">
          <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-slate2">Versions</span>
          {versions.map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelectVersion(i)}
              className={clsx(
                'rounded-full px-3 py-1 text-[12px] font-extrabold transition',
                i === currentVersion
                  ? 'border-2 border-ink bg-ink text-canvas'
                  : 'border-2 border-hairline bg-canvas-pure text-slate2 hover:border-brand-mint',
              )}
              data-testid={`version-pill-${i}`}
            >
              v{i + 1} {v.label}
            </button>
          ))}
          <span className="text-[11px] font-semibold text-slate2">Switching is 0⭐</span>
        </div>
      )}

      {hasSong && (
        <div className="flex flex-wrap gap-2" data-testid="suggestion-row">
          {SUGGESTION_CARDS.map((card) => (
            <button
              key={card.key}
              type="button"
              disabled={busy}
              onClick={() => onSuggestion(card)}
              className="rounded-full border-2 border-hairline bg-canvas-pure px-4 py-2 text-[13px] font-bold text-ink-soft transition hover:-translate-y-px hover:border-brand-mint disabled:opacity-50"
              data-testid={`suggestion-${card.key}`}
            >
              {card.label}
              <span className="ml-1.5 text-[11px] text-slate2">−{MUSIC_GENERATION_COST_STARS}⭐</span>
            </button>
          ))}
        </div>
      )}

      {hasSong && selectedSlot && slotMeta && (
        <div className="flex flex-wrap items-center gap-3" data-testid="style-row">
          <span className="min-w-[96px] text-[11px] font-bold uppercase tracking-[0.09em] text-slate2">
            {slotMeta.label} sound
          </span>
          <div className="flex flex-wrap gap-2">
            {INSTRUMENT_STYLES[selectedSlot].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onStyle(selectedSlot, s.id)}
                className={clsx(
                  'flex min-w-[92px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[12px] font-bold transition hover:-translate-y-0.5',
                  styles[selectedSlot] === s.id
                    ? 'border-2 border-brand-mint bg-wash-mint text-ink'
                    : 'border-2 border-hairline bg-canvas-pure text-ink-soft hover:border-brand-mint',
                )}
                data-testid={`style-${selectedSlot}-${s.id}`}
              >
                <span className="text-[20px] leading-none" aria-hidden="true">{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-semibold text-slate2">Swap sounds 0⭐ · instant</span>
        </div>
      )}
    </div>
  );
}
