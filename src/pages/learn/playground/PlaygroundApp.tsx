import { useCallback, useEffect, useState } from 'react';
import { useBlocker, useSearchParams } from 'react-router-dom';

import { GeneratingScreen } from './GeneratingScreen';
import { useHistoryStore } from './historyStore';
import { LandingScreen } from './LandingScreen';
import { usePlaygroundStore } from './playgroundStore';
import { loadProject as loadPersisted, saveProject as savePersisted } from './projectPersistence';
import { type ProjectChange, useProjectStore } from './projectStore';
import { withPreloadedAssets } from './sampleAssets';
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
  const [phase, setPhase] = useState<Phase>('landing');
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

  // Persist the project (VFS + history) to IndexedDB on change, debounced, while
  // in the workspace — so a refresh restores the work (see projectPersistence).
  useEffect(() => {
    if (phase !== 'workspace') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const ps = useProjectStore.getState();
        void savePersisted(persistKey, {
          files: ps.files,
          folders: ps.folders,
          checkpoints: useHistoryStore.getState().checkpoints,
          savedAt: Date.now(),
        });
      }, SAVE_DEBOUNCE_MS);
    };
    const unsubProject = useProjectStore.subscribe(schedule);
    const unsubHistory = useHistoryStore.subscribe(schedule);
    return () => {
      clearTimeout(timer);
      unsubProject();
      unsubHistory();
    };
  }, [phase, persistKey]);

  // Guard against accidentally leaving the studio (the Learn nav now sits above
  // it): block in-app navigation away while in the workspace and confirm first.
  const blocker = useBlocker(phase === 'workspace');

  return (
    <div data-theme={theme} className="h-full min-h-0 w-full overflow-hidden bg-pg-bg">
      {phase === 'landing' && (
        <LandingScreen
          onSubmit={(p) => {
            setPrompt(p);
            setPhase('generating');
          }}
        />
      )}
      {phase === 'generating' && (
        <GeneratingScreen
          prompt={prompt}
          projectId={projectId}
          onDone={async (f) => {
            // Restore a persisted project (survives refresh) if one exists for this
            // key; otherwise open the freshly-resolved files + seed history.
            const persisted = await loadPersisted(persistKey);
            const project = useProjectStore.getState();
            const history = useHistoryStore.getState();
            if (persisted && persisted.files.length > 0) {
              // Always (re)seed the read-only preloaded samples, so they appear
              // even for projects persisted before they existed.
              project.hydrate(withPreloadedAssets(persisted.files), persisted.folders);
              history.hydrate(persisted.checkpoints);
            } else {
              const seeded = withPreloadedAssets(f);
              project.setFiles(seeded);
              history.reset();
              history.record(seeded, Date.now(), 'Initial version');
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
