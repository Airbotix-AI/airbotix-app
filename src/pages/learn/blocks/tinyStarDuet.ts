// Tiny Star Village S1/A5-S — "我的双人问候", chapter five's Personal Ship
// (scene-specs A5-S, teaching script §7.7).
//
// Everything the child owns in this scene lives here: the three-friend cast they
// pick two performers from, the two greeting actions, the Wait band that keeps
// the order legible, and the run-time measurement that proves the two greetings
// really took turns. It is a module of its own because `storyMissionProgress.ts`
// is at the umbrella's 1000-line ceiling (`rules/file-organization.md`).
//
// ── Runtime facts this scene is derived from (measured against interpreter.ts
//    and blocksModel.ts, and already recorded by A5-B and A5-D) ───────────────
//   `wait n`  sleeps n * 100 ms, and MAX_PARAM = 9 caps a Wait at 900 ms.
//   `say`     holds a speech bubble for SAY_MS = 1400 ms.
//   `hop 1`   occupies STEP_MS up + STEP_MS down = 360 ms.
// Two consequences shape the contract below. A spoken greeting outlives every
// Wait this runtime has, so a duet led by Say can never be pulled apart — the
// honest claim is "the second friend started later", exactly as A5-B recorded. A
// bounce is shorter than the longest Wait, so a duet led by Hop CAN leave the
// stage empty, and A5-D's "not too late" ceiling applies to it unchanged.

import { MAX_PARAM, type Block, type Character, type Page } from './blocksModel';

/** A5-S: the shipped greeting stage of A5-H/A5-B/A5-D (scene-specs §6). */
export const TINY_STAR_DUET_PAGE_ID = 'tsv-a5-s-page';
export const TINY_STAR_DUET_BACKGROUND = 'candy';
export const TINY_STAR_DUET_GY = 10;

/**
 * A5-S: the two stage slots. The scene has exactly two interactive characters
 * (scene-specs §1.2), and the slot IS the turn: `greeter-one` greets straight
 * away, `greeter-two` waits first. So "who goes first" is decided by which
 * friend the child casts in which slot — no block ever has to be swapped.
 */
export const TINY_STAR_DUET_FIRST_ID = 'greeter-one';
export const TINY_STAR_DUET_SECOND_ID = 'greeter-two';
export const TINY_STAR_DUET_FIRST_SCRIPT = 'greeter-one-duet';
export const TINY_STAR_DUET_SECOND_SCRIPT = 'greeter-two-duet';
export const TINY_STAR_DUET_FIRST_GX = 7;
export const TINY_STAR_DUET_SECOND_GX = 12;

export interface TinyStarDuetFriend {
  id: string;
  name: string;
  emoji: string;
  asset: string;
}

/**
 * A5-S: the cast the child picks two performers from (scene-specs A5-S
 * "两名角色从 ⭐/🐻/🐱 选择"). All three are shipped Tiny Star Village assets —
 * no new art is introduced, and §1.2's two-character stage limit still holds
 * because only two of them are ever on stage.
 */
export const TINY_STAR_DUET_CAST: readonly TinyStarDuetFriend[] = [
  {
    id: 'lumilo',
    name: 'Lumilo',
    emoji: '⭐',
    asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
  },
  {
    id: 'tuan-tuan',
    name: 'Tuan Tuan',
    emoji: '🐻',
    asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
  },
  {
    id: 'dot-dot',
    name: 'Dot Dot',
    emoji: '🐱',
    asset: '/story-blocks/tiny-star-village/characters/dot-dot/resting.svg',
  },
] as const;

/**
 * A5-S: the preset greetings the Say editor offers. The first two are chapter
 * five's own voices (A5-H/A5-B) and the third is the greeting A1-S saved, so a
 * child's duet still sounds like the village they have been building.
 */
export const TINY_STAR_DUET_GREETINGS = [
  'Morning!',
  'Morning too!',
  'Good morning, village!',
] as const;

/** A5-S: a bounce is always one space — scene-specs A5-S writes `hop 1`. */
export const TINY_STAR_DUET_HOP_N = 1;

export interface TinyStarDuetAction {
  id: 'say' | 'hop';
  label: string;
  emoji: string;
  /** How long this greeting occupies the stage, measured against interpreter.ts. */
  durationMs: number;
}

/**
 * A5-S: the greeting actions a friend can perform.
 *
 * scene-specs A5-S also lists `pop` for the first friend. It is NOT offered
 * here: `pop` is `legacy: true` in `BLOCK_DEFS`, so it appears in no child-facing
 * palette, and shipping it would have meant either un-legacying a block for every
 * project in the product or adding a button that inserts a block on the child's
 * behalf — which the A4-S scaffold boundary already forbids. Say and Hop are the
 * two actions this runtime actually lets a child build.
 */
