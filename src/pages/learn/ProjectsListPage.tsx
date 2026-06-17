import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { listMyClasses, type ClassMineSummary } from './classroom/classroomApi';
import { ShareToClassModal } from './classroom/ShareToClassModal';
import { loadThumbnail } from './playground/projectPersistence';
import { WorkCard } from './projects/WorkCard';
import { ConfirmDialog } from './projects/ConfirmDialog';
import { usePlacement } from './projects/usePlacement';
import type { KidProject } from './projects/kidProject';

// "My Works" — `/learn/projects` (my-classes-prd §3.4). Segmented by
// All · Personal · <each enrolled class>. Cards open the studio; the ⋯ menu
// drives placement (PATCH /projects/:id/placement) and wall-sharing.

type Tab = 'all' | 'personal' | string; // string = a class id

export function ProjectsListPage() {
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const qc = useQueryClient();
  const nav = useNavigate();
  // ?tab=<classId> (e.g. from the class wall's "Share something of mine") opens
  // that class pre-filtered; falls back to All if it has no projects (effect below).
  const [sp] = useSearchParams();
  const [tab, setTab] = useState<Tab>((sp.get('tab') as Tab) || 'all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [shareProject, setShareProject] = useState<KidProject | null>(null);

  const projects = useQuery<KidProject[]>({
    queryKey: ['projects', 'kid', kidId],
    queryFn: () => api<KidProject[]>(`/kids/${kidId}/projects`),
    enabled: !!kidId,
  });

  const classes = useQuery<ClassMineSummary[]>({
    queryKey: ['kid', kidId, 'classes'],
    queryFn: () => listMyClasses(),
    enabled: !!kidId,
  });

  const placement = usePlacement({ kidId, onShareRequest: setShareProject });

  // Local game/blocks thumbnails (captured device-side, no backend upload yet).
  const all = useMemo(() => projects.data ?? [], [projects.data]);
  const thumbIds = all.filter((p) => p.kind === 'game' || p.kind === 'blocks').map((p) => p.id);
  const localThumbs = useQuery<Record<string, string>>({
    queryKey: ['playground-thumbs', thumbIds.join(',')],
    queryFn: async () => {
      const entries = await Promise.all(
        thumbIds.map(async (id) => [id, await loadThumbnail(id)] as const),
      );
      return Object.fromEntries(entries.filter(([, v]) => v)) as Record<string, string>;
    },
    enabled: thumbIds.length > 0,
  });

  const del = useMutation({
    mutationFn: (id: string) => api<void>(`/projects/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['projects', 'kid', kidId] });
    },
  });

  const classList = classes.data ?? [];
  const personal = useMemo(() => all.filter((p) => !p.class_id), [all]);
  const byClass = useMemo(() => {
    const m = new Map<string, KidProject[]>();
    for (const p of all) if (p.class_id) m.set(p.class_id, [...(m.get(p.class_id) ?? []), p]);
    return m;
  }, [all]);

  // If we were sent to a class tab that has no projects, fall back to All (§3.4).
  useEffect(() => {
    if (tab !== 'all' && tab !== 'personal' && all.length > 0 && (byClass.get(tab)?.length ?? 0) === 0) {
      setTab('all');
    }
  }, [tab, all.length, byClass]);

  const atLimit = all.length >= 50;

  const renderCard = (p: KidProject) => (
    <WorkCard
      key={p.id}
      project={p}
      localThumb={localThumbs.data?.[p.id]}
      classes={classList}
      onDelete={() => setDeleteId(p.id)}
      {...placement.handlers(p)}
    />
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="hero-display" style={{ fontSize: '40px' }}>
          📂 My Works
        </h1>
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
        <div className="mb-4 rounded-2xl border border-brand-sunshine/40 bg-wash-sunshine px-4 py-3 text-[13px] font-medium text-ink">
          You've reached the 50-project limit. Archive or delete a project to make room.
        </div>
      )}

      {/* Segmented tabs: All · Personal · <each class> */}
      <div className="mb-6 flex flex-wrap items-center gap-2" data-testid="works-tabs">
        <SegTab active={tab === 'all'} onClick={() => setTab('all')}>
          All
        </SegTab>
        <SegTab active={tab === 'personal'} onClick={() => setTab('personal')}>
          Personal
        </SegTab>
        {classList.map((c) => (
          <SegTab key={c.id} active={tab === c.id} onClick={() => setTab(c.id)}>
            {c.name}
          </SegTab>
        ))}
      </div>

      {projects.isLoading && <p className="lead-text">Loading…</p>}

      {!projects.isLoading && all.length === 0 && (
        <div className="card-base flex flex-col items-center py-12 text-center">
          <span className="sticker-sky">Empty</span>
          <p className="lead-text mt-4" style={{ fontSize: '16px' }}>
            Your works will show up here.
            <br />
            Try making something on the home page!
          </p>
          <Link to="/learn" className="btn-pill-primary mt-6 inline-block">
            Go make something →
          </Link>
        </div>
      )}

      {/* ALL — grouped Personal + each class */}
      {!projects.isLoading && all.length > 0 && tab === 'all' && (
        <div className="space-y-8">
          {personal.length > 0 && (
            <Group label="Personal">{personal.map(renderCard)}</Group>
          )}
          {classList.map((c) => {
            const items = byClass.get(c.id) ?? [];
            if (items.length === 0) return null;
            return (
              <Group key={c.id} label={c.name}>
                {items.map(renderCard)}
              </Group>
            );
          })}
        </div>
      )}

      {/* PERSONAL */}
      {tab === 'personal' && (
        <Grid>{personal.map(renderCard)}</Grid>
      )}

      {/* A single class */}
      {tab !== 'all' && tab !== 'personal' && (
        <Grid>{(byClass.get(tab) ?? []).map(renderCard)}</Grid>
      )}

      {showNewModal && kidId && (
        <NewProjectModal kidId={kidId} onClose={() => setShowNewModal(false)} nav={nav} />
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete this project?"
          body={`“${all.find((p) => p.id === deleteId)?.title ?? 'this project'}” will be removed for good. This can’t be undone.`}
          confirmLabel="Delete"
          busy={del.isPending}
          onConfirm={() => del.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {shareProject && (
        <ShareToClassModal
          projectId={shareProject.id}
          onClose={() => setShareProject(null)}
          onShared={() => qc.invalidateQueries({ queryKey: ['projects', 'kid', kidId] })}
        />
      )}

      {placement.dialog}
    </div>
  );
}

function SegTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-[14px] font-bold transition-colors ${
        active
          ? 'bg-canvas-pure text-ink shadow-card-soft'
          : 'bg-surface text-slate2 hover:bg-wash-coral hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-steel">{label}</p>
      <Grid>{children}</Grid>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
  );
}

// ─── New project modal (personal project; unchanged from prior behaviour) ────

type StarterTile = 'image' | 'story' | 'music' | 'blank';

const STARTER_TILES: { key: StarterTile; emoji: string; label: string; color: string }[] = [
  { key: 'image', emoji: '🖼', label: 'Image', color: 'bubblegum' },
  { key: 'story', emoji: '📖', label: 'Story', color: 'sky' },
  { key: 'music', emoji: '🎵', label: 'Music', color: 'mint' },
  { key: 'blank', emoji: '✨', label: 'Blank', color: 'sunshine' },
];

function NewProjectModal({
  kidId,
  onClose,
  nav,
}: {
  kidId: string;
  onClose: () => void;
  nav: ReturnType<typeof useNavigate>;
}) {
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
      const dest =
        starter !== 'blank'
          ? `/learn/create/${starter}?project_id=${res.id}`
          : `/learn/projects/${res.id}`;
      nav(dest);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="card-base w-full max-w-sm">
        <span className="sticker-bubblegum">New project</span>
        <h2 className="mb-5 mt-4 text-[22px] font-bold text-ink">What are you making?</h2>

        <label className="mb-5 block">
          <span className="label-k12">Give it a name</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') create.mutate();
            }}
            placeholder="My awesome project"
            className="input-k12"
            maxLength={120}
          />
        </label>

        <div className="mb-6">
          <span className="label-k12 mb-3 block">Start with (optional)</span>
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

        <p className="mb-4 text-[12px] text-slate2">🔒 New projects here are Personal — only you can see them.</p>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-pill-secondary flex-1">
            Cancel
          </button>
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
