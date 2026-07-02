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

import { useCallback, useEffect, useRef, useState } from 'react';
import { Panel, PanelGroup } from 'react-resizable-panels';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import clsx from 'clsx';

import { useMe } from '@/auth/useAuth';
import { useDemoMode } from '@/pages/try/demoMode';
import { listClasses } from '@/pages/learn/classroom/classroomApi';
import { api } from '@/lib/api';
import { uploadChatImage } from '../code/codeApi';
import type { LearningContext, VfsFile } from '../code/codeApi';
import type { SaveResult } from './projectPersistence';
import { DesktopIcon } from './desktop/DesktopIcon';
import { Taskbar } from './desktop/Taskbar';
import { Window } from './desktop/Window';
import { WINDOW_META } from './desktop/windowMeta';
import { useWsEvent } from '@/lib/useWsEvent';
import { AssetViewerPane } from './panes/AssetViewerPane';
import { listClassAssets } from './panes/playgroundApi';
import { ChatPane } from './panes/ChatPane';
import { CodeEditorPane } from './panes/CodeEditorPane';
import { buildExplainPrompt } from './panes/explainPrompt';
import { GameRunnerPane } from './panes/GameRunnerPane';
import type { GameEngine } from './buildGamePreview';
import { HelpPane } from './panes/HelpPane';
import { ResizeHandle } from './panes/ResizeHandle';
import { useGameAgent, type ChatItem, type FirstTurnSeed } from './panes/useGameAgent';
import { usePlaygroundStore } from './playgroundStore';
import { readWorkspaceSlice, writeWorkspaceSlice } from './workspaceUiStore';

interface WorkspaceProps {
  /** The lifted VFS — owned by PlaygroundApp. */
  files: VfsFile[];
  /** Bump (via onRun) forces the Game Runner to re-run. Owned by PlaygroundApp. */
  runKey: number;
  /** Whether the game is currently running. Owned by PlaygroundApp. */
  running: boolean;
  /** The project's game engine (2D phaser / 3D three) — picks the runner's vendored
   *  global + control shim (learn-game-studio-3d-prd.md D-3D-01). Defaults to phaser. */
  engine?: GameEngine;
  /** Called when an in-studio 2D⇄3D switch changes the engine (D-3D-08). */
  onEngineChange?: (engine: GameEngine) => void;
  /** Commit edits back to the page-level source of truth. */
  onApplyFiles: (f: VfsFile[]) => void;
  /** Save the project now + report the result — lets an asset import confirm the
   *  upload before revealing the asset (see AssetViewerPane). */
  onSaveNow?: () => Promise<SaveResult>;
  /** Re-run the game (PlaygroundApp bumps runKey). */
  onRun: () => void;
  /** The kid's landing-screen prompt — seeds the launch hand-off chat message. */
  prompt: string;
  /**
   * The real backend project. When set, AI turns run server-side (Stars-metered,
   * streamed, plan/approve-gated, PRD J2); when absent (a project-less session) the
   * offline stub turn runs behind the same UI.
   */
  projectId?: string;
  /** The AI's first turn (generated on the loading screen) — seeds the chat. */
  firstTurn?: FirstTurnSeed;
  /** The teacher's "where we left off" on a resumed game → welcome-back card (D-PAP-19,22). */
  resumeRecap?: LearningContext | null;
  /** Restored chat history (J9 resume) — reopens the saved conversation. */
  initialChat?: ChatItem[];
  /** Persist the conversation whenever it changes (J9). */
  onChatChange?: (chat: ChatItem[]) => void;
  /** The first-turn build was safety-refused → seed an explanation + gentler ideas. */
  blockedSeed?: boolean;
  /**
   * Teacher live viewer (D-LV-6) — render the SAME workspace but gate EVERY
   * mutation: AI turns (chat send / confirm / reject / asset-gen / raise-hand),
   * file CRUD + Monaco edits, and asset uploads. Running the game stays live.
   * The kid-only wallet query is skipped (a teacher has no family).
   */
  readOnly?: boolean;
}

