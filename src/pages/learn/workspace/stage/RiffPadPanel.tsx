// Riff Pad — "🎹 tap your own riff first" (music-stage-prd §5A D-MS11) plus
// the tutor layer (§5A D-MS13, P2a): a 16-step scale-locked melody grid +
// 3-row drum pad, a 👻 ghost underlay the kid traces or ignores, and the
// 👂 one-suggestion listen button. Tapping is 0⭐ and touches no AI; the loop
// audition reuses the stage's one playback engine (the pane swaps the played
// score — Tone.Transport is a singleton).
//
// Tutor iron rules (D-IS-18, inherited): AI is only ever summoned (both
// buttons carry price tags), AI output stays subordinate (the ghost renders
// FAINT below the kid's notes and is dismissible in one tap), and the AI
// talks about THE RIFF (the advice endpoint reads the actual notes).

import clsx from 'clsx';

import {
  RIFF_DRUM_ROWS,
  RIFF_MELODY_PITCHES,
  RIFF_STEPS,
  riffNoteCount,
  type RiffGrid,
  type RiffSection,
} from './riffPad';
import { RIFF_ADVICE_COST_STARS, RIFF_GHOST_COST_STARS } from './stageData';

const STEP_INDICES = Array.from({ length: RIFF_STEPS }, (_, i) => i);

