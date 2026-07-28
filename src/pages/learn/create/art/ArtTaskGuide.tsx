import { ART_TASK_DRAW_MODES, type ArtTaskDetail, type ArtTaskDrawMode } from './artTaskTypes';

interface ArtTaskGuideProps {
  task: ArtTaskDetail;
  mode: ArtTaskDrawMode;
  stepIndex: number;
  referenceVisible: boolean;
  traceOpacity: number;
  onPrevious(): void;
  onNext(): void;
  onToggleReference(): void;
  onTraceOpacityChange(value: number): void;
}

export function ArtTaskGuide({
  task,
  mode,
  stepIndex,
  referenceVisible,
  traceOpacity,
  onPrevious,
  onNext,
  onToggleReference,
  onTraceOpacityChange,
}: ArtTaskGuideProps) {
  const step = task.steps[stepIndex];
  const isLast = stepIndex === task.steps.length - 1;

  return (
    <section
      className="mb-2 rounded-2xl border border-brand-mint/30 bg-wash-mint p-3"
      data-testid="art-task-guide"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.1em] text-slate2">
            Art Studio · Step {stepIndex + 1} of {task.steps.length}
          </div>
          <h2 className="mt-0.5 text-[15px] font-black text-ink">{task.title}</h2>
        </div>
        <span className="rounded-full bg-canvas-pure px-2 py-1 text-[10px] font-bold text-ink-soft">
          {mode === ART_TASK_DRAW_MODES.trace
            ? 'Trace a Ghost'
            : mode === ART_TASK_DRAW_MODES.free
              ? 'Draw My Way'
              : 'Look & Draw'}
        </span>
      </div>

      {referenceVisible && mode !== ART_TASK_DRAW_MODES.trace && (
        <img
          src={task.reference.url}
          alt={task.reference.alt}
          className="mt-2 aspect-square w-full rounded-xl border border-hairline bg-canvas-pure object-contain"
          data-testid="art-task-reference"
        />
      )}

      <div className="mt-2 rounded-xl bg-canvas-pure p-2.5">
        <img
          src={step.guide_url}
          alt={`${step.title}: ${step.instruction_md}`}
          className="aspect-[2/1] w-full rounded-lg object-contain"
          data-testid="art-task-step-image"
        />
        <h3 className="mt-1 text-[13px] font-black text-ink">{step.title}</h3>
        <p className="text-[11px] leading-snug text-ink-soft">{step.instruction_md}</p>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrevious}
          disabled={stepIndex === 0}
          className="rounded-full bg-canvas-pure px-3 py-1.5 text-[11px] font-bold disabled:opacity-35"
          aria-label="Previous drawing step"
        >
          ←
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isLast}
          className="flex-1 rounded-full bg-brand-mint px-3 py-1.5 text-[11px] font-black text-ink disabled:opacity-35"
        >
          {isLast ? 'All steps done ✓' : 'I did this step →'}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {mode !== ART_TASK_DRAW_MODES.trace && (
          <button
            type="button"
            onClick={onToggleReference}
            className="rounded-full bg-canvas-pure px-2.5 py-1 text-[10px] font-bold text-ink-soft"
          >
            {referenceVisible ? 'Hide reference' : 'Show reference'}
          </button>
        )}
        {mode === ART_TASK_DRAW_MODES.trace && (
          <label className="flex flex-1 items-center gap-2 text-[10px] font-bold text-ink-soft">
            Ghost strength
            <input
              type="range"
              min="0.1"
              max="0.6"
              step="0.05"
              value={traceOpacity}
              onChange={(event) => onTraceOpacityChange(Number(event.target.value))}
              className="min-w-0 flex-1 accent-brand-mint"
              aria-label="Ghost strength"
            />
          </label>
        )}
      </div>
    </section>
  );
}
