// Story Blocks hub — `/learn/create/blocks` (learn-blocks-studio-prd.md §2).
// Pick a starter (blank / sample story) or reopen an existing Blocks project.
// Manual block coding is FREE (D-BLK-8) — no Stars gate anywhere here.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

import { useMe } from '@/auth/useAuth';
import {
  createBlocksProject,
  listBlocksProjects,
  type BlocksProjectMeta,
  type BlocksTemplateId,
} from './blocksApi';
import { BLOCKS_STARTERS } from './blocksStarters';
import { StoryJourneyMap } from './StoryJourneyMap';
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

  const freeStoryStarter = BLOCKS_STARTERS.find((starter) => starter.id === 'blocks_story');
  const latestProject = projects.data?.[0];

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

      {latestProject && (
        <section className="mb-8 rounded-[26px] border border-brand-mint/35 bg-wash-mint p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.12em] text-slate2">
              Continue where you left off
            </div>
            <h2 className="mt-1 text-[22px] font-black">{latestProject.title}</h2>
            {latestProject.updated_at && (
              <div className="mt-1 text-[12px] font-semibold text-slate2">
                Played {formatDistanceToNow(new Date(latestProject.updated_at), { addSuffix: true })}
              </div>
            )}
          </div>
          <button
            type="button"
            data-testid="blocks-continue-latest"
            onClick={() => nav(`/learn/blocks/${latestProject.id}`)}
            className="mt-4 rounded-full bg-brand-mint px-5 py-3 text-[13px] font-black text-ink shadow-card-soft sm:mt-0"
          >
            Continue →
          </button>
        </section>
      )}

      <StoryJourneyMap busy={busy} onStart={(template, title) => void start(template, title)} />

      {freeStoryStarter && (
        <section className="my-12 rounded-[30px] border-2 border-dashed border-brand-mint/45 bg-canvas-pure p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div className="flex items-start gap-4">
            <div className="text-[44px]" aria-hidden="true">{freeStoryStarter.emoji}</div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.12em] text-slate2">Free creation</div>
              <h2 className="mt-1 text-[24px] font-black">Make your own Story Blocks project</h2>
              <p className="mt-1 max-w-2xl text-[14px] font-semibold text-slate2">
                Start with the playful cat scene, then change the characters, sounds, blocks, and pages.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid={`blocks-starter-${freeStoryStarter.id}`}
            disabled={busy !== null}
            onClick={() => void start(freeStoryStarter.id, 'My Story Blocks project')}
            className="mt-5 whitespace-nowrap rounded-full bg-ink px-5 py-3 text-[13px] font-black text-white disabled:opacity-60 sm:mt-0"
          >
            {busy === freeStoryStarter.id ? 'Starting…' : 'Create my own →'}
          </button>
        </section>
      )}

      {projects.data && projects.data.length > 0 && (
        <div className="pb-10">
          <h2 className="mb-4 text-[26px] font-black">Your Story Blocks projects</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.data.map((p) => (
              <button
                key={p.id}
                type="button"
                data-testid="blocks-project-card"
                onClick={() => nav(`/learn/blocks/${p.id}`)}
                className="rounded-2xl border border-hairline bg-canvas-pure p-5 text-left transition hover:-translate-y-0.5 hover:shadow-card-soft"
              >
                <div className="text-[28px]">🧩</div>
                <div className="mt-2 font-bold">{p.title}</div>
                {p.updated_at && (
                  <div className="mt-1 text-[12px] text-slate2">
                    {formatDistanceToNow(new Date(p.updated_at), { addSuffix: true })}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
