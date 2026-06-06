// History timeline (the left-sidebar "History" view of the Code Editor). Lists
// the project checkpoints newest-first, grouped into coarse time chunks. Expand a
// checkpoint to see which files changed SINCE it; click a file to diff (peek the
// old version on the left), or Revert the whole project back to that snapshot.

import { ChevronDown, ChevronRight, History, RotateCcw } from 'lucide-react';
import { useState } from 'react';

import type { VfsFile } from '../../code/codeApi';
import { useHistoryStore, type Checkpoint } from '../historyStore';

interface HistoryPanelProps {
  currentFiles: VfsFile[];
  /** Open a diff: left = historical (peek), right = current. */
  onDiff: (path: string, original: string, modified: string) => void;
  /** Revert the project to a checkpoint. */
  onRevert: (cp: Checkpoint) => void;
}

type FileStatus = 'edited' | 'added' | 'removed';

/** Files that differ between a checkpoint (then) and the current VFS (now). */
function changedSince(cp: Checkpoint, current: VfsFile[]): { path: string; status: FileStatus }[] {
  const then = new Map(cp.files.map((f) => [f.path, f.content]));
  const now = new Map(current.map((f) => [f.path, f.content]));
  const out: { path: string; status: FileStatus }[] = [];
  for (const path of new Set([...then.keys(), ...now.keys()])) {
    const inThen = then.has(path);
    const inNow = now.has(path);
    if (inThen && inNow) {
      if (then.get(path) !== now.get(path)) out.push({ path, status: 'edited' });
    } else if (inThen) out.push({ path, status: 'removed' }); // existed then, gone now
    else out.push({ path, status: 'added' }); // added since
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

/** Coarse time chunk for grouping ("Just now" / "Earlier today" / "Older"). */
function chunkOf(ts: number, now: number): string {
  const min = (now - ts) / 60_000;
  if (min < 2) return 'Just now';
  if (min < 60) return 'Last hour';
  if (min < 60 * 24) return 'Earlier today';
  return 'Older';
}

function clock(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

const STATUS_COLOR: Record<FileStatus, string> = {
  edited: 'text-brand-sky',
  added: 'text-brand-mint',
  removed: 'text-brand-coral',
};
const base = (p: string) => p.split('/').pop() || p;

export function HistoryPanel({ currentFiles, onDiff, onRevert }: HistoryPanelProps) {
  const checkpoints = useHistoryStore((s) => s.checkpoints);
  const [open, setOpen] = useState<string | null>(null);
  const now = Date.now();

  if (checkpoints.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <PanelHeader />
        <p className="px-3 py-3 text-[12px] font-semibold text-pg-text-muted">
          No history yet. Your edits are snapshotted automatically as you work.
        </p>
      </div>
    );
  }

  // Group consecutive checkpoints into time chunks, preserving newest-first order.
  let lastChunk = '';

  return (
    <div className="flex h-full flex-col">
      <PanelHeader />
      <ul className="min-h-0 flex-1 overflow-auto px-2 pb-3" data-testid="history-list">
        {checkpoints.map((cp, i) => {
          const chunk = chunkOf(cp.ts, now);
          const showChunk = chunk !== lastChunk;
          lastChunk = chunk;
          const isOpen = open === cp.id;
          const Chevron = isOpen ? ChevronDown : ChevronRight;
          const changes = isOpen ? changedSince(cp, currentFiles) : [];
          const isCurrent = i === 0;
          return (
            <li key={cp.id}>
              {showChunk && (
                <div className="px-2 pt-3 pb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-pg-text-muted">
                  {chunk}
                </div>
              )}
              <div className="group flex items-center rounded-lg pr-1.5 transition-colors hover:bg-pg-text/5">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : cp.id)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pl-1.5 text-left"
                >
                  <Chevron size={13} className="shrink-0 text-pg-text-muted" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-pg-text">{cp.summary}</span>
                    <span className="block text-[10px] text-pg-text-muted">
                      {clock(cp.ts)}
                      {isCurrent ? ' · current' : ''}
                    </span>
                  </span>
                </button>
                {!isCurrent && (
                  <button
                    type="button"
                    aria-label={`Revert to ${cp.summary}`}
                    title="Revert to this version"
                    onClick={() => onRevert(cp)}
                    className="rounded p-1 text-pg-text-muted opacity-0 transition-opacity hover:bg-pg-text/10 hover:text-pg-text group-hover:opacity-100"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
              {isOpen && (
                <ul className="pb-1 pl-6">
                  {changes.length === 0 ? (
                    <li className="px-2 py-1 text-[11px] text-pg-text-muted">No changes since this version.</li>
                  ) : (
                    changes.map(({ path, status }) => (
                      <li key={path}>
                        <button
                          type="button"
                          aria-label={`Diff ${path}`}
                          onClick={() => {
                            const orig = cp.files.find((f) => f.path === path)?.content ?? '';
                            const mod = currentFiles.find((f) => f.path === path)?.content ?? '';
                            onDiff(path, orig, mod);
                          }}
                          className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[12px] text-pg-text-dim hover:bg-pg-text/5 hover:text-pg-text"
                        >
                          <span className={`text-[10px] font-bold uppercase ${STATUS_COLOR[status]}`}>
                            {status[0]}
                          </span>
                          <span className="truncate">{base(path)}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PanelHeader() {
  return (
    <div className="flex items-center gap-1.5 px-3 pt-3 pb-1">
      <History size={14} aria-hidden className="text-brand-sky" />
      <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-sky">History</span>
    </div>
  );
}
