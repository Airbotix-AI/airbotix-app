import { useMemo } from 'react';

import type { FileChange } from './codeApi';

/**
 * Inline red/green diff viewer (learn-code-studio-prd.md §2.3 / §6.4).
 * Pure line-based LCS — good enough for the small single-file edits the
 * Code Studio produces; no external diff dependency.
 */
type Row = { kind: 'same' | 'add' | 'del'; text: string };

function diffLines(before: string, after: string): Row[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const n = a.length;
  const m = b.length;
  // LCS table
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const rows: Row[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ kind: 'same', text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      rows.push({ kind: 'del', text: a[i] });
      i++;
    } else {
      rows.push({ kind: 'add', text: b[j] });
      j++;
    }
  }
  while (i < n) rows.push({ kind: 'del', text: a[i++] });
  while (j < m) rows.push({ kind: 'add', text: b[j++] });
  return rows;
}

export function DiffViewer({ change }: { change: FileChange }) {
  const rows = useMemo(() => diffLines(change.before, change.after), [change.before, change.after]);
  return (
    <div className="rounded-xl border border-hairline overflow-hidden">
      <div className="flex items-center justify-between bg-surface px-3 py-1.5 text-[12px] font-bold text-ink">
        <span className="font-mono">{change.path}</span>
        <span className="text-[11px] text-slate2">
          <span className="text-brand-mint">+{change.lines_added}</span>{' '}
          <span className="text-brand-coral">−{change.lines_removed}</span>
        </span>
      </div>
      <pre className="overflow-x-auto bg-canvas-pure text-[11px] leading-relaxed font-mono">
        {rows.map((r, idx) => (
          <div
            key={idx}
            className={
              r.kind === 'add'
                ? 'bg-wash-mint text-ink px-3'
                : r.kind === 'del'
                  ? 'bg-wash-coral text-ink px-3'
                  : 'text-ink-soft px-3'
            }
          >
            <span className="select-none pr-2 text-slate2">
              {r.kind === 'add' ? '+' : r.kind === 'del' ? '−' : ' '}
            </span>
            {r.text || ' '}
          </div>
        ))}
      </pre>
    </div>
  );
}
