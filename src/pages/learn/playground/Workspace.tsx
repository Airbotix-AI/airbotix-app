// The Playground workspace shell, in one of two layout modes driven by the
// store's `layoutMode`:
//
//   - 'window' (default): a full-height desktop — a dark surface holding the
//     left-edge <DesktopIcon> column + three draggable <Window>s (Code / Chat /
//     Game), with a <Taskbar> docked below it. The maximized window fills the
//     surface only (above the taskbar), so the surface is its own flex child.
//   - 'split': a horizontal PanelGroup — a left region with a Chat/Code tab
//     strip, a ResizeHandle, and the Game Runner on the right — over the same
//     <Taskbar> docked below (the Taskbar hides the per-window buttons in split
//     mode and just holds the brand + LayoutToggle).
//
// Dark-themed throughout (design-system tokens only; no raw hex / Tailwind
// defaults beyond the desktop bg). Matches docs/mockup-workspace-v2.png.

import { useState } from 'react';
import { Panel, PanelGroup } from 'react-resizable-panels';

import clsx from 'clsx';

import type { VfsFile } from '../code/codeApi';
import { DesktopIcon } from './desktop/DesktopIcon';
import { Taskbar } from './desktop/Taskbar';
import { Window } from './desktop/Window';
import { WINDOW_META } from './desktop/windowMeta';
import { ChatPane } from './panes/ChatPane';
import { CodeEditorPane } from './panes/CodeEditorPane';
import { GameRunnerPane } from './panes/GameRunnerPane';
import { ResizeHandle } from './panes/ResizeHandle';
import { usePlaygroundStore } from './playgroundStore';

interface WorkspaceProps {
  /** The lifted VFS — owned by PlaygroundApp. */
  files: VfsFile[];
  /** Bump (via onRun) forces the Game Runner to re-run. Owned by PlaygroundApp. */
  runKey: number;
  /** Whether the game is currently running. Owned by PlaygroundApp. */
  running: boolean;
  /** Commit edits back to the page-level source of truth. */
  onApplyFiles: (f: VfsFile[]) => void;
  /** Re-run the game (PlaygroundApp bumps runKey). */
  onRun: () => void;
}

type SplitTab = 'chat' | 'code';

// Tab id → short label; the icon comes from WINDOW_META so it matches the rest
// of the UI (lucide MessageSquare / Code2), not an emoji glyph.
const SPLIT_TABS: ReadonlyArray<{ id: SplitTab; label: string }> = [
  { id: 'chat', label: 'Chat' },
  { id: 'code', label: 'Code' },
];

export function Workspace({ files, runKey, running, onApplyFiles, onRun }: WorkspaceProps) {
  const layoutMode = usePlaygroundStore((s) => s.layoutMode);
  const [splitTab, setSplitTab] = useState<SplitTab>('chat');
  // Default window placement (Code lower-left & wide, Chat center-top & front,
  // Game right) is seeded in the store from the viewport — `Window` is an
  // uncontrolled react-rnd, so the rects must be set before mount.

  // The editor's ▶ Play runs AND brings the Game Runner window to the front (in
  // window mode). Chat turns and the runner's own Play use plain `onRun`, so a
  // chat message never steals focus to the Game Runner.
  const runFromEditor = () => {
    onRun();
    if (layoutMode === 'window') usePlaygroundStore.getState().openOrFocus('game');
  };

  if (layoutMode === 'window') {
    return (
      <div className="flex h-full w-full flex-col bg-ink text-canvas-pure">
        {/* Desktop surface — the maximized window fills this, above the taskbar. */}
        <div className="relative min-h-0 flex-1 overflow-hidden bg-[#0E0B16]">
          {/* Left-edge shortcut column */}
          {/* Desktop icons are the bottom layer — windows (zIndex ≥ 1) sit above. */}
          <div className="absolute left-4 top-4 z-0 flex flex-col gap-3">
            <DesktopIcon id="chat" />
            <DesktopIcon id="code" />
            <DesktopIcon id="game" />
          </div>

          {/* Floating windows */}
          <Window
            id="code"
            title={WINDOW_META.code.title}
            icon={<WINDOW_META.code.Icon size={16} />}
          >
            <CodeEditorPane files={files} onApplyFiles={onApplyFiles} onRun={runFromEditor} />
          </Window>
          <Window
            id="chat"
            title={WINDOW_META.chat.title}
            icon={<WINDOW_META.chat.Icon size={16} />}
          >
            <ChatPane files={files} onApplyFiles={onApplyFiles} onRun={onRun} />
          </Window>
          <Window
            id="game"
            title={WINDOW_META.game.title}
            icon={<WINDOW_META.game.Icon size={16} />}
          >
            <GameRunnerPane files={files} runKey={runKey} running={running} onRun={onRun} />
          </Window>
        </div>

        {/* Docked taskbar (brand + LayoutToggle + window buttons) */}
        <Taskbar />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-ink text-canvas-pure">
      {/* Split: horizontal PanelGroup, above the docked taskbar */}
      <div className="relative min-h-0 flex-1">
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
                  const Icon = WINDOW_META[id].Icon;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSplitTab(id)}
                      className={clsx(
                        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[13px] leading-none transition-colors',
                        active
                          ? 'bg-canvas-pure/15 font-extrabold text-canvas-pure'
                          : 'font-semibold text-stone2 hover:text-canvas-pure',
                      )}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="min-h-0 flex-1">
                {splitTab === 'chat' ? (
                  <ChatPane files={files} onApplyFiles={onApplyFiles} onRun={onRun} />
                ) : (
                  <CodeEditorPane files={files} onApplyFiles={onApplyFiles} onRun={runFromEditor} />
                )}
              </div>
            </section>
          </Panel>

          <ResizeHandle />

          {/* Right: Game Runner */}
          <Panel defaultSize={33} minSize={20} className="min-w-0">
            <GameRunnerPane files={files} runKey={runKey} running={running} onRun={onRun} />
          </Panel>
        </PanelGroup>
      </div>

      {/* Docked taskbar (brand + LayoutToggle); per-window buttons hidden in split mode */}
      <Taskbar />
    </div>
  );
}
