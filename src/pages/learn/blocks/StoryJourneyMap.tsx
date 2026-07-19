import type { BlocksTemplateId } from './blocksApi';
import {
  PLAYABLE_STORY_MISSION_COUNT,
  storyMissionProjectTitle,
  TINY_STAR_VILLAGE_CHAPTERS,
  type StoryJourneyChapter,
} from './storyJourneyCatalog';
import { CharacterVisual } from './CharacterVisual';
import './storyJourneyMap.css';

const LUMI = {
  name: 'Lumilo',
  asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
};

const TUAN_TUAN = {
  name: 'Tuan Tuan',
  asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
};

function ChapterArtwork({ chapter }: { chapter: StoryJourneyChapter }) {
  if (chapter.id === 'a1') {
    return <CharacterVisual character={LUMI} className="tsv-chapter-character" performance="idle" />;
  }
  if (chapter.id === 'a2') {
    return (
      <CharacterVisual character={TUAN_TUAN} className="tsv-chapter-character" performance="idle" />
    );
  }
  return <span>{chapter.emoji}</span>;
}

interface StoryJourneyMapProps {
  busy: string | null;
  onStart: (template: BlocksTemplateId, title: string) => void;
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
        <ChapterArtwork chapter={chapter} />
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
          {chapter.missions.map((mission, index) => (
            <button
              key={mission.template}
              type="button"
              className="tsv-mission-button"
              data-testid={`blocks-starter-${mission.template}`}
              disabled={busy !== null}
              onClick={() => onStart(mission.template, storyMissionProjectTitle(mission))}
            >
              <span className="tsv-mission-number">{index + 1}</span>
              <span className="tsv-mission-name">
                <small>Step {index + 1} of {chapter.missions.length} · {mission.action}</small>
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
      <div className="tsv-library-heading">
        <div>
          <div className="tsv-kicker">Story collection library</div>
          <h2>Choose a storybook world</h2>
        </div>
        <p>Each storybook is one complete adventure with six connected chapters.</p>
      </div>
      <div className="tsv-collection-shelf" data-testid="story-collection-shelf">
        <article className="tsv-collection-card is-open">
          <div className="tsv-collection-avatar tsv-collection-cast" aria-hidden="true">
            <CharacterVisual character={LUMI} className="tsv-collection-character is-lumi" />
            <CharacterVisual character={TUAN_TUAN} className="tsv-collection-character is-tuan" />
          </div>
          <div>
            <small>Open now · Original story</small>
            <h3>The Missing Morning Light</h3>
            <p>Lumi and friends wake Tiny Star Village, one program at a time.</p>
            <strong>6 chapters · Ages 5–8</strong>
          </div>
        </article>
        <article className="tsv-collection-card is-planned">
          <div className="tsv-collection-avatar" aria-hidden="true">🐵</div>
          <div>
            <small>Planned classic adventure</small>
            <h3>The Monkey King’s New Journey</h3>
            <p>An original child-friendly coding adventure inspired by a public-domain classic.</p>
            <strong>New avatars · New logic path</strong>
          </div>
        </article>
        <article className="tsv-collection-card is-planned">
          <div className="tsv-collection-avatar" aria-hidden="true">🐇</div>
          <div>
            <small>Planned classic adventure</small>
            <h3>Alice in Wonderland</h3>
            <p>Follow curious clues and test Wonderland’s changing rules with blocks.</p>
            <strong>New characters · New logic path</strong>
          </div>
        </article>
      </div>
      <div className="tsv-world-hero">
        <div className="tsv-world-sky" data-testid="story-world-cast" aria-hidden="true">
          <span className="tsv-world-star one">✦</span>
          <span className="tsv-world-star two">✦</span>
          <span className="tsv-world-moon">☾</span>
          <span className="tsv-world-house left">🏠</span>
          <CharacterVisual
            character={LUMI}
            className="tsv-world-character tsv-world-lumi"
            performance="listening"
          />
          <CharacterVisual
            character={TUAN_TUAN}
            className="tsv-world-character tsv-world-tuan"
            performance="listening"
          />
          <span className="tsv-world-house right">🏡</span>
        </div>
        <div className="tsv-world-intro">
          <div className="tsv-season-label">Collection 1 · Tiny Star Village</div>
          <h2 id="tiny-star-village-title">Bring back the morning light</h2>
          <p>
            Meet Lumi, Tuan Tuan, and Dot Dot. Each program you fix wakes another part of the
            village.
          </p>
          <div className="tsv-world-facts">
            <span>{PLAYABLE_STORY_MISSION_COUNT} scenes ready to play</span>
            <span>1 complete story · 6 connected chapters</span>
            <span>Ages 5–8</span>
          </div>
        </div>
      </div>

      <div className="tsv-map-heading">
        <div>
          <div className="tsv-kicker">Your story path</div>
          <h2>One storybook. Six connected chapters.</h2>
        </div>
        <p>Start with Chapter 1 and follow its four steps. Finished steps stay open for replay.</p>
      </div>

      <div className="tsv-chapter-grid">
        {TINY_STAR_VILLAGE_CHAPTERS.map((chapter) => (
          <ChapterCard key={chapter.id} chapter={chapter} busy={busy} onStart={onStart} />
        ))}
      </div>
    </section>
  );
}
