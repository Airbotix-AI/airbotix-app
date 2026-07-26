// Journey to the West — Story Mission program contracts (Blocks Studio).
//
// Split out of `storyMissionProgress.ts` so that file stays inside the
// 1000-line hard rule in `rules/file-organization.md`. These are the exact
// saved-program contracts the studio checks before it records a lesson's run
// marker; the matcher itself and the Tiny Star Village contracts stay in
// `storyMissionProgress.ts`, which merges this record into its lookup.

import type { Block } from './blocksModel';
import { JTW_GREETING_CHOICES } from './jtwPersonalArrival';
import { JTW_C2_ACTOR_FREE_BACKGROUND, JTW_STONE_MONKEY_SPRITE } from './jtwC2Stage';
import {
  JTW_C2_P7_EVIDENCE_LINES,
  JTW_C2_P7_MONKEY_SCRIPT_ID,
  JTW_C2_P7_PAGE_ID,
  JTW_C2_P7_SIDES,
} from './jtwPersonalEntry';

export interface StoryMissionProgramContract {
  pageId: string;
  background: string;
  characterId: string;
  scriptId: string;
  asset: string;
  target: Block[];
  allowedSayText?: readonly string[];
  start?: { gx: number; gy: number; size: number; rot: number };
  sceneTarget?: {
    id: string;
    name: string;
    gx: number;
    gy: number;
    size: number;
  };
}

const STONE_MONKEY_ASSET = JTW_STONE_MONKEY_SPRITE;

