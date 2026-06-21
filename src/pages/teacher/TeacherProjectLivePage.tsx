import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ApiError, api } from '@/lib/api';
import { useWsEvent } from '@/lib/useWsEvent';
import { PlaygroundApp } from '../learn/playground/PlaygroundApp';
import { CodeStudioPage } from '../learn/code/CodeStudioPage';
import { BlocksStudioPage } from '../learn/blocks/BlocksStudioPage';

// Teacher read-only LIVE project view (teacher-live-project-view-prd, D-LV-6).
// A teacher opens a kid's CLASS project and watches it render live as the kid's
// STUDIO EDITOR, READ-ONLY — so the teacher sees EXACTLY what the student sees
// while BUILDING (file tree / chat / Monaco / blocks editor), not just the
// running output. The viewer:
//   - loads GET /projects/:id (kind/title/owner) — server-enforced class-scoped
//     (D-LV-5: a 403/404 here means the teacher isn't allowed to see this kid's
//     project);
//   - renders the matching studio with `readOnly` + the projectId — the SAME
//     component the kid uses, with EVERY mutation entry point gated (the studios
//     load their own VFS by projectId);
//   - subscribes to `project.vfs.changed` on the teacher (`user`) socket and
//     REMOUNTS the studio so it re-loads the VFS and re-renders live for all
//     three kinds.
// `creative`/unknown kinds are out of Layer-1 scope → an honest message, no crash.

// The kinds the live viewer renders as the kid's editor. `creative` is the
// artifact gallery (follow-up, D-LV-4); any unknown kind is handled the same
// honest way.
type LiveKind = 'game' | 'code' | 'blocks';

interface LiveProjectMeta {
  id: string;
  title: string;
  kind: string;
  /** Owner kid nickname — the backend returns it for an authorized teacher read. */
  kid_nickname?: string | null;
}

// `project.vfs.changed` (D-LV-3): paths + version only, NEVER file contents (C5).
interface VfsChangedEvent {
  project_id: string;
  kid_id: string;
  kind: LiveKind;
  paths?: string[];
  version?: number;
}

const SUPPORTED_KINDS: readonly LiveKind[] = ['game', 'code', 'blocks'];

function isLiveKind(kind: string): kind is LiveKind {
  return (SUPPORTED_KINDS as readonly string[]).includes(kind);
}

export function TeacherProjectLivePage() {
  const { projectId } = useParams<{ projectId: string }>();

  // Live remount key: bumped on each `project.vfs.changed` for THIS project so the
  // studio remounts and re-loads the kid's latest VFS (the studios load by
  // projectId on mount). Teacher is already in the kid's `class:{id}` room (joined
  // on connect); we filter by project_id.
  const [liveVersion, setLiveVersion] = useState(0);

  const metaQuery = useQuery<LiveProjectMeta>({
    queryKey: ['teacher-live-project', projectId],
    queryFn: () => api<LiveProjectMeta>(`/projects/${projectId}`),
    enabled: !!projectId,
    retry: false, // a 403/404 is a final authz answer, not a flake — don't retry.
  });

  useWsEvent<VfsChangedEvent>(
    'project.vfs.changed',
    (ev) => {
      if (ev.project_id !== projectId) return;
      setLiveVersion((v) => v + 1);
    },
    [projectId],
    'user', // the teacher is a `user` principal — listen on the teacher socket.
  );

  if (metaQuery.isLoading) {
    return <CenterMessage testId="teacher-live-loading">Loading…</CenterMessage>;
  }

  // A 403/404 (class-scope / not-found, server-enforced D-LV-5) → friendly dead end.
  if (metaQuery.isError) {
    const status = metaQuery.error instanceof ApiError ? metaQuery.error.status : undefined;
    return (
      <CenterMessage testId="teacher-live-error">
        {status === 403 || status === 404
          ? "You can't view this project. You can only watch projects from a class you teach."
          : "This project couldn't be loaded. Try again in a moment."}
      </CenterMessage>
    );
  }

  const meta = metaQuery.data!;

  // Full-bleed (breaks out of the TeacherLayout centered container): a slim
  // "watching live" banner over the kid's OWN studio editor, edge to edge — the
  // teacher sees exactly what the student sees, with the live/read-only context
  // on top (Style B). The studio's own Home/back is suppressed in `readOnly`, so
  // the banner's Back is the only navigation.
  return (
    <div data-testid="teacher-live-root" className="fixed inset-0 z-40 flex flex-col bg-canvas">
      <LiveBanner title={meta.title} nickname={meta.kid_nickname ?? undefined} />
      <div className="min-h-0 flex-1 overflow-hidden">
        {!isLiveKind(meta.kind) ? (
          <CenterMessage testId="teacher-live-unsupported">
            Live view isn’t available for this project type yet.
          </CenterMessage>
        ) : (
          <LiveStudio
            // Remount on each live change so the studio re-loads the kid's latest
            // VFS (the studios load by projectId on mount). The projectId is in the
            // key so switching projects also remounts cleanly.
            key={`${projectId}:${liveVersion}`}
            kind={meta.kind}
            projectId={projectId!}
          />
        )}
      </div>
    </div>
  );
}

// Per-kind studio wiring — the SAME component the kid uses, in `readOnly` mode
// (D-LV-6). Every mutation affordance is gated inside the studio; the teacher
// sees the kid's editor exactly.
function LiveStudio({ kind, projectId }: { kind: LiveKind; projectId: string }) {
  if (kind === 'blocks') {
    return <BlocksStudioPage projectId={projectId} readOnly />;
  }
  if (kind === 'code') {
    return <CodeStudioPage projectId={projectId} readOnly />;
  }
  // game
  return <PlaygroundApp projectId={projectId} readOnly />;
}

// Style B: a slim dark "Live · watching <kid>" banner above the kid's own studio
// bar. Carries the only navigation (Back → Student work), the live signal, and the
// read-only state — distinct from the studio's own (read-only) chrome below it.
function LiveBanner({ title, nickname }: { title: string; nickname?: string }) {
  const navigate = useNavigate();
  // The viewer opens in its OWN tab (teacher-console deep-links it via window.open).
  // So "Back" closes this tab to reveal teacher-console behind it. A fresh tab has
  // no in-app history (history.length === 1) — `navigate(-1)` would be a no-op — so
  // we only use it as a fallback when this page WAS reached by in-app navigation.
  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else window.close();
  };
  return (
    <div
      data-testid="teacher-live-banner"
      className="flex shrink-0 items-center gap-3 px-4 py-2 text-white"
      style={{ background: 'linear-gradient(90deg, #2D2A45, #1F1B2D)' }}
    >
      <button
        type="button"
        onClick={handleBack}
        aria-label="Close — back to Student work"
        className="grid h-8 w-8 place-items-center rounded-full text-[16px] transition-colors hover:bg-white/10"
      >
        ←
      </button>
      <span className="h-2 w-2 shrink-0 rounded-full bg-brand-mint animate-pulse" aria-hidden="true" />
      <span className="text-[12px] font-bold uppercase tracking-[0.12em]">Live</span>
      <span className="truncate text-[13px] text-white/90" data-testid="teacher-live-owner">
        You’re watching {nickname ? <b>{nickname}</b> : 'this kid'}’s project
        {title ? <> — <span className="font-semibold">{title}</span></> : null}
      </span>
      <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
        🔒 Read-only
      </span>
    </div>
  );
}

function CenterMessage({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <div
      data-testid={testId}
      className="flex h-full w-full items-center justify-center px-6 text-center text-[15px] text-ink-soft"
    >
      {children}
    </div>
  );
}
