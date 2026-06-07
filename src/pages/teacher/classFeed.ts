// Pure class-feed reducer (no React, no network): folds the live WS events the
// kid sessions broadcast (D-GAME5: game.vfs.changed / game.run / game.console)
// into the per-kid tile status, and orders the tiles so the teacher's attention
// goes to the right place. Kept pure so it is byte-deterministic and unit-tested
// without a browser (PRD §10.2 / §17.0 determinism toolkit).

import type { KidStatus, KidTile } from './classApi';

/** The lightweight live events a kid session broadcasts to the class room
 *  (PRD §9 D-GAME5a). PII-redacted at the source. */
export type ClassFeedEvent =
  | { type: 'game.run'; kidId: string; state: 'started' | 'error'; thumbnailDataUrl?: string }
  | { type: 'game.vfs.changed'; kidId: string; at: number }
  | { type: 'game.idle'; kidId: string }
  | { type: 'hand.raised'; kidId: string; at: number }
  | { type: 'hand.cleared'; kidId: string }
  | { type: 'takeover.changed'; kidId: string; takenOver: boolean };

/** Status priority for tile ordering: higher = more urgent (sorts to top).
 *  A raised hand and an on-screen error both pull a kid to the front (§17.12
 *  acceptance: stuck/error kids auto-flagged to the top). */
const STATUS_RANK: Record<KidStatus, number> = {
  error: 3,
  'share-pending': 2,
  idle: 1,
  running: 0,
};

/**
 * Apply one live event to the tile list, returning a NEW list (immutable — safe
 * to set straight into React state). Unknown kidIds are ignored (a kid not in
 * this class room can't appear). The reducer maps each broadcast to the J12
 * status model:
 *  - game.run started → running (+ optional fresh thumbnail)
 *  - game.run error   → error
 *  - game.vfs.changed → running (the kid is actively editing)
 *  - game.idle        → idle (maybe-stuck; §17.15 idle≠stuck is a backend concern)
 */
export function applyFeedEvent(tiles: KidTile[], ev: ClassFeedEvent): KidTile[] {
  return tiles.map((t) => {
    if (t.kidId !== ev.kidId) return t;
    switch (ev.type) {
      case 'game.run':
        return {
          ...t,
          status: ev.state === 'error' ? 'error' : 'running',
          thumbnailDataUrl: ev.thumbnailDataUrl ?? t.thumbnailDataUrl,
        };
      case 'game.vfs.changed':
        // An active edit clears a stale idle/error back to running.
        return { ...t, status: 'running' };
      case 'game.idle':
        return { ...t, status: 'idle' };
      case 'hand.raised':
        return { ...t, needsHelp: true, handRaisedAt: ev.at };
      case 'hand.cleared':
        return { ...t, needsHelp: false, handRaisedAt: null };
      case 'takeover.changed':
        return { ...t, takenOver: ev.takenOver };
      default:
        return t;
    }
  });
}

/**
 * Order tiles for the dashboard grid (§17.12 + §17.17):
 *  1. needs-help kids first, ordered by wait-time (longest-waited first) so a
 *     child under "she's coming" is never forgotten;
 *  2. then by status urgency (error > share-pending > idle > running);
 *  3. then stable by nickname for deterministic rendering.
 * Pure + total order → byte-stable across runs (no flaky test ordering).
 */
export function sortTiles(tiles: KidTile[]): KidTile[] {
  return [...tiles].sort((a, b) => {
    if (a.needsHelp !== b.needsHelp) return a.needsHelp ? -1 : 1;
    if (a.needsHelp && b.needsHelp) {
      // Both waiting → earliest raised hand (smallest timestamp) first.
      const aT = a.handRaisedAt ?? Number.MAX_SAFE_INTEGER;
      const bT = b.handRaisedAt ?? Number.MAX_SAFE_INTEGER;
      if (aT !== bT) return aT - bT;
    }
    const rank = STATUS_RANK[b.status] - STATUS_RANK[a.status];
    if (rank !== 0) return rank;
    return a.nickname.localeCompare(b.nickname);
  });
}

/** The raised-hands queue, longest-waited first (drives the hands panel). */
export function raisedHands(tiles: KidTile[]): KidTile[] {
  return tiles
    .filter((t) => t.needsHelp)
    .sort((a, b) => (a.handRaisedAt ?? 0) - (b.handRaisedAt ?? 0));
}
