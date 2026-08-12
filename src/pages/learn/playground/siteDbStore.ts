// Live site-database snapshots for the Website Studio's Database window
// (creative-code-studio-website-prd). The site's simulated backend keeps its
// `db` INSIDE the sandboxed frame; SiteFrame is the only thing talking to that
// frame, so this store is the seam between them and the DbPane:
//
//   - SiteFrame REGISTERS a refresh trigger (posting the existing `read-db`
//     control request into the frame) and WRITES every `__airbotixSiteDb` reply
//     it receives (Home reads and Database polls share the reply — both carry
//     the same live db, so every reply is a valid snapshot).
//   - DbPane renders purely from `{db, updatedAt}` and drives the polling: it
//     calls `requestRefresh()` on an interval WHILE MOUNTED — and the pane is
//     mounted exactly when its window/tab is visible, so a closed Database
//     window polls nothing.
//
// `db: null` = no snapshot yet for the current run (fresh mount / runKey
// reset — D-WEB-04 resets the frame db to its seeds, so stale snapshots are
// dropped rather than shown as truth). Pure state — no React/JSX.

import { create } from 'zustand';

interface SiteDbState {
  /** The last live-db snapshot from the frame (null = none yet this run). */
  db: Record<string, unknown> | null;
  /** When that snapshot arrived (Date.now()); null with no snapshot. */
  updatedAt: number | null;
  /** SiteFrame's registered "post read-db into the frame" trigger. */
  refreshTrigger: (() => void) | null;
  /** Record a snapshot (every `__airbotixSiteDb` reply lands here). */
  setDb: (db: Record<string, unknown> | null, at?: number) => void;
  /** Drop the snapshot (fresh run / fresh frame — the db reset to its seeds). */
  reset: () => void;
  /** SiteFrame registers (mount) / unregisters (unmount, pass null) here. */
  registerRefresh: (trigger: (() => void) | null) => void;
  /** Ask the live frame for its db now — no-op when no frame is registered. */
  requestRefresh: () => void;
}

export const useSiteDbStore = create<SiteDbState>((set, get) => ({
  db: null,
  updatedAt: null,
  refreshTrigger: null,
  setDb: (db, at = Date.now()) => set({ db, updatedAt: at }),
  reset: () => set({ db: null, updatedAt: null }),
  registerRefresh: (trigger) => set({ refreshTrigger: trigger }),
  requestRefresh: () => {
    get().refreshTrigger?.();
  },
}));
