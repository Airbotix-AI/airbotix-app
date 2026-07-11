import { useState } from 'react';

import type { StoryMission } from './curriculumGuides';

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
        <div className="bsx-mission-book" aria-hidden>{storyOpen ? page.emoji : '📖'}</div>
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
          <div data-testid="story-book">
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
        ) : completed ? (
          <div className="bsx-mission-success" data-testid="story-mission-success">
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
