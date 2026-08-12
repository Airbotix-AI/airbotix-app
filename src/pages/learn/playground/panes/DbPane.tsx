// The Database window (Website Studio only, creative-code-studio-website-prd):
// what the site's simulated backend remembers RIGHT NOW — the live in-frame
// `db` — rendered kid-friendly. READ-ONLY v1: looking inside the machine, not
// editing it (permanent starting data lives in data/*.json, one click away).
//
// Data flow: this pane renders purely from `siteDbStore` and DRIVES the
// polling — it requests a refresh on mount and every DB_POLL_MS while mounted
// (mounted ⇔ the window/tab is visible, so a closed Database window costs
// nothing); SiteFrame answers by posting the existing `read-db` control request
// into the sandboxed frame and writing the reply back to the store. A reload
// (runKey bump) resets the store — the pane then shows the fresh seeds again,
// which is exactly the D-WEB-04 semantics.

import { Database, Loader2, Pencil, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { VfsFile } from '../../code/codeApi';
import { ensureGameRunnerVisible } from '../playgroundStore';
import { useSiteDbStore } from '../siteDbStore';

/** How often the pane asks the live frame for its db while open (ms). */
export const DB_POLL_MS = 2000;
/** A snapshot younger than this reads as "live" (two polls + slack). */
const LIVE_WINDOW_MS = DB_POLL_MS * 2 + 500;
/** Longest rendered cell/value — the pane is a window, not a data dump. */
const VALUE_CLIP_CHARS = 120;

/** Kid-readable stringification of one db value, clipped. */
function renderValue(v: unknown): string {
  let s: string;
  if (typeof v === 'string') s = v;
  else {
    try {
      s = JSON.stringify(v) ?? String(v);
    } catch {
      s = String(v);
    }
  }
  return s.length > VALUE_CLIP_CHARS ? `${s.slice(0, VALUE_CLIP_CHARS)}…` : s;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** The heading suffix: arrays count rows, objects count fields, primitives none. */
function countLabel(value: unknown): string | null {
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? 'row' : 'rows'}`;
  if (isPlainObject(value)) {
    const n = Object.keys(value).length;
    return `${n} ${n === 1 ? 'field' : 'fields'}`;
  }
  return null;
}

const CELL = 'border-b border-pg-border px-2 py-1 align-top font-mono text-[12px]';

/** An array of objects → a table (columns = the union of item keys). */
function RowsTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) if (!columns.includes(key)) columns.push(key);
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-pg-border">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} className={`${CELL} bg-pg-surface-2 font-bold text-pg-text-dim`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c} className={`${CELL} text-pg-text`}>
                  {c in row ? renderValue(row[c]) : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One db key ("collection") rendered by shape: table / list / fields / value. */
function Collection({
  name,
  value,
  seedPath,
  onOpenDataFile,
}: {
  name: string;
  value: unknown;
  /** The `data/<name>.json` VFS path when it exists — gates the edit affordance. */
  seedPath?: string;
  onOpenDataFile?: (path: string) => void;
}) {
  const count = countLabel(value);
  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-2">
        <h3
          data-testid={`db-collection-${name}`}
          className="text-[13px] font-extrabold text-pg-text"
        >
          {name}
          {count && <span className="font-semibold text-pg-text-muted"> · {count}</span>}
        </h3>
        {seedPath && onOpenDataFile && (
          <button
            type="button"
            data-testid={`db-edit-${name}`}
            title={`Open ${seedPath} in the code editor`}
            onClick={() => onOpenDataFile(seedPath)}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-pg-text-dim transition-colors hover:bg-pg-text/10 hover:text-pg-text"
          >
            <Pencil size={11} aria-hidden /> Edit starting data
          </button>
        )}
      </div>
      {Array.isArray(value) ? (
        value.length === 0 ? (
          <p className="text-[12px] text-pg-text-muted">No rows yet.</p>
        ) : value.every(isPlainObject) ? (
          <RowsTable rows={value as Array<Record<string, unknown>>} />
        ) : (
          <ul className="space-y-0.5 rounded-lg border border-pg-border px-3 py-2">
            {value.map((item, i) => (
              <li key={i} className="font-mono text-[12px] text-pg-text">
                {renderValue(item)}
              </li>
            ))}
          </ul>
        )
      ) : isPlainObject(value) ? (
        <div className="rounded-lg border border-pg-border">
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="flex gap-2 border-b border-pg-border px-2 py-1 last:border-b-0">
              <span className="shrink-0 font-mono text-[12px] font-bold text-pg-text-dim">{k}</span>
              <span className="min-w-0 break-words font-mono text-[12px] text-pg-text">
                {renderValue(v)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-pg-border px-3 py-2 font-mono text-[12px] text-pg-text">
          {renderValue(value)}
        </p>
      )}
    </section>
  );
}

interface DbPaneProps {
  /** The project VFS — locates each collection's `data/<name>.json` seed. */
  files: VfsFile[];
  /** Open a seed file in the code editor (the same seam the agent's
   *  `open_file` client action uses). */
  onOpenDataFile?: (path: string) => void;
  /** Teacher live viewer — the editor is read-only there, so "Edit starting
   *  data" would be a dead promise; hide it. */
  readOnly?: boolean;
}

/**
 * Website Studio's Database window: one section per db key ("collection"),
 * refreshed live (~2 s) while open + a manual Refresh, with a per-collection
 * jump to the `data/*.json` seed. Read-only.
 */
export function DbPane({ files, onOpenDataFile, readOnly = false }: DbPaneProps) {
  const db = useSiteDbStore((s) => s.db);
  const updatedAt = useSiteDbStore((s) => s.updatedAt);
  const requestRefresh = useSiteDbStore((s) => s.requestRefresh);

  // Poll while mounted — mounted ⇔ visible (closed windows render nothing), so
  // this IS the "never poll while closed" guarantee. The db lives in the site
  // frame, which only exists while the Website window is on screen (window
  // mode) — open it silently (no raise; no-op in split mode / already open) so
  // the pane has a live frame to ask.
  useEffect(() => {
    ensureGameRunnerVisible();
    requestRefresh();
    const timer = setInterval(requestRefresh, DB_POLL_MS);
    return () => clearInterval(timer);
  }, [requestRefresh]);

  // 1s ticker so the "updated Xs ago" hint stays honest when the live frame
  // stops answering (e.g. the Website window was closed mid-session).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const ageMs = updatedAt === null ? null : Math.max(0, now - updatedAt);
  const collections = db === null ? [] : Object.entries(db);
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
          onClick={requestRefresh}
          className="flex h-7 w-7 items-center justify-center rounded-md text-pg-text-dim transition-colors hover:bg-pg-text/10 hover:text-pg-text"
        >
          <RefreshCw size={14} aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {/* The one teaching line: runtime memory vs permanent starting data. */}
        <p className="text-[11px] leading-relaxed text-pg-text-muted">
          Your site remembers changes only while it runs — a reload starts fresh. Permanent
          starting data lives in your <span className="font-mono">data/*.json</span> files.
        </p>

        {db === null ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Loader2 size={18} aria-hidden className="animate-spin text-pg-text-muted" />
            <p className="text-[12px] text-pg-text-muted">Peeking into your site's memory…</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span aria-hidden className="text-4xl">🗃️</span>
            <p className="text-[13px] font-bold text-pg-text-dim">
              Your backend isn't remembering anything yet…
            </p>
            <p className="max-w-[36ch] text-[12px] text-pg-text-muted">
              Add a <span className="font-mono">data/*.json</span> file, or ask your AI helper to
              make a route that saves something!
            </p>
          </div>
        ) : (
          collections.map(([name, value]) => (
            <Collection
              key={name}
              name={name}
              value={value}
              seedPath={readOnly ? undefined : seedPathOf(name)}
              onOpenDataFile={onOpenDataFile}
            />
          ))
        )}
      </div>
    </div>
  );
}
