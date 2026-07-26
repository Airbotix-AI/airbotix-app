// Journey to the West — the "run the bug before you may fix it" rule shared by
// the two order-bug Fix scenes (scene-specs JTW-S1-C1-P6 and JTW-S1-C2-P6).
//
// Both scenes ship a chain whose blocks and parameters are all correct and
// whose ORDER is wrong. The studio may only record the lesson complete once a
// real run reproduced that bug AND a later run passed on the repaired order, so
// it needs one honest question about the CURRENT saved chain: "is the shipped
// bug still in it?". Keeping that question here (instead of inline in
// BlocksStudioPage) lets both scenes share it without growing that file.

import type { Block, BlockOp } from './blocksModel';

/** Lessons whose Fix contract is "reproduce the order bug, then swap it back". */
export const JTW_ORDER_DEBUG_LESSONS = ['jtw-s1-c1-p6', 'jtw-s1-c2-p6'] as const;

export type JtwOrderDebugLesson = (typeof JTW_ORDER_DEBUG_LESSONS)[number];

export function isJtwOrderDebugLesson(lessonId: string | undefined): boolean {
  return (JTW_ORDER_DEBUG_LESSONS as readonly string[]).includes(lessonId ?? '');
}

function firstIndexOf(blocks: readonly Block[], op: BlockOp): number {
  return blocks.findIndex((block) => block.op === op);
}

function lastIndexOf(blocks: readonly Block[], op: BlockOp): number {
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    if (blocks[index]?.op === op) return index;
  }
  return -1;
}

/**
 * Is the shipped order bug still present in `blocks`? A run started while this
 * is true IS the required bug run.
 *
 * - C1-P6: the greeting fires before the monkey is on stage — `say` sits before
 *   `show` (or `show` is missing entirely), so the voice comes from thin air.
 * - C2-P6: the way back leaves the wet-stone route — the single `move_down`
 *   sits after the last `move_left`, so the monkey crosses the pool instead of
 *   stepping onto the low stone his friends have to follow.
 *
 * Any other lesson has no shipped order bug, so nothing is observed.
 */
export function jtwOrderBugObserved(
  lessonId: string | undefined,
  blocks: readonly Block[] | undefined,
): boolean {
  const chain = blocks ?? [];
  if (lessonId === 'jtw-s1-c1-p6') {
    const say = firstIndexOf(chain, 'say');
    const show = firstIndexOf(chain, 'show');
    return say >= 0 && (show < 0 || say < show);
  }
  if (lessonId === 'jtw-s1-c2-p6') {
    const down = firstIndexOf(chain, 'move_down');
    const lastLeft = lastIndexOf(chain, 'move_left');
    return down >= 0 && lastLeft >= 0 && down > lastLeft;
  }
  return false;
}
