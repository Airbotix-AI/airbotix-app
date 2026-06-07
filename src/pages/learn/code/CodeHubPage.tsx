import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

import { useMe } from '@/auth/useAuth';
import { useKidWallet } from '@/pages/learn/create/shared/useStudio';
import { ApiError } from '@/lib/api';
import {
  CODE_TEMPLATES,
  TEMPLATE_SEED_COST,
  createCodeProject,
  listProjects,
  type CodeProject,
  type CodeTemplate,
} from './codeApi';

/** Code Studio hub — `/learn/create/code` (learn-code-studio-prd.md §2.1). */
export function CodeHubPage() {
  const me = useMe();
  const nav = useNavigate();
  const wallet = useKidWallet();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const projects = useQuery<CodeProject[]>({
    queryKey: ['kid', kidId, 'code-projects'],
    queryFn: () => listProjects(kidId!),
    enabled: !!kidId,
  });

  const start = async (template: CodeTemplate) => {
    setBusy(template.id);
    setError(null);
    // Tiny Game opens the Phaser game studio (the playground), not the web code
    // editor. Phase 1 is client-only: no backend project yet (the playground runs
    // on its local Phaser scaffold + IndexedDB, keyed by this id). A real
    // game-kind backend project is Phase 2. The `local-` prefix marks it as not
    // server-backed (the file load 404s → local scaffold fallback).
    if (template.id === 'tiny_game') {
      nav(`/learn/playground/local-${crypto.randomUUID()}`);
      return;
    }
    try {
      const project = await createCodeProject({
        kidId,
        familyId,
        title: template.id === 'blank' ? 'My project' : template.title,
        template: template.id,
      });
      nav(`/learn/code/${project.id}?template=${template.id}`);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'WALLET_INSUFFICIENT' || e.status === 402)
          setError('Out of Stars! Ask a parent to top up.');
        else setError(e.message);
      } else {
        setError('Could not start that project.');
      }
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Link to="/learn/create" className="btn-pill-ghost mb-3 -ml-3 text-[13px]">
            ← Make
          </Link>
          <div className="eyebrow eyebrow-sky">Code Studio</div>
          <h1 className="hero-display">
            Make a website, a game, or a <span className="squiggle-word">tool</span>.
          </h1>
          <p className="lead-text mt-4">
            You tell the AI what you want — it writes the code, you watch it run.
          </p>
        </div>
        {wallet.data && (
          <div className="text-right shrink-0">
            <div className="text-[24px] font-bold tabular-nums text-brand-sky">{wallet.data.stars_balance}★</div>
            <div className="text-[11px] uppercase tracking-[0.10em] text-slate2 font-bold">left to spend</div>
          </div>
        )}
      </div>

      <h2 className="section-heading mb-4" style={{ fontSize: '20px' }}>
        Pick a starting point
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        {CODE_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={busy !== null}
            onClick={() => start(t)}
            className={`pack-card ${t.color} text-left`}
          >
            <span className="pack-blob" />
            <div className="relative">
              <div className="text-[36px]">{t.emoji}</div>
              <h3 className="mt-2 text-[22px] font-bold leading-tight">{t.title}</h3>
              <p className="mt-1.5 text-[13px] opacity-90">{t.desc}</p>
              <div className="mt-6 rounded-full bg-canvas-pure/25 backdrop-blur px-3 py-1.5 inline-block text-[11px] font-bold uppercase tracking-[0.10em]">
                {busy === t.id ? 'Starting…' : `${TEMPLATE_SEED_COST}★ start`}
              </div>
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
          {error}
        </div>
      )}

      <h2 className="section-heading mb-4" style={{ fontSize: '20px' }}>
        Your past code projects
      </h2>
      {projects.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : projects.data && projects.data.length > 0 ? (
        <div className="card-base p-0 overflow-hidden">
          <ul className="divide-y divide-hairline">
            {projects.data.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-6 py-4">
                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-ink truncate">{p.title}</div>
                  <div className="text-[12px] text-slate2 mt-0.5">
                    {p.updated_at ? formatDistanceToNow(new Date(p.updated_at), { addSuffix: true }) : '—'}
                  </div>
                </div>
                <Link to={`/learn/code/${p.id}`} className="btn-pill-secondary text-[13px] shrink-0">
                  ▶ Open
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="card-base text-center">
          <span className="sticker-sky">Nothing yet</span>
          <p className="lead-text mt-4">Pick a starting point above to make your first thing.</p>
        </div>
      )}
    </div>
  );
}
