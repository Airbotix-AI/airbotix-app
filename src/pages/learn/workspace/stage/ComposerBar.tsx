// Composer Bar — "① tell the AI what song you want": description input,
// inspiration chips, genre pills and the −3⭐ generate button
// (music-stage-prd.md §2.1). Star-affordance is enforced by the parent
// (AC-8: an unaffordable click never sends a request).

import clsx from 'clsx';

import {
  GENRES,
  IDEA_CHIPS,
  MUSIC_GENERATION_COST_STARS,
  PROMPT_MAX_LENGTH,
  PROMPT_PLACEHOLDER,
  type GenreId,
} from './stageData';

export function ComposerBar({
  value,
  onChange,
  genre,
  onGenre,
  onGenerate,
  busy,
  balance,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  genre: GenreId;
  onGenre: (g: GenreId) => void;
  onGenerate: () => void;
  busy: boolean;
  balance: number;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  const short = balance < MUSIC_GENERATION_COST_STARS;
  return (
    // Docked at the BOTTOM of the deck column (D-MS9) — border on top.
    <div className="shrink-0 border-t border-hairline bg-canvas-pure px-5 py-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate2">
          <span className="inline-grid place-items-center w-[20px] h-[20px] rounded-full bg-brand-mint text-white text-[11px] mr-1.5 align-middle">1</span>
          Tell the AI what song you want
        </span>
        <span
          className={clsx(
            'rounded-full border border-hairline bg-wash-sunshine px-3 py-1 text-[12px] font-extrabold',
            short ? 'text-brand-coral' : 'text-ink',
          )}
          data-testid="composer-stars"
        >
          ⭐ {balance}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          maxLength={PROMPT_MAX_LENGTH}
          placeholder={PROMPT_PLACEHOLDER}
          autoFocus
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim() && !busy) onGenerate();
          }}
          className="flex-1 min-w-[220px] rounded-2xl border-2 border-hairline bg-canvas px-4 py-3 text-[14px] font-semibold text-ink placeholder:font-medium placeholder:text-steel focus:border-brand-mint focus:outline-none"
          data-testid="composer-input"
        />
        <button
          type="button"
          onClick={onGenerate}
          disabled={busy || !value.trim()}
          title={short ? `Need ${MUSIC_GENERATION_COST_STARS}★, have ${balance}★` : ''}
          className="btn-pill-primary shrink-0 inline-flex items-center gap-2 disabled:opacity-60"
          data-testid="composer-generate"
        >
          {busy ? '…' : '🎵 Compose'}
          <span className="rounded-full bg-canvas-pure/25 px-2 py-0.5 text-[11px] font-bold">
            −{MUSIC_GENERATION_COST_STARS}⭐
          </span>
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {IDEA_CHIPS.map((idea, i) => (
          <button
            key={idea.prompt}
            type="button"
            onClick={() => {
              onChange(idea.prompt);
              inputRef?.current?.focus();
            }}
            className="rounded-full border border-hairline bg-canvas px-3 py-1.5 text-[12px] font-bold text-ink-soft transition hover:-translate-y-px hover:border-brand-sky"
            data-testid={`idea-chip-${i}`}
          >
            {idea.emoji} {idea.prompt}
          </button>
        ))}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {GENRES.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onGenre(g.id)}
            className={clsx(
              'rounded-full px-4 py-1.5 text-[13px] font-extrabold transition',
              genre === g.id
                ? 'bg-grad-sky text-white shadow-brand-sky'
                : 'border-2 border-hairline bg-canvas-pure text-ink-soft hover:border-brand-coral',
            )}
            data-testid={`genre-${g.id}`}
          >
            {g.label}
          </button>
        ))}
      </div>
    </div>
  );
}
