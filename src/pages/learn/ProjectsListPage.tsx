import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';

interface Project {
  id: string;
  title: string;
  product_line: 'line_a_creative' | 'line_b_coding';
  visibility: 'private' | 'class' | 'public';
  thumbnail_s3_key: string | null;
  star_cost_total: number;
  artifact_count: number;
  status: 'in_progress' | 'submitted' | 'accepted' | 'archived';
  updated_at: string;
}

type FilterTab = 'all' | 'in_progress' | 'finished' | 'shared';
type StarterTile = 'image' | 'story' | 'music' | 'blank';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'finished',    label: 'Finished' },
  { key: 'shared',      label: 'Shared with class' },
];

// status → sticker color + label per DESIGN.md sticker system
const STATUS_STICKER: Record<string, { color: string; label: string }> = {
  in_progress: { color: 'sunshine', label: '🟡 working' },
  submitted:   { color: 'sky',      label: '🕐 in review' },
  accepted:    { color: 'mint',     label: '✓ finished' },
  archived:    { color: 'coral',    label: '📦 archived' },
};

const VISIBILITY_STICKER: Record<string, { color: string; label: string }> = {
  class:  { color: 'bubblegum', label: '🌟 in class' },
  public: { color: 'coral',     label: '🌍 public' },
};

// thumbnail placeholder bg per product line
const THUMB_BG: Record<string, string> = {
  line_a_creative: 'bg-wash-bubblegum',
  line_b_coding:   'bg-wash-sky',
};

const THUMB_ICON: Record<string, string> = {
  line_a_creative: '🎨',
  line_b_coding:   '💻',
};

