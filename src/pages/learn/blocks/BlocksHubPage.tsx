// Blocks Studio hub — `/learn/create/blocks` (learn-blocks-studio-prd.md §2).
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
import './blocks.css';

// One generic starter: every new project opens on a working scene (the cat
// chasing a bouncing ball) the kid can press Go! on, then remix into anything.
const STARTERS: Array<{ id: BlocksTemplateId; emoji: string; title: string; desc: string }> = [
  { id: 'blocks_story', emoji: '🐱', title: 'New project', desc: 'Press Go! to watch the cat chase a bouncing ball — then make it your own.' },
  { id: 'blocks_tsv_a1_h', emoji: '🌟', title: 'Tiny Star Village · A1', desc: 'Press Go and watch carefully: does Little Light say hello before waking up?' },
];

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

  return (
    <div className="bsx">
      <div className="mb-8">
        <div className="eyebrow eyebrow-mint">Blocks</div>
        <h1 className="hero-display">
          Snap blocks. <span className="squiggle-word">Make magic.</span>
        </h1>
        <p className="lead-text mt-4">
          Drag puzzle blocks to make your characters move, talk and play. No typing — and it&apos;s
          free to make as much as you like!
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-brand-coral/40 bg-wash-coral px-4 py-3 text-[14px] font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:max-w-md gap-6 mb-12">
        {STARTERS.map((s) => (
          <button
            key={s.id}
            type="button"
            data-testid={`blocks-starter-${s.id}`}
            disabled={busy !== null}
            onClick={() => void start(s.id, 'My blocks project')}
            className="pack-card mint block text-left disabled:opacity-60"
          >
            <span className="pack-blob" />
            <div className="relative">
              <div className="text-[40px]">{s.emoji}</div>
              <h2 className="mt-3 text-[24px] font-bold leading-tight">{s.title}</h2>
              <p className="mt-2 text-[14px] opacity-90">{s.desc}</p>
              <span className="mt-6 inline-block rounded-full bg-canvas-pure/25 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em] backdrop-blur">
                {busy === s.id ? 'Starting…' : 'Start →'}
              </span>
            </div>
          </button>
        ))}
      </div>

      {projects.data && projects.data.length > 0 && (
        <div>
          <h2 className="text-[20px] font-bold mb-4">Your blocks projects</h2>
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
