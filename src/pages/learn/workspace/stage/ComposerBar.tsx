// Composer Bar — "① tell the AI what song you want": description textarea,
// inspiration chips, genre pills and the −3⭐ generate button
// (music-stage-prd.md §2.1). Star-affordance is enforced by the parent
// (AC-8: an unaffordable click never sends a request).
//
// Once a song exists the bar gains a MODE (D-MS10): "✏️ Change this song"
// (default — typed text edits the CURRENT version, existingScore rides the
// request) vs "✨ New song" (from-scratch compose, the old behaviour). Edit
// mode hides the new-song helpers (idea chips + genre pills) — that space is
// what makes the input roomy enough to describe a change.

import clsx from 'clsx';

import {
  COMPOSE_HEADER,
  EDIT_HEADER,
  EDIT_PROMPT_PLACEHOLDER,
  GENRES,
  IDEA_CHIPS,
  MUSIC_GENERATION_COST_STARS,
  PROMPT_MAX_LENGTH,
  PROMPT_PLACEHOLDER,
  type ComposeMode,
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
  hasSong,
  mode,
  onMode,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  genre: GenreId;
  onGenre: (g: GenreId) => void;
  onGenerate: () => void;
  busy: boolean;
  balance: number;
  /** A song is on the stage → the edit/new mode toggle appears. */
  hasSong: boolean;
  /** Compose mode (D-MS10). Only meaningful when hasSong. */
  mode: ComposeMode;
  onMode: (m: ComposeMode) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}) {
  // TODO(D-WFA-01): show "Free during workshop" + skip the `short` (balance) gate
  // during a live free-workshop window. Not wired yet — the Music Stage is
  // SESSION-scoped and its song project is created lazily on the first generate
  // (MusicStagePane.setSongProjectId), so the per-project `ai_free_now` flag isn't
  // available before the paid turn. The backend enforces the waiver regardless.
  const short = balance < MUSIC_GENERATION_COST_STARS;
  const editing = hasSong && mode === 'edit';
  return (
    // Docked at the BOTTOM of the deck column (D-MS9) — border on top.
    <div className="shrink-0 border-t border-hairline bg-canvas-pure px-5 py-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate2">
          <span className="inline-grid place-items-center w-[20px] h-[20px] rounded-full bg-brand-mint text-white text-[11px] mr-1.5 align-middle">1</span>
          {editing ? EDIT_HEADER : COMPOSE_HEADER}
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

      {hasSong && (
        <div
          className="mb-2.5 flex gap-1 rounded-full bg-surface p-1"
          role="tablist"
          aria-label="Change this song or start a new one?"
        >
          {(
            [
              { id: 'edit', label: '✏️ Change this song' },
              { id: 'new', label: '✨ New song' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => onMode(m.id)}
              className={clsx(
                'flex-1 rounded-full px-3 py-1.5 text-[12px] font-extrabold transition',
                mode === m.id ? 'bg-canvas-pure text-ink shadow-card-soft' : 'text-slate2 hover:text-ink',
              )}
              data-testid={`compose-mode-${m.id}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <textarea
          ref={inputRef}
          value={value}
          maxLength={PROMPT_MAX_LENGTH}
          placeholder={editing ? EDIT_PROMPT_PLACEHOLDER : PROMPT_PLACEHOLDER}
          autoFocus
          rows={editing ? 3 : 2}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends (kid-friendly); Shift+Enter makes a new line.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (value.trim() && !busy) onGenerate();
            }
          }}
          className="min-w-[220px] flex-1 resize-none rounded-2xl border-2 border-hairline bg-canvas px-4 py-3 text-[14px] font-semibold leading-snug text-ink placeholder:font-medium placeholder:text-steel focus:border-brand-mint focus:outline-none"
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
          {busy ? '…' : editing ? '🎼 Update' : '🎵 Compose'}
          <span className="rounded-full bg-canvas-pure/25 px-2 py-0.5 text-[11px] font-bold">
            −{MUSIC_GENERATION_COST_STARS}⭐
          </span>
        </button>
      </div>

      {!editing && (
        <>
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
        </>
      )}
    </div>
  );
}
