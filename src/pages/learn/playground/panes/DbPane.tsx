// The Database window (Website Studio only, creative-code-studio-website-prd
// D-WEB-15/16): the project's REAL server-side SQLite database, rendered
// kid-friendly and EDITABLE — each table is a `DbTable` (inline cell edit /
// add row / two-step delete, keyed by rowid). The db lives on Airbotix servers
// and KEEPS its data across reloads and sessions; `data/*.json` files are the
// STARTING data, and the explicit Reset database button here is the ONLY reset
// path (rebuilds every table from those seeds and wipes changes).
//
// Data flow: this pane renders purely from `siteDbStore` (REST introspection —
// GET /projects/:id/db/tables + first rows per table) and DRIVES the polling:
// it refreshes on mount and every DB_POLL_MS while mounted (mounted ⇔ the
// window/tab is visible, so a closed Database window costs nothing).

import { Database, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api';
import type { VfsFile } from '../../code/codeApi';
import { useSiteDbStore } from '../siteDbStore';
import { DbTable } from './DbTable';
import { resetSiteDb } from './playgroundApi';

/** How often the pane re-introspects the server db while open (ms). */
export const DB_POLL_MS = 2000;
/** A snapshot younger than this reads as "live" (two polls + slack). */
const LIVE_WINDOW_MS = DB_POLL_MS * 2 + 500;
/** An armed Reset disarms itself after this long without the second click. */
const RESET_CONFIRM_MS = 5000;

interface DbPaneProps {
  /** The backend project whose db this window introspects (D-WEB-15). */
  projectId?: string;
  /** The project VFS — locates each table's `data/<name>.json` seed. */
  files: VfsFile[];
  /** Open a seed file in the code editor (the same seam the agent's
   *  `open_file` client action uses). */
  onOpenDataFile?: (path: string) => void;
  /** Teacher live viewer — the editor is read-only there, so "Edit starting
   *  data" and "Reset database" would be dead/destructive promises; hide both. */
  readOnly?: boolean;
}

/**
 * Website Studio's Database window: one section per server-side table,
 * refreshed live (~2 s) while open + a manual Refresh, a per-table jump to the
 * `data/*.json` seed, and the explicit two-step Reset database affordance.
 */
export function DbPane({ projectId, files, onOpenDataFile, readOnly = false }: DbPaneProps) {
  const tables = useSiteDbStore((s) => s.tables);
  const updatedAt = useSiteDbStore((s) => s.updatedAt);
  const pollError = useSiteDbStore((s) => s.error);
  const refresh = useSiteDbStore((s) => s.refresh);
  const dropSnapshot = useSiteDbStore((s) => s.reset);

  // Poll while mounted — mounted ⇔ visible (closed windows render nothing), so
  // this IS the "never poll while closed" guarantee. The snapshot is dropped
  // first so another project's tables never flash as this project's truth.
  // A hidden TAB pauses the interval (no point polling a page nobody sees);
  // coming back refreshes immediately.
  useEffect(() => {
    if (!projectId) return undefined;
    dropSnapshot();
    void refresh(projectId);
    const timer = setInterval(() => {
      if (!document.hidden) void refresh(projectId);
    }, DB_POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void refresh(projectId);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [projectId, refresh, dropSnapshot]);

  // 1s ticker so the "updated Xs ago" hint stays honest when polls start
  // failing (offline / backend blip) — the snapshot ages visibly.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset database — two-step inline confirmation (no browser confirm()):
  // the first click ARMS the button, the second fires; arming times out.
  const [resetState, setResetState] = useState<'idle' | 'armed' | 'busy'>('idle');
  const [resetError, setResetError] = useState<string | null>(null);
  const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (disarmTimer.current) clearTimeout(disarmTimer.current);
    },
    [],
  );
  const onResetClick = async () => {
    if (!projectId || resetState === 'busy') return;
    if (resetState === 'idle') {
      setResetState('armed');
      setResetError(null);
      disarmTimer.current = setTimeout(() => setResetState('idle'), RESET_CONFIRM_MS);
      return;
    }
    if (disarmTimer.current) clearTimeout(disarmTimer.current);
    setResetState('busy');
    try {
      await resetSiteDb(projectId);
      dropSnapshot(); // in-flight polls from before the reset must not land
      await refresh(projectId);
    } catch (err) {
      setResetError(
        err instanceof ApiError && err.message
          ? err.message
          : 'The reset did not go through — try again in a moment.',
      );
    } finally {
      setResetState('idle');
    }
  };

  const ageMs = updatedAt === null ? null : Math.max(0, now - updatedAt);
  const seedPathOf = (name: string): string | undefined =>
    files.find((f) => f.kind === 'text' && f.path === `data/${name}.json`)?.path;

  return (
    <div data-testid="site-db-pane" className="flex h-full min-h-0 flex-col bg-pg-surface">
      {/* Header: freshness + manual refresh. */}
      <div className="flex shrink-0 items-center gap-2 border-b border-pg-border bg-pg-surface-2 px-3 py-1.5">
        <Database size={14} aria-hidden className="text-brand-sky" />
        <span className="text-[12px] font-bold text-pg-text-dim">
          What your backend remembers right now
        </span>
        <span data-testid="db-freshness" className="ml-auto text-[11px] font-semibold text-pg-text-muted">
          {ageMs === null ? (
            '—'
          ) : ageMs < LIVE_WINDOW_MS ? (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-mint" /> live
            </span>
          ) : (
            `updated ${Math.round(ageMs / 1000)}s ago`
          )}
        </span>
        <button
          type="button"
          aria-label="Refresh database"
          data-testid="db-refresh"
          title="Refresh database"
          onClick={() => {
            if (projectId) void refresh(projectId);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-pg-text-dim transition-colors hover:bg-pg-text/10 hover:text-pg-text"
        >
          <RefreshCw size={14} aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {/* The teaching lines: a real persistent db vs the data/*.json seeds. */}
        <div className="space-y-2">
          <p className="text-[11px] leading-relaxed text-pg-text-muted">
            Your database lives on Airbotix servers and KEEPS its data — even after a reload.
            Edits you make here change the LIVE database right away.
            Your <span className="font-mono">data/*.json</span> files are the starting data:
            Reset database rebuilds every table from them and wipes your changes.
          </p>
          {!readOnly && (
            <button
              type="button"
              data-testid="db-reset"
              aria-label="Reset database"
              disabled={resetState === 'busy' || !projectId}
              onClick={() => void onResetClick()}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-60 ${
                resetState === 'armed'
                  ? 'border-brand-coral bg-wash-coral text-ink hover:bg-brand-coral hover:text-white'
                  : 'border-pg-border text-pg-text-dim hover:bg-pg-text/10 hover:text-pg-text'
              }`}
            >
              <RotateCcw size={11} aria-hidden />
              {resetState === 'busy'
                ? 'Resetting…'
                : resetState === 'armed'
                  ? 'Really reset? This wipes your changes'
                  : 'Reset database'}
            </button>
          )}
          {resetError && (
            <p className="text-[11px] font-semibold text-brand-coral">{resetError}</p>
          )}
        </div>

        {tables === null && pollError && projectId ? (
          // The FIRST introspection keeps failing (offline / backend blip) —
          // an honest dead-end beats an infinite "Peeking…" spinner.
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span aria-hidden className="text-4xl">🔌</span>
            <p className="text-[13px] font-bold text-pg-text-dim">
              Your database didn't answer…
            </p>
            <p className="max-w-[36ch] text-[12px] text-pg-text-muted">
              Check your internet connection, then try again.
            </p>
            <button
              type="button"
              data-testid="db-retry"
              onClick={() => void refresh(projectId)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-pg-border px-2.5 py-1 text-[11px] font-bold text-pg-text-dim transition-colors hover:bg-pg-text/10 hover:text-pg-text"
            >
              <RefreshCw size={11} aria-hidden /> Try again
            </button>
          </div>
        ) : tables === null ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Loader2 size={18} aria-hidden className="animate-spin text-pg-text-muted" />
            <p className="text-[12px] text-pg-text-muted">Peeking into your database…</p>
          </div>
        ) : tables.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span aria-hidden className="text-4xl">🗃️</span>
            <p className="text-[13px] font-bold text-pg-text-dim">No tables yet…</p>
            <p className="max-w-[36ch] text-[12px] text-pg-text-muted">
              Add a <span className="font-mono">data/&lt;name&gt;.json</span> starting file, or
              CREATE TABLE from your <span className="font-mono">server.js</span> code!
            </p>
          </div>
        ) : (
          tables.map((table) => (
            <DbTable
              key={table.name}
              table={table}
              projectId={projectId}
              readOnly={readOnly}
              seedPath={readOnly ? undefined : seedPathOf(table.name)}
              onOpenDataFile={onOpenDataFile}
            />
          ))
        )}
      </div>
    </div>
  );
}
