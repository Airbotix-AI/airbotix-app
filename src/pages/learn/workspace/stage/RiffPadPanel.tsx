// Riff Pad — "🎹 tap your own riff first" (music-stage-prd §5A D-MS11).
// A 16-step scale-locked melody grid + 3-row drum pad. Tapping is 0⭐ and
// touches no AI; the loop audition reuses the stage's one playback engine
// (the pane swaps the played score — Tone.Transport is a singleton).

import clsx from 'clsx';

import {
  RIFF_DRUM_ROWS,
  RIFF_MELODY_PITCHES,
  RIFF_STEPS,
  riffNoteCount,
  type RiffGrid,
  type RiffSection,
} from './riffPad';

const STEP_INDICES = Array.from({ length: RIFF_STEPS }, (_, i) => i);

function CellRow({
  section,
  row,
  cells,
  label,
  accent,
  activeStep,
  onToggle,
}: {
  section: RiffSection;
  row: number;
  cells: boolean[];
  label: string;
  accent: 'mint' | 'sky';
  activeStep: number | null;
  onToggle: (section: RiffSection, row: number, step: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-11 shrink-0 text-right text-[10px] font-bold text-slate2">{label}</span>
      <div className="flex gap-[3px]">
        {STEP_INDICES.map((step) => (
          <button
            key={step}
            type="button"
            aria-label={`${label} step ${step + 1}`}
            aria-pressed={cells[step]}
            onClick={() => onToggle(section, row, step)}
            className={clsx(
              'h-5 w-5 rounded-[5px] border transition',
              // Beat guide: a stronger left edge on every 4th step (bar feel).
              step % 4 === 0 ? 'ml-[3px] first:ml-0' : '',
              cells[step]
                ? accent === 'mint'
                  ? 'border-brand-mint bg-brand-mint shadow-brand-mint'
                  : 'border-brand-sky bg-brand-sky'
                : 'border-hairline bg-canvas hover:border-brand-mint',
              activeStep === step && 'ring-2 ring-brand-sunshine',
            )}
            data-testid={`riff-cell-${section === 'melody' ? 'm' : 'd'}-${row}-${step}`}
          />
        ))}
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
}: {
  grid: RiffGrid;
  onToggle: (section: RiffSection, row: number, step: number) => void;
  onClear: () => void;
  /** True while the pad loop is playing (pane-owned playback swap). */
  auditioning: boolean;
  onToggleAudition: () => void;
  /** Playhead step while auditioning — the "walking lights" feedback. */
  activeStep: number | null;
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
              label={`${drum.emoji} ${drum.label}`}
              accent="sky"
              activeStep={auditioning ? activeStep : null}
              onToggle={onToggle}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
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
        <span className="text-[11px] font-semibold text-slate2">
          Top rows = melody · bottom rows = beat
        </span>
      </div>
    </div>
  );
}
