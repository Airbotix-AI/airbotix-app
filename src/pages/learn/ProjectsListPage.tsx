import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';

interface Project {
  id: string;
  title: string;
  kind?: 'creative' | 'code' | 'game';
  product_line: 'line_a_creative' | 'line_b_coding';
  visibility: 'private' | 'class' | 'public';
  thumbnail_s3_key: string | null;
  star_cost_total: number;
  status: 'in_progress' | 'submitted' | 'accepted' | 'archived';
  updated_at: string;
}

const STATUS_STICKER: Record<string, string> = {
  in_progress: 'sunshine',
  submitted:   'sky',
  accepted:    'mint',
  archived:    'coral',
};

export function ProjectsListPage() {
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const qc = useQueryClient();
  // Inline delete confirmation: the id of the project awaiting a "Delete this?" confirm.
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const projects = useQuery<Project[]>({
    queryKey: ['projects', 'kid', kidId],
    queryFn: () => api<Project[]>(`/kids/${kidId}/projects`),
    enabled: !!kidId,
  });

  const del = useMutation({
    mutationFn: (id: string) => api<void>(`/projects/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setConfirmId(null);
      qc.invalidateQueries({ queryKey: ['projects', 'kid', kidId] });
    },
  });

  // Resume opens a game in the studio (PRD J9); other kinds open their project detail.
  const resumeHref = (p: Project) =>
    p.kind === 'game' ? `/learn/playground/${p.id}` : `/learn/projects/${p.id}`;

  return (
    <div>
      <div className="mb-10 flex items-start justify-between gap-4">
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

      {projects.isLoading && <p className="lead-text">Loading…</p>}

      {!projects.isLoading && (!projects.data || projects.data.length === 0) && (
        <div className="card-base text-center">
          <span className="sticker-mint">Empty</span>
          <h2 className="section-heading mt-4" style={{ fontSize: '24px' }}>
            No projects yet
          </h2>
          <p className="lead-text mt-2">
            Make something! Start a mission or play around freely.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link to="/learn/missions" className="btn-pill-primary">Browse missions →</Link>
            <Link to="/learn/projects/new" className="btn-pill-secondary">Free play</Link>
          </div>
        </div>
      )}

      {projects.data && projects.data.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.data.map((p) => (
            <div key={p.id} className="card-base" data-testid="project-card">
              <Link
                to={resumeHref(p)}
                className="block transition-transform hover:-translate-y-0.5"
                data-testid="project-resume"
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
                  {p.kind === 'game'
                    ? 'Game'
                    : p.product_line === 'line_a_creative'
                      ? 'Creative'
                      : 'Coding'}
                  {p.visibility !== 'private' && ` · ${p.visibility}`}
                </div>
                <div className="text-[12px] text-slate2 mt-3">
                  Updated {new Date(p.updated_at).toLocaleDateString()}
                </div>
              </Link>

              {/* Resume / Delete actions (delete asks for confirmation first). */}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-hairline pt-3">
                <Link to={resumeHref(p)} className="text-[13px] font-bold text-brand-sky">
                  {p.kind === 'game' ? 'Resume game →' : 'Open →'}
                </Link>
                {confirmId === p.id ? (
                  <span className="flex items-center gap-2 text-[13px]">
                    <span className="text-slate2">Delete this?</span>
                    <button
                      type="button"
                      onClick={() => del.mutate(p.id)}
                      disabled={del.isPending}
                      className="font-bold text-brand-coral disabled:opacity-50"
                      data-testid="project-delete-confirm"
                    >
                      {del.isPending ? 'Deleting…' : 'Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="font-bold text-slate2"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(p.id)}
                    className="text-[13px] font-bold text-slate2 hover:text-brand-coral"
                    data-testid="project-delete"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
