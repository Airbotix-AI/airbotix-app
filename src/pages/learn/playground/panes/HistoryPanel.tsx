// History timeline (the left-sidebar "History" view of the Code Editor), as a
// two-column master-detail:
//   - left  = the project checkpoints, newest-first (click to select; no expand);
//   - right = the files THAT entry changed — i.e. diffed against the checkpoint
//             RIGHT BEFORE it (so "edited GameOver.js" lists GameOver.js with a
//             real before→after diff, not "changes since now").
// Click a file → open its diff tab (left = the older version / peek, right = this
// version). Revert (in the detail header) restores the whole project to the entry.

import { History, RotateCcw } from 'lucide-react';
import { useState } from 'react';

import type { VfsFile } from '../../code/codeApi';
import { useHistoryStore, type Checkpoint } from '../historyStore';

interface HistoryPanelProps {
  /** Open a diff: left = the version before this entry, right = this entry. */
  onDiff: (path: string, original: string, modified: string) => void;
  /** Revert the whole project to a checkpoint. */
  onRevert: (cp: Checkpoint) => void;
  /** Revert a single file to its version at a checkpoint (`file`), or delete it (`null`). */
  onRevertFile: (path: string, file: VfsFile | null) => void;
}

type FileStatus = 'edited' | 'added' | 'removed';

/** Files this checkpoint changed vs the one before it (`prev`, or none for the first). */
function changedIn(cp: Checkpoint, prev: Checkpoint | null): { path: string; status: FileStatus }[] {
  const now = new Map(cp.files.map((f) => [f.path, f.content]));
  if (!prev) {
    return [...now.keys()].sort().map((path) => ({ path, status: 'added' as const }));
  }
  const before = new Map(prev.files.map((f) => [f.path, f.content]));
  const out: { path: string; status: FileStatus }[] = [];
  for (const path of new Set([...before.keys(), ...now.keys()])) {
    const inB = before.has(path);
    const inN = now.has(path);
    if (inB && inN) {
      if (before.get(path) !== now.get(path)) out.push({ path, status: 'edited' });
    } else if (inN) out.push({ path, status: 'added' });
    else out.push({ path, status: 'removed' });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function clock(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const STATUS_LABEL: Record<FileStatus, { letter: string; color: string }> = {
  edited: { letter: 'M', color: 'text-brand-sky' },
  added: { letter: 'A', color: 'text-brand-mint' },
  removed: { letter: 'D', color: 'text-brand-coral' },
};
const base = (p: string) => p.split('/').pop() || p;

export function HistoryPanel({ onDiff, onRevert, onRevertFile }: HistoryPanelProps) {
  const checkpoints = useHistoryStore((s) => s.checkpoints);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedIndex = checkpoints.findIndex((c) => c.id === selectedId);
  const selected = selectedIndex >= 0 ? checkpoints[selectedIndex] : null;
  // Newest-first, so the "previous" (older) checkpoint is the NEXT index.
  const prev = selected ? checkpoints[selectedIndex + 1] ?? null : null;
  const changes = selected ? changedIn(selected, prev) : [];

  if (checkpoints.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <Header label="History" />
        <p className="px-3 py-3 text-[12px] font-semibold text-pg-text-muted">
          No history yet. Your edits are snapshotted automatically as you work.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Versions column */}
      <div className="flex min-w-0 flex-1 flex-col border-r border-pg-border">
        <Header label="History" />
        <ul className="min-h-0 flex-1 overflow-auto px-1.5 pb-2">
          {checkpoints.map((cp, i) => {
            const isSel = cp.id === selectedId;
            return (
              <li key={cp.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(cp.id)}
                  className={`flex w-full flex-col rounded-lg px-2 py-1.5 text-left transition-colors ${
                    isSel ? 'bg-brand-sky/15' : 'hover:bg-pg-text/5'
                  }`}
                >
                  <span className="truncate text-[13px] font-semibold text-pg-text">{cp.summary}</span>
                  <span className="text-[10px] text-pg-text-muted">
                    {clock(cp.ts)}
                    {i === 0 ? ' · current' : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Detail column — files this version changed (appears on selection) */}
      {selected && (
        <div className="flex min-w-0 flex-1 flex-col" data-testid="history-detail">
          <div className="flex items-center gap-1.5 px-2 py-2">
            <span className="min-w-0 flex-1 truncate text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand-sky">
              {selectedIndex === 0 ? 'Latest' : 'Changed'}
            </span>
            {selectedIndex !== 0 && (
              <button
                type="button"
                aria-label={`Revert to ${selected.summary}`}
                title="Revert the whole project to this version"
                onClick={() => onRevert(selected)}
                className="flex items-center gap-1 rounded-md bg-pg-text/10 px-2 py-0.5 text-[11px] font-bold text-pg-text transition-colors hover:bg-pg-text/20"
              >
                <RotateCcw size={12} aria-hidden /> Revert
              </button>
            )}
          </div>
          <ul className="min-h-0 flex-1 overflow-auto px-1.5 pb-2">
            {changes.length === 0 ? (
              <li className="px-2 py-1 text-[11px] text-pg-text-muted">No file changes.</li>
            ) : (
              changes.map(({ path, status }) => (
                <li key={path}>
                  <div className="group flex items-center rounded pr-1 hover:bg-pg-text/5">
                    <button
                      type="button"
                      aria-label={`Diff ${path}`}
                      title={`Diff ${path}`}
                      onClick={() => {
                        const original = prev?.files.find((f) => f.path === path)?.content ?? '';
                        const modified = selected.files.find((f) => f.path === path)?.content ?? '';
                        onDiff(path, original, modified);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1 text-left text-[12px] text-pg-text-dim hover:text-pg-text"
                    >
                      <span className={`text-[10px] font-bold ${STATUS_LABEL[status].color}`}>
                        {STATUS_LABEL[status].letter}
                      </span>
                      <span className="truncate">{base(path)}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Revert ${path}`}
                      title="Revert just this file to this version"
                      onClick={() => onRevertFile(path, selected.files.find((f) => f.path === path) ?? null)}
                      className="shrink-0 rounded p-0.5 text-pg-text-muted opacity-0 transition-opacity hover:bg-pg-text/10 hover:text-pg-text group-hover:opacity-100"
                    >
                      <RotateCcw size={12} aria-hidden />
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function Header({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 pt-3 pb-1">
      <History size={14} aria-hidden className="text-brand-sky" />
      <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-sky">{label}</span>
    </div>
  );
}
