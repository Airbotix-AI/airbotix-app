// Story Blocks hub — `/learn/create/blocks` (learn-blocks-studio-prd.md §2).
// Pick a starter (blank / sample story) or reopen an existing Blocks project.
// Manual block coding is FREE (D-BLK-8) — no Stars gate anywhere here.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import {
  createBlocksProject,
  listBlocksProjects,
  type BlocksProjectMeta,
  type BlocksTemplateId,
} from './blocksApi';
import { StoryJourneyMap } from './StoryJourneyMap';
import { storyMissionProjectTitle } from './storyJourneyCatalog';
import { fetchStoryLineProgress } from './story-parts/storyPartsApi';
import {
  TINY_STAR_STORY_LINE_ID,
  tinyStarResumeProject,
  tinyStarSeasonView,
} from './tinyStarSeason';
import './blocks.css';

export function BlocksHubPage() {
  const me = useMe();
  const nav = useNavigate();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const projects = useQuery<BlocksProjectMeta[]>({
    queryKey: ['kid', kidId, 'blocks-projects'],
    queryFn: () => listBlocksProjects(kidId!),
    enabled: !!kidId,
  });

  // Tiny Star Village season progression — the server owns the unlock chain
  // (/story-parts/tiny-star-village-s1). Until it answers, nothing is locked.
  const seasonProgress = useQuery({
    queryKey: ['story-parts', TINY_STAR_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(TINY_STAR_STORY_LINE_ID),
    enabled: !!kidId,
  });
  const season = tinyStarSeasonView(seasonProgress.data);

  const start = async (template: BlocksTemplateId, title: string) => {
    setBusy(template);
    setError(null);
    try {
      const { id } = await createBlocksProject({ title, template });
      nav(`/learn/blocks/${id}`);
    } catch {
      setError("Couldn't start a new project — try again in a moment.");
      setBusy(null);
    }
  };

  // Resume the season: reopen the child's own project for the open scene when
  // they already started it, otherwise begin that scene fresh.
  const resumeSeason = () => {
    const scene = season.resume;
    if (!scene) return;
    const existing = tinyStarResumeProject(projects.data ?? [], scene);
    if (existing) {
      nav(`/learn/blocks/${existing.id}`);
      return;
    }
    void start(scene.mission.template, storyMissionProjectTitle(scene.mission));
  };

  return (
    <div className="bsx">
      <div className="mb-8 max-w-4xl">
        <div className="eyebrow eyebrow-mint">Story Blocks · Ages 5–8</div>
        <h1 className="hero-display">
          Step into a story. <span className="squiggle-word">Program what happens next.</span>
        </h1>
        <p className="lead-text mt-4">
          Pick a story collection, follow its six connected chapters, and use real blocks to help
          each hero solve what happens next.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-brand-coral/40 bg-wash-coral px-4 py-3 text-[14px] font-semibold">
          {error}
        </div>
      )}

      <StoryJourneyMap
        busy={busy}
        season={season}
        onResume={resumeSeason}
        onStart={(template, title) => void start(template, title)}
      />

      {/* Journey to the West story world — reading + evidence parts (JtW S1). */}
      <section
        className="my-8 rounded-[26px] border border-brand-sunshine/45 bg-wash-sunshine p-5 sm:flex sm:items-center sm:justify-between sm:gap-5"
        data-testid="blocks-jtw-entry"
      >
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.12em] text-slate2">
            New story world
          </div>
          <h2 className="mt-1 text-[22px] font-black">
            Journey to the West · The Monkey King's First Journey
          </h2>
          <p className="mt-1 text-[13px] font-semibold text-slate2">
            Read the story, find evidence, and see how the immortal stone wakes at dawn. One Part at
            a time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => nav('/learn/story/journey-west')}
          className="mt-4 rounded-full bg-brand-sunshine px-5 py-3 text-[13px] font-black text-ink shadow-card-soft sm:mt-0"
        >
          Enter Flower Fruit Mountain →
        </button>
      </section>
    </div>
  );
}
