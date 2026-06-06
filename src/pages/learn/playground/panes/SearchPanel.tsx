// Project-wide search (the left-sidebar "Search" view of the Code Editor).
// Case-insensitive substring search across every TEXT file → results grouped by
// file with line + snippet; click a result to jump to that file+line. Optional
// replace-all swaps every match across the project (recorded in history).

import { ChevronDown, ChevronRight, Replace, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { VfsFile } from '../../code/codeApi';

interface SearchPanelProps {
  files: VfsFile[];
  /** Open a file at a line (jump to a result). */
  onOpenResult: (path: string, line: number) => void;
  /** Replace every case-insensitive match across the project; returns the count. */
  onReplaceAll: (query: string, replacement: string) => number;
}

interface FileResult {
  path: string;
  matches: { line: number; text: string }[];
}

const base = (p: string) => p.split('/').pop() || p;

/** Case-insensitive substring search across text files, grouped by file. */
function search(files: VfsFile[], query: string): FileResult[] {
  const q = query.toLowerCase();
  if (!q) return [];
  const out: FileResult[] = [];
  for (const f of files) {
    if (f.kind !== 'text') continue;
    const matches: { line: number; text: string }[] = [];
    f.content.split('\n').forEach((line, i) => {
      if (line.toLowerCase().includes(q)) matches.push({ line: i + 1, text: line.trim().slice(0, 200) });
    });
    if (matches.length) out.push({ path: f.path, matches });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

export function SearchPanel({ files, onOpenResult, onReplaceAll }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [replacedNote, setReplacedNote] = useState<string | null>(null);

  const results = useMemo(() => search(files, query), [files, query]);
  const totalMatches = results.reduce((n, r) => n + r.matches.length, 0);

  const toggle = (path: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const doReplaceAll = () => {
    const n = onReplaceAll(query, replacement);
    setReplacedNote(n > 0 ? `Replaced ${n} match${n === 1 ? '' : 'es'}.` : 'No matches replaced.');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 px-3 pt-3 pb-1">
        <Search size={14} aria-hidden className="text-brand-sky" />
        <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-sky">Search</span>
      </div>

      {/* Query (+ optional replace) inputs */}
      <div className="flex items-start gap-1 px-2 pb-1">
        <button
          type="button"
          aria-label={showReplace ? 'Hide replace' : 'Show replace'}
          onClick={() => setShowReplace((s) => !s)}
          className="mt-1 shrink-0 rounded p-1 text-pg-text-muted transition-colors hover:bg-pg-text/10 hover:text-pg-text"
        >
          <Replace size={14} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <input
            aria-label="Search files"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setReplacedNote(null);
            }}
            placeholder="Search in files…"
            className="w-full rounded-md border border-pg-border bg-pg-surface px-2 py-1 text-[12px] text-pg-text focus:border-brand-sky focus:outline-none"
          />
          {showReplace && (
            <div className="flex items-center gap-1">
              <input
                aria-label="Replace with"
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder="Replace with…"
                className="w-full min-w-0 flex-1 rounded-md border border-pg-border bg-pg-surface px-2 py-1 text-[12px] text-pg-text focus:border-brand-sky focus:outline-none"
              />
              <button
                type="button"
                onClick={doReplaceAll}
                disabled={!query}
                className="shrink-0 rounded-md bg-pg-text/10 px-2 py-1 text-[11px] font-bold text-pg-text transition-colors hover:bg-pg-text/20 disabled:opacity-40"
              >
                All
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-3 pb-1 text-[10px] font-semibold text-pg-text-muted">
        {replacedNote ??
          (query
            ? totalMatches === 0
              ? 'No results.'
              : `${totalMatches} result${totalMatches === 1 ? '' : 's'} in ${results.length} file${results.length === 1 ? '' : 's'}`
            : 'Type to search across all files.')}
      </div>

      {/* Results grouped by file */}
      <ul className="min-h-0 flex-1 overflow-auto px-1.5 pb-3" data-testid="search-results">
        {results.map((r) => {
          const open = !collapsed.has(r.path);
          const Chevron = open ? ChevronDown : ChevronRight;
          return (
            <li key={r.path}>
              <button
                type="button"
                onClick={() => toggle(r.path)}
                className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left hover:bg-pg-text/5"
              >
                <Chevron size={13} className="shrink-0 text-pg-text-muted" aria-hidden />
                <span className="truncate text-[12px] font-semibold text-pg-text">{base(r.path)}</span>
                <span className="ml-auto shrink-0 text-[10px] text-pg-text-muted">{r.matches.length}</span>
              </button>
              {open && (
                <ul className="pl-4">
                  {r.matches.map((m, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        aria-label={`${r.path}:${m.line}`}
                        onClick={() => onOpenResult(r.path, m.line)}
                        className="flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left hover:bg-pg-text/5"
                      >
                        <span className="shrink-0 text-[10px] tabular-nums text-pg-text-muted">{m.line}</span>
                        <span className="truncate font-mono text-[11px] text-pg-text-dim">{m.text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
