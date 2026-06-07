import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker, useSearchParams } from 'react-router-dom';

import { GeneratingScreen } from './GeneratingScreen';
import { useHistoryStore } from './historyStore';
import { LandingScreen } from './LandingScreen';
import { usePlaygroundStore } from './playgroundStore';
import { loadProject as loadPersisted, saveProject as savePersisted } from './projectPersistence';
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
  const [searchParams] = useSearchParams();
  const projectId = projectIdProp ?? searchParams.get('projectId') ?? undefined;
  // Persistence key: the real project, or a fixed key for the DEV sandbox.
  const persistKey = projectId ?? 'dev-sandbox';
  // When the studio opens on a REAL backend project (the authed
  // `/learn/playground/:projectId` route, PRD J1), skip the landing prompt and go
  // straight to loading its seeded VFS — the kid already named + created it on the
  // hub. The DEV sandbox (no route project) still starts at the landing entry.
  const [phase, setPhase] = useState<Phase>(projectIdProp ? 'generating' : 'landing');
  const [prompt, setPrompt] = useState('');
  // The kid-chosen game name (PRD J1). For a real backend game project it's set
  // at create; on the landing path it labels this session's build.
  const [name, setName] = useState('');
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

  // Guard against accidentally leaving the studio (the Learn nav now sits above
  // it): block in-app navigation away while in the workspace and confirm first.
  const blocker = useBlocker(phase === 'workspace');

  return (
    <div data-theme={theme} className="h-full min-h-0 w-full overflow-hidden bg-pg-bg">
      {phase === 'landing' && (
        <LandingScreen
          onSubmit={(p, gameName) => {
            setPrompt(p);
            setName(gameName ?? '');
            setPhase('generating');
          }}
        />
      )}
      {phase === 'generating' && (
        <GeneratingScreen
          prompt={prompt}
          name={name}
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
            setPhase('workspace');
          }}
        />
      )}
      {phase === 'workspace' && (
        <Workspace
          files={files}
          runKey={runKey}
          running={running}
          onApplyFiles={applyFiles}
          onRun={run}
          prompt={prompt}
          // Only the AUTHED studio route (a real owned project, passed as a prop)
          // runs server-side AI turns. The DEV sandbox — even when a `?projectId`
          // query selects a VFS fixture for the runner — keeps the offline stub
          // turn so the debug/warn specs stay deterministic and LLM-free.
          projectId={projectIdProp}
        />
      )}

      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-pg-border bg-pg-surface p-5 text-pg-text shadow-2xl"
          >
            <h2 className="text-[17px] font-extrabold">Leave the game studio?</h2>
            <p className="mt-2 text-[13.5px] text-pg-text-dim">
              Your game is saved on this device, so it&apos;ll be here when you come back — but
              you&apos;ll leave the editor now.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => blocker.reset?.()}
                className="rounded-lg border border-pg-border px-4 py-2 text-[13px] font-bold transition-colors hover:bg-pg-text/5"
              >
                Keep building
              </button>
              <button
                type="button"
                onClick={() => blocker.proceed?.()}
                className="rounded-lg bg-brand-coral px-4 py-2 text-[13px] font-extrabold text-white"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
