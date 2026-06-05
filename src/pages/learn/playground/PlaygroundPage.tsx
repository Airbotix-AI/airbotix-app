// Top-level Playground page. A resizable two-region split — Code Editor on the
// left (~2/3), Game Runner on the right (~1/3); drag the boundary to resize.
// The Code Editor itself is a 3-column resizable group (file list / editor / AI
// helper). No windows / desktop / taskbar. This page is the single source of
// truth for the in-memory VFS + run state (no backend/auth this iteration).

import { useCallback, useState } from 'react';
import { Panel, PanelGroup } from 'react-resizable-panels';

import type { VfsFile } from '../code/codeApi';
import { CodeEditorPane } from './panes/CodeEditorPane';
import { GameRunnerPane } from './panes/GameRunnerPane';
import { ResizeHandle } from './panes/ResizeHandle';
import { STARTER_GAME } from './starterGame';

export function PlaygroundPage() {
  const [files, setFiles] = useState<VfsFile[]>(STARTER_GAME);
  const [runKey, setRunKey] = useState(0);

  // Bumping `runKey` is how every child asks for a fresh run; the runner keys
  // its iframe off it so a re-run is a clean remount, not a mutation.
  const run = useCallback(() => setRunKey((k) => k + 1), []);

  return (
    <PanelGroup direction="horizontal" className="h-screen w-full bg-ink" autoSaveId="pg-outer">
      <Panel defaultSize={67} minSize={30} className="min-w-0">
        <CodeEditorPane files={files} onApplyFiles={setFiles} onRun={run} />
      </Panel>
      <ResizeHandle />
      <Panel defaultSize={33} minSize={20} className="min-w-0">
        <GameRunnerPane files={files} runKey={runKey} onRestart={run} />
      </Panel>
    </PanelGroup>
  );
}
