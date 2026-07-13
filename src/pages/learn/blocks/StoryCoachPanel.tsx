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
  const completing = mission.mode === 'complete' || mission.mode === 'personal-ship';
  const observing = mission.mode === 'observe-only';
  const step = observing
    ? cue === 'complete'
      ? 4
      : cue === 'watch'
        ? 3
        : cue === 'retry'
          ? 4
          : 2
    : completing
      ? cue === 'complete'
        ? 4
        : cue === 'test' ||
            cue === 'saving' ||
            cue === 'watch' ||
            cue === 'hopFirst' ||
            cue === 'sayThen'
          ? 3
          : 2
      : STEP_BY_CUE[cue];
  const canRun = observing
    ? cue === 'ready' || cue === 'retry'
    : completing
      ? cue === 'test'
      : cue === 'ready' || cue === 'retry' || cue === 'test';
  const labels = observing
    ? ['Story', 'Point', 'Go', 'Answer']
    : completing
      ? ['Story', 'Build', 'Test', 'Done']
      : ['Story', 'Watch', 'Fix', 'Test'];

  return (
    <aside className="bsx-story-coach" data-testid="story-coach" aria-live="polite">
      <div className="bsx-story-coach-head">
        <span className="bsx-story-coach-face" aria-hidden>
          <img src={mission.hero.asset} alt="" />
        </span>
        <div>
          <strong>{mission.hero.name}</strong>
          <span>{mission.hero.role}</span>
        </div>
      </div>
      <p data-testid="story-coach-cue">{mission.coach[cue]}</p>
      <div className="bsx-story-coach-steps" aria-label={`Mission step ${step} of 4`}>
        {labels.map((label, index) => (
          <span key={label} className={index + 1 <= step ? 'on' : ''}>
            {index + 1}
            <small>{label}</small>
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
