import { Gamepad2, Pause, Play, RotateCcw, Smartphone, Terminal, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';

import type { VfsFile } from '../../code/codeApi';
import { GameFrame } from '../GameFrame';
import type { ConsoleLine } from '../buildGamePreview';
import { SCREEN_PRESETS } from '../screenPresets';

interface GameRunnerPaneProps {
  /** The lifted VFS — owned by PlaygroundApp. */
  files: VfsFile[];
  /** Bump (via onRun) forces GameFrame to re-run. Owned by PlaygroundApp. */
  runKey: number;
  /** Whether the game is currently running. Owned by PlaygroundApp; ▶ → onRun(). */
  running: boolean;
  /** Launch / re-run the game (PlaygroundApp flips `running` + bumps runKey). */
  onRun: () => void;
}

const DEFAULT_PRESET_ID = 'original';

/** Console line level → text color (VSCode-terminal flavor). */
const LEVEL_COLOR: Record<ConsoleLine['level'], string> = {
  log: 'text-pg-text-dim',
  info: 'text-pg-text-dim',
  warn: 'text-brand-sunshine',
  error: 'text-brand-coral',
};

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
export function GameRunnerPane({ files, runKey, running, onRun }: GameRunnerPaneProps) {
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const [showConsole, setShowConsole] = useState(false);
  const [fps, setFps] = useState(0);
  const [lines, setLines] = useState<ConsoleLine[]>([]);

  const preset = SCREEN_PRESETS.find((p) => p.id === presetId) ?? SCREEN_PRESETS[0];
  const logCount = lines.length;

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

        <ToolButton label="Toggle console" active={showConsole} onClick={() => setShowConsole((s) => !s)}>
          <Terminal size={18} />
        </ToolButton>
      </div>

      {/* Stage — edge-to-edge; the game letterboxes against black via Scale.FIT. */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        {running ? (
          <div className="h-full w-full bg-black">
            <GameFrame
              files={files}
              runKey={runKey}
              paused={paused}
              muted={muted}
              onFps={setFps}
              onConsole={setLines}
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
            <button
              type="button"
              onClick={() => setLines([])}
              className="ml-auto rounded-md px-2 py-0.5 text-[11px] font-semibold text-pg-text-dim transition-colors hover:bg-pg-text/10 hover:text-pg-text"
            >
              Clear
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
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
                    <span className="min-w-0 whitespace-pre-wrap break-words">{l.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
