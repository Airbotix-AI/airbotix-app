import type { StoryCoachCue, StoryMission } from './curriculumGuides';

interface StoryCoachPanelProps {
  mission: StoryMission;
  cue: StoryCoachCue;
  running: boolean;
  onGo: () => void;
}

const STEP_BY_CUE: Record<StoryCoachCue, number> = {
  ready: 1,
  watch: 2,
  sayFirst: 2,
  sayThen: 4,
  hopFirst: 4,
  hopThen: 2,
  retry: 2,
  fix: 3,
  test: 4,
  saving: 4,
  complete: 4,
};

export function StoryCoachPanel({ mission, cue, running, onGo }: StoryCoachPanelProps) {
  const step = STEP_BY_CUE[cue];
  const canRun = cue === 'ready' || cue === 'retry' || cue === 'test';

  return (
    <aside className="bsx-story-coach" data-testid="story-coach" aria-live="polite">
      <div className="bsx-story-coach-head">
        <span className="bsx-story-coach-face" aria-hidden>⭐</span>
        <div>
          <strong>Lumilo</strong>
          <span>Morning Light Keeper</span>
        </div>
      </div>
      <p data-testid="story-coach-cue">{mission.coach[cue]}</p>
      <div className="bsx-story-coach-steps" aria-label={`Mission step ${step} of 4`}>
        {['Story', 'Watch', 'Fix', 'Test'].map((label, index) => (
          <span key={label} className={index + 1 <= step ? 'on' : ''}>
            {index + 1}<small>{label}</small>
          </span>
        ))}
      </div>
      {canRun && (
        <button type="button" onClick={onGo} disabled={running}>
          ▶ {cue === 'retry' ? 'Watch again' : cue === 'test' ? 'Test my fix' : 'Go'}
        </button>
      )}
    </aside>
  );
}
