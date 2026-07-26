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
import {
  JTW_C3_P4_LESSON_ID,
  JTW_C3_P4_PAGE_IDS,
  JTW_C3_P4_SCRIPT_IDS,
  JTW_C3_SEA_TARGET,
} from './jtwC3SeaBuild';
import {
  JTW_C3_LISTEN_CLUE,
  JTW_C3_P5_LESSON_ID,
  JTW_C3_P5_PAGE_IDS,
  JTW_C3_P5_SCRIPT_IDS,
  JTW_C3_P5_STARTER_CHAIN,
} from './jtwC3WeatherBuild';
import {
  JTW_C3_MONKEY_KING_ID,
  JTW_C3_MONKEY_KING_SIZE,
  JTW_C3_MONKEY_KING_SPRITE,
  JTW_C3_PAGE2_SCENE,
  JTW_C3_PAGE2_START_CELL,
} from './jtwC3Stage';

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
  // Journey to the West S1/C3-P4 — chapter three's main Build (scene-specs
  // JTW-S1-C3-P4), and the season's first mission that spans THREE pages. The
  // child owns Page 2's five-block sea chain; Pages 1 and 3 keep read-only demo
  // chains ("Page 1/3示范链不可被孩子删除") this single-page record cannot see, so
  // the bespoke branch in `storyMissionProgress.ts` hands the whole PROJECT to
  // `jtwC3SeaBuildComplete`. The fields below still describe the page the child
  // edits, which is what the studio's Say editor and script lookup need; the
  // `target` is the scene's exact chain (no `end` — `goto_page` is terminal).
  [JTW_C3_P4_LESSON_ID]: {
    pageId: JTW_C3_P4_PAGE_IDS[1],
    background: JTW_C3_PAGE2_SCENE,
    characterId: JTW_C3_MONKEY_KING_ID,
    scriptId: JTW_C3_P4_SCRIPT_IDS.seaLeg,
    asset: JTW_C3_MONKEY_KING_SPRITE,
    start: {
      gx: JTW_C3_PAGE2_START_CELL.gx,
      gy: JTW_C3_PAGE2_START_CELL.gy,
      size: JTW_C3_MONKEY_KING_SIZE,
      rot: 0,
    },
    target: [...JTW_C3_SEA_TARGET],
  },
  // Journey to the West S1/C3-P5 — the chapter's expression choice (scene-specs
  // JTW-S1-C3-P5). It has TWO valid saved programs on TWO different Page 2 seas,
  // which this single-page, single-target record cannot express, so the bespoke
  // branch in `storyMissionProgress.ts` hands the whole PROJECT to
  // `jtwC3WeatherBuildVersion`. Only two fields here are read for this lesson:
  // `scriptId`, so the studio can find the script the child edits, and
  // `allowedSayText`, so the Say editor offers the mist version's preset line
  // instead of asking a six-year-old to type it. `background` and `target`
  // describe the SHIPPED starter both branches begin from (the shared route on
  // the default sea) and are never used to judge a C3-P5 build — the child's own
  // weather choice decides both.
  [JTW_C3_P5_LESSON_ID]: {
    pageId: JTW_C3_P5_PAGE_IDS[1],
    background: JTW_C3_PAGE2_SCENE,
    characterId: JTW_C3_MONKEY_KING_ID,
    scriptId: JTW_C3_P5_SCRIPT_IDS.seaLeg,
    asset: JTW_C3_MONKEY_KING_SPRITE,
    allowedSayText: [JTW_C3_LISTEN_CLUE],
    start: {
      gx: JTW_C3_PAGE2_START_CELL.gx,
      gy: JTW_C3_PAGE2_START_CELL.gy,
      size: JTW_C3_MONKEY_KING_SIZE,
      rot: 0,
    },
    target: [...JTW_C3_P5_STARTER_CHAIN],
  },
};
