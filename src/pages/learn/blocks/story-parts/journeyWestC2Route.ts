// Journey to the West · C2 — the shared wet-stone route geometry.
//
// Chapter two's outbound Build (C2-P4/P5) and its return Fix (C2-P6) walk the
// SAME grid, so the stop simulation lives here rather than inside either part.
// Split out of `journeyWestSeason1.ts`, which is already over the 1000-line
// hard rule in `rules/file-organization.md`.

import type { Block } from '../blocksModel';

/** The wet-stone start the monkey leaves from (scene-specs C2 grid contract). */
export const C2_ROUTE_START = { gx: 2, gy: 8 } as const;
/** The water-curtain entrance cell the outbound five-block route ends on. */
export const C2_ENTRANCE_CELL_POSITION = { gx: 6, gy: 7 } as const;

/** Cells a foot can actually land on: three low wet stones and the high ledge. */
export const C2_STONE_CELLS: ReadonlySet<string> = new Set([
  '2-8',
  '3-8',
  '4-8',
  '4-7',
  '5-7',
  '6-7',
]);

/**
 * Simulate a saved route: one stop cell per move block, walked from `start`
 * (the 2/8 outbound start by default; the return walk passes the 6/7 entrance
 * cell). Only the four move ops walk the grid (up = gy−1, per the C2 grid
 * contract); anything else contributes no stop. This derives the REAL run trace
 * from the SAVED BlocksProject — never from frontend state.
 */
export function jtwWetStoneTrace(
  moves: readonly Block[],
  start: { gx: number; gy: number } = C2_ROUTE_START,
): string[] {
  let { gx, gy } = start;
  const trace: string[] = [];
  for (const block of moves) {
    const n = block.n ?? 0;
    if (block.op === 'move_right') gx += n;
    else if (block.op === 'move_left') gx -= n;
    else if (block.op === 'move_up') gy -= n;
    else if (block.op === 'move_down') gy += n;
    else continue;
    trace.push(`${gx}-${gy}`);
  }
  return trace;
}
