import { useEffect, useMemo, useRef, useState } from 'react';

import type { VfsFile } from './codeApi';
import { buildSrcDoc, isConsoleMessage, type ConsoleLine } from './buildPreview';

interface PreviewFrameProps {
  files: VfsFile[];
  /** Bump to force a fresh re-run ("Run anew" button). */
  runKey: number;
  /** Show the captured console panel under the preview (Pro mode). */
  showConsole?: boolean;
  /** Called when the kid clicks "Fix this error" on a console error line. */
  onFixError?: (message: string) => void;
}

const LEVEL_COLOR: Record<ConsoleLine['level'], string> = {
  log: 'text-ink-soft',
  info: 'text-ink-soft',
  warn: 'text-brand-sunshine',
  error: 'text-brand-coral',
};

export function PreviewFrame({ files, runKey, showConsole = false, onFixError }: PreviewFrameProps) {
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const srcDoc = useMemo(() => buildSrcDoc(files), [files]);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Reset console each run.
  useEffect(() => {
    setLines([]);
  }, [runKey, srcDoc]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!isConsoleMessage(e.data)) return;
      setLines((prev) => [...prev.slice(-49), { level: e.data.level, text: e.data.text }]);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const lastError = [...lines].reverse().find((l) => l.level === 'error' && l.text !== 'ready');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 bg-white">
        <iframe
          key={runKey}
          ref={frameRef}
          title="Preview"
          // Deliberately NO allow-same-origin / allow-top-navigation / allow-forms (PRD §5.1 / §6.1).
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          className="h-full w-full border-0"
        />
      </div>

      {showConsole && (
        <div className="shrink-0 max-h-40 overflow-y-auto border-t border-hairline bg-canvas-pure px-4 py-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate2 mb-1">Console</div>
          {lines.length === 0 ? (
            <div className="text-[12px] text-slate2 font-mono">…</div>
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
