import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { GeneratingScreen } from './GeneratingScreen';
import { useHistoryStore } from './historyStore';
import { LandingScreen } from './LandingScreen';
import { usePlaygroundStore } from './playgroundStore';
import { loadProject as loadPersisted, saveProject as savePersisted } from './projectPersistence';
import { type ProjectChange, useProjectStore } from './projectStore';
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

  return (
    <div data-theme={theme} className="h-screen w-full overflow-hidden bg-pg-bg">
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
              project.hydrate(persisted.files, persisted.folders);
              history.hydrate(persisted.checkpoints);
            } else {
              project.setFiles(f);
              history.reset();
              history.record(f, Date.now(), 'Initial version');
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
    </div>
  );
}
