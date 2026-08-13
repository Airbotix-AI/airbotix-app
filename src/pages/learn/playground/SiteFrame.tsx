import { Home } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { VfsFile } from '../code/codeApi';
import {
  buildSitePreview,
  isConsoleMessage,
  isSiteNavigateMessage,
  resolveErrorLoc,
  SITE_HOME_PAGE,
  type ConsoleLine,
} from './buildSitePreview';
import { fetchProjectSource, fetchProjectSourceUrl, querySiteDb } from './panes/playgroundApi';
import { useSiteBackendChannel, type SiteBackendTransport } from './siteBackendChannel';
import {
  createRunCollector,
  isSiteReportMessage,
  PROBE_REPLY_TIMEOUT_MS,
  RUN_OBSERVE_MS,
  type RunReport,
} from './runReport';

interface SiteFrameProps {
  files: VfsFile[];
  /** The backend project whose server-side db answers the frame's `db.query`
   *  sql requests (D-WEB-15). Absent only in a project-less session, where
   *  queries fail kid-readably instead of silently hanging. */
  projectId?: string;
  /** Class shared assets resolved to ready `data:` URLs — inlined like VFS
   *  assets (same seam as GameFrame's virtualAssets). */
  virtualAssets?: VfsFile[];
  /** Bump to force a fresh page load: back to index.html, console cleared.
   *  The db is server-side (D-WEB-15) and simply PERSISTS across reloads —
   *  only the explicit Reset database affordance rebuilds it. */
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
  /**
   * Post-apply verification (D-WEB-13, same seam as GameFrame): when set, each
   * RUN (runKey) is observed for RUN_OBSERVE_MS, the in-frame shim is asked to
   * report, and the finalized website RunReport (console evidence + the shim's
   * site ledgers) is emitted EXACTLY ONCE per run — with
   * `probeError: 'no-response'` if the shim never answers.
   */
  onRunReport?: (report: RunReport) => void;
  /** 1-based chain attempt stamped into the emitted RunReport (default 1). */
  reportAttempt?: number;
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
 * channel back to the app is postMessage (console capture + the nav shim +
 * the sql channel).
 *
 * The db is REAL and server-side (D-WEB-15): this component is the frame's
 * token-holding proxy — each in-frame `db.query` arrives as an
 * `action:'sql'` postMessage, is forwarded to `POST /projects/:id/db/query`
 * with the kid's session, and the reply is posted back by request id. The
 * same proxy answers `action:'source'` (D-WEB-19): `sources.get` forwards to
 * `POST /projects/:id/sources/:name` so curated EXTERNAL data reaches the
 * site while the sandbox keeps zero egress. Page
 * navigation carries nothing (state lives on the server); the slim top bar
 * is Home (`site-nav-home`) + the current page (`site-nav-page`).
 */
export function SiteFrame({
  files,
  projectId,
  virtualAssets,
  runKey,
  showConsole = false,
  onFixError,
  onConsoleCount,
  onConsole,
  onRunReport,
  reportAttempt = 1,
}: SiteFrameProps) {
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [page, setPage] = useState(SITE_HOME_PAGE);

  // A reload (runKey bump) is a fresh page load: back to the home page,
  // console cleared. The server-side db persists — nothing else resets.
  useEffect(() => {
    setPage(SITE_HOME_PAGE);
    setLines([]);
  }, [runKey]);

  const { srcDoc, scriptRanges, currentPage } = useMemo(
    () => buildSitePreview(files, { page, virtualAssets }),
    [files, page, virtualAssets],
  );
  // Read inside the (stable) message listener without re-subscribing.
  const scriptRangesRef = useRef(scriptRanges);
  scriptRangesRef.current = scriptRanges;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // The studio backend transport: the site's `db.query` / `sources.get` /
  // `sources.fetch` calls are forwarded to the AUTHED per-project endpoints
  // with the kid's session (the frame stays token-free). The public play host
  // uses the shareId variant — everything else about the proxy is shared
  // (siteBackendChannel).
  const transport = useMemo<SiteBackendTransport>(
    () => ({
      ready: !!projectId,
      query: (sql, params) => querySiteDb(projectId as string, sql, params),
      getSource: (name, params) => fetchProjectSource(projectId as string, name, params),
      openFetch: (url) => fetchProjectSourceUrl(projectId as string, url),
    }),
    [projectId],
  );
  useSiteBackendChannel(iframeRef, transport);

  // ── Run-report collection (D-WEB-13) — mirrors GameFrame's ────────────────
  // One collector per RUN (runKey) — deliberately NOT per srcDoc: a website
  // live-rebuilds and page-navigates without a fresh run, and the evidence from
  // the whole observed window must survive those srcdoc swaps. Latest callback/
  // attempt in refs so a parent re-render never restarts the observation.
  const onRunReportRef = useRef(onRunReport);
  onRunReportRef.current = onRunReport;
  const reportAttemptRef = useRef(reportAttempt);
  reportAttemptRef.current = reportAttempt;
  const collectorRef = useRef<ReturnType<typeof createRunCollector> | null>(null);
  // Finalize-and-emit for the CURRENT run (null once emitted / between runs).
  const emitReportRef = useRef<(() => void) | null>(null);
  const collectReports = !!onRunReport;

  useEffect(() => {
    if (!collectReports) return undefined;
    const collector = createRunCollector({
      engine: 'website',
      attempt: reportAttemptRef.current,
      assetManifest: [],
    });
    collectorRef.current = collector;
    const startedAt = Date.now();
    let emitted = false;
    const emit = () => {
      if (emitted) return; // at most once per run
      emitted = true;
      emitReportRef.current = null;
      onRunReportRef.current?.(collector.finalize(Date.now() - startedAt));
    };
    emitReportRef.current = emit;
    // Observe, then ask the in-frame shim for its evidence ledgers; if it never
    // answers (shim broke / page wedged), finalize as inconclusive.
    let replyTimer: ReturnType<typeof setTimeout> | undefined;
    const probeTimer = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage({ __airbotixControl: true, action: 'report' }, '*');
      replyTimer = setTimeout(() => {
        collector.setProbeError('no-response');
        emit();
      }, PROBE_REPLY_TIMEOUT_MS);
    }, RUN_OBSERVE_MS);
    return () => {
      clearTimeout(probeTimer);
      clearTimeout(replyTimer);
      collectorRef.current = null;
      emitReportRef.current = null;
    };
  }, [collectReports, runKey]);

  useEffect(() => {
    // The sql / source proxy lives in useSiteBackendChannel (shared with the
    // public play host). This listener owns the studio-only concerns: console
    // capture (+ the run-report collector), the run-report probe reply, and
    // page navigation.
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
        // The RunReport collector stays STACK-FREE (schema-capped wire shape,
        // same posture as GameFrame); log/info lines become site.logs — the
        // model's own console.log instrumentation echoed back (D-WEB-13).
        collectorRef.current?.feedConsole({ level: e.data.level, text: e.data.text, loc });
        setLines((prev) => [
          ...prev.slice(-49),
          { level: e.data.level, text: e.data.text, loc, stack: e.data.stack },
        ]);
        return;
      }
      if (isSiteReportMessage(e.data)) {
        // The shim answered the run probe with its evidence ledgers.
        collectorRef.current?.feedSite(e.data.site);
        emitReportRef.current?.();
        return;
      }
      if (isSiteNavigateMessage(e.data)) {
        // A page-link click: just render the target page — the db is
        // server-side, so there is no state to carry (D-WEB-15).
        setPage(e.data.path);
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
      {/* Slim site nav bar: Home + the page on screen. */}
      <div className="flex shrink-0 items-center gap-2 border-b border-pg-border bg-pg-surface-2 px-3 py-1.5">
        <button
          type="button"
          data-testid="site-nav-home"
          aria-label="Home page"
          onClick={() => setPage(SITE_HOME_PAGE)}
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
