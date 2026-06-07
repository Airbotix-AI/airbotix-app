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

import { useEffect, useRef, useState } from 'react';
import { Panel, PanelGroup } from 'react-resizable-panels';
import { useQuery } from '@tanstack/react-query';

import clsx from 'clsx';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import type { VfsFile } from '../code/codeApi';
import { DesktopIcon } from './desktop/DesktopIcon';
import { Taskbar } from './desktop/Taskbar';
import { Window } from './desktop/Window';
import { WINDOW_META } from './desktop/windowMeta';
import { AssetViewerPane } from './panes/AssetViewerPane';
import { ChatPane } from './panes/ChatPane';
import { CodeEditorPane } from './panes/CodeEditorPane';
import { GameRunnerPane } from './panes/GameRunnerPane';
import { ResizeHandle } from './panes/ResizeHandle';
import { useGameAgent } from './panes/useGameAgent';
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
  /** The kid's landing-screen prompt — seeds the launch hand-off chat message. */
  prompt: string;
  /**
   * The real backend project. When set, AI turns run server-side (Stars-metered,
   * streamed, plan/approve-gated, PRD J2); when absent (DEV sandbox) the offline
   * stub turn runs behind the same UI.
   */
  projectId?: string;
}

interface Wallet {
  stars_balance: number;
}

type SplitTab = 'chat' | 'code' | 'assets';

// Tab id → short label; the icon comes from WINDOW_META so it matches the rest
// of the UI (lucide MessageSquare / Code2 / Images), not an emoji glyph.
const SPLIT_TABS: ReadonlyArray<{ id: SplitTab; label: string }> = [
  { id: 'chat', label: 'Chat' },
  { id: 'code', label: 'Code' },
  { id: 'assets', label: 'Assets' },
];

