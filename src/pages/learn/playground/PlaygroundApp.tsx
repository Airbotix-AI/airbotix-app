import { useCallback, useState } from 'react';

import type { VfsFile } from '@/pages/learn/code/codeApi';

import { GeneratingScreen } from './GeneratingScreen';
import { LandingScreen } from './LandingScreen';
import { Workspace } from './Workspace';
import { usePlaygroundStore } from './playgroundStore';

type Phase = 'landing' | 'generating' | 'workspace';

export function PlaygroundApp() {
  const [phase, setPhase] = useState<Phase>('landing');
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<VfsFile[]>([]);
  const [runKey, setRunKey] = useState(0);
  // Whether the game has been launched. ▶ Play (editor or runner) sets this so
  // the Game Runner mounts; it also brings the Game Runner window to the front.
  const [running, setRunning] = useState(false);

  const run = useCallback(() => {
    setRunning(true);
    setRunKey((k) => k + 1);
    usePlaygroundStore.getState().openOrFocus('game');
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
