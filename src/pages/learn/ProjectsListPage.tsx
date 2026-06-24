import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { useWsEvent } from '@/lib/useWsEvent';
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

  // A teacher putting our project on / taking it off the class wall flips its
  // visibility server-side and emits `wall.placement_changed` to the kid socket
  // (platform-backend wall.service teacherPublish/teacherRemove). Refetch so the
  // placement badge here updates live (teacher-class-work-prd §12.3, acceptance #5).
  useWsEvent(
    'wall.placement_changed',
    () => qc.invalidateQueries({ queryKey: ['projects', 'kid', kidId] }),
    [kidId],
  );

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
      <div className="mb-4 flex items-center justify-end gap-4">
        {/* "+ New project" is just a shortcut to the Create tab — the single
            create surface (my-classes-prd §3.3). No bespoke new-project modal:
            one shared tool registry (CREATE_TOOLS), zero drift. */}
        <button
          onClick={() => nav('/learn/create')}
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
