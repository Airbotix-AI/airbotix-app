// Top-level Playground page. A permanent two-pane split — Code Editor on the
// left 2/3, Game Runner on the right 1/3, filling the screen. No windows /
// desktop / taskbar: the panes are fixed. This page is the single source of
// truth for the in-memory VFS + run state (no backend/auth this iteration).

import { useCallback, useState } from 'react';

import type { VfsFile } from '../code/codeApi';
import { CodeEditorPane } from './panes/CodeEditorPane';
import { GameRunnerPane } from './panes/GameRunnerPane';
import { STARTER_GAME } from './starterGame';

export function PlaygroundPage() {
  const [files, setFiles] = useState<VfsFile[]>(STARTER_GAME);
  const [runKey, setRunKey] = useState(0);

  // Bumping `runKey` is how every child asks for a fresh run; the runner keys
  // its iframe off it so a re-run is a clean remount, not a mutation.
  const run = useCallback(() => setRunKey((k) => k + 1), []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-ink">
      {/* Left 2/3 — Code Editor */}
      <div className="min-w-0 flex-[2]">
        <CodeEditorPane files={files} onApplyFiles={setFiles} onRun={run} />
      </div>
      {/* Right 1/3 — Game Runner */}
      <div className="min-w-0 flex-1">
        <GameRunnerPane files={files} runKey={runKey} onRestart={run} />
      </div>
    </div>
  );
}