export const TINY_STAR_DUET_ACTIONS: readonly TinyStarDuetAction[] = [
  { id: 'say', label: 'Say hello', emoji: '💬', durationMs: 1400 },
  { id: 'hop', label: 'Bounce', emoji: '🦘', durationMs: 360 },
] as const;

/** A5-S: the longest pause this runtime can express (`MAX_PARAM` × 100 ms). */
export const TINY_STAR_DUET_MAX_WAIT_MS = MAX_PARAM * 100;

/**
 * A5-S: the smallest head start that still reads as "one of them started first"
 * when the leader's own turn outlives every Wait. This is the same 250 ms A5-B
 * measured for the two-Say duet (`TINY_STAR_TURN_MIN_GAP_MS`), kept in step by a
 * unit test rather than by an import, so this module has no cycle back into
 * `storyMissionProgress`.
 */
export const TINY_STAR_DUET_MIN_GAP_MS = 250;

/**
 * A5-S: measurement slack on the ceiling only, matching A5-D's
 * `TINY_STAR_RELAY_JITTER_MS`. A sleeping timer fires late but never early, so
 * the floor needs no allowance while the ceiling must not punish a correct
 * choice that met a slow frame.
 */
export const TINY_STAR_DUET_JITTER_MS = 120;

export interface TinyStarDuetWaitBand {
  /** The second friend may not start before this. */
  floorMs: number;
  /** After this the stage has stood empty for longer than the first turn lasted. */
  ceilingMs: number;
}

/**
 * A5-S: how long the second friend must wait, given what the FIRST friend does.
 *
 * Floor — wait until your friend's turn is over. When that turn outlives every
 * Wait this runtime has (a speech bubble does: 1400 ms > 900 ms), fall back to
 * the head start A5-B measured, because the bubble is still up and the only
 * honest claim is "you heard who started".
 *
 * Ceiling — the stage may not stand empty for longer than the first turn lasted.
 * For a bounce that reproduces A5-D's band exactly (360…720 ms); for a spoken
 * greeting it sits above the runtime's own 900 ms limit, i.e. there is nothing
 * to bump into, which is correct: a bubble is still on stage the whole time.
 */
export function tinyStarDuetWaitBandMs(first: TinyStarDuetAction): TinyStarDuetWaitBand {
  return {
    floorMs:
      first.durationMs <= TINY_STAR_DUET_MAX_WAIT_MS ? first.durationMs : TINY_STAR_DUET_MIN_GAP_MS,
    ceilingMs: 2 * first.durationMs,
  };
}

/** A5-S: the Wait numbers that are legal for a given first action. */
export function tinyStarDuetWaits(first: TinyStarDuetAction): number[] {
  const band = tinyStarDuetWaitBandMs(first);
  const waits: number[] = [];
  for (let n = 1; n <= MAX_PARAM; n += 1) {
    const gap = n * 100;
    if (gap >= band.floorMs && gap <= band.ceilingMs) waits.push(n);
  }
  return waits;
}

/** A5-S: which greeting action a saved block is, or null if it is neither. */
export function tinyStarDuetActionOf(block: Block | undefined): TinyStarDuetAction | null {
  if (
    block?.op === 'say' &&
    (TINY_STAR_DUET_GREETINGS as readonly string[]).includes(block.text ?? '')
  ) {
    return TINY_STAR_DUET_ACTIONS[0];
  }
  if (block?.op === 'hop' && block.n === TINY_STAR_DUET_HOP_N) return TINY_STAR_DUET_ACTIONS[1];
  return null;
}

/** A5-S: which cast friend a stage slot currently holds, or null. */
export function tinyStarDuetFriendOf(actor: Character | undefined): TinyStarDuetFriend | null {
  if (!actor) return null;
  return (
    TINY_STAR_DUET_CAST.find(
      (friend) =>
        friend.name === actor.name && friend.emoji === actor.emoji && friend.asset === actor.asset,
    ) ?? null
  );
}

export interface TinyStarDuetDesign {
  /** The friend the child cast in the slot that greets straight away. */
  first: TinyStarDuetFriend;
  /** The friend the child cast in the slot that waits. */
  second: TinyStarDuetFriend;
  firstAction: TinyStarDuetAction;
  secondAction: TinyStarDuetAction;
  /** The Wait the child chose, in the block's own units (tenths of a second). */
  waitN: number;
}

