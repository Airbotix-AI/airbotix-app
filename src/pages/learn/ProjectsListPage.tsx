import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';

interface Project {
  id: string;
  title: string;
  product_line: 'line_a_creative' | 'line_b_coding';
  visibility: 'private' | 'class' | 'public';
  thumbnail_s3_key: string | null;
  star_cost_total: number;
  status: 'in_progress' | 'submitted' | 'accepted' | 'archived';
  updated_at: string;
}

type FilterTab = 'all' | 'in_progress' | 'finished' | 'shared';

const STATUS_STICKER: Record<string, string> = {
  in_progress: 'sunshine',
  submitted:   'sky',
  accepted:    'mint',
  archived:    'coral',
};

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'finished',    label: 'Finished' },
  { key: 'shared',      label: 'Shared with class' },
];

function applyFilter(projects: Project[], tab: FilterTab): Project[] {
  if (tab === 'in_progress') return projects.filter((p) => p.status === 'in_progress');
  if (tab === 'finished')    return projects.filter((p) => ['submitted', 'accepted', 'archived'].includes(p.status));
  if (tab === 'shared')      return projects.filter((p) => p.visibility === 'class' || p.visibility === 'public');
  return projects;
}

export function ProjectsListPage() {
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const [tab, setTab] = useState<FilterTab>('all');

  const projects = useQuery<Project[]>({
    queryKey: ['projects', 'kid', kidId],
    queryFn: () => api<Project[]>(`/kids/${kidId}/projects`),
    enabled: !!kidId,
  });

  const filtered = applyFilter(projects.data ?? [], tab);

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-sky">My projects</div>
          <h1 className="hero-display">Your stuff.</h1>
          <p className="lead-text mt-4">
            Pick one up where you left off, or start something new.
          </p>
        </div>
        <Link to="/learn/projects/new" className="btn-pill-primary shrink-0">
          + New project
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold border-2 transition-colors ${
              tab === t.key
                ? 'bg-brand-coral text-white border-brand-coral'
                : 'bg-canvas-pure text-ink-soft border-hairline hover:border-brand-coral'
            }`}
          >
            {t.label}
            {t.key !== 'all' && projects.data && (
              <span className="ml-1.5 opacity-70">
                ({applyFilter(projects.data, t.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {projects.isLoading && <p className="lead-text">Loading…</p>}

      {!projects.isLoading && filtered.length === 0 && (
        <div className="card-base text-center">
          <span className="sticker-mint">Empty</span>
          <h2 className="section-heading mt-4" style={{ fontSize: '24px' }}>
            {tab === 'all' ? 'No projects yet' : 'Nothing here'}
          </h2>
          <p className="lead-text mt-2">
            {tab === 'all'
              ? 'Make something! Start a mission or play around freely.'
              : 'Try a different filter, or start something new.'}
          </p>
          {tab === 'all' && (
            <div className="mt-6 flex gap-3 justify-center">
              <Link to="/learn/missions" className="btn-pill-primary">Browse missions →</Link>
              <Link to="/learn/projects/new" className="btn-pill-secondary">Free play</Link>
            </div>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/learn/projects/${p.id}`}
              className="card-base block transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`sticker-${STATUS_STICKER[p.status] ?? 'sky'}`}>
                  {p.status.replace(/_/g, ' ')}
                </span>
                <span className="text-[12px] font-bold text-brand-mint">
                  {p.star_cost_total}★
                </span>
              </div>
              <h3 className="text-[20px] font-bold text-ink mt-4 leading-tight line-clamp-2">
                {p.title}
              </h3>
              <div className="text-[11px] uppercase tracking-[0.10em] text-slate2 font-bold mt-2">
                {p.product_line === 'line_a_creative' ? 'Creative' : 'Coding'}
                {p.visibility !== 'private' && ` · ${p.visibility}`}
              </div>
              <div className="text-[12px] text-slate2 mt-3">
                Updated {new Date(p.updated_at).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
