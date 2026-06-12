import { useEffect, useMemo, useRef, useState } from 'react';

import type { VfsFile } from '../code/codeApi';
import { buildGamePreview, isConsoleMessage, isStatMessage, resolveErrorLoc, type ConsoleLine } from './buildGamePreview';

interface GameFrameProps {
  files: VfsFile[];
  /** Bump to force a fresh re-run ("Play again" button). */
  runKey: number;
  /** Show the captured console panel under the stage (Pro mode). */
  showConsole?: boolean;
  /** Called when the kid clicks "Fix this error" on a console error line. */
  onFixError?: (message: string) => void;
  /** Pause/resume the running game via the control channel. */
  paused?: boolean;
  /** Mute/unmute the running game via the control channel. */
  muted?: boolean;
  /** Reports the game's frame rate (~every 500ms while running). */
  onFps?: (fps: number) => void;
  /** Reports the captured console line count whenever it changes. */
  onConsoleCount?: (n: number) => void;
  /** Reports the full captured console lines (so a parent can render its own
   *  console panel instead of the built-in one). */
  onConsole?: (lines: ConsoleLine[]) => void;
  /** Force Phaser arcade physics debug draw (hitboxes/velocities). */
  debug?: boolean;
}

const LEVEL_COLOR: Record<ConsoleLine['level'], string> = {
  log: 'text-pg-text-dim',
  info: 'text-pg-text-dim',
  warn: 'text-brand-sunshine',
  error: 'text-brand-coral',
};

/**
 * Renders a kid's Phaser game inside the strict sandbox. Same security model as
 * the code studio's PreviewFrame: opaque-origin iframe, `allow-scripts` only,
 * NO allow-same-origin. The only channel back to the app is postMessage (the
 * console shim injected by buildGameSrcDoc).
 */
export function GameFrame({
  files,
  runKey,
  showConsole = false,
  onFixError,
  paused = false,
  muted = false,
  onFps,
  onConsoleCount,
  onConsole,
  debug = false,
}: GameFrameProps) {
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const { srcDoc, scriptRanges } = useMemo(() => buildGamePreview(files, { debug }), [files, debug]);
  // Read inside the (stable) message listener without re-subscribing.
  const scriptRangesRef = useRef(scriptRanges);
  scriptRangesRef.current = scriptRanges;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  /** Post a control message to the sandboxed frame (opaque origin → targetOrigin '*'). */
  const postControl = (action: 'pause' | 'resume' | 'mute' | 'unmute') => {
    iframeRef.current?.contentWindow?.postMessage({ __airbotixControl: true, action }, '*');
  };

  // Reset console each run.
  useEffect(() => {
    setLines([]);
  }, [runKey, srcDoc]);

  // Assert paused state on change and after a remount (runKey in deps).
  useEffect(() => {
    postControl(paused ? 'pause' : 'resume');
  }, [paused, runKey]);

  // Assert muted state on change and after a remount (runKey in deps).
  useEffect(() => {
    postControl(muted ? 'mute' : 'unmute');
  }, [muted, runKey]);

  // Latest control state, read inside the (stable) message listener without
  // re-subscribing — so the remount re-assert below always posts current values.
  const controlRef = useRef({ paused, muted });
  controlRef.current = { paused, muted };
  // Last runKey for which we've re-asserted control after seeing a fresh stat.
  const reassertedRunKey = useRef<number | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (isConsoleMessage(e.data)) {
        // Map srcdoc-relative locations (syntax errors — sourceURL never applied)
        // back to the kid's file:line; runtime locs pass through unchanged.
        const loc = resolveErrorLoc(e.data.loc, scriptRangesRef.current);
        setLines((prev) => [...prev.slice(-49), { level: e.data.level, text: e.data.text, loc }]);
        return;
      }
      if (isStatMessage(e.data)) {
        onFps?.(e.data.fps);
        // Remount race: the control effects fire before the new game instance
        // exists, so the first stat of a fresh run re-asserts current state.
        if (reassertedRunKey.current !== runKey) {
          reassertedRunKey.current = runKey;
          postControl(controlRef.current.paused ? 'pause' : 'resume');
          postControl(controlRef.current.muted ? 'mute' : 'unmute');
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onFps, runKey]);

  // Report the captured console (count + full lines) to the parent.
  useEffect(() => {
    onConsoleCount?.(lines.length);
    onConsole?.(lines);
  }, [lines, onConsoleCount, onConsole]);

  const lastError = [...lines].reverse().find((l) => l.level === 'error' && l.text !== 'ready');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 bg-black">
        <iframe
          ref={iframeRef}
          key={runKey}
          title="Game"
          data-game-frame=""
          // Deliberately NO allow-same-origin / allow-top-navigation / allow-forms.
          // allow-pointer-lock + allow-orientation-lock are safe and useful for games.
          sandbox="allow-scripts allow-pointer-lock allow-orientation-lock"
          srcDoc={srcDoc}
          className="h-full w-full border-0"
        />
      </div>

      {showConsole && (
        <div className="shrink-0 max-h-40 overflow-y-auto border-t border-pg-border bg-pg-desktop px-4 py-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-pg-text-muted mb-1">Console</div>
          {lines.length === 0 ? (
            <div className="text-[12px] text-pg-text-muted font-mono">…</div>
          ) : (
            <ul className="space-y-0.5">
              {lines.map((l, i) => (
                <li key={i} className={`text-[12px] font-mono ${LEVEL_COLOR[l.level]}`}>
                  {l.level === 'error' ? '⛔ ' : l.level === 'warn' ? '⚠ ' : '› '}
                  {l.text}
                </li>
              ))}
            </ul>
          )}
          {lastError && onFixError && (
            <button
              onClick={() => onFixError(lastError.text)}
              className="mt-2 rounded-full bg-wash-coral px-3 py-1 text-[11px] font-bold text-ink hover:bg-brand-coral hover:text-white transition-colors"
            >
              🤖 Fix this error
            </button>
          )}
        </div>
      )}
    </div>
  );
}
