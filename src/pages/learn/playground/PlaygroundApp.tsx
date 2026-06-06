import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { GeneratingScreen } from './GeneratingScreen';
import { useHistoryStore } from './historyStore';
import { LandingScreen } from './LandingScreen';
import { usePlaygroundStore } from './playgroundStore';
import { useProjectStore } from './projectStore';
import { Workspace } from './Workspace';

type Phase = 'landing' | 'generating' | 'workspace';

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
