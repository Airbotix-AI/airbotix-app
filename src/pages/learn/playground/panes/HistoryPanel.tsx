// "Time Machine" — the kid-friendly version history (the Code Editor's Time
// Machine sidebar view). One clean, single-column list of save points, newest
// first. The hero action is **Go back**: it restores the WHOLE game to that
// point after a reassuring confirm (the newest version is always kept, so it's
// safe). Each entry can optionally reveal **what changed** — a plain-language
// file list; tapping a file opens a before/after view. No git-speak, no
// timestamps, no per-file revert.

import {
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  FilePen,
  FilePlus2,
  FileX2,
  type LucideIcon,
  RotateCcw,
  Sparkles,
  Undo2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { useHistoryStore, type Checkpoint } from '../historyStore';

interface HistoryPanelProps {
  /** Open a before/after view: left = the version before this entry, right = it. */
  onDiff: (path: string, original: string, modified: string) => void;
  /** Restore the WHOLE game to a save point. */
  onRevert: (cp: Checkpoint) => void;
  /** True while a confirm is open, so the pane can give it a little more room. */
  onDetailOpen: (open: boolean) => void;
}

type FileStatus = 'edited' | 'added' | 'removed';

const base = (p: string) => p.split('/').pop() || p;

/** Files this save point changed vs the one before it (or all, for the first). */
function changedIn(cp: Checkpoint, prev: Checkpoint | null): { path: string; status: FileStatus }[] {
  const now = new Map(cp.files.map((f) => [f.path, f.content]));
  if (!prev) return [...now.keys()].sort().map((path) => ({ path, status: 'added' as const }));
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

/** Friendly "X ago" — no exact clocks. */
function ago(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return 'moments ago';
  const m = Math.round(s / 60);
  if (m < 60) return m === 1 ? 'a minute ago' : `${m} minutes ago`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? 'an hour ago' : `${h} hours ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

/** A plain-language title + icon for a save point, from its (technical) summary. */
function describe(summary: string): { Icon: LucideIcon; title: string } {
  const first = summary.split(', ')[0];
  const lower = first.toLowerCase();
  if (lower.startsWith('initial') || lower === 'no change')
    return { Icon: Sparkles, title: 'Your game started here' };
  if (lower.startsWith('reverted') || lower.startsWith('went back'))
    return { Icon: Undo2, title: 'Went back in time' };
  if (lower.includes('newest')) return { Icon: Cloud, title: 'Kept your newest copy' };
  const [verb, ...restArr] = first.split(' ');
  const rest = restArr.join(' ').replace(/\s+\+\d+$/, ''); // drop the "+N" tail
  const VERB: Record<string, { word: string; Icon: LucideIcon }> = {
    edited: { word: 'Changed', Icon: FilePen },
    replaced: { word: 'Changed', Icon: FilePen },
    added: { word: 'Added', Icon: FilePlus2 },
    created: { word: 'Added', Icon: FilePlus2 },
    removed: { word: 'Removed', Icon: FileX2 },
    deleted: { word: 'Removed', Icon: FileX2 },
    renamed: { word: 'Renamed', Icon: FilePen },
    moved: { word: 'Moved', Icon: FilePen },
  };
  const v = VERB[verb] ?? { word: 'Changed', Icon: FilePen };
  return { Icon: v.Icon, title: rest ? `${v.word} ${rest}` : `${v.word} your game` };
}

const TAG: Record<FileStatus, { label: string; color: string; Icon: LucideIcon }> = {
  edited: { label: 'changed', color: 'text-brand-sky', Icon: FilePen },
  added: { label: 'new', color: 'text-brand-mint', Icon: FilePlus2 },
  removed: { label: 'gone', color: 'text-brand-coral', Icon: FileX2 },
};

export function HistoryPanel({ onDiff, onRevert, onDetailOpen }: HistoryPanelProps) {
  const checkpoints = useHistoryStore((s) => s.checkpoints);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Give the confirm a touch more room (reuses the pane's sidebar-widen hook).
  useEffect(() => {
    onDetailOpen(confirmId !== null);
  }, [confirmId, onDetailOpen]);

  if (checkpoints.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <Header />
        <p className="px-3 py-3 text-[12.5px] font-semibold text-pg-text-muted">
          Nothing here yet. As you build, your game is saved here so you can always go back.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header />
      <ul className="min-h-0 flex-1 space-y-1.5 overflow-auto px-2 pb-3">
        {checkpoints.map((cp, i) => {
          const isNow = i === 0;
          const { Icon, title } = describe(cp.summary);
          const prev = checkpoints[i + 1] ?? null;
          const changes = changedIn(cp, prev);
          const expanded = expandedId === cp.id;
          const confirming = confirmId === cp.id;

          return (
            <li
              key={cp.id}
              data-testid="history-entry"
              className={`rounded-xl border ${
                isNow ? 'border-brand-mint/40 bg-wash-mint/40' : 'border-pg-border bg-pg-text/5'
              }`}
            >
              {/* Top row: icon + title + time (+ a "Now" pill on the latest). */}
              <div className="flex items-center gap-2 px-2.5 py-2">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                    isNow ? 'bg-brand-mint/20 text-brand-mint' : 'bg-pg-text/10 text-pg-text-dim'
                  }`}
                >
                  <Icon size={15} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-pg-text">{title}</p>
                  <p className="text-[11px] text-pg-text-muted">{isNow ? "you're here now" : ago(cp.ts)}</p>
                </div>
                {isNow && (
                  <span className="shrink-0 rounded-full bg-brand-mint/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-brand-mint">
                    Now
                  </span>
                )}
              </div>

              {/* Actions: "Go back" (except the current point — you're already
                  there) + an optional "What changed" peek. */}
              {!confirming && (!isNow || changes.length > 0) && (
                <div className="flex items-center gap-1 px-2.5 pb-2">
                  {!isNow && (
                    <button
                      type="button"
                      data-testid="history-goback"
                      onClick={() => {
                        setConfirmId(cp.id);
                        setExpandedId(null);
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-brand-sky px-3 py-1.5 text-[12.5px] font-extrabold text-white transition-transform hover:-translate-y-0.5"
                    >
                      <RotateCcw size={13} aria-hidden /> Go back
                    </button>
                  )}
                  {changes.length > 0 && (
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setExpandedId(expanded ? null : cp.id)}
                      className={`flex items-center gap-0.5 rounded-lg px-2 py-1.5 text-[12px] font-bold text-pg-text-muted transition-colors hover:bg-pg-text/10 hover:text-pg-text ${
                        isNow ? '' : 'ml-auto'
                      }`}
                    >
                      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />} What changed
                    </button>
                  )}
                </div>
              )}

              {/* Reassuring confirm — clear about exactly what happens. */}
              {confirming && (
                <div className="px-2.5 pb-2.5">
                  <p className="mb-2 text-[12px] leading-snug text-pg-text-dim">
                    Bring your game back to how it was <b className="text-pg-text">{ago(cp.ts)}</b>? Your newest
                    version is saved here too, so you can always come back.
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="history-goback-confirm"
                      onClick={() => {
                        onRevert(cp);
                        setConfirmId(null);
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-brand-sky px-3 py-1.5 text-[12.5px] font-extrabold text-white"
                    >
                      <Check size={13} aria-hidden /> Yes, go back
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="flex items-center gap-1 rounded-lg border border-pg-border px-3 py-1.5 text-[12.5px] font-bold text-pg-text-dim transition-colors hover:bg-pg-text/5"
                    >
                      <X size={13} aria-hidden /> Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* "What changed" — a plain-language file list; tap to see before/after. */}
              {expanded && !confirming && (
                <ul className="border-t border-pg-border/70 px-2.5 py-1.5">
                  {changes.map(({ path, status }) => {
                    const tag = TAG[status];
                    return (
                      <li key={path}>
                        <button
                          type="button"
                          data-testid="history-file"
                          aria-label={`See what changed in ${path}`}
                          onClick={() => {
                            const original = prev?.files.find((f) => f.path === path)?.content ?? '';
                            const modified = cp.files.find((f) => f.path === path)?.content ?? '';
                            onDiff(path, original, modified);
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[12px] text-pg-text-dim transition-colors hover:bg-pg-text/5 hover:text-pg-text"
                        >
                          <tag.Icon size={13} aria-hidden className={`shrink-0 ${tag.color}`} />
                          <span className="min-w-0 flex-1 truncate">{base(path)}</span>
                          <span className={`shrink-0 text-[10px] font-bold ${tag.color}`}>{tag.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Header() {
  return (
    <div className="shrink-0 px-3 pt-3 pb-2">
      <div className="flex items-center gap-1.5">
        <span aria-hidden className="text-[15px]">🕰️</span>
        <span className="text-[12px] font-extrabold text-pg-text">Time Machine</span>
      </div>
      <p className="mt-0.5 text-[11px] leading-snug text-pg-text-muted">
        Go back to an earlier version of your game. Your newest is always kept.
      </p>
    </div>
  );
}
