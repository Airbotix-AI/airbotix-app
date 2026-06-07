import { AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker, useNavigate, useSearchParams } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';

import { GeneratingScreen } from './GeneratingScreen';
import { createGameProject } from './panes/playgroundApi';
import { useHistoryStore } from './historyStore';
import { LandingScreen } from './LandingScreen';
import { usePlaygroundStore, type PlaygroundSnapshot } from './playgroundStore';
import {
  loadProject as loadPersisted,
  saveProject as savePersisted,
  loadWorkspaceUi,
  saveWorkspaceUi,
  saveThumbnail,
} from './projectPersistence';
import { captureWorkspaceThumbnail } from './workspaceThumbnail';
import { useWorkspaceUiStore } from './workspaceUiStore';
import { type ProjectChange, useProjectStore } from './projectStore';
import { withPreloadedAssets } from './sampleAssets';
import { useSaveStatusStore } from './saveStatusStore';
import { Workspace } from './Workspace';

type Phase = 'landing' | 'generating' | 'workspace';

/** Debounce window (ms) for persisting the project after a change. */
const SAVE_DEBOUNCE_MS = 600;

const base = (p: string) => p.split('/').pop() || p;

/** History label for a file-tree mutation (create/rename/move/delete). */
function changeSummary(c: ProjectChange): string | undefined {
  if (c.kind === 'create-file' && c.added.length) return `created ${base(c.added[0])}`;
  if (c.kind === 'remove' && c.removed.length)
    return `deleted ${base(c.removed[0])}${c.removed.length > 1 ? ` +${c.removed.length - 1}` : ''}`;
  if (c.kind === 'rename' && c.remaps.length) return `renamed ${base(c.remaps[0].from)} → ${base(c.remaps[0].to)}`;
  if (c.kind === 'move' && c.remaps.length) return `moved ${base(c.remaps[0].from)}`;
  return undefined;
}

interface PlaygroundAppProps {
  /**
   * The backend project whose files to open (its VFS is loaded from the
   * S3-backed backend). Supplied by the authed `/learn/playground/:projectId`
   * route once it exists; in the DEV sandbox it's read from a `?projectId`
   * query param if present, else absent → the local starter scaffold is used.
   */
  projectId?: string;
}