function CellRow({
  section,
  row,
  cells,
  ghostCells,
  label,
  accent,
  activeStep,
  onToggle,
}: {
  section: RiffSection;
  row: number;
  cells: boolean[];
  /** Ghost underlay for this row (faint, erasable — §5A D-MS13 ①). */
  ghostCells: boolean[] | null;
  label: string;
  accent: 'mint' | 'sky';
  activeStep: number | null;
  onToggle: (section: RiffSection, row: number, step: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-11 shrink-0 text-right text-[10px] font-bold text-slate2">{label}</span>
      <div className="flex gap-[3px]">
        {STEP_INDICES.map((step) => {
          const on = cells[step];
          // The kid's own note always wins the pixel — the ghost only shows
          // through where the kid has not played (the hand is the top layer).
          const ghost = !on && !!ghostCells?.[step];
          return (
            <button
              key={step}
              type="button"
              aria-label={`${label} step ${step + 1}`}
              aria-pressed={on}
              onClick={() => onToggle(section, row, step)}
              className={clsx(
                'h-5 w-5 rounded-[5px] border transition',
                // Beat guide: a stronger left edge on every 4th step (bar feel).
                step % 4 === 0 ? 'ml-[3px] first:ml-0' : '',
                on
                  ? accent === 'mint'
                    ? 'border-brand-mint bg-brand-mint shadow-brand-mint'
                    : 'border-brand-sky bg-brand-sky'
                  : ghost
                    ? accent === 'mint'
                      ? 'border-dashed border-brand-mint/70 bg-wash-mint'
                      : 'border-dashed border-brand-sky/70 bg-wash-sky'
                    : 'border-hairline bg-canvas hover:border-brand-mint',
                activeStep === step && 'ring-2 ring-brand-sunshine',
              )}
              data-testid={`riff-cell-${section === 'melody' ? 'm' : 'd'}-${row}-${step}`}
              {...(ghost ? { 'data-ghost': 'true' } : {})}
            />
          );
        })}
      </div>
    </div>
  );
}

export function RiffPadPanel({
  grid,
  onToggle,
  onClear,
  auditioning,
  onToggleAudition,
  activeStep,
  ghost,
  onGhost,
  onDismissGhost,
  ghostBusy,
  onAdvice,
  adviceBusy,
}: {
  grid: RiffGrid;
  onToggle: (section: RiffSection, row: number, step: number) => void;
  onClear: () => void;
  /** True while the pad loop is playing (pane-owned playback swap). */
  auditioning: boolean;
  onToggleAudition: () => void;
  /** Playhead step while auditioning — the "walking lights" feedback. */
  activeStep: number | null;
  /** 👻 The tutor's faint starter underlay, if requested (§5A D-MS13). */
  ghost: RiffGrid | null;
  onGhost: () => void;
  onDismissGhost: () => void;
  ghostBusy: boolean;
  /** 👂 "听一听" — one note-grounded suggestion in the AI bubble. */
  onAdvice: () => void;
  adviceBusy: boolean;
}) {
  const count = riffNoteCount(grid);
  return (
    <div
      className="shrink-0 border-t border-hairline bg-canvas-pure px-5 py-3"
      data-testid="riff-pad"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate2">
          🎹 Tap your riff — every note fits, you can’t hit a wrong one
        </span>
        <span className="rounded-full bg-wash-mint px-2.5 py-0.5 text-[11px] font-extrabold text-ink" data-testid="riff-count">
          {count} notes · 0⭐
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="grid w-max gap-[3px]" data-testid="riff-melody-grid">
          {RIFF_MELODY_PITCHES.map((pitch, row) => (
            <CellRow
              key={pitch}
              section="melody"
              row={row}
              cells={grid.melody[row]}
              ghostCells={ghost?.melody[row] ?? null}
              label={pitch}
              accent="mint"
              activeStep={auditioning ? activeStep : null}
              onToggle={onToggle}
            />
          ))}
        </div>
        <div className="mt-2 grid w-max gap-[3px]" data-testid="riff-drum-grid">
          {RIFF_DRUM_ROWS.map((drum, row) => (
            <CellRow
              key={drum.hit}
              section="drums"
              row={row}
              cells={grid.drums[row]}
              ghostCells={ghost?.drums[row] ?? null}
              label={`${drum.emoji} ${drum.label}`}
              accent="sky"
              activeStep={auditioning ? activeStep : null}
              onToggle={onToggle}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleAudition}
          disabled={count === 0}
          className="rounded-full border-2 border-hairline bg-canvas px-3.5 py-1.5 text-[12px] font-extrabold text-ink transition hover:border-brand-mint disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="riff-loop"
        >
          {auditioning ? '⏹ Stop' : '▶ Loop my riff'}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={count === 0}
          className="rounded-full border-2 border-hairline bg-canvas px-3.5 py-1.5 text-[12px] font-bold text-slate2 transition hover:border-brand-coral disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="riff-clear"
        >
          🧽 Clear
        </button>
        {/* 👻 The tutor lays a faint starter the kid traces or ignores. */}
        {ghost === null ? (
          <button
            type="button"
            onClick={onGhost}
            disabled={ghostBusy}
            title="The tutor sketches a faint starter riff you can trace, change or ignore"
            className="rounded-full border-2 border-hairline bg-canvas px-3.5 py-1.5 text-[12px] font-extrabold text-ink transition hover:border-brand-mint disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="riff-ghost"
          >
            {ghostBusy ? '👻 Sketching…' : `👻 Ghost riff −${RIFF_GHOST_COST_STARS}⭐`}
          </button>
        ) : (
          <button
            type="button"
            onClick={onDismissGhost}
            title="Hide the tutor's starter — your notes stay"
            className="rounded-full border-2 border-dashed border-hairline bg-canvas px-3.5 py-1.5 text-[12px] font-bold text-slate2 transition hover:border-brand-coral"
            data-testid="riff-ghost-dismiss"
          >
            👻 Hide ghost
          </button>
        )}
        <button
          type="button"
          onClick={onAdvice}
          disabled={adviceBusy || count === 0}
          title="The tutor listens to YOUR riff and suggests one next step"
          className="rounded-full border-2 border-hairline bg-canvas px-3.5 py-1.5 text-[12px] font-extrabold text-ink transition hover:border-brand-mint disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="riff-advice"
        >
          {adviceBusy ? '👂 Listening…' : `👂 Listen −${RIFF_ADVICE_COST_STARS}⭐`}
        </button>
        <span className="text-[11px] font-semibold text-slate2">
          Top rows = melody · bottom rows = beat
        </span>
      </div>
    </div>
  );
}
