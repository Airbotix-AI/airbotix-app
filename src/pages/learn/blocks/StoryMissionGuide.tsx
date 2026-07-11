import type { StoryMission } from './curriculumGuides';

interface StoryMissionGuideProps {
  mission: StoryMission;
  hasRun: boolean;
  answerId: string | null;
  onAnswer: (choiceId: string) => void;
  onClose: () => void;
}

export function StoryMissionGuide({
  mission,
  hasRun,
  answerId,
  onAnswer,
  onClose,
}: StoryMissionGuideProps) {
  const chosen = mission.choices.find((choice) => choice.id === answerId);
  const complete = chosen?.correct === true;

  return (
    <div className="bsx-mission-backdrop" data-testid="story-mission-backdrop">
      <section
        className="bsx-mission-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-mission-title"
        data-testid="story-mission"
      >
        <button
          type="button"
          className="bsx-mission-close"
          onClick={onClose}
          aria-label="Close story mission"
        >
          ✕
        </button>
        <div className="bsx-mission-book" aria-hidden>📖</div>
        <div className="bsx-mission-eyebrow">{mission.eyebrow}</div>
        <h2 id="story-mission-title">{complete ? mission.successTitle : mission.title}</h2>

        {complete ? (
          <div className="bsx-mission-success" data-testid="story-mission-success">
            <p>{mission.success}</p>
            <div className="bsx-mission-next">🌟 {mission.next}</div>
            <button type="button" className="bsx-mission-primary" onClick={onClose}>
              Keep exploring
            </button>
          </div>
        ) : hasRun ? (
          <div data-testid="story-mission-question">
            <p className="bsx-mission-prompt">👀 {mission.question}</p>
            <div className="bsx-mission-choices">
              {mission.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className="bsx-mission-choice"
                  data-testid={`story-choice-${choice.id}`}
                  onClick={() => onAnswer(choice.id)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            {chosen && !chosen.correct && (
              <p className="bsx-mission-retry" role="status">↻ {mission.retry}</p>
            )}
            <button type="button" className="bsx-mission-secondary" onClick={onClose}>
              ▶ Watch again
            </button>
          </div>
        ) : (
          <div data-testid="story-mission-intro">
            <p className="bsx-mission-story">{mission.story}</p>
            <div className="bsx-mission-task">
              <strong>Your mission</strong>
              <span>{mission.mission}</span>
            </div>
            <button type="button" className="bsx-mission-primary" onClick={onClose}>
              Show me Go ▶
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