export function PlaygroundApp({ projectId: projectIdProp }: PlaygroundAppProps = {}) {
  // The whole playground (all phases) themes from this one `data-theme` root.
  const theme = usePlaygroundStore((s) => s.theme);
  // Highest window z-index — floating windows climb past any static z-index as the
  // kid focuses them, so the leave dialog reads it to always sit on top.
  const topZ = usePlaygroundStore((s) => s.topZ);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;
  // The hub starts a NEW game with the sentinel id `new`, so the studio opens
  // PROMPT-FIRST on the landing screen (the 3-phase flow). The real `kind='game'`
  // project is created on prompt SUBMIT (below), not on the hub click — otherwise
  // a kid who backs out at the prompt would orphan an empty project.
  const isNew = projectIdProp === 'new';
  // The real owned project id once known: the route param, or the id created on
  // submit. `undefined` for a new-but-not-yet-created game and the DEV sandbox.
  const [createdId, setCreatedId] = useState<string | undefined>(undefined);
  const ownedProjectId = createdId ?? (isNew ? undefined : projectIdProp);
  const projectId = ownedProjectId ?? searchParams.get('projectId') ?? undefined;
  // Persistence key: the real project, or a fixed key for the DEV sandbox.
  const persistKey = projectId ?? 'dev-sandbox';
  // A real owned route project (re)opens straight into loading its seeded VFS; a
  // NEW game and the DEV sandbox start on the landing prompt.
  const [phase, setPhase] = useState<Phase>(projectIdProp && !isNew ? 'generating' : 'landing');
  const [prompt, setPrompt] = useState('');
  // The VFS lives in the project store (single funnel for editor saves, AI
  // turns, file CRUD, drag moves — and the seam for history + persistence).
  const files = useProjectStore((s) => s.files);
  const applyFiles = useProjectStore((s) => s.apply);
  const [runKey, setRunKey] = useState(0);
  // Whether the game has been launched. ▶ Play (editor or runner) and AI turns
  // set this so the Game Runner mounts. Bringing the runner window to the FRONT
  // is done only for the editor's ▶ Play (in Workspace) — NOT for chat turns.
  const [running, setRunning] = useState(false);
  const setSaveStatus = useSaveStatusStore((s) => s.set);
  // The server save version we last reconciled against (PRD J3, last-write-wins).
  // A ref so the debounced save reads the latest without re-subscribing.
  const versionRef = useRef(0);
  // Wraps the workspace so we can snapshot it (chrome + game) for the Projects
  // thumbnail when the kid leaves. Excludes the leave dialog (a sibling below).
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  // A real project couldn't be opened (load failed / create failed). The backend
  // is the source of truth — there's no scaffold fallback — so we show an error
  // and the kid heads back to project creation.
  const [loadError, setLoadError] = useState(false);

  const run = useCallback(() => {
    setRunning(true);
    setRunKey((k) => k + 1);
  }, []);

  // Record file-tree operations (create/rename/move/delete) in history. Typing is
  // snapshotted by the editor's idle autosave; this covers structural changes so
  // they're in the timeline and revertable too.
  useEffect(() => {
    return useProjectStore.subscribe((state) => {
      const c = state.change;
      if (!c) return;
      if (c.kind === 'create-file' || c.kind === 'rename' || c.kind === 'move' || c.kind === 'remove') {
        useHistoryStore.getState().record(state.files, Date.now(), changeSummary(c));
      }
    });
  }, []);

  // Persist the project (VFS + history) on change, debounced, while in the
  // workspace. The backend is the source of truth (PRD J3): we PUT the VFS and
  // show a visible save status; IndexedDB is the offline cache/outbox. On a
  // stale-version save the server's newer copy wins and the kid's superseded
  // build drops into History so it stays recoverable (never the word "conflict").
  useEffect(() => {
    if (phase !== 'workspace') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      setSaveStatus('saving');
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const ps = useProjectStore.getState();
        const result = await savePersisted(
          persistKey,
          {
            files: ps.files,
            folders: ps.folders,
            checkpoints: useHistoryStore.getState().checkpoints,
            savedAt: Date.now(),
            version: versionRef.current,
          },
          projectId,
        );
        if (result.status === 'saved') {
          versionRef.current = result.version;
          setSaveStatus('saved');
        } else if (result.status === 'queued') {
          setSaveStatus('queued');
        } else {
          // kept-newest: adopt the server's snapshot, record the superseded build
          // in History (recoverable), and reassure the kid we kept their newest.
          versionRef.current = result.server.version;
          useHistoryStore
            .getState()
            .record(result.superseded, Date.now(), 'Your earlier copy (we kept your newest)');
          useProjectStore.getState().apply(withPreloadedAssets(result.server.files));
          setSaveStatus('kept-newest');
        }
      }, SAVE_DEBOUNCE_MS);
    };
    const unsubProject = useProjectStore.subscribe(schedule);
    const unsubHistory = useHistoryStore.subscribe(schedule);
    return () => {
      clearTimeout(timer);
      unsubProject();
      unsubHistory();
    };
  }, [phase, persistKey, projectId, setSaveStatus]);

  // Persist the workspace UI ("resume where I left off") — debounced, while in the
  // workspace. Single place: snapshot the whole namespaced bag + the playground
  // store's slice. FUTURE-PROOF — any new pane that registers a slice via
  // `usePersistedWorkspaceState` is captured here automatically, no edits needed.
  useEffect(() => {
    if (phase !== 'workspace' || !projectId) return; // DEV sandbox is transient
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const blob = useWorkspaceUiStore.getState().snapshot();
        const ps = usePlaygroundStore.getState();
        blob.slices.playground = {
          theme: ps.theme,
          layoutMode: ps.layoutMode,
          windows: ps.windows,
          topZ: ps.topZ,
        };
        void saveWorkspaceUi(persistKey, blob);
      }, SAVE_DEBOUNCE_MS);
    };
    schedule(); // capture the initial layout on entry
    const unsubUi = useWorkspaceUiStore.subscribe(schedule);
    const unsubPg = usePlaygroundStore.subscribe(schedule);
    return () => {
      clearTimeout(timer);
      unsubUi();
      unsubPg();
    };
  }, [phase, persistKey, projectId]);

  // Guard against accidentally leaving the studio (the Learn nav now sits above
  // it): block in-app navigation away while in the workspace and confirm first.
  const blocker = useBlocker(phase === 'workspace');

  // Capture a workspace thumbnail (real projects only — the dev sandbox is
  // transient), persist it locally, then leave. Best-effort: never blocks exit.
  const handleLeave = useCallback(async () => {
    if (projectId && workspaceRef.current) {
      setLeaving(true);
      try {
        const dataUrl = await captureWorkspaceThumbnail(workspaceRef.current);
        if (dataUrl) await saveThumbnail(projectId, dataUrl);
      } catch {
        // Thumbnail is best-effort; leaving must not depend on it.
      }
    }
    blocker.proceed?.();
  }, [projectId, blocker]);

  return (
    <div data-theme={theme} className="h-full min-h-0 w-full overflow-hidden bg-pg-bg">
      {loadError ? (
        <LoadErrorScreen onBack={() => navigate('/learn/create')} />
      ) : (
        <>
      {phase === 'landing' && (
        <LandingScreen
          onSubmit={async (p) => {
            setPrompt(p);
            // For a NEW game, create the real backend `kind='game'` project now —
            // AFTER the prompt — then load it. The **prompt is the project name**
            // (capped to a sensible length). Falls back to a throwaway local
            // scaffold if the backend isn't ready, so the studio still opens.
            if (isNew && !createdId) {
              try {
                const game = await createGameProject({
                  kidId,
                  familyId,
                  title: p.trim().slice(0, 80) || 'My game',
                  template: 'phaser_blank',
                });
                setCreatedId(game.id);
                window.history.replaceState(null, '', `/learn/playground/${game.id}`);
              } catch {
                // Can't create the project on the backend → no local fallback;
                // show the error and send the kid back to project creation.
                setLoadError(true);
                return;
              }
            }
            setPhase('generating');
          }}
        />
      )}
      {phase === 'generating' && (
        <GeneratingScreen
          prompt={prompt}
          projectId={projectId}
          onDone={async (f) => {
            // Load the project (PRD J9): for a REAL project the backend is the
            // source of truth — `loadPersisted` reads its saved versioned VFS (and
            // falls back to the offline cache); for the DEV sandbox it's the cache.
            // `f` (from GeneratingScreen) is the scaffold fallback when neither
            // exists. Restoring the saved VFS means a reload never reopens the
            // scaffold.
            const persisted = await loadPersisted(persistKey, projectId);
            const project = useProjectStore.getState();
            const history = useHistoryStore.getState();
            if (persisted && persisted.files.length > 0) {
              versionRef.current = persisted.version;
              // Always (re)seed the read-only preloaded samples, so they appear
              // even for projects persisted before they existed.
              project.hydrate(withPreloadedAssets(persisted.files), persisted.folders);
              if (persisted.checkpoints.length > 0) {
                history.hydrate(persisted.checkpoints);
              } else {
                history.reset();
                history.record(persisted.files, Date.now(), 'Initial version');
              }
              setSaveStatus('saved');
            } else {
              versionRef.current = 0;
              const seeded = withPreloadedAssets(f);
              project.setFiles(seeded);
              history.reset();
              history.record(seeded, Date.now(), 'Initial version');
              setSaveStatus('idle');
            }
            // Restore the saved workspace UI (open tabs, sidebar, layout mode,
            // window positions/status, asset + runner selections, theme) so the
            // studio reopens exactly where the kid left it. MUST run before the
            // workspace (and its panes) mount so their persisted slices seed. Only
            // for a REAL project (resume); the DEV sandbox is transient → reset to
            // defaults and never persist, so each session/e2e starts clean.
            if (projectId) {
              const ui = await loadWorkspaceUi(persistKey);
              useWorkspaceUiStore.getState().restore(ui);
              const pg = ui?.slices?.playground as PlaygroundSnapshot | undefined;
              if (pg) usePlaygroundStore.getState().restore(pg);
            } else {
              useWorkspaceUiStore.getState().restore(null);
            }
            setPhase('workspace');
          }}
          onError={() => setLoadError(true)}
        />
      )}
      {phase === 'workspace' && (
        <div ref={workspaceRef} className="h-full min-h-0 w-full">
        <Workspace
          files={files}
          runKey={runKey}
          running={running}
          onApplyFiles={applyFiles}
          onRun={run}
          prompt={prompt}
          // Only a real OWNED project (the authed route param, or the id created
          // on submit) runs server-side AI turns. The DEV sandbox — even when a
          // `?projectId` query selects a VFS fixture for the runner — keeps the
          // offline stub turn so the debug/warn specs stay deterministic and
          // LLM-free.
          projectId={ownedProjectId}
        />
        </div>
      )}

      {blocker.state === 'blocked' && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 p-4"
          style={{ zIndex: topZ + 100 }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-pg-border bg-pg-surface p-5 text-pg-text shadow-2xl"
          >
            <h2 className="text-[17px] font-extrabold text-pg-text">Leave the game studio?</h2>
            <p className="mt-2 text-[13.5px] text-pg-text-dim">
              Your game is saved on this device, so it&apos;ll be here when you come back — but
              you&apos;ll leave the editor now.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                disabled={leaving}
                onClick={() => blocker.reset?.()}
                className="rounded-lg border border-pg-border px-4 py-2 text-[13px] font-bold transition-colors hover:bg-pg-text/5 disabled:opacity-50"
              >
                Keep building
              </button>
              <button
                type="button"
                disabled={leaving}
                onClick={handleLeave}
                className="rounded-lg bg-brand-coral px-4 py-2 text-[13px] font-extrabold text-white disabled:opacity-70"
              >
                {leaving ? 'Saving…' : 'Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

// Shown when a real project can't be opened — the backend is the source of truth
// and there is no scaffold fallback, so the kid heads back to project creation.
function LoadErrorScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="pg-canvas flex h-full flex-col items-center justify-center gap-5 px-6 text-center text-pg-text">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-wash-coral text-brand-coral">
        <AlertTriangle size={30} />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-[20px] font-extrabold">We couldn&apos;t open this game</h1>
        <p className="max-w-sm text-[14px] text-pg-text-dim">
          It may have been removed, or there was a problem loading it. Let&apos;s head back so
          you can make or pick another one.
        </p>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="rounded-xl bg-brand-coral px-5 py-2.5 text-[14px] font-extrabold text-white"
      >
        Make something new
      </button>
    </div>
  );
}
