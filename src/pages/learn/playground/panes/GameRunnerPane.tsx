import { Bug, Gamepad2, Pause, Play, RotateCcw, Smartphone, Sparkles, Terminal, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { VfsFile } from '../../code/codeApi';
import { GameFrame } from '../GameFrame';
import { readWorkspaceSlice, writeWorkspaceSlice } from '../workspaceUiStore';
import type { ConsoleLine, GameEngine } from '../buildGamePreview';
import type { RunReport } from '../runReport';
import { SCREEN_PRESETS } from '../screenPresets';
import { useStickToBottom } from './useStickToBottom';
import { extractRuntimeErrors } from '../verifyRoundtrip';

interface GameRunnerPaneProps {
  /** The lifted VFS — owned by PlaygroundApp. */
  files: VfsFile[];
  /**
   * Class shared assets the game references at `assets/class/<name>`, resolved to
   * `data:` URLs (class-shared-assets-prd, Model A). Passed LIVE (not through the
   * runKey freeze that keeps code edits from restarting the game): a class asset
   * resolving is a legitimate reason to re-run once so it appears.
   */
  virtualAssets?: VfsFile[];
  /** Bump (via onRun) forces GameFrame to re-run. Owned by PlaygroundApp. */
  runKey: number;
  /** Whether the game is currently running. Owned by PlaygroundApp; ▶ → onRun(). */
  running: boolean;
  /** Which engine global + control shim the runner injects (2D phaser / 3D three).
   *  learn-game-studio-3d-prd.md D-3D-01. Defaults to phaser. */
  engine?: GameEngine;
  /** Launch / re-run the game (PlaygroundApp flips `running` + bumps runKey). */
  onRun: () => void;
  /** Open a console error's source location in the editor (jump to file+line). */
  onOpenLocation?: (file: string, line: number) => void;
  /** Send a console error to the AI chat to fix ("Ask AI to fix"). */
  onAskFix?: (message: string) => void;
  /** Legacy self-verify (MP3): report captured runtime errors for a raw fix turn.
   *  RETIRED for game projects — verification now rides `onRunReport` (D-PAP-40). */
  onRuntimeErrors?: (errors: string[]) => void;
  /** Post-apply verification (D-PAP-40): pass-through to GameFrame — emits one
   *  structured RunReport per run for the loop driver (useVerification). */
  onRunReport?: (report: RunReport) => void;
  /** 1-based chain attempt stamped into the emitted RunReport (default 1). */
  reportAttempt?: number;
  /** Teacher live read-only viewer (D-LV-6): the game still RUNS (non-destructive),
   *  but "Ask AI to fix" — whose only action is a (gated) AI turn — is hidden so a
   *  teacher never sees a dead control. */
  readOnly?: boolean;
}

/** Short file name for a console location (the basename of the sourceURL path). */
function baseName(file: string): string {
  return file.split(/[\\/]/).pop() || file;
}

/** Kid-friendly prompt for the AI from a captured error line (with its location).
 *  Exported: the try-demo scripted agent recognises this exact shape so the
 *  console's "Ask AI to fix" continues the demo script (drift-alarmed in
 *  `src/pages/try/scriptedAgent.test.ts` — keep them matching). */
// eslint-disable-next-line react-refresh/only-export-components
export function fixPrompt(line: ConsoleLine): string {
  const where = line.loc ? ` (in ${baseName(line.loc.file)}, line ${line.loc.line})` : '';
  return `My game has an error${where}: ${line.text}\nCan you fix it?`;
}

const DEFAULT_PRESET_ID = 'original';

/** Console line level → text color (VSCode-terminal flavor). */
const LEVEL_COLOR: Record<ConsoleLine['level'], string> = {
  log: 'text-pg-text-dim',
  info: 'text-pg-text-dim',
  warn: 'text-brand-sunshine',
  error: 'text-brand-coral',
};

/**
 * The scrollable console output. Its own component so MOUNTING (= the panel
 * opening, e.g. auto-opened on the first error) starts pinned at the LATEST
 * line — `useStickToBottom` (the chat list's pin-to-bottom state machine) glues
 * the view to the bottom on mount and on every new line while the kid is at/near
 * the bottom, but never yanks them back down after they deliberately scroll up.
 */
function ConsoleList({
  lines,
  onOpenLocation,
}: {
  lines: ConsoleLine[];
  onOpenLocation?: (file: string, line: number) => void;
}) {
  // Changes on append AND clear (count + last text), driving the glue/pill logic.
  const { listRef } = useStickToBottom(`${lines.length}:${lines[lines.length - 1]?.text ?? ''}`);
  return (
    <div ref={listRef} data-testid="console-list" className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
      {lines.length === 0 ? (
        <div className="text-[12px] text-pg-text-muted">—</div>
      ) : (
        <ul>
          {lines.map((l, i) => (
            <li
              key={i}
              className={`flex gap-1.5 border-b border-pg-border py-0.5 text-[12px] leading-relaxed ${LEVEL_COLOR[l.level]}`}
            >
              <span aria-hidden className="select-none text-pg-text-muted">›</span>
              <span className="min-w-0 whitespace-pre-wrap break-words">
                {l.text}
                {l.loc && (
                  <button
                    type="button"
                    onClick={() => onOpenLocation?.(l.loc!.file, l.loc!.line)}
                    title="Open in editor"
                    className="ml-1.5 rounded bg-pg-text/10 px-1.5 py-px font-sans text-[11px] font-semibold text-pg-text-dim underline-offset-2 transition-colors hover:bg-pg-text/20 hover:text-pg-text hover:underline"
                  >
                    {baseName(l.loc.file)}:{l.loc.line}
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A small dark-chrome toolbar button (icon-only). */
function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors ${
        active ? 'bg-pg-text/20 text-pg-text' : 'text-pg-text-dim hover:bg-pg-text/10 hover:text-pg-text'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * The Game Runner pane (spec §5): a toolbar, the edge-to-edge game stage, an
 * optional console panel, and a status bar, filling its column.
 *
 * Dark chrome to match the game canvas. The stage fills the whole area
 * edge-to-edge against black — Phaser's Scale.FIT centers/letterboxes the game
 * seamlessly. The console (when toggled) is its own bottom section above the
 * status bar, NOT overlaid on the stage. `running` is owned by PlaygroundApp;
 * pressing ▶ anywhere calls `onRun()`.
 */
export function GameRunnerPane({
  files,
  virtualAssets,
  runKey,
  running,
  engine = 'phaser',
  onRun,
  onOpenLocation,
  onAskFix,
  onRuntimeErrors,
  onRunReport,
  reportAttempt,
  readOnly,
}: GameRunnerPaneProps) {
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  // Persisted Game Runner selections (J9): screen preset + console visibility.
  const runnerSeed = useRef(
    readWorkspaceSlice('game-runner', { runnerPresetId: '', runnerShowConsole: false }),
  ).current;
  const [presetId, setPresetId] = useState(() => runnerSeed.runnerPresetId || DEFAULT_PRESET_ID);
  const [showConsole, setShowConsole] = useState(() => runnerSeed.runnerShowConsole);
  useEffect(() => {
    writeWorkspaceSlice('game-runner', { runnerPresetId: presetId, runnerShowConsole: showConsole });
  }, [presetId, showConsole]);
  const [debug, setDebug] = useState(false);
  const [fps, setFps] = useState(0);
  const [lines, setLines] = useState<ConsoleLine[]>([]);

  // The running game uses a SNAPSHOT of the VFS taken at launch (keyed to runKey),
  // so editor autosaves — which mutate `files` WITHOUT a Play — don't silently
  // reload the game mid-edit. A real run (▶ Play / restart / AI turn) bumps runKey
  // and re-snapshots. Updated synchronously during render so the first Play already
  // uses the latest code (no double-load).
  //
  // ALSO re-snapshot when the ENGINE changes (a 2D⇄3D switch, D-3D-08): the engine
  // prop is live, so without this the runner would render the new engine's global
  // against the OLD engine's snapshot files → "Phaser/THREE is not defined". The
  // switch flips engine + replaces the VFS in one commit (flushSync), so `files`
  // here is already the clean target-engine starter when `engine` changes.
  const lastRunKey = useRef(runKey);
  const lastEngine = useRef(engine);
  const runFilesRef = useRef(files);
  if (runKey !== lastRunKey.current || engine !== lastEngine.current) {
    lastRunKey.current = runKey;
    lastEngine.current = engine;
    runFilesRef.current = files;
  }
  const runFiles = runFilesRef.current;

  const preset = SCREEN_PRESETS.find((p) => p.id === presetId) ?? SCREEN_PRESETS[0];
  const logCount = lines.length;
  // Count problems = errors AND warnings. Phaser reports developer-facing issues
  // (e.g. "Scene not found", missing textures) via console.warn, so warnings must
  // count too — to a kid those are "something's wrong" just like errors.
  const problemCount = lines.reduce(
    (n, l) => (l.level === 'error' || l.level === 'warn' ? n + 1 : n),
    0,
  );
  // The most recent real error — what "Ask AI to fix" sends to the chat agent.
  const lastError = [...lines].reverse().find((l) => l.level === 'error' && l.text !== 'ready');

  // Self-verify (MP3 / D-PAP-09,13,23): when a run captures runtime errors, report
  // them up so the agent can auto-fix. Fire once per distinct (run, error-set) so a
  // steady error stream doesn't re-trigger; the caller bounds attempts (≤2 → co-debug).
  const reportedErrorsRef = useRef('');
  useEffect(() => {
    if (!onRuntimeErrors) return;
    const errs = extractRuntimeErrors(lines);
    if (errs.length === 0) return;
    const sig = `${runKey}:${errs.join('|')}`;
    if (sig === reportedErrorsRef.current) return;
    reportedErrorsRef.current = sig;
    onRuntimeErrors(errs);
  }, [lines, runKey, onRuntimeErrors]);

  // Auto-open the console on the FIRST problem of a run, so the kid sees what's
  // wrong. Only on the 0 → >0 edge — later problems don't re-open it (the kid can
  // close it and keep it closed; a restart resets `lines`, so it can open again).
  const sawProblems = useRef(false);
  useEffect(() => {
    if (problemCount > 0 && !sawProblems.current) {
      sawProblems.current = true;
      setShowConsole(true);
    } else if (problemCount === 0) {
      sawProblems.current = false;
    }
  }, [problemCount]);

  // Size the stage to the chosen preset's ASPECT RATIO, scaled to fit the pane
  // (letterboxed against black). This is what makes the preset dropdown actually
  // do something — picking iPhone gives a tall portrait box, 720p a wide one. A
  // ResizeObserver keeps it fitted as the pane/window resizes; the running game
  // re-fits live (the iframe resize fires Phaser's Scale.FIT) — no reload.
  const stageRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      // Inset by STAGE_PAD so the "screen" never touches the pane edges — the
      // desk shows all around it, making the device frame readable.
      const STAGE_PAD = 16;
      const cw = el.clientWidth - STAGE_PAD * 2;
      const ch = el.clientHeight - STAGE_PAD * 2;
      if (cw <= 0 || ch <= 0) return;
      const scale = Math.min(cw / preset.w, ch / preset.h);
      setBox({ w: Math.floor(preset.w * scale), h: Math.floor(preset.h * scale) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [preset.w, preset.h]);

  return (
    // The Game Runner is always DARK (a media-player surface), regardless of the
    // playground theme — `data-theme="dark"` re-themes its pg-* chrome locally.
    // In Window mode the game Window also forces dark; this covers Split mode.
    <div data-theme="dark" className="flex h-full min-h-0 flex-col bg-pg-bg text-pg-text">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-pg-border bg-pg-surface-2 px-3 py-2">
        <ToolButton
          label={!running ? 'Play' : paused ? 'Play' : 'Pause'}
          active={running && !paused}
          onClick={() => {
            if (!running) {
              onRun();
              return;
            }
            setPaused((p) => !p);
          }}
        >
          {!running || paused ? <Play size={18} /> : <Pause size={18} />}
        </ToolButton>

        <ToolButton
          label={muted ? 'Unmute' : 'Mute'}
          active={!muted}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </ToolButton>

        <label className="flex items-center gap-1.5">
          <Smartphone aria-hidden size={18} className="text-pg-text-dim" />
          <select
            aria-label="Screen size"
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            className="rounded-lg border border-pg-border bg-pg-surface-2 px-2 py-1 text-xs font-medium text-pg-text focus:outline-none focus:ring-2 focus:ring-brand-sky"
          >
            {SCREEN_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="text-pg-text">
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <ToolButton label="Restart" onClick={onRun}>
          <RotateCcw size={18} />
        </ToolButton>

        <ToolButton
          label={debug ? 'Hide physics debug' : 'Show physics debug'}
          active={debug}
          onClick={() => setDebug((d) => !d)}
        >
          <Bug size={18} />
        </ToolButton>

        <ToolButton label="Toggle console" active={showConsole} onClick={() => setShowConsole((s) => !s)}>
          <Terminal size={18} />
        </ToolButton>
      </div>

      {/* Stage — the game sits in a preset-aspect "screen" box, centered on the
          darker desk so its edges (border + shadow) read as a device frame. */}
      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-pg-desktop"
      >
        {running ? (
          <div
            className="overflow-hidden rounded-md bg-black shadow-[0_10px_40px_-8px_rgba(0,0,0,0.8)] ring-1 ring-white/20"
            style={box ? { width: box.w, height: box.h } : { width: '100%', height: '100%' }}
          >
            <GameFrame
              files={runFiles}
              virtualAssets={virtualAssets}
              engine={engine}
              runKey={runKey}
              paused={paused}
              muted={muted}
              debug={debug}
              onFps={setFps}
              onConsole={setLines}
              onRunReport={onRunReport}
              reportAttempt={reportAttempt}
            />
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-pg-desktop text-center">
            <Gamepad2 size={44} className="text-pg-text-muted" />
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-pg-text-dim">Press ▶ to play</p>
              <p className="text-xs text-pg-text-muted">your game shows up here</p>
            </div>
            <button
              type="button"
              onClick={onRun}
              className="flex items-center gap-1.5 rounded-lg bg-pg-text/10 px-3 py-1.5 text-sm font-bold text-pg-text transition-colors hover:bg-pg-text/20 focus:outline-none focus:ring-2 focus:ring-brand-sky"
            >
              <Play size={16} /> Play
            </button>
          </div>
        )}
      </div>

      {/* Console panel — separate bottom section, above the status bar. */}
      {showConsole && (
        <div className="flex h-48 shrink-0 flex-col border-t border-pg-border bg-pg-desktop font-mono">
          <div className="flex shrink-0 items-center gap-2 px-3 py-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-pg-text-muted">Console</span>
            <span className="text-[11px] text-pg-text-dim">{logCount}</span>
            {/* "Ask AI to fix" runs a (gated) AI turn — hidden in the teacher
                read-only viewer so no dead control shows (D-LV-6). */}
            {!readOnly && lastError && onAskFix && (
              <button
                type="button"
                onClick={() => onAskFix(fixPrompt(lastError))}
                className="ml-auto flex items-center gap-1 rounded-md bg-brand-sky/20 px-2 py-0.5 text-[11px] font-bold text-pg-text transition-colors hover:bg-brand-sky/30"
              >
                <Sparkles size={12} aria-hidden /> Ask AI to fix
              </button>
            )}
            <button
              type="button"
              onClick={() => setLines([])}
              className={`${!readOnly && lastError && onAskFix ? 'ml-1.5' : 'ml-auto'} rounded-md px-2 py-0.5 text-[11px] font-semibold text-pg-text-dim transition-colors hover:bg-pg-text/10 hover:text-pg-text`}
            >
              Clear
            </button>
          </div>
          <ConsoleList lines={lines} onOpenLocation={onOpenLocation} />
        </div>
      )}

      {/* Status bar */}
      <div className="flex shrink-0 items-center gap-2 border-t border-pg-border bg-pg-surface-2 px-3 py-1.5 text-xs">
        {!running ? (
          <>
            <span aria-hidden className="h-2 w-2 rounded-full bg-pg-text-muted" />
            <span className="font-bold text-pg-text">Idle</span>
          </>
        ) : (
          <>
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${paused ? 'bg-brand-sunshine' : 'bg-brand-mint'}`}
            />
            <span className="font-bold text-pg-text">{paused ? 'Paused' : 'Running'}</span>
            <span className="text-pg-text-muted">·</span>
            <span className="text-pg-text-dim">{fps + ' fps'}</span>
            <span className="text-pg-text-muted">·</span>
            <span className="text-pg-text-dim">{logCount + ' logs'}</span>
          </>
        )}
        <span className="ml-auto text-pg-text-dim">
          {preset.w} × {preset.h}
        </span>
      </div>
    </div>
  );
}
