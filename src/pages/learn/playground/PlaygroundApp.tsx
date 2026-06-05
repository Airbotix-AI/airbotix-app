import { useCallback, useState } from 'react';

import type { VfsFile } from '@/pages/learn/code/codeApi';

import { GeneratingScreen } from './GeneratingScreen';
import { LandingScreen } from './LandingScreen';
import { Workspace } from './Workspace';

type Phase = 'landing' | 'generating' | 'workspace';

export function PlaygroundApp() {
  const [phase, setPhase] = useState<Phase>('landing');
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<VfsFile[]>([]);
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
    <div className="h-screen w-full overflow-hidden bg-ink">
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
          onDone={(f) => {
            setFiles(f);
            setPhase('workspace');
          }}
        />
      )}
      {phase === 'workspace' && (
        <Workspace
          files={files}
          runKey={runKey}
          running={running}
          onApplyFiles={setFiles}
          onRun={run}
        />
      )}
    </div>
  );
}
