import { ArtTaskGuide } from './ArtTaskGuide';
import type { ArtTaskRuntime } from './useArtTaskRuntime';

interface ArtTaskRuntimePanelProps {
  runtime: ArtTaskRuntime;
  canComplete: boolean;
  isComplete: boolean;
  isSaving: boolean;
  onComplete(): void;
}

export function ArtTaskRuntimePanel({
  runtime,
  canComplete,
  isComplete,
  isSaving,
  onComplete,
}: ArtTaskRuntimePanelProps) {
  if (runtime.isLoading) {
    return (
      <div className="mb-2 rounded-2xl bg-surface p-3 text-[12px] font-bold text-ink-soft">
        Loading your drawing steps…
      </div>
    );
  }
  if (runtime.isError) {
    return (
      <div className="mb-2 rounded-2xl bg-wash-coral p-3 text-[12px] font-bold text-ink">
        This drawing idea is not ready. Your blank canvas still works.
      </div>
    );
  }
  if (!runtime.task) return null;

  return (
    <ArtTaskGuide
      task={runtime.task}
      mode={runtime.mode}
      stepIndex={Math.min(runtime.stepIndex, runtime.task.steps.length - 1)}
      referenceVisible={runtime.referenceVisible}
      traceOpacity={runtime.traceOpacity}
      canComplete={canComplete}
      isComplete={isComplete}
      isSaving={isSaving}
      onPrevious={() => runtime.setStepIndex((index) => Math.max(0, index - 1))}
      onNext={() =>
        runtime.setStepIndex((index) => Math.min(runtime.task!.steps.length - 1, index + 1))
      }
      onComplete={onComplete}
      onToggleReference={() => runtime.setReferenceVisible((visible) => !visible)}
      onTraceOpacityChange={runtime.setTraceOpacity}
    />
  );
}
