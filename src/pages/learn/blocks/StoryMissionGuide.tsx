import { useState, type CSSProperties } from 'react';

import type { StoryMission } from './curriculumGuides';

const CELEBRATION_COLORS = ['#ffcc4d', '#ff6b91', '#6fd6ff', '#7ce38b', '#a98bff'];
const CELEBRATION_PIECES = Array.from({ length: 32 }, (_, index) => ({
  id: index,
  style: {
    '--confetti-left': `${(index * 37) % 100}%`,
    '--confetti-delay': `${(index % 8) * 90}ms`,
    '--confetti-duration': `${1500 + (index % 5) * 170}ms`,
    '--confetti-drift': `${(index % 2 === 0 ? 1 : -1) * (20 + (index % 4) * 12)}px`,
    '--confetti-color': CELEBRATION_COLORS[index % CELEBRATION_COLORS.length],
  } as CSSProperties,
}));

interface StoryMissionGuideProps {
  mission: StoryMission;
  hasRun: boolean;
  completed: boolean;
  answerId: string | null;
  onAnswer: (choiceId: string) => void;
  onApplyFix: () => void;
  onClose: () => void;
}

export function StoryMissionGuide({
  mission,
  hasRun,
  completed,
  answerId,
  onAnswer,
  onApplyFix,
  onClose,
}: StoryMissionGuideProps) {
  const [storyOpen, setStoryOpen] = useState(!hasRun);
  const [storyPage, setStoryPage] = useState(0);
  const [fixAnswer, setFixAnswer] = useState<string | null>(null);
  const chosen = mission.choices.find((choice) => choice.id === answerId);
  const observationCorrect = chosen?.correct === true;
  const chosenFix = mission.fixChoices.find((choice) => choice.id === fixAnswer);
  const page = mission.storyPages[storyPage];
  const lastStoryPage = storyPage === mission.storyPages.length - 1;

  const readStory = () => {
    setStoryPage(0);
    setStoryOpen(true);
  };

  return (
    <div className="bsx-mission-backdrop" data-testid="story-mission-backdrop">
      <section
        className={`bsx-mission-card${storyOpen ? ' bsx-story-fullscreen' : ''}`}
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
        {!storyOpen && <div className="bsx-mission-book" aria-hidden>📖</div>}
        <div className="bsx-mission-eyebrow">{mission.eyebrow}</div>
        <h2 id="story-mission-title">
          {storyOpen
            ? page.title
            : completed
              ? mission.completionTitle
              : observationCorrect
                ? mission.fixTitle
                : mission.title}
        </h2>

        {storyOpen ? (
          <div
            className={`bsx-story-book bsx-story-book-${storyPage + 1}`}
            data-testid="story-book"
          >
            <div
              className={`bsx-story-scene bsx-story-scene-${storyPage + 1}`}
              data-testid="story-animated-scene"
              aria-hidden="true"
            >
              <span className="bsx-story-moon">🌙</span>
              <span className="bsx-story-cloud bsx-story-cloud-one" />
              <span className="bsx-story-cloud bsx-story-cloud-two" />
              <span className="bsx-story-star bsx-story-star-one">✦</span>
              <span className="bsx-story-star bsx-story-star-two">✦</span>
              <span className="bsx-story-star bsx-story-star-three">✦</span>
              <div className="bsx-story-village">
                <span>🏠</span><span>🏡</span><span>🏠</span>
              </div>
              <div className="bsx-story-tower">🔔</div>
              <div className="bsx-story-light-path" />
              <div className="bsx-story-hero">⭐</div>
              <div className="bsx-story-speech">Morning!</div>
              <div className="bsx-story-blocks">
                <span>💬 Say</span><b>→</b><span>🦘 Hop</span>
              </div>
              <div className="bsx-story-child">👉</div>
              <div className="bsx-story-scene-caption">{page.emoji}</div>
            </div>
            <div className="bsx-story-copy">
              <p className="bsx-mission-story">{page.body}</p>
              {page.dialogue && (
                <blockquote className="bsx-story-dialogue">
                  <strong>{page.speaker}</strong>
                  <span>“{page.dialogue}”</span>
                </blockquote>
              )}
              <div className="bsx-story-progress" aria-label={`Story page ${storyPage + 1} of ${mission.storyPages.length}`}>
                {mission.storyPages.map((story, index) => (
                  <span key={story.title} className={index === storyPage ? 'on' : ''} aria-hidden />
                ))}
              </div>
              {lastStoryPage && (
                <>
                  <p className="bsx-mission-partner">🤝 {mission.partnerLine}</p>
                  <div className="bsx-mission-task">
                    <strong>Your mission</strong>
                    <span>{mission.mission}</span>
                  </div>
                </>
              )}
              <div className="bsx-story-actions">
                {storyPage > 0 && (
                  <button
                    type="button"
                    className="bsx-mission-secondary bsx-story-back"
                    onClick={() => setStoryPage((current) => current - 1)}
                  >
                    ← Back
                  </button>
                )}
                {lastStoryPage ? (
                  <button type="button" className="bsx-mission-primary" onClick={onClose}>
                    Start the mission ▶
                  </button>
                ) : (
                  <button
                    type="button"
                    className="bsx-mission-primary"
                    onClick={() => setStoryPage((current) => current + 1)}
                  >
                    Next page →
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : completed ? (
          <div className="bsx-mission-success" data-testid="story-mission-success">
            <div
              className="bsx-story-celebration"
              data-testid="story-celebration"
              aria-hidden="true"
            >
              {CELEBRATION_PIECES.map((piece) => (
                <span key={piece.id} style={piece.style} />
              ))}
            </div>
            <p>{mission.completion}</p>
            <div className="bsx-logic-proof" data-testid="story-logic-proof">
              <div className="bsx-logic-proof-steps">
                {mission.completionSteps.map((step, index) => (
                  <div key={step.label} className="bsx-logic-proof-step">
                    <small>{step.order}</small>
                    <strong>{step.icon} {step.label}</strong>
                    {index < mission.completionSteps.length - 1 && <span aria-hidden>→</span>}
                  </div>
                ))}
              </div>
              <p>{mission.completionWhy}</p>
            </div>
            <div className="bsx-mission-next">🌟 {mission.next}</div>
            <button type="button" className="bsx-mission-secondary" onClick={readStory}>
              📖 Read the story again
            </button>
            <button type="button" className="bsx-mission-primary" onClick={onClose}>
              Keep exploring
            </button>
          </div>
        ) : observationCorrect ? (
          <div data-testid="story-fix-task">
            <p className="bsx-mission-story">{mission.success}</p>
            <div className="bsx-logic-proof" data-testid="story-observation-proof">
              <div className="bsx-logic-proof-steps">
                {mission.logicSteps.map((step, index) => (
                  <div key={step.label} className="bsx-logic-proof-step">
                    <small>{step.order}</small>
                    <strong>{step.icon} {step.label}</strong>
                    {index < mission.logicSteps.length - 1 && <span aria-hidden>→</span>}
                  </div>
                ))}
              </div>
              <p>{mission.logicWhy}</p>
            </div>
            <p className="bsx-mission-prompt">🧩 {mission.fixPrompt}</p>
            <div className="bsx-mission-choices">
              {mission.fixChoices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className="bsx-mission-choice"
                  data-testid={`story-fix-${choice.id}`}
                  onClick={() => {
                    setFixAnswer(choice.id);
                    if (choice.correct) onApplyFix();
                  }}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            {chosenFix && !chosenFix.correct && (
              <p className="bsx-mission-retry" role="status">↻ {mission.fixRetry}</p>
            )}
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
            <button type="button" className="bsx-mission-secondary" onClick={readStory}>
              📖 Read the story
            </button>
            <button type="button" className="bsx-mission-secondary" onClick={onClose}>
              ▶ Watch again
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
