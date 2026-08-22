// Journey to the West · chapter three's measured page boundaries.
//
// A cross-page boundary is the pair of cells one run really produced: the cell
// the monkey king LEFT the previous page on, and the cell he APPEARED on when
// the next page opened. C3-P6 (木筏跳了位置) debugs it, C3-P7 measures it on the
// reopened personal route, and C3-P8 shows it as the chapter's program evidence,
// so the table lives here instead of being copied into each page.
//
// It renders only what `jtwC3JumpBoundaries` measured — the component decides
// nothing about whether a boundary is right.

import clsx from 'clsx';

import type { JtwC3Boundary } from '../jtwC3JumpFix';
import { c3p2PageLabel } from './journeyWestC3Part2Program';

/** The two readings a boundary can have, in the child's own words. */
const BOUNDARY_OK = 'Acceptable';
const BOUNDARY_BREAK = 'Disconnected';

export function JourneyWestC3BoundaryTable({
  boundaries,
  testId,
}: {
  boundaries: readonly JtwC3Boundary[];
  /** Per-Part test id, e.g. `jtw-c3p8-boundaries`. */
  testId: string;
}) {
  return (
    <ul className="flex flex-col gap-1" data-testid={testId}>
      {boundaries.map((boundary) => (
        <li
          key={`${boundary.from}-${boundary.to}`}
          data-boundary={`${boundary.from}-${boundary.to}`}
          data-exit={boundary.exitCell}
          data-enter={boundary.enterCell}
          data-continuous={boundary.continuous ? '1' : '0'}
          className={clsx(
            'rounded-2xl border px-3 py-2 text-[13px]',
            boundary.continuous
              ? 'border-brand-mint/50 bg-wash-mint text-ink'
              : 'border-brand-coral/50 bg-canvas-pure text-ink',
          )}
        >
          <span className="font-bold">
            Page {boundary.from} · {c3p2PageLabel(boundary.from)} → Page {boundary.to} ·{' '}
            {c3p2PageLabel(boundary.to)}
          </span>
          <span className="ml-2 font-semibold text-ink-soft">
            {boundary.exitCell} leave → {boundary.enterCell} Appear ·{' '}
            {boundary.continuous ? BOUNDARY_OK : BOUNDARY_BREAK}
          </span>
        </li>
      ))}
    </ul>
  );
}
