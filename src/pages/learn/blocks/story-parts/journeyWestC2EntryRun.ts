// Journey to the West S1/C2 — what a run of the child's SAVED entry project
// actually did, measured off the real interpreter.
//
// C2-P7 saves the personal entry route; C2-P7 reruns it as its 关闭重开 proof and
// C2-P8 runs it again as the chapter Retell (scene-specs JTW-S1-C2-P7 /
// JTW-S1-C2-P8: "加载P7真实保存版本，从Start运行至End；不得另载答案项目"). Both
// read the same three facts off the same runner, so the reader and the
// "did it match the saved design" rule live here once instead of twice.

import type { SpriteState } from '../interpreter';
import {
  JTW_C2_P7_CAVE_ID,
  JTW_C2_P7_CURTAIN_ID,
  JTW_C2_P7_MONKEY_ID,
  type JtwPersonalEntryDesign,
} from '../jtwPersonalEntry';

/** What a real run of the saved C2 entry page measured on the stage. */
export interface C2EntryRunResult {
  /** The cell the monkey finished on, in the `gx-gy` form the stops use. */
  endCell: string;
  /** The curtain's own On Bump ran its Hide. */
  curtainHidden: boolean;
  /** The cave's own On Bump ran its Show. */
  caveShown: boolean;
  /** The evidence line the cave really said during this run, if any. */
  saidLine: string | null;
}

/** Read the run's outcome off the runner's final sprite states. */
export function c2EntryRunResult(
  stateOf: (charId: string) => SpriteState | undefined,
  saidLine: string | null,
): C2EntryRunResult {
  const monkey = stateOf(JTW_C2_P7_MONKEY_ID);
  const curtain = stateOf(JTW_C2_P7_CURTAIN_ID);
  const cave = stateOf(JTW_C2_P7_CAVE_ID);
  return {
    endCell: monkey ? `${monkey.gx}-${monkey.gy}` : '',
    curtainHidden: curtain?.visible === false,
    caveShown: cave?.visible === true,
    saidLine,
  };
}

/**
 * Did this run reproduce the design the child SAVED? This is C2-P7's
 * "关闭重开、结果一致" evidence and C2-P8's "P7保存版本真实重跑" evidence: the
 * monkey finished on the knock cell of the bank he starts on, the curtain
 * really hid, the cave really showed itself, and it said the very line the
 * saved project carries.
 */
export function c2EntryRunMatches(
  design: JtwPersonalEntryDesign | null,
  result: C2EntryRunResult | null,
): boolean {
  if (!design || !result) return false;
  return (
    result.endCell === design.side.knockCell &&
    result.curtainHidden &&
    result.caveShown &&
    result.saidLine === design.evidenceLine
  );
}
