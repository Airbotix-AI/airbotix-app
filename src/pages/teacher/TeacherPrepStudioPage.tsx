import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ApiError, api } from '@/lib/api';
import { PlaygroundApp } from '../learn/playground/PlaygroundApp';
import { CodeStudioPage } from '../learn/code/CodeStudioPage';
import { BlocksStudioPage } from '../learn/blocks/BlocksStudioPage';
import { createPrepProject, type PrepProjectKind } from './teacherPrepApi';

// Teacher PREP-PROJECT studio (teacher-prep-projects — Stage 2, airbotix-app).
// A teacher opens their OWN prep project and builds/iterates it EDITABLE — with the
// SAME studios a kid uses (PlaygroundApp / CodeStudioPage / BlocksStudioPage), not a
// look-alike. teacher-console deep-links this route in a new tab (Stage 3). The page:
//   - loads GET /projects/:projectId (kind/title) — the backend (Stage 1) authorizes
//     the OWNING teacher to read+write their prep Project and run AI turns (0 Stars);
//     a 403/404 here means this teacher doesn't own the project → friendly dead end;
//   - renders the matching studio EDITABLE (`readOnly={false}`) with `embedded` so the
//     studio's own Home/back link (which routes into `/learn/*` and would bounce a
//     `user` principal) is suppressed — the prep banner carries the only navigation;
//   - is NOT the live viewer: there is no `project.vfs.changed` remount (that's the
//     read-only live viewer's concern) — the teacher is editing, not watching.
// `creative`/unknown kinds are out of scope here → an honest message, no crash.

// The studio kinds the prep editor mounts. `creative` (artifact gallery) has no
// editable studio yet → an honest message, mirroring the live viewer.
type PrepKind = 'game' | 'code' | 'blocks';

interface PrepProjectMeta {
  id: string;
  title: string;
  kind: string;
}

const SUPPORTED_KINDS: readonly PrepKind[] = ['game', 'code', 'blocks'];

function isPrepKind(kind: string): kind is PrepKind {
  return (SUPPORTED_KINDS as readonly string[]).includes(kind);
}

export function TeacherPrepStudioPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();

  // NEW prep (teacher parity with the kid create flows): teacher-console deep-links
  // `/teacher/prep/new?class=<id>&kind=<kind>` and creation happens HERE, in the app —
  // never in teacher-console — so it runs against this tab's freshly-refreshed teacher
  // session (dev shares one localhost refresh cookie across ports; a create fired from
  // teacher-console can race the app's refresh rotation and 401). No project exists yet
  // → skip the meta fetch.
  //   - game  → PROMPT-FIRST: land on the SAME prompt a kid sees; the project is created
  //             when they submit the first prompt (PlaygroundApp, gated by `prepClassId`).
  //   - blocks/code → CREATE-THEN-OPEN: create immediately, then open the studio.
  const isNew = projectId === 'new';
  const prepClassId = searchParams.get('class');
  const newKind = (searchParams.get('kind') ?? 'game') as string;

  const metaQuery = useQuery<PrepProjectMeta>({
    queryKey: ['teacher-prep-project', projectId],
    queryFn: () => api<PrepProjectMeta>(`/projects/${projectId}`),
    enabled: !isNew && !!projectId,
    retry: false, // a 403/404 is a final authz answer, not a flake — don't retry.
  });

  if (isNew) {
    return (
      <div data-testid="teacher-prep-root" className="fixed inset-0 z-40 flex flex-col bg-canvas">
        <PrepBanner title="" />
        <div className="min-h-0 flex-1 overflow-hidden">
          {!prepClassId ? (
            <CenterMessage testId="teacher-prep-new-error">
              This prep link is missing its class. Reopen it from the class page.
            </CenterMessage>
          ) : newKind === 'game' ? (
            <PlaygroundApp projectId="new" embedded prepClassId={prepClassId} />
          ) : newKind === 'blocks' || newKind === 'code' ? (
            <NewPrepStudio classId={prepClassId} kind={newKind} />
          ) : (
            <CenterMessage testId="teacher-prep-unsupported">
              Prep editing isn’t available for this project type yet.
            </CenterMessage>
          )}
        </div>
      </div>
    );
  }

  if (metaQuery.isLoading) {
    return <CenterMessage testId="teacher-prep-loading">Loading…</CenterMessage>;
  }

  // A 403 (not the owning teacher) / 404 (missing) → friendly dead end. The backend
  // is the source of truth for authz (only the prep owner may read+write).
  if (metaQuery.isError) {
    const status = metaQuery.error instanceof ApiError ? metaQuery.error.status : undefined;
    return (
      <CenterMessage testId="teacher-prep-error">
        {status === 403 || status === 404
          ? "You can't open this prep project. You can only edit prep projects you own."
          : "This prep project couldn't be loaded. Try again in a moment."}
      </CenterMessage>
    );
  }

  const meta = metaQuery.data!;

  // Full-bleed (breaks out of the TeacherLayout centered container): a slim
  // "Teacher prep · editable" banner over the SAME studio editor a kid uses, edge
  // to edge — the teacher builds exactly as a student would, with the prep context
  // on top. The studio's own Home/back is suppressed via `embedded`, so the banner's
  // Back is the only navigation.
  return (
    <div data-testid="teacher-prep-root" className="fixed inset-0 z-40 flex flex-col bg-canvas">
      <PrepBanner title={meta.title} />
      <div className="min-h-0 flex-1 overflow-hidden">
        {!isPrepKind(meta.kind) ? (
          <CenterMessage testId="teacher-prep-unsupported">
            Prep editing isn’t available for this project type yet.
          </CenterMessage>
        ) : (
          <PrepStudio kind={meta.kind} projectId={projectId!} />
        )}
      </div>
    </div>
  );
}

