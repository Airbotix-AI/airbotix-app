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
  say: 2,
  hop: 2,
  retry: 2,
  complete: 3,
};

export function StoryCoachPanel({ mission, cue, running, onGo }: StoryCoachPanelProps) {
  const step = STEP_BY_CUE[cue];
  const canRun = cue === 'ready' || cue === 'retry';

  return (
    <aside className="bsx-story-coach" data-testid="story-coach" aria-live="polite">
      <div className="bsx-story-coach-head">
        <span className="bsx-story-coach-face" aria-hidden>⭐</span>
        <div>
          <strong>Little Light</strong>
          <span>Story helper</span>
        </div>
      </div>
      <p data-testid="story-coach-cue">{mission.coach[cue]}</p>
      <div className="bsx-story-coach-steps" aria-label={`Mission step ${step} of 3`}>
        {['Story', 'Watch', 'Answer'].map((label, index) => (
          <span key={label} className={index + 1 <= step ? 'on' : ''}>
            {index + 1}<small>{label}</small>
          </span>
        ))}
      </div>
      {canRun && (
        <button type="button" onClick={onGo} disabled={running}>
          ▶ {cue === 'retry' ? 'Watch again' : 'Go'}
        </button>
      )}
    </aside>
  );
}
