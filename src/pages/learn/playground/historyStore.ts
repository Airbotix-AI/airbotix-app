// Edit-history store — a local timeline of project snapshots for diff / peek /
// revert. Checkpoints are recorded on an IDLE AUTOSNAPSHOT (the editor commits a
// pause in typing, then records here), so work is captured without a manual save.
//
// Each checkpoint is a full snapshot of the VFS at that moment + a short summary
// of what changed vs the previous one. Identical-to-previous snapshots are
// skipped (no-op pauses don't spam the timeline), and the list is capped so a
// long session can't grow unbounded. In-memory for now; M4 persistence will
// serialize this alongside the VFS.

import { create } from 'zustand';

import type { VfsFile } from '../code/codeApi';

export interface Checkpoint {
  id: string;
  /** Epoch ms when recorded (stamped by the caller — keeps the store testable). */
  ts: number;
  /** Full VFS snapshot at this checkpoint. */
  files: VfsFile[];
  /** Human summary of what changed vs the previous checkpoint, e.g. "edited main.js". */
  summary: string;
  /** True if this point is an in-progress editing session that later edits in the
   *  same session FOLD INTO (so a burst of typing is one entry, not dozens). */
  coalescable?: boolean;
}

/** Most recent checkpoints kept; older ones drop off the end. */
const MAX_CHECKPOINTS = 50;

/** Consecutive coalescable edits within this gap fold into one save point. A kid
 *  changing a line produces several idle-autosaves; they should read as ONE
 *  "you changed your game", not one entry per pause. */
const COALESCE_WINDOW_MS = 90_000;

interface RecordOptions {
  /** This is a continuous-editing autosave: fold it into the latest save point if
   *  that one is also a recent editing session (instead of adding a new entry). */
  coalesce?: boolean;
}

interface HistoryState {
  checkpoints: Checkpoint[];
  /** Record a snapshot. No-op if identical to the latest. Returns the checkpoint (or null). */
  record: (files: VfsFile[], ts: number, summary?: string, opts?: RecordOptions) => Checkpoint | null;
  /** Restore persisted checkpoints (continues ids past the restored max). */
  hydrate: (checkpoints: Checkpoint[]) => void;
  reset: () => void;
}

/** Same paths + content? (cheap structural equality for snapshot dedupe). */
function sameFiles(a: VfsFile[], b: VfsFile[]): boolean {
  if (a.length !== b.length) return false;
  const byPath = new Map(b.map((f) => [f.path, f.content]));
  return a.every((f) => byPath.get(f.path) === f.content);
}

const base = (p: string) => p.split('/').pop() || p;

/** Short "what changed" summary comparing a new snapshot to the previous one. */
export function summarize(prev: VfsFile[] | null, next: VfsFile[]): string {
  if (!prev) return 'Initial version';
  const prevMap = new Map(prev.map((f) => [f.path, f.content]));
  const nextPaths = new Set(next.map((f) => f.path));
  const added = next.filter((f) => !prevMap.has(f.path)).map((f) => f.path);
  const removed = prev.filter((f) => !nextPaths.has(f.path)).map((f) => f.path);
  const edited = next.filter((f) => prevMap.has(f.path) && prevMap.get(f.path) !== f.content).map((f) => f.path);

  const parts: string[] = [];
  if (edited.length) parts.push(`edited ${base(edited[0])}${edited.length > 1 ? ` +${edited.length - 1}` : ''}`);
  if (added.length) parts.push(`added ${base(added[0])}${added.length > 1 ? ` +${added.length - 1}` : ''}`);
  if (removed.length) parts.push(`removed ${base(removed[0])}${removed.length > 1 ? ` +${removed.length - 1}` : ''}`);
  return parts.join(', ') || 'No change';
}

let counter = 0;
const nextId = () => `cp_${(counter += 1)}`;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  checkpoints: [],

  record: (files, ts, summary, opts) => {
    const { checkpoints } = get();
    const latest = checkpoints[0];
    if (latest && sameFiles(latest.files, files)) return null;
    const snapshot = files.map((f) => ({ ...f })); // snapshot copy

    // Fold a continuous-editing autosave into the current session: replace the
    // latest point in place (keeping its id) and re-summarise against the point
    // BEFORE the session, so the timeline shows one evolving "you changed your
    // game" instead of one entry per keystroke-pause.
    if (opts?.coalesce && latest?.coalescable && ts - latest.ts < COALESCE_WINDOW_MS) {
      const before = checkpoints[1]?.files ?? null;
      const updated: Checkpoint = {
        ...latest,
        ts,
        files: snapshot,
        summary: summary ?? summarize(before, files),
      };
      set({ checkpoints: [updated, ...checkpoints.slice(1)] });
      return updated;
    }

    const cp: Checkpoint = {
      id: nextId(),
      ts,
      files: snapshot,
      summary: summary ?? summarize(latest?.files ?? null, files),
      coalescable: opts?.coalesce,
    };
    set({ checkpoints: [cp, ...checkpoints].slice(0, MAX_CHECKPOINTS) });
    return cp;
  },

  hydrate: (checkpoints) => {
    // Continue the id counter past the restored max so new ids don't collide.
    counter = checkpoints.reduce((m, c) => Math.max(m, Number(c.id.replace('cp_', '')) || 0), 0);
    set({ checkpoints });
  },

  reset: () => set({ checkpoints: [] }),
}));