// Create-then-open (Blocks / Web Code): create the teacher-owned prep project HERE in
// the app (once), rewrite the URL to /teacher/prep/:id, then mount the real studio on
// the seeded VFS. Game is prompt-first and never reaches this. Creation-in-the-app is
// the same pattern the kid create flow uses and avoids the cross-tab session race.
function NewPrepStudio({ classId, kind }: { classId: string; kind: 'blocks' | 'code' }) {
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Create EXACTLY once. The ref guard (NOT a per-run `alive` flag) is what makes this
  // StrictMode-safe: under StrictMode the effect mounts→cleans up→mounts again, so an
  // `alive=false` set in the first run's cleanup would swallow the (already in-flight,
  // successful) create and leave the UI stuck on "Creating…". We fire once and commit
  // the result whenever it lands; a state set after a real unmount is a harmless no-op.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    createPrepProject(classId, kind as PrepProjectKind)
      .then((project) => {
        // Replace /new with the real id so a reload reopens the created project.
        window.history.replaceState(null, '', `/teacher/prep/${project.id}`);
        setCreatedId(project.id);
      })
      .catch(() => setFailed(true));
  }, [classId, kind]);

  if (failed) {
    return (
      <CenterMessage testId="teacher-prep-new-error">
        We couldn’t start this prep project. Please try again from the class page.
      </CenterMessage>
    );
  }
  if (!createdId) {
    return <CenterMessage testId="teacher-prep-creating">Creating your project…</CenterMessage>;
  }
  return kind === 'blocks' ? (
    <BlocksStudioPage projectId={createdId} embedded />
  ) : (
    <CodeStudioPage projectId={createdId} embedded />
  );
}

// Per-kind studio wiring — the SAME component the kid uses, EDITABLE (`readOnly`
// defaults to false). `embedded` suppresses each studio's own navigation into
// `/learn/*` (page-level Home/back links AND PlaygroundApp's load-error "Back",
// which otherwise routes to `/learn/create`) so a teacher `user` principal is never
// routed there and stranded on `/portal`; the prep banner carries the only Back.
function PrepStudio({ kind, projectId }: { kind: PrepKind; projectId: string }) {
  if (kind === 'blocks') {
    return <BlocksStudioPage projectId={projectId} embedded />;
  }
  if (kind === 'code') {
    return <CodeStudioPage projectId={projectId} embedded />;
  }
  // game
  return <PlaygroundApp projectId={projectId} embedded />;
}

// A slim "Teacher prep · editable" banner above the studio — distinct from the
// read-only live viewer's dark "Live · Read-only" banner (Style B). It signals the
// EDITABLE prep context and carries the only Back.
function PrepBanner({ title }: { title: string }) {
  const navigate = useNavigate();
  // The prep studio opens in its OWN tab (teacher-console deep-links it via
  // window.open). "Back" closes this tab to reveal teacher-console behind it. A
  // fresh tab has no in-app history (history.length === 1), so navigate(-1) would
  // be a no-op — only use it as a fallback when this page was reached in-app.
  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else window.close();
  };
  return (
    <div
      data-testid="teacher-prep-banner"
      className="flex shrink-0 items-center gap-3 border-b border-hairline bg-wash-mint px-4 py-2 text-ink"
    >
      <button
        type="button"
        onClick={handleBack}
        aria-label="Close — back to prep"
        className="grid h-8 w-8 place-items-center rounded-full text-[16px] transition-colors hover:bg-ink/10"
      >
        ←
      </button>
      <span className="text-[12px] font-bold uppercase tracking-[0.12em]">Teacher prep</span>
      <span className="rounded-full bg-canvas-pure px-2.5 py-0.5 text-[11px] font-bold text-ink">
        ✏️ Editable
      </span>
      {title ? (
        <span className="truncate text-[13px] text-ink-soft" data-testid="teacher-prep-title">
          {title}
        </span>
      ) : null}
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