function duetSlot(
  page: Page,
  charId: string,
  scriptId: string,
  gx: number,
): { friend: TinyStarDuetFriend; blocks: readonly Block[] } | null {
  const actor = page.characters.find((candidate) => candidate.id === charId);
  const friend = tinyStarDuetFriendOf(actor);
  if (!actor || !friend || actor.scripts.length !== 1) return null;
  if (actor.start.gx !== gx || actor.start.gy !== TINY_STAR_DUET_GY) return null;
  if (actor.start.size !== 1 || actor.start.rot !== 0) return null;
  const script = actor.scripts[0];
  if (script.id !== scriptId) return null;
  return { friend, blocks: script.blocks };
}

/**
 * Parse the child's A5-S duet from the saved page. Returns null while the work
 * is not a legal duet — which the starter deliberately is not: it ships the SAME
 * friend in both slots and two empty chains, so nothing but the child's own
 * choices can complete it.
 *
 * A legal duet is: two DIFFERENT cast friends on the shipped greeting squares,
 * the first on `Start → <greeting> → End`, the second on
 * `Start → Wait N → <greeting> → End`, and N inside the band the first friend's
 * action allows.
 */
export function tinyStarDuetDesign(page: Page | undefined): TinyStarDuetDesign | null {
  if (!page || page.background !== TINY_STAR_DUET_BACKGROUND) return null;
  if (page.characters.length !== 2) return null;

  const firstSlot = duetSlot(
    page,
    TINY_STAR_DUET_FIRST_ID,
    TINY_STAR_DUET_FIRST_SCRIPT,
    TINY_STAR_DUET_FIRST_GX,
  );
  const secondSlot = duetSlot(
    page,
    TINY_STAR_DUET_SECOND_ID,
    TINY_STAR_DUET_SECOND_SCRIPT,
    TINY_STAR_DUET_SECOND_GX,
  );
  if (!firstSlot || !secondSlot) return null;
  // A duet needs two friends. The starter casts one friend twice on purpose.
  if (firstSlot.friend.id === secondSlot.friend.id) return null;

  const firstBlocks = firstSlot.blocks;
  const firstAction = tinyStarDuetActionOf(firstBlocks[1]);
  if (
    firstBlocks.length !== 3 ||
    firstBlocks[0]?.op !== 'when_flag' ||
    !firstAction ||
    firstBlocks[2]?.op !== 'end'
  ) {
    return null;
  }

  const secondBlocks = secondSlot.blocks;
  const wait = secondBlocks[1];
  const secondAction = tinyStarDuetActionOf(secondBlocks[2]);
  if (
    secondBlocks.length !== 4 ||
    secondBlocks[0]?.op !== 'when_flag' ||
    wait?.op !== 'wait' ||
    !secondAction ||
    secondBlocks[3]?.op !== 'end'
  ) {
    return null;
  }
  const waitN = wait.n ?? 0;
  if (!tinyStarDuetWaits(firstAction).includes(waitN)) return null;

  return {
    first: firstSlot.friend,
    second: secondSlot.friend,
    firstAction,
    secondAction,
    waitN,
  };
}

/**
 * A5-S: how long after the first friend's greeting the second friend's greeting
 * started in THIS run. `greetedAt` holds the moment each slot FIRST reached its
 * greeting block, recorded by the studio from the interpreter's own `onStep`
 * host callback — a measurement of the runtime, never a page flag. `null` means
 * the run did not produce two greetings in duet order at all.
 */
export function tinyStarDuetGapMs(greetedAt: ReadonlyMap<string, number>): number | null {
  const first = greetedAt.get(TINY_STAR_DUET_FIRST_ID);
  const second = greetedAt.get(TINY_STAR_DUET_SECOND_ID);
  if (first === undefined || second === undefined) return null;
  const gap = second - first;
  return gap >= 0 ? gap : null;
}

/**
 * A5-S: did the two friends really take turns in THIS run? The gap the
 * interpreter produced must sit inside the band the child's own first action
 * allows — late enough that an adult can tell who started, early enough that the
 * stage never stood empty for longer than that first turn lasted.
 */
export function tinyStarDuetTookTurns(
  greetedAt: ReadonlyMap<string, number>,
  first: TinyStarDuetAction,
): boolean {
  const gap = tinyStarDuetGapMs(greetedAt);
  if (gap === null) return false;
  const band = tinyStarDuetWaitBandMs(first);
  return gap >= band.floorMs && gap <= band.ceilingMs + TINY_STAR_DUET_JITTER_MS;
}
