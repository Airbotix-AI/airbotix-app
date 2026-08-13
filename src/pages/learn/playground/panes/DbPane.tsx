// The Database window (Website Studio only, creative-code-studio-website-prd
// D-WEB-15/16/18): the project's REAL server-side SQLite database as a
// professional master–detail db tool — a LEFT sidebar listing every table
// (live row counts, `db-table-<name>`, first table auto-selected) and a
// RIGHT panel showing the SELECTED table as the D-WEB-16 editable grid
// (`DbTable`: inline cell edit / add row / two-step delete, keyed by rowid,
// wrapped in `db-collection-<name>`). The toolbar carries Refresh + freshness
// + the selected table's `data/*.json` seed jump + the explicit two-step
// Reset database (the ONLY reset path — rebuilds every table from the seeds).
// The D-WEB-19 "Data sources" discovery group was REMOVED (owner feedback
// 2026-08-13): with the open `sources.fetch(url)` door (D-WEB-23) the curated
// listing earned no space here — the AI + Website Guide teach sources now.
//
// Data flow: this pane renders purely from `siteDbStore` (REST introspection —
// GET /projects/:id/db/tables + first rows per table; NEVER the JSON seeds)
// and DRIVES the polling: it refreshes on mount and every DB_POLL_MS while
// mounted (mounted ⇔ the window/tab is visible, so a closed Database window
// costs nothing). Selection is kept by NAME so it survives every poll; a
// selected table that vanished (e.g. a Reset removed a runtime table) falls
// back to the first table.

