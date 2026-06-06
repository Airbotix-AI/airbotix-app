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
}

/** Most recent checkpoints kept; older ones drop off the end. */
const MAX_CHECKPOINTS = 50;

interface HistoryState {
  checkpoints: Checkpoint[];
  /** Record a snapshot. No-op if identical to the latest. Returns the new checkpoint (or null). */
  record: (files: VfsFile[], ts: number, summary?: string) => Checkpoint | null;
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

  record: (files, ts, summary) => {
    const { checkpoints } = get();
    const latest = checkpoints[0];
    if (latest && sameFiles(latest.files, files)) return null;
    const cp: Checkpoint = {
      id: nextId(),
      ts,
      files: files.map((f) => ({ ...f })), // snapshot copy
      summary: summary ?? summarize(latest?.files ?? null, files),
    };
    set({ checkpoints: [cp, ...checkpoints].slice(0, MAX_CHECKPOINTS) });
    return cp;
  },

  reset: () => set({ checkpoints: [] }),
}));
