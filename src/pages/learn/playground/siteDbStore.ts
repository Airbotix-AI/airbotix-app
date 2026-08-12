// Server-side database snapshots for the Website Studio's Database window
// (creative-code-studio-website-prd D-WEB-15). The site's db is REAL SQLite
// hosted by platform-backend, so this store introspects it over REST — no
// frame involvement:
//
//   - DbPane drives the polling: it calls `refresh(projectId)` on mount and
//     every DB_POLL_MS WHILE MOUNTED (mounted ⇔ the window/tab is visible, so
//     a closed Database window polls nothing).
//   - `refresh` fetches the schema (`GET /projects/:id/db/tables`) plus the
//     first rows of each table for display, and adopts the snapshot only if
//     no newer refresh/reset superseded it (a stale in-flight poll must never
//     overwrite fresher truth — e.g. right after a Reset).
//   - A failed poll KEEPS the last snapshot and leaves `updatedAt` alone, so
//     the pane's freshness hint ages honestly instead of lying "live".
//
// `tables: null` = no snapshot yet (fresh mount / project switch / just
// reset). Pure state — no React/JSX.

import { create } from 'zustand';

import { listSiteDbRows, listSiteDbTables, type SiteDbTableInfo } from './panes/playgroundApi';

/** How many rows per table the Database window displays (the heading still
 *  shows the REAL total from `row_count`). */
export const DB_ROWS_DISPLAY_LIMIT = 50;

/** One table's schema + the first rows fetched for display. */
export interface SiteDbTableSnapshot extends SiteDbTableInfo {
  rows: Record<string, unknown>[];
  /** The table has a usable SQLite rowid (D-WEB-16): each row then carries its
   *  rowid under `__rowid__` and the pane may edit/delete by it; false renders
   *  the table read-only (WITHOUT ROWID / no stable key). */
  hasRowid: boolean;
}

interface SiteDbState {
  /** The last introspection snapshot (null = none yet). */
  tables: SiteDbTableSnapshot[] | null;
  /** When that snapshot arrived (Date.now()); null with no snapshot. */
  updatedAt: number | null;
  /** The LATEST poll failed (cleared by the next success / reset). With no
   *  snapshot yet this is the pane's "db unreachable" state — without it a
   *  persistent failure would spin "Peeking…" forever. */
  error: boolean;
  /** Fetch a fresh snapshot; superseded/failed fetches never overwrite. */
  refresh: (projectId: string) => Promise<void>;
  /** Drop the snapshot AND invalidate in-flight polls (project switch /
   *  right after a Reset database call). */
  reset: () => void;
}

// Supersession counter: each refresh tags itself, `reset()` bumps it, and a
// completed fetch adopts only if it is still the newest — module-level (not
// state) because it must be read/written synchronously across awaits.
let refreshSeq = 0;

export const useSiteDbStore = create<SiteDbState>((set) => ({
  tables: null,
  updatedAt: null,
  error: false,
  refresh: async (projectId) => {
    const seq = ++refreshSeq;
    try {
      const { tables } = await listSiteDbTables(projectId);
      const snapshot = await Promise.all(
        tables.map(async (t): Promise<SiteDbTableSnapshot> => {
          const { rows, has_rowid } = await listSiteDbRows(projectId, t.name, {
            limit: DB_ROWS_DISPLAY_LIMIT,
          });
          // `=== true` is deliberate: an older backend (no D-WEB-16 field yet)
          // must degrade to read-only, never to broken edit affordances.
          return { ...t, rows, hasRowid: has_rowid === true };
        }),
      );
      if (seq !== refreshSeq) return; // superseded — never overwrite fresher truth
      set({ tables: snapshot, updatedAt: Date.now(), error: false });
    } catch {
      // A poll failure keeps the last snapshot (the freshness hint ages
      // honestly, the next poll retries) but is FLAGGED — with no snapshot
      // yet, the pane needs it to show "unreachable" instead of spinning.
      if (seq === refreshSeq) set({ error: true });
    }
  },
  reset: () => {
    refreshSeq += 1; // in-flight polls started before this must not land
    set({ tables: null, updatedAt: null, error: false });
  },
}));
