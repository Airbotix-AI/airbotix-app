import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { GeneratingScreen } from './GeneratingScreen';
import { useHistoryStore } from './historyStore';
import { LandingScreen } from './LandingScreen';
import { usePlaygroundStore } from './playgroundStore';
import { type ProjectChange, useProjectStore } from './projectStore';
import { Workspace } from './Workspace';

type Phase = 'landing' | 'generating' | 'workspace';

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
  const [phase, setPhase] = useState<Phase>('landing');
  const [prompt, setPrompt] = useState('');
  // The VFS lives in the project store (single funnel for editor saves, AI
  // turns, file CRUD, drag moves — and the seam for history + persistence).
  const files = useProjectStore((s) => s.files);
  const loadProject = useProjectStore((s) => s.setFiles);
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
          onDone={(f) => {
            loadProject(f);
            // Seed history with the starting version so the timeline + diffs have
            // a baseline to compare against.
            const history = useHistoryStore.getState();
            history.reset();
            history.record(f, Date.now(), 'Initial version');
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
