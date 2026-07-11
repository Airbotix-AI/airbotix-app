import { useState } from 'react';

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
  const [storyOpen, setStoryOpen] = useState(!hasRun);
  const [storyPage, setStoryPage] = useState(0);
  const chosen = mission.choices.find((choice) => choice.id === answerId);
  const complete = chosen?.correct === true;
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
          {storyOpen ? page.title : complete ? mission.successTitle : mission.title}
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
        ) : complete ? (
          <div className="bsx-mission-success" data-testid="story-mission-success">
            <p>{mission.success}</p>
            <div className="bsx-mission-next">🌟 {mission.next}</div>
            <button type="button" className="bsx-mission-secondary" onClick={readStory}>
              📖 Read the story again
            </button>
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
