import { useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import type { StoryMission } from './curriculumGuides';
import { CharacterVisual } from './CharacterVisual';
import type { CharacterPerformance } from './characterPerformance';

const CELEBRATION_COLORS = ['#ffcc4d', '#ff6b91', '#6fd6ff', '#7ce38b', '#a98bff'];
const CELEBRATION_PIECES = Array.from({ length: 72 }, (_, index) => ({
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
  journeyLabel?: string;
  nextJourneyLabel?: string;
  nextBusy?: boolean;
  nextError?: string | null;
  onNext?: () => void;
  onBackToCollection?: () => void;
}

export function StoryMissionGuide({
  mission,
  hasRun,
  completed,
  answerId,
  onAnswer,
  onApplyFix,
  onClose,
  journeyLabel,
  nextJourneyLabel,
  nextBusy = false,
  nextError,
  onNext,
  onBackToCollection,
}: StoryMissionGuideProps) {
  const [storyOpen, setStoryOpen] = useState(!hasRun);
  const [storyPage, setStoryPage] = useState(0);
  const [fixAnswer, setFixAnswer] = useState<string | null>(null);
  const chosen = mission.choices.find((choice) => choice.id === answerId);
  const observationCorrect = chosen?.correct === true;
  const chosenFix = mission.fixChoices.find((choice) => choice.id === fixAnswer);
  const page = mission.storyPages[storyPage];
  const lastStoryPage = storyPage === mission.storyPages.length - 1;
  const storyScene = page.scene ?? storyPage + 1;
  const storyBlocks = page.blocks ?? ['💬 Say', '🦘 Hop'];
  const heroTestId = mission.hero.name === 'Tuan Tuan' ? 'story-tuan-tuan' : 'story-lumilo';
  const storyPerformance: CharacterPerformance =
    storyScene === 1
      ? 'speaking'
      : storyScene === 2
        ? 'hopping'
        : storyScene === 4
          ? 'thinking'
          : storyScene === 5
            ? 'success'
            : 'listening';

  const readStory = () => {
    setStoryPage(0);
    setStoryOpen(true);
  };

  return (
    <>
      {completed &&
        mission.celebrate !== false &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="bsx-story-celebration" data-testid="story-celebration" aria-hidden="true">
            {CELEBRATION_PIECES.map((piece) => (
              <span key={piece.id} style={piece.style} />
            ))}
          </div>,
          document.body,
        )}
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
          {!storyOpen && (
            <div className="bsx-mission-book" aria-hidden>
              📖
            </div>
          )}
          <div className="bsx-mission-eyebrow">{mission.eyebrow}</div>
          <h2 id="story-mission-title">
            {storyOpen
              ? page.title
              : completed
                ? mission.completionTitle
                : mission.mode === 'observe-only' && hasRun
                  ? mission.successTitle
                  : mission.mode !== 'observe-fix' && hasRun
                    ? mission.fixTitle
                    : observationCorrect
                      ? mission.fixTitle
                      : mission.title}
          </h2>
          {nextError && !completed && (
            <p className="bsx-mission-retry" role="alert">
              {nextError}
            </p>
          )}

          {storyOpen ? (
            <div
              className={`bsx-story-book bsx-story-book-${storyPage + 1}`}
              data-testid="story-book"
            >
              <div
                className={`bsx-story-scene bsx-story-scene-${storyScene}`}
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
                  <span>🏠</span>
                  <span>🏡</span>
                  <span>🏠</span>
                </div>
                <div className="bsx-story-tower">🔔</div>
                {page.direction && (
                  <div className="bsx-story-direction" data-testid="story-direction-map">
                    <div className="bsx-story-direction-start">
                      <CharacterVisual character={mission.hero} performance="moving" />
                      <span>Start</span>
                    </div>
                    <strong data-direction={page.direction.arrow}>
                      {page.direction.arrow === 'left' ? '⬅️' : '➡️'}
                    </strong>
                    <div
                      className="bsx-story-direction-target"
                      data-testid="story-direction-target"
                    >
                      <b>⭐</b>
                      <span>{page.direction.target}</span>
                    </div>
                  </div>
                )}
                {storyScene === 2 && (
                  <>
                    <svg
                      className="bsx-story-light-network"
                      data-testid="story-light-network"
                      viewBox="0 0 600 360"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <marker
                          id="bsx-story-light-arrow"
                          markerUnits="userSpaceOnUse"
                          markerWidth="14"
                          markerHeight="14"
                          refX="12"
                          refY="7"
                          orient="auto"
                        >
                          <path d="M0,0 L14,7 L0,14 Z" />
                        </marker>
                      </defs>
                      <path
                        className="bsx-story-light-route route-left"
                        d="M105 252 Q155 198 283 170"
                        markerEnd="url(#bsx-story-light-arrow)"
                      />
                      <path
                        className="bsx-story-light-route route-middle"
                        d="M300 274 L300 176"
                        markerEnd="url(#bsx-story-light-arrow)"
                      />
                      <path
                        className="bsx-story-light-route route-right"
                        d="M495 252 Q445 198 317 170"
                        markerEnd="url(#bsx-story-light-arrow)"
                      />
                      <circle className="bsx-story-wake-node node-left" cx="105" cy="252" r="11" />
                      <circle
                        className="bsx-story-wake-node node-middle"
                        cx="300"
                        cy="274"
                        r="11"
                      />
                      <circle className="bsx-story-wake-node node-right" cx="495" cy="252" r="11" />
                      <circle className="bsx-story-tower-node" cx="300" cy="170" r="15" />
                    </svg>
                    <div className="bsx-story-light-equation" data-testid="story-light-equation">
                      <span>🏠✦</span>
                      <strong>→</strong>
                      <span>🔔</span>
                      <strong>→</strong>
                      <span>🌅</span>
                    </div>
                  </>
                )}
                <div className="bsx-story-hero" data-testid={heroTestId}>
                  <CharacterVisual character={mission.hero} performance={storyPerformance} />
                  <span>{mission.hero.name}</span>
                </div>
                <div className="bsx-story-speech">
                  {page.visualSpeech ??
                    (storyPage === 0 ? `Hi! I'm ${mission.hero.name}!` : 'Morning!')}
                </div>
                <div className="bsx-story-blocks">
                  <span>{storyBlocks[0]}</span>
                  <b>→</b>
                  <span>{storyBlocks[1]}</span>
                </div>
                <div className="bsx-story-child">👉</div>
              </div>
              <div className="bsx-story-copy">
                <p className="bsx-mission-story">{page.body}</p>
                {page.dialogue && (
                  <blockquote className="bsx-story-dialogue">
                    <strong>{page.speaker}</strong>
                    <span>“{page.dialogue}”</span>
                  </blockquote>
                )}
                <div
                  className="bsx-story-progress"
                  aria-label={`Story page ${storyPage + 1} of ${mission.storyPages.length}`}
                >
                  {mission.storyPages.map((story, index) => (
                    <span
                      key={story.title}
                      className={index === storyPage ? 'on' : ''}
                      aria-hidden
                    />
                  ))}
                </div>
                {lastStoryPage && (
                  <>
                    <p className="bsx-mission-partner">🤝 {mission.partnerLine}</p>
                    <div className="bsx-mission-task">
                      <strong>Your mission</strong>
                      <span>{mission.mission}</span>
                    </div>
                    {mission.lessonId === 'tsv-s1-a4-h' && (
                      <div className="bsx-mission-choices" data-testid="story-prerun-prediction">
                        {mission.choices.map((choice) => (
                          <button
                            key={choice.id}
                            type="button"
                            className="bsx-mission-choice"
                            data-testid={`story-choice-${choice.id}`}
                            aria-pressed={answerId === choice.id}
                            onClick={() => onAnswer(choice.id)}
                          >
                            {choice.label}
                          </button>
                        ))}
                      </div>
                    )}
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
            <div
              className="bsx-mission-success"
              data-testid={
                mission.mode === 'observe-only' ? 'story-hook-complete' : 'story-mission-success'
              }
            >
              {journeyLabel && <div className="bsx-mission-journey-label">{journeyLabel}</div>}
              <p>{mission.completion}</p>
              <div className="bsx-mission-evidence" data-testid="story-completion-evidence">
                <span>✓ Blocks ready</span>
                <span>✓ Story played</span>
                <span>✓ Work saved</span>
              </div>
              <div
                className="bsx-logic-proof"
                data-testid={
                  mission.mode === 'observe-only' ? 'story-observation-proof' : 'story-logic-proof'
                }
              >
                <div className="bsx-logic-proof-steps">
                  {mission.completionSteps.map((step, index) => (
                    <div key={step.label} className="bsx-logic-proof-step">
                      <small>{step.order}</small>
                      <strong>
                        {step.icon} {step.label}
                      </strong>
                      {index < mission.completionSteps.length - 1 && <span aria-hidden>→</span>}
                    </div>
                  ))}
                </div>
                <p>{mission.completionWhy}</p>
              </div>
              <div className="bsx-mission-next">🌟 {mission.next}</div>
              {nextError && (
                <p className="bsx-mission-retry" role="alert">
                  {nextError}
                </p>
              )}
              <button type="button" className="bsx-mission-secondary" onClick={readStory}>
                📖 Read the story again
              </button>
              {onNext && nextJourneyLabel ? (
                <button
                  type="button"
                  className="bsx-mission-primary"
                  data-testid="story-next-mission"
                  disabled={nextBusy}
                  onClick={onNext}
                >
                  {nextBusy ? 'Opening…' : `Next: ${nextJourneyLabel} →`}
                </button>
              ) : (
                <button
                  type="button"
                  className="bsx-mission-primary"
                  data-testid="story-back-to-collection"
                  onClick={onBackToCollection ?? onClose}
                >
                  Back to the story collection →
                </button>
              )}
            </div>
          ) : mission.mode !== 'observe-fix' && mission.mode !== 'observe-only' && hasRun ? (
            <div data-testid="story-build-task">
              <p className="bsx-mission-story">{mission.workspaceIntro}</p>
              <div className="bsx-logic-proof" data-testid="story-build-proof">
                <div className="bsx-logic-proof-steps">
                  {mission.completionSteps.map((step, index) => (
                    <div key={step.label} className="bsx-logic-proof-step">
                      <small>{step.order}</small>
                      <strong>
                        {step.icon} {step.label}
                      </strong>
                      {index < mission.completionSteps.length - 1 && <span aria-hidden>→</span>}
                    </div>
                  ))}
                </div>
                <p>{mission.completionWhy}</p>
              </div>
              <p className="bsx-mission-prompt">🧩 {mission.fixPrompt}</p>
              <button type="button" className="bsx-mission-secondary" onClick={readStory}>
                📖 Read the story again
              </button>
              <button type="button" className="bsx-mission-primary" onClick={onClose}>
                Keep building ▶
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
                      <strong>
                        {step.icon} {step.label}
                      </strong>
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
                <p className="bsx-mission-retry" role="status">
                  ↻ {mission.fixRetry}
                </p>
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
                <p className="bsx-mission-retry" role="status">
                  ↻ {mission.retry}
                </p>
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
    </>
  );
}
