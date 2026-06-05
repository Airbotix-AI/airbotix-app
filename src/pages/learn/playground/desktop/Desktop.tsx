// The playground virtual desktop surface (C5.1). Per virtual-desktop-design.md §4
// and virtual-desktop-mockup.svg: a soft K-12 gradient backdrop, a top-left column
// of shortcut icons, the three floating windows (Code Editor / Game Runner / Share)
// in their reusable <Window> chrome, and the bottom taskbar.
//
// This is purely the surface/composition. Window state (open/focus/z-order/drag)
// lives in the window store; the cross-window drag overlay is handled inside
// <Window> via the store's `interacting` flag — NOT added here.

import { useEffect } from 'react';

import type { VfsFile } from '../../code/codeApi';
import { CodeEditorWindow } from '../windows/CodeEditorWindow';
import { GameRunnerWindow } from '../windows/GameRunnerWindow';
import { ShareWindow } from '../windows/ShareWindow';
import { DesktopIcon } from './DesktopIcon';
import { Taskbar } from './Taskbar';
import { Window } from './Window';
import { WINDOW_CONFIG } from './windowConfig';
import { useWindowStore } from './windowStore';

interface DesktopProps {
  /** The lifted VFS — owned by PlaygroundPage. */
  files: VfsFile[];
  /** Bump forces the Game Runner to re-run. Owned by PlaygroundPage. */
  runKey: number;
  /** Commit edits back to the page-level source of truth. */
  onApplyFiles: (files: VfsFile[]) => void;
  /** Re-run the game (PlaygroundPage bumps runKey). */
  onRun: () => void;
}

export function Desktop({ files, runKey, onApplyFiles, onRun }: DesktopProps) {
  const openOrFocus = useWindowStore((s) => s.openOrFocus);

  // On first load the desktop would otherwise be empty (all windows start
  // closed). Open the game window first, then the code window, so the Code
  // Editor ends up focused/on top — the kid's primary surface.
  useEffect(() => {
    openOrFocus('game');
    openOrFocus('code');
  }, [openOrFocus]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-wash-mint to-wash-sky">
      {/* Top-left shortcut column */}
      <div className="absolute left-4 top-4 z-10 flex flex-col gap-3">
        <DesktopIcon id="code" label={WINDOW_CONFIG.code.title} icon={WINDOW_CONFIG.code.icon} />
        <DesktopIcon id="game" label={WINDOW_CONFIG.game.title} icon={WINDOW_CONFIG.game.icon} />
        <DesktopIcon
          id="share"
          label={WINDOW_CONFIG.share.title}
          icon={WINDOW_CONFIG.share.icon}
        />
      </div>

      {/* Floating windows */}
      <Window id="code" title={WINDOW_CONFIG.code.title} icon={WINDOW_CONFIG.code.icon}>
        <CodeEditorWindow files={files} onApplyFiles={onApplyFiles} onRun={onRun} />
      </Window>

      <Window id="game" title={WINDOW_CONFIG.game.title} icon={WINDOW_CONFIG.game.icon}>
        <GameRunnerWindow files={files} runKey={runKey} onRestart={onRun} />
      </Window>

      <Window id="share" title={WINDOW_CONFIG.share.title} icon={WINDOW_CONFIG.share.icon}>
        <ShareWindow />
      </Window>

      <Taskbar />
    </div>
  );
}