function applyFilter(projects: Project[], tab: FilterTab): Project[] {
  if (tab === 'in_progress') return projects.filter((p) => p.status === 'in_progress');
  if (tab === 'finished')    return projects.filter((p) => ['submitted', 'accepted', 'archived'].includes(p.status));
  if (tab === 'shared')      return projects.filter((p) => p.visibility !== 'private');
  return projects;
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days} days ago`;
  if (days < 14) return 'Last week';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProjectsListPage() {
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const [tab, setTab] = useState<FilterTab>('all');
  const [showNewModal, setShowNewModal] = useState(false);

  const projects = useQuery<Project[]>({
    queryKey: ['projects', 'kid', kidId],
    queryFn: () => api<Project[]>(`/kids/${kidId}/projects`),
    enabled: !!kidId,
  });

  const filtered = applyFilter(projects.data ?? [], tab);
  const atLimit = (projects.data?.length ?? 0) >= 50;

  return (
    <div>
      {/* ── Header row ── */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="hero-display" style={{ fontSize: '40px' }}>📂 My Works</h1>
        <button
          onClick={() => setShowNewModal(true)}
          disabled={atLimit}
          className="btn-pill-primary shrink-0"
          title={atLimit ? 'You have 50 projects — archive some to make room' : undefined}
        >
          + New project
        </button>
      </div>

      {atLimit && (
        <div className="mb-4 rounded-2xl bg-wash-sunshine border border-brand-sunshine/40 px-4 py-3 text-[13px] font-medium text-ink">
          You've reached the 50-project limit. Archive or delete a project to make room.
        </div>
      )}

      {/* ── Filter row ── */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold text-steel">Filter:</span>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1 text-[13px] font-semibold transition-colors ${
              tab === t.key
                ? 'bg-brand-coral text-white'
                : 'bg-surface text-slate2 hover:bg-wash-coral hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {projects.isLoading && <p className="lead-text">Loading…</p>}

      {/* ── Empty state ── */}
      {!projects.isLoading && filtered.length === 0 && (
        <div className="card-base flex flex-col items-center py-12 text-center">
          <span className="sticker-sky">Empty</span>
          <p className="lead-text mt-4" style={{ fontSize: '16px' }}>
            Your works will show up here.<br />Try making something on the home page!
          </p>
          <Link to="/learn" className="btn-pill-primary mt-6 inline-block">
            Go make something →
          </Link>
        </div>
      )}

      {/* ── Grid — 24/page per PRD §4 ── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.slice(0, 24).map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {showNewModal && kidId && (
        <NewProjectModal kidId={kidId} onClose={() => setShowNewModal(false)} />
      )}
    </div>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({ project: p }: { project: Project }) {
  const badge = p.visibility !== 'private'
    ? VISIBILITY_STICKER[p.visibility]
    : STATUS_STICKER[p.status];
  const thumbBg = THUMB_BG[p.product_line] ?? 'bg-wash-sky';
  const thumbIcon = THUMB_ICON[p.product_line] ?? '🎨';

  return (
    <Link
      to={`/learn/projects/${p.id}`}
      className="card-base block p-0 overflow-hidden transition-transform hover:-translate-y-1"
    >
      {/* Thumbnail — 4:3 ratio */}
      <div className={`aspect-[4/3] ${thumbBg} flex items-center justify-center overflow-hidden`}>
        {p.thumbnail_s3_key ? (
          <img src={p.thumbnail_s3_key} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[36px] opacity-25">{thumbIcon}</span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <h3 className="text-[14px] font-bold text-ink leading-snug line-clamp-2">
          {p.title}
        </h3>
        <p className="text-[12px] text-steel">
          {p.artifact_count} {p.artifact_count === 1 ? 'item' : 'items'}
        </p>
        <div className="flex items-center justify-between gap-1 pt-0.5">
          {badge && (
            <span className={`sticker-${badge.color}`} style={{ fontSize: '11px', padding: '4px 10px' }}>
              {badge.label}
            </span>
          )}
          <span className="text-[11px] text-steel ml-auto">{relativeDate(p.updated_at)}</span>
        </div>
      </div>
    </Link>
  );
}

// ─── New project modal ────────────────────────────────────────────────────────

const STARTER_TILES: { key: StarterTile; emoji: string; label: string; color: string }[] = [
  { key: 'image', emoji: '🖼',  label: 'Image',  color: 'bubblegum' },
  { key: 'story', emoji: '📖', label: 'Story',  color: 'sky' },
  { key: 'music', emoji: '🎵', label: 'Music',  color: 'mint' },
  { key: 'blank', emoji: '✨', label: 'Blank',  color: 'sunshine' },
];

function NewProjectModal({ kidId, onClose }: { kidId: string; onClose: () => void }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [starter, setStarter] = useState<StarterTile>('blank');

  const create = useMutation({
    mutationFn: () =>
      api<{ id: string }>('/projects', {
        method: 'POST',
        body: { title: title.trim() || 'Untitled', product_line: 'line_a_creative' },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['projects', 'kid', kidId] });
      const dest = starter !== 'blank'
        ? `/learn/create/${starter}?project_id=${res.id}`
        : `/learn/projects/${res.id}`;
      nav(dest);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="card-base max-w-sm w-full">
        <span className="sticker-bubblegum">New project</span>

        <h2 className="text-[22px] font-bold text-ink mt-4 mb-5">What are you making?</h2>

        {/* Title input */}
        <label className="block mb-5">
          <span className="label-k12">Give it a name</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') create.mutate(); }}
            placeholder="My awesome project"
            className="input-k12"
            maxLength={120}
          />
        </label>

        {/* Starter tiles */}
        <div className="mb-6">
          <span className="label-k12 block mb-3">Start with (optional)</span>
          <div className="grid grid-cols-4 gap-2">
            {STARTER_TILES.map((t) => (
              <button
                key={t.key}
                onClick={() => setStarter(t.key)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                  starter === t.key
                    ? `border-brand-${t.color} bg-wash-${t.color} text-ink`
                    : 'border-hairline bg-surface text-steel hover:border-brand-coral'
                }`}
              >
                <span className="text-[22px]">{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-pill-secondary flex-1">Cancel</button>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="btn-pill-primary flex-1"
          >
            {create.isPending ? 'Creating…' : 'Create →'}
          </button>
        </div>
      </div>
    </div>
  );
}