import { Database, Loader2, Pencil, RefreshCw, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api';
import type { VfsFile } from '../../code/codeApi';
import { useSiteDbStore } from '../siteDbStore';
import { DbSidebar } from './DbSidebar';
import { DbTable } from './DbTable';
import { resetSiteDb } from './playgroundApi';

/** How often the pane re-introspects the server db while open (ms). */
export const DB_POLL_MS = 2000;
/** A snapshot younger than this reads as "live" (two polls + slack). */
const LIVE_WINDOW_MS = DB_POLL_MS * 2 + 500;
/** An armed Reset disarms itself after this long without the second click. */
const RESET_CONFIRM_MS = 5000;

const TOOLBAR_BUTTON =
  'inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold text-pg-text-dim transition-colors hover:bg-pg-text/10 hover:text-pg-text';

interface DbPaneProps {
  /** The backend project whose db this window introspects (D-WEB-15). */
  projectId?: string;
  /** The project VFS — locates the selected table's `data/<name>.json` seed. */
  files: VfsFile[];
  /** Open a seed file in the code editor (the same seam the agent's
   *  `open_file` client action uses). */
  onOpenDataFile?: (path: string) => void;
  /** Teacher live viewer — the editor is read-only there, so "Edit starting
   *  data" and "Reset database" would be dead/destructive promises; hide both. */
  readOnly?: boolean;
}

/**
 * Website Studio's Database window: a two-panel db tool — table list left,
 * the selected table's editable grid right — refreshed live (~2 s) while open,
 * with a toolbar for Refresh / the seed-file jump / the two-step Reset.
 */
export function DbPane({ projectId, files, onOpenDataFile, readOnly = false }: DbPaneProps) {
  const tables = useSiteDbStore((s) => s.tables);
  const sizeBytes = useSiteDbStore((s) => s.sizeBytes);
  const updatedAt = useSiteDbStore((s) => s.updatedAt);
  const pollError = useSiteDbStore((s) => s.error);
  const refresh = useSiteDbStore((s) => s.refresh);
  const dropSnapshot = useSiteDbStore((s) => s.reset);

  // The kid's table pick, by NAME — poll refreshes replace the snapshot but
  // never this, so selection survives them. null = "the first table".
  const [selectedName, setSelectedName] = useState<string | null>(null);

  // Poll while mounted — mounted ⇔ visible (closed windows render nothing), so
  // this IS the "never poll while closed" guarantee. The snapshot (and the
  // table pick) is dropped first so another project's tables never flash as
  // this project's truth. A hidden TAB pauses the interval (no point polling a
  // page nobody sees); coming back refreshes immediately.
  useEffect(() => {
    if (!projectId) return undefined;
    dropSnapshot();
    setSelectedName(null);
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

  // The EFFECTIVE selection: the picked table when it still exists, else the
  // first table (auto-select on load; fallback when a Reset removed it).
  const selected = tables?.find((t) => t.name === selectedName) ?? tables?.[0] ?? null;
  const seedPath =
    selected === null
      ? undefined
      : files.find((f) => f.kind === 'text' && f.path === `data/${selected.name}.json`)?.path;

  return (
    <div data-testid="site-db-pane" className="flex h-full min-h-0 flex-col bg-pg-surface">
      {/* Toolbar: identity + freshness + Refresh + seed jump + Reset. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-1.5 gap-y-1 border-b border-pg-border bg-pg-surface-2 px-2 py-1.5">
        <Database size={14} aria-hidden className="text-brand-sky" />
        <span className="text-[12px] font-bold text-pg-text-dim">Database</span>
        <span data-testid="db-freshness" className="text-[11px] font-semibold text-pg-text-muted">
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
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Refresh database"
            data-testid="db-refresh"
            title="Refresh database"
            onClick={() => {
              if (!projectId) return;
              void refresh(projectId);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-pg-text-dim transition-colors hover:bg-pg-text/10 hover:text-pg-text"
          >
            <RefreshCw size={14} aria-hidden />
          </button>
          {!readOnly && selected && seedPath && onOpenDataFile && (
            <button
              type="button"
              data-testid={`db-edit-${selected.name}`}
              title={`Open ${seedPath} in the code editor`}
              onClick={() => onOpenDataFile(seedPath)}
              className={TOOLBAR_BUTTON}
            >
              <Pencil size={11} aria-hidden /> Edit starting data
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              data-testid="db-reset"
              aria-label="Reset database"
              disabled={resetState === 'busy' || !projectId}
              onClick={() => void onResetClick()}
              className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-60 ${
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
        </div>
      </div>

      {/* The teaching line, compact: a real persistent db vs the data/*.json
          seeds. Same story as before D-WEB-18, one subtle info line. */}
      <p className="shrink-0 border-b border-pg-border px-3 py-1.5 text-[11px] leading-snug text-pg-text-muted">
        Your database lives on Airbotix servers and KEEPS its data — even after a reload. Edits
        here change the LIVE database right away; your{' '}
        <span className="font-mono">data/*.json</span> files are the starting data — Reset
        database rebuilds every table from them and wipes your changes.
      </p>
      {resetError && (
        <p className="shrink-0 px-3 py-1 text-[11px] font-semibold text-brand-coral">
          {resetError}
        </p>
      )}

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
      ) : tables.length === 0 || selected === null ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span aria-hidden className="text-4xl">🗃️</span>
          <p className="text-[13px] font-bold text-pg-text-dim">No tables yet…</p>
          <p className="max-w-[36ch] text-[12px] text-pg-text-muted">
            Add a <span className="font-mono">data/&lt;name&gt;.json</span> starting file, or
            CREATE TABLE from your <span className="font-mono">server.js</span> code!
          </p>
        </div>
      ) : (
        // Master–detail (D-WEB-18): tables left, the selected table's grid right.
        // The sidebar keeps a sane min width; a narrow pane scrolls the grid.
        <div className="flex min-h-0 flex-1">
          <DbSidebar
            tables={tables}
            selectedName={selected.name}
            onSelect={setSelectedName}
            sizeBytes={sizeBytes}
          />
          <div
            data-testid={`db-collection-${selected.name}`}
            className="flex min-h-0 min-w-0 flex-1 flex-col p-3"
          >
            <DbTable table={selected} projectId={projectId} readOnly={readOnly} />
          </div>
        </div>
      )}
    </div>
  );
}