interface Wallet {
  stars_balance: number;
}

type SplitTab = 'chat' | 'code' | 'assets' | 'help';

// Tab id → short label; the icon comes from WINDOW_META so it matches the rest
// of the UI (lucide MessageSquare / Code2 / Images / BookOpen), not an emoji glyph.
const SPLIT_TABS: ReadonlyArray<{ id: SplitTab; label: string }> = [
  { id: 'chat', label: 'Chat' },
  { id: 'code', label: 'Code' },
  { id: 'assets', label: 'Assets' },
  { id: 'help', label: 'Guide' },
];

export function Workspace({
  files,
  runKey,
  running,
  engine = 'phaser',
  onEngineChange,
  onApplyFiles,
  onSaveNow,
  onRun,
  prompt,
  projectId,
  firstTurn,
  resumeRecap,
  initialChat,
  onChatChange,
  blockedSeed,
  readOnly = false,
}: WorkspaceProps) {
  const layoutMode = usePlaygroundStore((s) => s.layoutMode);
  // Welcome-back card on resume — dismissed once the kid taps "Keep building" (or
  // it simply sits above the chat; it never blocks typing). D-PAP-19,22.
  const [recapDismissed, setRecapDismissed] = useState(false);
  const showRecap = !!resumeRecap && !recapDismissed;
  const [splitTab, setSplitTab] = useState<SplitTab>(
    () => readWorkspaceSlice('split', { tab: 'chat' as SplitTab }).tab,
  );
  // A request to open a specific asset in the Asset Viewer (from a chat card).
  const [openAsset, setOpenAsset] = useState<{ path: string; nonce: number } | null>(null);
  const openAssetNonce = useRef(0);
  useEffect(() => {
    writeWorkspaceSlice('split', { tab: splitTab });
  }, [splitTab]);

  // Age-derived tier (OD-1): Lite 8–11 (agency beat) / Pro 12–17 (plan→approve).
  // Default Lite when age is unknown (the safest, simplest UX).
  const me = useMe();
  const age = me.data?.kind === 'kid' ? (me.data.age ?? null) : null;
  // In the teacher viewer the principal is a `user` (no family/wallet); force the
  // kid-derived ids null so the kid-only wallet/class queries never fire (D-LV-6).
  const familyId = !readOnly && me.data?.kind === 'kid' ? me.data.family_id : null;
  const kidId = !readOnly && me.data?.kind === 'kid' ? me.data.sub : null;
  const mode: 'lite' | 'pro' = age != null && age >= 12 ? 'pro' : 'lite';

  // Family Stars balance for the metered display (real path). Refetched after a
  // turn debits (OD-3 "meter every turn"). Skipped for a teacher viewer.
  const wallet = useQuery<Wallet>({
    queryKey: ['wallet', familyId],
    queryFn: () => api<Wallet>(`/families/${familyId}/wallet`),
    enabled: !!familyId && !!projectId,
  });
  // "Ask my teacher" only makes sense when the kid is in a class — gate the
  // raise-hand on class membership.
  const classes = useQuery({
    queryKey: ['kid', kidId, 'classes'],
    queryFn: () => listClasses(kidId!),
    enabled: !!kidId,
  });
  const inClass = (classes.data?.length ?? 0) > 0;
  // Class shared assets (class-shared-assets-prd): the teacher's prepared media
  // for THIS project's class. The backend gate returns `[]` unless the project is
  // class work for a class the kid is enrolled in, so the Asset Viewer's "Class"
  // tab is shown only when this resolves non-empty. Real owned projects only (a
  // project-less session / teacher-viewer principal has no class membership).
  const classAssetsQuery = useQuery({
    queryKey: ['project', projectId, 'class-assets'],
    queryFn: () => listClassAssets(projectId!),
    enabled: !!projectId,
  });
  const classAssets = classAssetsQuery.data ?? [];

  // Live-refresh the Class tab when the teacher changes the class library
  // (class-shared-assets-prd): the backend pushes a class_id-only signal to the
  // enrolled kid's private socket; we just refetch the access-gated endpoint, so
  // a newly-uploaded asset appears (or a removed one disappears) without a reload.
  const qc = useQueryClient();
  const refetchClassAssets = useCallback(() => {
    if (projectId) {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'class-assets'] });
    }
  }, [qc, projectId]);
  useWsEvent('class.asset_added', refetchClassAssets, [projectId]);
  useWsEvent('class.asset_removed', refetchClassAssets, [projectId]);
  useWsEvent('class.assets_copied', refetchClassAssets, [projectId]);
  // Default window placement (Code lower-left & wide, Chat center-top & front,
  // Game right) is seeded in the store from the viewport — `Window` is an
  // uncontrolled react-rnd, so the rects must be set before mount.

  // Surface/focus a panel for a turn's workspace action: open+focus the window
  // (Window mode) or switch the split tab (Split mode; the Game pane is always
  // visible there, so 'game' is a no-op). Reads the layout at CALL time, not
  // from the render closure: the demo tour (and deferred client actions) hold
  // this handler across renders, and a Windows↔Split flip in between must route
  // through the layout that is actually on screen.
  const focusPanel = (target: 'chat' | 'code' | 'game' | 'assets' | 'help') => {
    if (usePlaygroundStore.getState().layoutMode === 'window') {
      usePlaygroundStore.getState().openOrFocus(target);
    } else if (target !== 'game') {
      setSplitTab(target);
    }
  };

  // The editor's ▶ Play runs AND brings the Game Runner window to the front (in
  // window mode; the split Game pane is always visible). Chat turns and the
  // runner's own Play use plain `onRun`, so a chat message never steals focus
  // to the Game Runner.
  const runFromEditor = () => {
    onRun();
    focusPanel('game');
  };

  // Open a file in the code view and (optionally) reveal/highlight a line range.
  // Shared by the console's jump-to-error AND the agent's open_file/jump_to_line/
  // highlight_code UI tools (D-PAP-08). The monotonic nonce makes a repeat request
  // for the same file:line re-fire (a new object identity each time).
  const [locationRequest, setLocationRequest] = useState<{
    file: string;
    line: number;
    toLine?: number;
    select?: boolean;
    nonce: number;
  } | null>(null);
  const jumpNonce = useRef(0);
  const handleOpenLocation = (file: string, line: number, toLine?: number, select?: boolean) => {
    setLocationRequest({ file, line, toLine, select, nonce: (jumpNonce.current += 1) });
    // Bring the editor forward so the kid sees the jump.
    focusPanel('code');
  };

  // The agent's `open_help` — surface the Guide and jump it to a passage. A
  // monotonic nonce makes a repeat jump to the same place re-fire (HelpPane reacts
  // to the new object identity). Mirrors the jump-to-error `locationRequest` seam.
  const [helpRequest, setHelpRequest] = useState<{ docId: string; anchor?: string; nonce: number } | null>(
    null,
  );
  const helpNonce = useRef(0);
  const openHelp = (docId: string, anchor?: string) => {
    focusPanel('help');
    setHelpRequest({ docId, anchor, nonce: (helpNonce.current += 1) });
  };

  // Own the chat state HERE (not in ChatPane) so the history survives toggling
  // between Window and Split layouts — the panes remount across modes, this
  // component does not. Chat applies edits to the VFS but never runs the game.
  const {
    chat,
    busy,
    streaming,
    progress,
    error,
    offline,
    pending,
    balance,
    canUndo,
    safeguard,
    handRaised,
    imagesDisabled,
    imageRejectNonce,
    send,
    requestAssetGen,
    confirmPending,
    cancelPending,
    undo,
    raiseHand,
    lowerHand,
    abort,
    retryLast,
    autoFixFromErrors,
  } = useGameAgent({
      files,
      onApplyFiles,
      introPrompt: prompt,
      projectId,
      mode,
      engine,
      onEngineChange,
      firstTurn,
      initialChat,
      onChatChange,
      blockedSeed,
      readOnly,
      balance: wallet.data?.stars_balance,
      onStarsCharged: () => wallet.refetch(),
      clientActions: {
        runGame: runFromEditor,
        restartGame: runFromEditor,
        focusPanel,
        openHelp,
        // Teaching tools: open/reveal/highlight the file the agent just changed.
        openFile: (path, fromLine, toLine) => handleOpenLocation(path, fromLine ?? 1, toLine),
        // Look tools — only fire when the agent was asked (guardrail enforced
        // backend-side); here they just drive the store.
        setTheme: (t) => usePlaygroundStore.getState().setTheme(t),
        setLayout: (m) => usePlaygroundStore.getState().setLayoutMode(m),
      },
    });

  // Try-demo seam (try-demo-mode-prd D-DEMO-04/05): in the public demo the tour
  // overlay drives the canned turns through this REAL `send`. No-op outside the
  // demo provider (`useDemoMode()` is null everywhere else).
  const demo = useDemoMode();
  useEffect(() => {
    demo?.bindChatSend?.(send);
  }, [demo, send]);

  // "See code" CTA → surface the Code Editor (open/focus it in window mode, or
  // switch the split tab). "Run game" reuses runFromEditor (run + focus runner).
  const handleSeeCode = () => {
    focusPanel('code');
  };
  // Tapping a finished asset in chat → bring the Asset Viewer to front and open
  // that asset there (the nonce re-fires even when reopening the same path).
  const openAssetInViewer = (path: string) => {
    focusPanel('assets');
    setOpenAsset({ path, nonce: openAssetNonce.current++ });
  };
  const assetSrcFromChat = (path: string) => files.find((f) => f.path === path)?.content;
  // Asset Viewer Generate/Remix → bring the Chat to front (it's where generation
  // shows), then post the request. The chat auto-scrolls to the new message.
  const requestAssetGenFromViewer = (prompt: string, ref?: { refAssetPath?: string; refUrl?: string }) => {
    focusPanel('chat');
    requestAssetGen(prompt, ref);
  };
  const chatProps = {
    chat,
    busy,
    streaming,
    progress,
    error,
    offline,
    balance,
    pending,
    canUndo,
    safeguard,
    handRaised,
    inClass,
    readOnly,
    onSend: send,
    // Attach-a-picture (D-PAP-33): wired only on the real (authed, project-backed)
    // path — the project-less demo + read-only viewer have no uploader, so the
    // composer hides the affordance.
    onUploadImage:
      projectId && !readOnly ? (file: File) => uploadChatImage(projectId, file) : undefined,
    imagesDisabled,
    imageRejectNonce,
    onConfirm: confirmPending,
    onCancel: cancelPending,
    onUndo: undo,
    onRaiseHand: raiseHand,
    onLowerHand: lowerHand,
    onRunGame: runFromEditor,
    onSeeCode: handleSeeCode,
    // Tap a changed-file row → open the editor and highlight the change (§11.4).
    onOpenFile: (path: string, fromLine?: number, toLine?: number) =>
      handleOpenLocation(path, fromLine ?? 1, toLine),
    onOpenAsset: openAssetInViewer,
    assetSrc: assetSrcFromChat,
    onStop: abort,
    onRetry: retryLast,
    recap: showRecap ? resumeRecap : null,
    onContinueRecap: () => setRecapDismissed(true),
  };

  // "Ask AI to fix" on a console error → send the error to the chat agent and
  // surface the chat. (The agent turn is still the local stub, but the UX path
  // is real.)
  const handleAskFix = (message: string) => {
    send(message);
    focusPanel('chat');
  };

  // "✨ Explain this" on an editor selection → send the snippet to the chat agent
  // for a plain-words explanation (the prompt asks it not to edit). The playground
  // teacher model auto-applies with no agency gate, so a plain `send` answers
  // directly. Surface the chat so the answer is visible.
  const handleExplainCode = (code: string) => {
    send(buildExplainPrompt(code));
    focusPanel('chat');
  };

  // Try-demo seam (try-demo-mode-prd §3 v2): register the studio's REAL
  // affordances so the tour can sequence them (auto-run, restart-after-change,
  // diff jump, explain-this, asset generate, guide). Every handler is the same
  // production one the studio's own UI calls. No-op outside the demo provider.
  useEffect(() => {
    demo?.bindStudioControls?.({
      runGame: runFromEditor,
      focusPanel,
      openFileAt: handleOpenLocation,
      explainSelection: handleExplainCode,
      requestAssetGen: requestAssetGenFromViewer,
      openGuide: openHelp,
    });
  });

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
            <DesktopIcon id="help" />
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
              onExplainSelection={handleExplainCode}
              readOnly={readOnly}
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
              engine={engine}
              onRun={onRun}
              onOpenLocation={handleOpenLocation}
              onAskFix={handleAskFix}
              onRuntimeErrors={autoFixFromErrors}
              readOnly={readOnly}
            />
          </Window>
          <Window
            id="assets"
            title={WINDOW_META.assets.title}
            icon={<WINDOW_META.assets.Icon size={16} />}
          >
            <AssetViewerPane files={files} projectId={projectId} onApplyFiles={onApplyFiles} onSaveNow={onSaveNow} onRequestAssetGen={requestAssetGenFromViewer} openAsset={openAsset} readOnly={readOnly} classAssets={classAssets} />
          </Window>
          <Window
            id="help"
            title={WINDOW_META.help.title}
            icon={<WINDOW_META.help.Icon size={16} />}
          >
            <HelpPane mode={mode} request={helpRequest ?? undefined} />
          </Window>
        </div>

        {/* Docked taskbar (brand + LayoutToggle + window buttons + share link) */}
        <Taskbar projectId={projectId} readOnly={readOnly} />
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
              {/* Inert demo-tour seam: `data-pane` marks the split regions the
                  way `data-window` marks the floating windows (desktop/Window),
                  so the tour's layout-proof spotlight selectors resolve here. */}
              <div data-pane={splitTab} className="min-h-0 flex-1">
                {splitTab === 'chat' ? (
                  <ChatPane {...chatProps} />
                ) : splitTab === 'code' ? (
                  <CodeEditorPane
                    files={files}
                    onApplyFiles={onApplyFiles}
                    onRun={runFromEditor}
                    openLocation={locationRequest}
                    onExplainSelection={handleExplainCode}
                    readOnly={readOnly}
                  />
                ) : splitTab === 'help' ? (
                  <HelpPane mode={mode} request={helpRequest ?? undefined} />
                ) : (
                  <AssetViewerPane files={files} projectId={projectId} onApplyFiles={onApplyFiles} onSaveNow={onSaveNow} onRequestAssetGen={requestAssetGenFromViewer} openAsset={openAsset} readOnly={readOnly} classAssets={classAssets} />
                )}
              </div>
            </section>
          </Panel>

          <ResizeHandle />

          {/* Right: Game Runner (data-pane: same demo-tour seam as the left region) */}
          <Panel defaultSize={33} minSize={20} className="min-w-0">
            <div data-pane="game" className="h-full min-h-0">
              <GameRunnerPane
                files={files}
                runKey={runKey}
                running={running}
                engine={engine}
                onRun={onRun}
                onOpenLocation={handleOpenLocation}
                onAskFix={handleAskFix}
                onRuntimeErrors={autoFixFromErrors}
                readOnly={readOnly}
              />
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Docked taskbar (brand + LayoutToggle + share link); per-window buttons hidden in split mode */}
      <Taskbar projectId={projectId} readOnly={readOnly} />
    </div>
  );
}