export const JTW_MISSION_CONTRACTS: Record<string, StoryMissionProgramContract> = {
  // Journey to the West S1/C1-P4 — the chapter's Build 1 (scene-specs
  // JTW-S1-C1-P4). The child selects play_sound(Chime)/show/hop(1)/say from the
  // palette (grow/turn are live distractors the exact-target match rejects) and
  // orders them between the reserved when_flag+hide and end.
  'jtw-s1-c1-p4': {
    pageId: 'jtw-c1-p4-page',
    background: 'jtw-s1-c1-flower-fruit-stone',
    characterId: 'stone-monkey',
    scriptId: 'stone-monkey-arrival-build',
    asset: STONE_MONKEY_ASSET,
    start: { gx: 8, gy: 9, size: 3, rot: 0 },
    target: [
      { op: 'when_flag' },
      { op: 'hide' },
      { op: 'play_sound', n: 2 },
      { op: 'show' },
      { op: 'hop', n: 1 },
      { op: 'say', text: '你好，我刚刚来到这里。' },
      { op: 'end' },
    ],
  },
  // Journey to the West S1/C1-P5 — Build 2, the greeting-order choice
  // (scene-specs JTW-S1-C1-P5). TWO orders are valid (Hop→Say or Say→Hop);
  // the bespoke matcher below enforces the verified prefix, forbids removing
  // Show, and accepts only the preset greetings. `target` records order A for
  // tooling; matching is handled by the bespoke branch.
  'jtw-s1-c1-p5': {
    pageId: 'jtw-c1-p5-page',
    background: 'jtw-s1-c1-flower-fruit-stone',
    characterId: 'stone-monkey',
    scriptId: 'stone-monkey-first-greeting',
    asset: STONE_MONKEY_ASSET,
    start: { gx: 8, gy: 9, size: 3, rot: 0 },
    allowedSayText: JTW_GREETING_CHOICES,
    target: [
      { op: 'when_flag' },
      { op: 'hide' },
      { op: 'play_sound', n: 2 },
      { op: 'show' },
      { op: 'hop', n: 1 },
      { op: 'say', text: '你好，我也是刚刚认识这个世界。' },
      { op: 'end' },
    ],
  },
  // Journey to the West S1/C1-P7 — the Personal Ship (scene-specs
  // JTW-S1-C1-P7). The frame is fixed (Start·hide·sound·Show … Say(preset)·End)
  // but the CHILD owns the sound, the two visible actions (order + optional
  // wait between them) and the preset greeting — the bespoke branch below
  // validates the structure instead of an exact target. `target` records one
  // canonical example for tooling.
  'jtw-s1-c1-p7': {
    pageId: 'jtw-c1-p7-page',
    background: 'jtw-s1-c1-flower-fruit-stone',
    characterId: 'stone-monkey',
    scriptId: 'stone-monkey-personal-arrival',
    asset: STONE_MONKEY_ASSET,
    start: { gx: 8, gy: 9, size: 3, rot: 0 },
    allowedSayText: JTW_GREETING_CHOICES,
    target: [
      { op: 'when_flag' },
      { op: 'hide' },
      { op: 'play_sound', n: 2 },
      { op: 'show' },
      { op: 'hop', n: 1 },
      { op: 'grow', n: 2 },
      { op: 'say', text: '你好，我刚刚来到这里。' },
      { op: 'end' },
    ],
  },
  // Journey to the West S1/C2-P4 — chapter two's main Build (scene-specs
  // JTW-S1-C2-P4). The starter ships ONLY Start/End; the child selects and
  // orders the five one-step route blocks Right 1 · Right 1 · Up 1 · Right 1 ·
  // Right 1 from a palette that also offers Left/Down/Wait as live
  // distractors. The exact-target match rejects the parameter-merged
  // Right 2/Up 1/Right 2 shortcut, any wrong order, a missing or extra step
  // (no overshoot tolerance) and a moved start — the child owns all five
  // blocks, never "just a number edit".
  'jtw-s1-c2-p4': {
    pageId: 'jtw-c2-p4-page',
    background: 'jtw-s1-c1-flower-fruit-stone',
    characterId: 'stone-monkey',
    scriptId: 'stone-monkey-route-to-curtain',
    asset: STONE_MONKEY_ASSET,
    start: { gx: 2, gy: 8, size: 3, rot: 0 },
    target: [
      { op: 'when_flag' },
      { op: 'move_right', n: 1 },
      { op: 'move_right', n: 1 },
      { op: 'move_up', n: 1 },
      { op: 'move_right', n: 1 },
      { op: 'move_right', n: 1 },
      { op: 'end' },
    ],
  },
  // Journey to the West S1/C1-P6 — Twist & Debug, the stable order bug
  // (scene-specs JTW-S1-C1-P6). The starter ships Say → Hop → Show; ONLY the
  // exact repaired order passes. The exact-target match rejects the shipped
  // bug order, any delete-and-rebuild shortcut, a changed sound and free-typed
  // dialogue — the child may only move the Show/Hop/Say target blocks.
  'jtw-s1-c1-p6': {
    pageId: 'jtw-c1-p6-page',
    background: 'jtw-s1-c1-flower-fruit-stone',
    characterId: 'stone-monkey',
    scriptId: 'stone-monkey-arrival-debug',
    asset: STONE_MONKEY_ASSET,
    start: { gx: 8, gy: 9, size: 3, rot: 0 },
    target: [
      { op: 'when_flag' },
      { op: 'hide' },
      { op: 'play_sound', n: 2 },
      { op: 'show' },
      { op: 'hop', n: 1 },
      { op: 'say', text: '你好，我刚刚来到这里。' },
      { op: 'end' },
    ],
  },
  // Journey to the West S1/C2-P6 — the return-route order bug (scene-specs
  // JTW-S1-C2-P6). The starter ships Left 2 → Left 2 → Down 1; ONLY the exact
  // repaired order passes. The exact-target match therefore rejects the shipped
  // bug order, a delete-and-rebuild, a bigger number (`move_left 4`), a
  // `set_speed`/`go_home` shortcut and a moved start — the child may only swap
  // the second Left 2 with the Down 1. The monkey starts on the 6/7 entrance
  // cell P4/P5 left him on, so no edit to the outbound route can be smuggled in.
  'jtw-s1-c2-p6': {
    pageId: 'jtw-c2-p6-page',
    background: JTW_C2_ACTOR_FREE_BACKGROUND,
    characterId: 'stone-monkey',
    scriptId: 'stone-monkey-return-bug',
    asset: STONE_MONKEY_ASSET,
    start: { gx: 6, gy: 7, size: 3, rot: 0 },
    target: [
      { op: 'when_flag' },
      { op: 'move_left', n: 2 },
      { op: 'move_down', n: 1 },
      { op: 'move_left', n: 2 },
      { op: 'end' },
    ],
  },
  // Journey to the West S1/C2-P7 — chapter two's Personal Ship (scene-specs
  // JTW-S1-C2-P7). NOTHING about the route is a fixed answer: the child picks
  // which BANK the friends will enter from, and each bank needs its own exact
  // chain (five one-step blocks from the left, six from the right, because the
  // right shore sits a row lower). They also choose how long the monkey holds
  // the door open and which preset evidence line the cave says. The bespoke
  // branch in `storyMissionProgress.ts` therefore hands the whole page to
  // `jtwPersonalEntryDesign`, which is what rejects the "错误混搭" case (one
  // bank's start with the other bank's route) as well as a deleted response
  // chain, a moved door actor and a free-typed line. `start` is deliberately
  // ABSENT — two starts are legal — and `target` records the left bank's
  // version for tooling only.
  'jtw-s1-c2-p7': {
    pageId: JTW_C2_P7_PAGE_ID,
    background: JTW_C2_ACTOR_FREE_BACKGROUND,
    characterId: 'stone-monkey',
    scriptId: JTW_C2_P7_MONKEY_SCRIPT_ID,
    asset: STONE_MONKEY_ASSET,
    allowedSayText: JTW_C2_P7_EVIDENCE_LINES,
    target: [
      { op: 'when_flag' },
      ...JTW_C2_P7_SIDES[0].route,
      { op: 'wait', n: 1 },
      { op: 'end' },
    ],
  },
};