export function Workspace({ files, runKey, running, onApplyFiles, onRun, prompt, projectId }: WorkspaceProps) {
  const layoutMode = usePlaygroundStore((s) => s.layoutMode);
  const [splitTab, setSplitTab] = useState<SplitTab>('chat');

  // Age-derived tier (OD-1): Lite 8–11 (agency beat) / Pro 12–17 (plan→approve).
  // Default Lite when age is unknown (the safest, simplest UX).
  const me = useMe();
  const age = me.data?.kind === 'kid' ? (me.data.age ?? null) : null;
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;
  const mode: 'lite' | 'pro' = age != null && age >= 12 ? 'pro' : 'lite';

  // Family Stars balance for the metered display (real path). Refetched after a
  // turn debits (OD-3 "meter every turn").
  const wallet = useQuery<Wallet>({
    queryKey: ['wallet', familyId],
    queryFn: () => api<Wallet>(`/families/${familyId}/wallet`),
    enabled: !!familyId && !!projectId,
  });
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

  // Own the chat state HERE (not in ChatPane) so the history survives toggling
  // between Window and Split layouts — the panes remount across modes, this
  // component does not. Chat applies edits to the VFS but never runs the game.
  const { chat, busy, error, offline, pending, balance, canUndo, send, confirmPending, cancelPending, undo } =
    useGameAgent({
      files,
      onApplyFiles,
      introPrompt: prompt,
      projectId,
      mode,
      balance: wallet.data?.stars_balance,
      onStarsCharged: () => wallet.refetch(),
    });

  // "See code" CTA → surface the Code Editor (open/focus it in window mode, or
  // switch the split tab). "Run game" reuses runFromEditor (run + focus runner).
  const handleSeeCode = () => {
    if (layoutMode === 'window') usePlaygroundStore.getState().openOrFocus('code');
    else setSplitTab('code');
  };
  const chatProps = {
    chat,
    busy,
    error,
    offline,
    balance,
    pending,
    canUndo,
    onSend: send,
    onConfirm: confirmPending,
    onCancel: cancelPending,
    onUndo: undo,
    onRunGame: runFromEditor,
    onSeeCode: handleSeeCode,
  };

  // A request from the runner console to open a file at a line (jump-to-error).
  // The Code Editor pane reacts to it; the monotonic nonce makes a repeat click
  // on the same file:line re-fire (a new object identity each time).
  const [locationRequest, setLocationRequest] = useState<{
    file: string;
    line: number;
    nonce: number;
  } | null>(null);
  const jumpNonce = useRef(0);
  const handleOpenLocation = (file: string, line: number) => {
    setLocationRequest({ file, line, nonce: (jumpNonce.current += 1) });
    // Bring the editor forward so the kid sees the jump.
    if (layoutMode === 'window') usePlaygroundStore.getState().openOrFocus('code');
    else setSplitTab('code');
  };

  // "Ask AI to fix" on a console error → send the error to the chat agent and
  // surface the chat. (The agent turn is still the local stub, but the UX path
  // is real.)
  const handleAskFix = (message: string) => {
    send(message);
    if (layoutMode === 'window') usePlaygroundStore.getState().openOrFocus('chat');
    else setSplitTab('chat');
  };

  // Keep window rects inside the actual desktop surface (default rects are seeded
  // from window.innerHeight and over-shoot under the Learn nav). Clamping BEFORE a
  // window opens from chat means it mounts already-fitted (Window's react-rnd
  // `default` only reads the rect on first mount).
  const surfaceRef = useRef<HTMLDivElement>(null);
  const fitWindows = usePlaygroundStore((s) => s.fitWindows);
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return undefined;
    fitWindows(el.clientWidth, el.clientHeight);
    const ro = new ResizeObserver(() => fitWindows(el.clientWidth, el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitWindows, layoutMode]);

  if (layoutMode === 'window') {
    return (
      <div className="flex h-full w-full flex-col bg-pg-bg text-pg-text">
        {/* Desktop surface — the maximized window fills this, above the taskbar. */}
        <div ref={surfaceRef} className="pg-desktop-bg relative min-h-0 flex-1 overflow-hidden">
          {/* Left-edge shortcut column */}
          {/* Desktop icons are the bottom layer — windows (zIndex ≥ 1) sit above. */}
          <div className="absolute left-4 top-4 z-0 flex flex-col gap-3">
            <DesktopIcon id="chat" />
            <DesktopIcon id="code" />
            <DesktopIcon id="game" />
            <DesktopIcon id="assets" />
          </div>

          {/* Floating windows */}
          <Window
            id="code"
            title={WINDOW_META.code.title}
            icon={<WINDOW_META.code.Icon size={16} />}
          >
            <CodeEditorPane
              files={files}
              onApplyFiles={onApplyFiles}
              onRun={runFromEditor}
              openLocation={locationRequest}
            />
          </Window>
          <Window
            id="chat"
            title={WINDOW_META.chat.title}
            icon={<WINDOW_META.chat.Icon size={16} />}
          >
            <ChatPane {...chatProps} />
          </Window>
          <Window
            id="game"
            variant="game"
            title={WINDOW_META.game.title}
            icon={<WINDOW_META.game.Icon size={16} />}
          >
            <GameRunnerPane
              files={files}
              runKey={runKey}
              running={running}
              onRun={onRun}
              onOpenLocation={handleOpenLocation}
              onAskFix={handleAskFix}
            />
          </Window>
          <Window
            id="assets"
            title={WINDOW_META.assets.title}
            icon={<WINDOW_META.assets.Icon size={16} />}
          >
            <AssetViewerPane files={files} />
          </Window>
        </div>

        {/* Docked taskbar (brand + LayoutToggle + window buttons) */}
        <Taskbar />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-pg-bg text-pg-text">
      {/* Split: horizontal PanelGroup, above the docked taskbar */}
      <div className="relative min-h-0 flex-1">
        <PanelGroup
          direction="horizontal"
          className="h-full min-h-0 bg-pg-bg"
          autoSaveId="pg-workspace-split"
        >
          {/* Left: Chat / Code tab strip + active pane */}
          <Panel defaultSize={67} minSize={30} className="min-w-0">
            <section className="flex h-full min-h-0 flex-col">
              <div
                role="tablist"
                aria-label="Editor mode"
                className="flex shrink-0 items-center gap-0.5 border-b border-pg-border bg-pg-text/5 px-2 py-1.5"
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
                          ? 'bg-pg-text/15 font-extrabold text-pg-text'
                          : 'font-semibold text-pg-text-dim hover:text-pg-text',
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
                  <ChatPane {...chatProps} />
                ) : splitTab === 'code' ? (
                  <CodeEditorPane
                    files={files}
                    onApplyFiles={onApplyFiles}
                    onRun={runFromEditor}
                    openLocation={locationRequest}
                  />
                ) : (
                  <AssetViewerPane files={files} />
                )}
              </div>
            </section>
          </Panel>

          <ResizeHandle />

          {/* Right: Game Runner */}
          <Panel defaultSize={33} minSize={20} className="min-w-0">
            <GameRunnerPane
              files={files}
              runKey={runKey}
              running={running}
              onRun={onRun}
              onOpenLocation={handleOpenLocation}
              onAskFix={handleAskFix}
            />
          </Panel>
        </PanelGroup>
      </div>

      {/* Docked taskbar (brand + LayoutToggle); per-window buttons hidden in split mode */}
      <Taskbar />
    </div>
  );
}
