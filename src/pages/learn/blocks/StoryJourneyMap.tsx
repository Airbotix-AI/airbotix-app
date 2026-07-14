import type { BlocksTemplateId } from './blocksApi';
import {
  PLAYABLE_STORY_MISSION_COUNT,
  TINY_STAR_VILLAGE_CHAPTERS,
  type StoryJourneyChapter,
  type StoryJourneyMission,
} from './storyJourneyCatalog';
import './storyJourneyMap.css';

interface StoryJourneyMapProps {
  busy: string | null;
  onStart: (template: BlocksTemplateId, title: string) => void;
}

function missionProjectTitle(mission: StoryJourneyMission): string {
  return `Tiny Star Village · ${mission.title}`;
}

function ChapterCard({
  chapter,
  busy,
  onStart,
}: {
  chapter: StoryJourneyChapter;
  busy: string | null;
  onStart: StoryJourneyMapProps['onStart'];
}) {
  const isPlayable = chapter.missions.length > 0;

  return (
    <article
      className={`tsv-chapter-card tsv-art-${chapter.art}${isPlayable ? '' : ' is-coming'}`}
      data-testid={`story-chapter-${chapter.id}`}
    >
      <div className="tsv-chapter-art" aria-hidden="true">
        <span>{chapter.emoji}</span>
        <b>{chapter.number}</b>
      </div>
      <div className="tsv-chapter-copy">
        <div className="tsv-chapter-topline">
          <span>Chapter {chapter.number}</span>
          <span className={isPlayable ? 'is-ready' : 'is-soon'}>
            {isPlayable ? `${chapter.missions.length} scenes ready` : 'Story preview'}
          </span>
        </div>
        <h3>{chapter.title}</h3>
        <p>{chapter.story}</p>
        <div className="tsv-skill"><span aria-hidden="true">✦</span> {chapter.skill}</div>
      </div>

      {isPlayable ? (
        <div className="tsv-mission-list" aria-label={`Chapter ${chapter.number} scenes`}>
          {chapter.missions.map((mission) => (
            <button
              key={mission.template}
              type="button"
              className="tsv-mission-button"
              data-testid={`blocks-starter-${mission.template}`}
              disabled={busy !== null}
              onClick={() => onStart(mission.template, missionProjectTitle(mission))}
            >
              <span className="tsv-mission-number">{mission.number}</span>
              <span className="tsv-mission-name">
                <small>{mission.action}</small>
                {mission.title}
              </span>
              <span className="tsv-mission-arrow" aria-hidden="true">→</span>
            </button>
          ))}
          {chapter.id === 'a2' && (
            <div className="tsv-next-scene">
              <span aria-hidden="true">✨</span>
              Next: build your own two-step cloud path
            </div>
          )}
        </div>
      ) : (
        <div className="tsv-coming-note">This chapter opens as its illustrated scenes are ready.</div>
      )}
    </article>
  );
}

export function StoryJourneyMap({ busy, onStart }: StoryJourneyMapProps) {
  return (
    <section className="tsv-journey" aria-labelledby="tiny-star-village-title">
      <div className="tsv-world-hero">
        <div className="tsv-world-sky" aria-hidden="true">
          <span className="tsv-world-star one">✦</span>
          <span className="tsv-world-star two">✦</span>
          <span className="tsv-world-moon">☾</span>
          <span className="tsv-world-house left">🏠</span>
          <span className="tsv-world-lumi">🌟</span>
          <span className="tsv-world-house right">🏡</span>
        </div>
        <div className="tsv-world-intro">
          <div className="tsv-season-label">Tiny Star Village · Season 1</div>
          <h2 id="tiny-star-village-title">Bring back the morning light</h2>
          <p>
            Meet Lumi, Tuan Tuan, and Dot Dot. Each program you fix wakes another part of the
            village.
          </p>
          <div className="tsv-world-facts">
            <span>{PLAYABLE_STORY_MISSION_COUNT} scenes ready to play</span>
            <span>6 connected chapters</span>
            <span>Ages 5–8</span>
          </div>
        </div>
      </div>

      <div className="tsv-map-heading">
        <div>
          <div className="tsv-kicker">Your story path</div>
          <h2>One village. Six connected chapters.</h2>
        </div>
        <p>Choose any ready scene. New chapters appear here as their artwork and missions are finished.</p>
      </div>

      <div className="tsv-chapter-grid">
        {TINY_STAR_VILLAGE_CHAPTERS.map((chapter) => (
          <ChapterCard key={chapter.id} chapter={chapter} busy={busy} onStart={onStart} />
        ))}
      </div>
    </section>
  );
}
