// Journey to the West S1/C1-P7 — "我的到来" personal-arrival design.
//
// The chapter-one Personal Ship keeps a fixed frame (Start · hide · sound · Show
// … Say(preset) · End) but hands the child the sound cue, the two visible
// actions, their order and an optional pause between them. Parsing that design
// lives here rather than in `storyMissionProgress.ts` so the shared mission
// matcher stays inside the umbrella's 1000-line rule
// (`rules/file-organization.md`) and Tiny Star Village's contracts are not
// interleaved with another story line's structure rules.

import type { Block } from './blocksModel';

/** JtW C1-P5 preset greetings — the child picks one; no free typing required. */
export const JTW_GREETING_CHOICES = [
  '你好，我也是刚刚认识这个世界。',
  '你们好，我可以过来吗？',
  '你好，我刚刚来到这里。',
] as const;

/** JtW C1-P7: the visible action ops the Personal Ship contract allows. */
export const JTW_P7_ACTION_OPS = [
  'hop',
  'turn_left',
  'turn_right',
  'grow',
  'shrink',
  'reset_size',
] as const;

export interface JtwPersonalArrivalDesign {
  /** The child's chosen sound cue (play_sound n, 1..6). */
  soundN: number;
  /** The two visible actions, in the child's order. */
  actions: [Block, Block];
  /** The optional wait between the two actions (1..3), or null. */
  waitN: number | null;
  /** The preset greeting the child kept. */
  greeting: string;
}

function jtwVisibleActionOk(block: Block | undefined, prior: Block | undefined): boolean {
  if (!block) return false;
  if (block.op === 'hop' || block.op === 'turn_left' || block.op === 'turn_right') {
    return (block.n ?? 0) >= 1;
  }
  if (block.op === 'grow' || block.op === 'shrink') return (block.n ?? 0) >= 1;
  // reset_size only reads as a visible change straight after a grow/shrink.
  if (block.op === 'reset_size') return prior?.op === 'grow' || prior?.op === 'shrink';
  return false;
}

/**
 * Parse the child's C1-P7 personal-arrival design from a saved chain. Returns
 * null when the chain breaks the structural contract: fixed frame
 * (Start·hide·sound(1..6)·Show … Say(preset)·End), 8–9 blocks total, two
 * VISIBLE actions from the allowed set (order is the child's), an optional
 * wait(1..3) only between them.
 */
export function jtwPersonalArrivalDesign(
  blocks: readonly Block[],
): JtwPersonalArrivalDesign | null {
  const sound = blocks[2];
  const say = blocks[blocks.length - 2];
  const frameOk =
    (blocks.length === 8 || blocks.length === 9) &&
    blocks[0]?.op === 'when_flag' &&
    blocks[1]?.op === 'hide' &&
    sound?.op === 'play_sound' &&
    (sound.n ?? 0) >= 1 &&
    (sound.n ?? 0) <= 6 &&
    blocks[3]?.op === 'show' &&
    say?.op === 'say' &&
    (JTW_GREETING_CHOICES as readonly string[]).includes(say.text ?? '') &&
    blocks[blocks.length - 1]?.op === 'end';
  if (!frameOk) return null;
  const middle = blocks.slice(4, blocks.length - 2);
  const wait = middle.length === 3 ? middle[1] : undefined;
  if (middle.length === 3 && !(wait?.op === 'wait' && (wait.n ?? 0) >= 1 && (wait.n ?? 0) <= 3)) {
    return null;
  }
  const actionOne = middle[0];
  const actionTwo = middle.length === 3 ? middle[2] : middle[1];
  if (
    !actionOne ||
    !actionTwo ||
    !jtwVisibleActionOk(actionOne, undefined) ||
    !jtwVisibleActionOk(actionTwo, actionOne)
  ) {
    return null;
  }
  return {
    soundN: sound?.n ?? 0,
    actions: [actionOne, actionTwo],
    waitN: wait?.n ?? null,
    greeting: say?.text ?? '',
  };
}
