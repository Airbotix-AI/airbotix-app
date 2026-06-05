import { useEffect, useRef, useState } from 'react';

import type { VfsFile } from '../../code/codeApi';
import { GameFrame } from '../GameFrame';
import { SCREEN_PRESETS } from '../screenPresets';

interface GameRunnerPaneProps {
  /** The lifted VFS — owned by PlaygroundPage. */
  files: VfsFile[];
  /** Bump (via onRestart) forces GameFrame to re-run. Owned by PlaygroundPage. */
  runKey: number;
  /** Restart the game — PlaygroundPage bumps runKey. */
  onRestart: () => void;
}

const DEFAULT_PRESET_ID = 'original';
const STAGE_PADDING_PX = 16; // matches the stage area's p-4

/** Track an element's content-box size via ResizeObserver. */
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/**
 * Largest box with the given aspect ratio that fits inside avail (w×h),
 * minus padding — so the whole game is always visible, letterboxed, never scrolled.
 */
function fitBox(availW: number, availH: number, aspect: number) {
  const w0 = Math.max(0, availW - STAGE_PADDING_PX * 2);
  const h0 = Math.max(0, availH - STAGE_PADDING_PX * 2);
  let w = w0;
  let h = w0 / aspect;
  if (h > h0) {
    h = h0;
    w = h0 * aspect;
  }
  return { w: Math.round(w), h: Math.round(h) };
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
        active ? 'bg-canvas-pure/20 text-canvas-pure' : 'text-stone2 hover:bg-canvas-pure/10 hover:text-canvas-pure'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * The Game Runner pane (spec §5): a toolbar, the FIT-scaled game stage, and a
 * status bar, filling its column.
 *
 * Dark chrome to match the game canvas. The toolbar/status bars are tinted a
 * touch lighter than the stage "desk", and the screen itself gets a light ring,
 * so the running game reads as distinct from the surrounding chrome.
 */
export function GameRunnerPane({ files, runKey, onRestart }: GameRunnerPaneProps) {
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const [showConsole, setShowConsole] = useState(false);
  const [fps, setFps] = useState(0);
  const [logCount, setLogCount] = useState(0);

  const preset = SCREEN_PRESETS.find((p) => p.id === presetId) ?? SCREEN_PRESETS[0];

  // Scale the stage to fit the available area, preserving the preset's aspect
  // ratio, so the whole game is always visible (no scrolling). Recomputes as the
  // pane is resized (ResizeObserver) and Phaser's Scale.FIT rescales the canvas.
  const [stageRef, stageSize] = useElementSize<HTMLDivElement>();
  const stage = fitBox(stageSize.w, stageSize.h, preset.w / preset.h);

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink text-canvas-pure">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-canvas-pure/10 bg-canvas-pure/5 px-3 py-2">
        <ToolButton
          label={paused ? 'Play' : 'Pause'}
          active={!paused}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? '▶' : '⏸'}
        </ToolButton>

        <ToolButton
          label={muted ? 'Unmute' : 'Mute'}
          active={!muted}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? '🔇' : '🔊'}
        </ToolButton>

        <label className="flex items-center gap-1.5">
          <span aria-hidden className="text-base">
            📱
          </span>
          <select
            aria-label="Screen size"
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            className="rounded-lg border border-canvas-pure/20 bg-canvas-pure/10 px-2 py-1 text-xs font-medium text-canvas-pure focus:outline-none focus:ring-2 focus:ring-brand-sky"
          >
            {SCREEN_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="text-ink">
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <ToolButton label="Restart" onClick={onRestart}>
          ↻
        </ToolButton>

        <ToolButton label="Toggle console" active={showConsole} onClick={() => setShowConsole((s) => !s)}>
          ⌨
        </ToolButton>
      </div>

      {/* Stage — the game scales to fit this area, keeping aspect ratio. */}
      <div
        ref={stageRef}
        className="flex flex-1 min-h-0 items-center justify-center overflow-hidden bg-ink p-4"
      >
        <div
          className="flex shrink-0 flex-col overflow-hidden rounded-lg bg-ink shadow-card-soft ring-1 ring-canvas-pure/20"
          style={{ width: stage.w, height: stage.h }}
        >
          <GameFrame
            files={files}
            runKey={runKey}
            paused={paused}
            muted={muted}
            showConsole={showConsole}
            onFps={setFps}
            onConsoleCount={setLogCount}
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="flex shrink-0 items-center gap-2 border-t border-canvas-pure/10 bg-canvas-pure/5 px-3 py-1.5 text-xs">
        <span
          aria-hidden
          className={`h-2 w-2 rounded-full ${paused ? 'bg-brand-sunshine' : 'bg-brand-mint'}`}
        />
        <span className="font-bold text-canvas-pure">{paused ? 'Paused' : 'Running'}</span>
        <span className="text-steel">·</span>
        <span className="text-stone2">{fps + ' fps'}</span>
        <span className="text-steel">·</span>
        <span className="text-stone2">{logCount + ' logs'}</span>
        <span className="ml-auto text-stone2">
          {preset.w} × {preset.h}
        </span>
      </div>
    </div>
  );
}
