// The Playground workspace shell: a thin top bar (label + LayoutToggle) over the
// mode content, switching between two layouts driven by the store's `layoutMode`:
//
//   - 'window' (default): three floating, draggable <Window>s (Chat / Code /
//     Game) over a dark `bg-ink` surface.
//   - 'split': a fixed horizontal PanelGroup — a left region with a Chat/Code tab
//     strip, a ResizeHandle, and the Game Runner on the right.
//
// Dark-themed throughout (design-system tokens only; no raw hex / Tailwind
// defaults). Matches docs/mockup-workspace.png (State A = window, State B = split).

import { useState } from 'react';
import { Panel, PanelGroup } from 'react-resizable-panels';

import clsx from 'clsx';

import type { VfsFile } from '../code/codeApi';
import { LayoutToggle } from './LayoutToggle';
import { Window } from './desktop/Window';
import { ChatPane } from './panes/ChatPane';
import { CodeEditorPane } from './panes/CodeEditorPane';
import { GameRunnerPane } from './panes/GameRunnerPane';
import { ResizeHandle } from './panes/ResizeHandle';
import { usePlaygroundStore } from './playgroundStore';

interface WorkspaceProps {
  /** The lifted VFS — owned by PlaygroundPage. */
  files: VfsFile[];
  /** Bump (via onRun) forces the Game Runner to re-run. Owned by PlaygroundPage. */
  runKey: number;
  /** Commit edits back to the page-level source of truth. */
  onApplyFiles: (f: VfsFile[]) => void;
  /** Re-run the game (PlaygroundPage bumps runKey). */
  onRun: () => void;
}

type SplitTab = 'chat' | 'code';

const SPLIT_TABS: ReadonlyArray<{ id: SplitTab; label: string }> = [
  { id: 'chat', label: '💬 Chat' },
  { id: 'code', label: '</> Code' },
];

export function Workspace({ files, runKey, onApplyFiles, onRun }: WorkspaceProps) {
  const layoutMode = usePlaygroundStore((s) => s.layoutMode);
  const [splitTab, setSplitTab] = useState<SplitTab>('chat');

  return (
    <div className="flex h-full w-full flex-col bg-ink text-canvas-pure">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-canvas-pure/10 bg-canvas-pure/5 px-3 py-1.5">
        <span className="text-xs font-semibold text-stone2">Playground</span>
        <LayoutToggle />
      </div>

      {/* Mode content */}
      <div className="relative min-h-0 flex-1">
        {layoutMode === 'window' ? (
          <div className="relative h-full w-full bg-ink">
            <Window id="chat" title="Chat" icon="💬">
              <ChatPane files={files} onApplyFiles={onApplyFiles} onRun={onRun} />
            </Window>
            <Window id="code" title="Code Editor" icon="</>">
              <CodeEditorPane files={files} onApplyFiles={onApplyFiles} onRun={onRun} />
            </Window>
            <Window id="game" title="Game Runner" icon="🎮">
              <GameRunnerPane files={files} runKey={runKey} onRestart={onRun} />
            </Window>
          </div>
        ) : (
          <PanelGroup
            direction="horizontal"
            className="h-full min-h-0 bg-ink"
            autoSaveId="pg-workspace-split"
          >
            {/* Left: Chat / Code tab strip + active pane */}
            <Panel defaultSize={67} minSize={30} className="min-w-0">
              <section className="flex h-full min-h-0 flex-col">
                <div
                  role="tablist"
                  aria-label="Editor mode"
                  className="flex shrink-0 items-center gap-0.5 border-b border-canvas-pure/10 bg-canvas-pure/5 px-2 py-1.5"
                >
                  {SPLIT_TABS.map(({ id, label }) => {
                    const active = splitTab === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setSplitTab(id)}
                        className={clsx(
                          'rounded-lg px-3 py-1 text-[13px] leading-none transition-colors',
                          active
                            ? 'bg-canvas-pure/15 font-extrabold text-canvas-pure'
                            : 'font-semibold text-stone2 hover:text-canvas-pure',
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="min-h-0 flex-1">
                  {splitTab === 'chat' ? (
                    <ChatPane files={files} onApplyFiles={onApplyFiles} onRun={onRun} />
                  ) : (
                    <CodeEditorPane files={files} onApplyFiles={onApplyFiles} onRun={onRun} />
                  )}
                </div>
              </section>
            </Panel>

            <ResizeHandle />

            {/* Right: Game Runner */}
            <Panel defaultSize={33} minSize={20} className="min-w-0">
              <GameRunnerPane files={files} runKey={runKey} onRestart={onRun} />
            </Panel>
          </PanelGroup>
        )}
      </div>
    </div>
  );
}
