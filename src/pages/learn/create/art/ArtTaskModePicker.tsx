import { ART_TASK_DRAW_MODES, type ArtTaskDrawMode, type ArtTaskListItem } from './artTaskTypes';

interface ModeChoice {
  id: ArtTaskDrawMode;
  emoji: string;
  title: string;
  body: string;
}

const MODE_CHOICES: ModeChoice[] = [
  {
    id: ART_TASK_DRAW_MODES.look,
    emoji: '👀',
    title: 'Look & Draw',
    body: 'Keep the finished picture beside your canvas.',
  },
  {
    id: ART_TASK_DRAW_MODES.trace,
    emoji: '✏️',
    title: 'Trace a Ghost',
    body: 'Put a faint outline under your paper and draw over it.',
  },
  {
    id: ART_TASK_DRAW_MODES.free,
    emoji: '🌟',
    title: 'Draw My Way',
    body: 'Start blank and use only the little step cards.',
  },
];

interface ArtTaskModePickerProps {
  task: ArtTaskListItem;
  onPick(mode: ArtTaskDrawMode): void;
  onClose(): void;
}

export function ArtTaskModePicker({ task, onPick, onClose }: ArtTaskModePickerProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="art-task-mode-title"
      data-testid="art-task-mode-picker"
    >
      <div className="w-full max-w-2xl rounded-[32px] bg-canvas-pure p-5 shadow-card-soft sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow eyebrow-bubblegum">Choose how to draw</div>
            <h2 id="art-task-mode-title" className="mt-1 text-[26px] font-black text-ink">
              {task.title}
            </h2>
            <p className="mt-1 text-[14px] text-ink-soft">
              You can switch the reference on or off while you draw.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-surface px-3 py-2 text-[13px] font-bold text-ink-soft"
            aria-label="Close drawing choices"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {MODE_CHOICES.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => onPick(choice.id)}
              className="rounded-3xl border border-hairline bg-canvas p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-bubblegum/40 hover:shadow-card-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bubblegum"
            >
              <span className="text-[34px]" aria-hidden="true">
                {choice.emoji}
              </span>
              <span className="mt-2 block text-[16px] font-black text-ink">{choice.title}</span>
              <span className="mt-1 block text-[12px] leading-snug text-ink-soft">
                {choice.body}
              </span>
              <span className="mt-3 block text-[11px] font-black uppercase tracking-[0.1em] text-brand-bubblegum">
                Free · Start →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
