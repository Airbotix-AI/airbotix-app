import { Home } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { VfsFile } from '../code/codeApi';
import {
  buildSitePreview,
  isConsoleMessage,
  isSiteDbMessage,
  isSiteNavigateMessage,
  resolveErrorLoc,
  SITE_HOME_PAGE,
  type ConsoleLine,
} from './buildSitePreview';

/** How long Home waits for the frame's live-db reply before navigating with
 *  the last-carried db (a crashed/blank page must never wedge the button). */
const HOME_DB_REPLY_TIMEOUT_MS = 300;

interface SiteFrameProps {
  files: VfsFile[];
  /** Class shared assets resolved to ready `data:` URLs — inlined like VFS
   *  assets (same seam as GameFrame's virtualAssets). */
  virtualAssets?: VfsFile[];
  /** Bump to force a fresh run. A fresh run RESETS the db to its data/*.json
   *  seeds and returns to index.html (product decision: db resets per run,
   *  persists only across page navigations). */
  runKey: number;
  /** Show the captured console panel under the site (same as GameFrame). */
  showConsole?: boolean;
  /** Called when the kid clicks "Fix this error" on a console error line. */
  onFixError?: (message: string) => void;
  /** Reports the captured console line count whenever it changes. */
  onConsoleCount?: (n: number) => void;
  /** Reports the full captured console lines (so a parent pane can render its
   *  own console panel instead of the built-in one). */
  onConsole?: (lines: ConsoleLine[]) => void;
}

const LEVEL_COLOR: Record<ConsoleLine['level'], string> = {
  log: 'text-pg-text-dim',
  info: 'text-pg-text-dim',
  warn: 'text-brand-sunshine',
  error: 'text-brand-coral',
};

/**
 * Renders a kid's WEBSITE inside the strict sandbox (Website Studio,
 * creative-code-studio-website-prd). Same security model as GameFrame:
 * opaque-origin iframe, `allow-scripts` ONLY, NO allow-same-origin; the only
 * channel back to the app is postMessage (console capture + the nav shim).
 *
 * Owns the site's cross-page state: `currentPage` + the carried `dbState` the
 * in-frame nav shim posts on a page-link click — so `db` changes survive
 * navigation and reset only on a fresh run (runKey). The slim top bar carries
 * Home (`site-nav-home`, PRESERVES db) and the current page (`site-nav-page`).
 */
export function SiteFrame({
  files,
  virtualAssets,
  runKey,
  showConsole = false,
  onFixError,
  onConsoleCount,
  onConsole,
}: SiteFrameProps) {
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [page, setPage] = useState(SITE_HOME_PAGE);
  const [dbState, setDbState] = useState<Record<string, unknown> | null>(null);

  // A restart (runKey bump) resets the whole site: back to the home page, db
  // re-hydrated from the data/*.json seeds, console cleared.
  useEffect(() => {
    setPage(SITE_HOME_PAGE);
    setDbState(null);
    setLines([]);
  }, [runKey]);

  const { srcDoc, scriptRanges, currentPage } = useMemo(
    () => buildSitePreview(files, { page, dbState, virtualAssets }),
    [files, page, dbState, virtualAssets],
  );
  // Read inside the (stable) message listener without re-subscribing.
  const scriptRangesRef = useRef(scriptRanges);
  scriptRangesRef.current = scriptRanges;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Home reads the LIVE db from the frame first (`read-db` control message +
  // `__airbotixSiteDb` reply), so db mutations made since the last link click
  // aren't lost. The timer doubles as the "a Home request is pending" flag; if
  // the frame never answers (crashed/blank page) the timeout navigates with
  // the last-carried db instead — Home must never wedge.
  const homeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goHomeRef = useRef((db?: Record<string, unknown> | null) => {
    if (homeTimerRef.current) {
      clearTimeout(homeTimerRef.current);
      homeTimerRef.current = null;
    }
    // A null/absent reply (uncloneable live db / timeout) keeps the last-carried db.
    if (db != null) setDbState(db);
    setPage(SITE_HOME_PAGE);
  });
  const requestHome = () => {
    const frameWindow = iframeRef.current?.contentWindow;
    if (homeTimerRef.current) return; // a Home request is already in flight
    if (!frameWindow) {
      goHomeRef.current();
      return;
    }
    frameWindow.postMessage({ __airbotixSiteControl: true, action: 'read-db' }, '*');
    homeTimerRef.current = setTimeout(() => goHomeRef.current(), HOME_DB_REPLY_TIMEOUT_MS);
  };
  useEffect(
    () => () => {
      if (homeTimerRef.current) clearTimeout(homeTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // Only THIS frame may feed the console / drive navigation (same
      // defence-in-depth as GameFrame — another frame on the page must not
      // steer the site). A null source (jsdom tests) is not the cross-frame case.
      const frameWindow = iframeRef.current?.contentWindow;
      if (e.source != null && frameWindow != null && e.source !== frameWindow) return;
      if (isConsoleMessage(e.data)) {
        // Map srcdoc-relative locations (syntax errors — sourceURL never
        // applied) back to the kid's file:line; runtime locs pass through.
        const loc = resolveErrorLoc(e.data.loc, scriptRangesRef.current);
        setLines((prev) => [
          ...prev.slice(-49),
          { level: e.data.level, text: e.data.text, loc, stack: e.data.stack },
        ]);
        return;
      }
      if (isSiteNavigateMessage(e.data)) {
        // A page-link click: carry the live db across the navigation so the
        // site "remembers" while the kid browses (it resets on restart).
        setDbState((e.data.db ?? null) as Record<string, unknown> | null);
        setPage(e.data.path);
        return;
      }
      if (isSiteDbMessage(e.data)) {
        // The frame answered our Home read-db request with its LIVE db.
        // Unsolicited replies (no pending Home) are ignored.
        if (homeTimerRef.current) {
          goHomeRef.current((e.data.db ?? null) as Record<string, unknown> | null);
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Report the captured console (count + full lines) to the parent.
  useEffect(() => {
    onConsoleCount?.(lines.length);
    onConsole?.(lines);
  }, [lines, onConsoleCount, onConsole]);

  const lastError = [...lines].reverse().find((l) => l.level === 'error' && l.text !== 'ready');

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Slim site nav bar: Home (preserves db) + the page on screen. */}
      <div className="flex shrink-0 items-center gap-2 border-b border-pg-border bg-pg-surface-2 px-3 py-1.5">
        <button
          type="button"
          data-testid="site-nav-home"
          aria-label="Home page"
          onClick={requestHome}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-bold text-pg-text-dim transition-colors hover:bg-pg-text/10 hover:text-pg-text"
        >
          <Home size={13} aria-hidden /> Home
        </button>
        <span
          data-testid="site-nav-page"
          className="truncate font-mono text-[12px] text-pg-text-muted"
        >
          {currentPage}
        </span>
      </div>

      <div className="min-h-0 flex-1 bg-pg-surface">
        <iframe
          ref={iframeRef}
          key={runKey}
          title="Site"
          data-site-frame=""
          // Deliberately allow-scripts ONLY — NO allow-same-origin /
          // allow-top-navigation / allow-forms. Never weaken this.
          sandbox="allow-scripts"
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
