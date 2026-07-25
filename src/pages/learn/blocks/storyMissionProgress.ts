import type { Block, BlocksProject } from './blocksModel';

const LUMILO_CHARACTER = 'little-light';
const LUMILO_FLAG_SCRIPT = 'little-light-flag';
const LUMILO_ASSET = '/story-blocks/tiny-star-village/characters/little-light/resting.svg';

interface StoryMissionProgramContract {
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

/** JtW C1-P5 preset greetings — the child picks one; no free typing required. */
export const JTW_GREETING_CHOICES = [
  '你好，我也是刚刚认识这个世界。',
  '你们好，我可以过来吗？',
  '你好，我刚刚来到这里。',
] as const;

export const TINY_STAR_GREETING_CHOICES = [
  'Good morning, village!',
  "I'm awake!",
  "Let's go!",
] as const;

const LUMI_MORNING_TARGET: Block[] = [
  { op: 'when_flag' },
  { op: 'hop', n: 1 },
  { op: 'say', text: 'Morning!' },
  { op: 'end' },
];

const LUMI_CONTRACT = {
  background: 'tsv-window-room-dim',
  characterId: LUMILO_CHARACTER,
  scriptId: LUMILO_FLAG_SCRIPT,
  asset: LUMILO_ASSET,
};

const TINY_STAR_MISSION_CONTRACTS: Record<string, StoryMissionProgramContract> = {
  'tsv-s1-a1-h': { ...LUMI_CONTRACT, pageId: 'tsv-a1-h-page', target: LUMI_MORNING_TARGET },
  'tsv-s1-a1-b': { ...LUMI_CONTRACT, pageId: 'tsv-a1-b-page', target: LUMI_MORNING_TARGET },
  'tsv-s1-a1-d': { ...LUMI_CONTRACT, pageId: 'tsv-a1-d-page', target: LUMI_MORNING_TARGET },
  'tsv-s1-a1-s': {
    ...LUMI_CONTRACT,
    pageId: 'tsv-a1-s-page',
    target: LUMI_MORNING_TARGET,
    allowedSayText: TINY_STAR_GREETING_CHOICES,
  },
  'tsv-s1-a2-h': {
    pageId: 'tsv-a2-h-page',
    background: 'tsv-cloud-path-meadow',
    characterId: 'tuan-tuan',
    scriptId: 'tuan-tuan-flag',
    asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
    start: { gx: 8, gy: 10, size: 1, rot: 0 },
    target: [{ op: 'when_flag' }, { op: 'move_left', n: 3 }, { op: 'end' }],
    sceneTarget: {
      id: 'plaza-target',
      name: 'Plaza Star',
      gx: 11,
      gy: 10,
      size: 0.8,
    },
  },
  'tsv-s1-a2-b': {
    pageId: 'tsv-a2-b-page',
    background: 'tsv-cloud-path-meadow',
    characterId: 'tuan-tuan',
    scriptId: 'tuan-tuan-flag',
    asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
    start: { gx: 8, gy: 10, size: 1, rot: 0 },
    target: [{ op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'end' }],
    sceneTarget: {
      id: 'plaza-target',
      name: 'Plaza Star',
      gx: 11,
      gy: 10,
      size: 0.8,
    },
  },
  'tsv-s1-a2-d': {
    pageId: 'tsv-a2-d-page',
    background: 'tsv-cloud-path-meadow',
    characterId: 'tuan-tuan',
    scriptId: 'tuan-tuan-flag',
    asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
    start: { gx: 8, gy: 10, size: 1, rot: 0 },
    target: [{ op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'end' }],
    sceneTarget: {
      id: 'plaza-target',
      name: 'Plaza Star',
      gx: 11,
      gy: 10,
      size: 0.8,
    },
  },
  'tsv-s1-a2-s': {
    pageId: 'tsv-a2-s-page',
    background: 'tsv-cloud-path-meadow',
    characterId: 'tuan-tuan',
    scriptId: 'tuan-tuan-flag',
    asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
    start: { gx: 8, gy: 10, size: 1, rot: 0 },
    target: [{ op: 'when_flag' }, { op: 'move_right', n: 1 }, { op: 'move_right', n: 1 }, { op: 'end' }],
    sceneTarget: { id: 'plaza-target', name: 'My Home Star', gx: 10, gy: 10, size: 0.8 },
  },
  'tsv-s1-a3-h': {
    pageId: 'tsv-a3-h-page',
    background: 'sunset',
    characterId: 'dot-dot',
    scriptId: 'dot-dot-tap',
    asset: '/story-blocks/tiny-star-village/characters/dot-dot/resting.svg',
    start: { gx: 10, gy: 8, size: 1, rot: 0 },
    target: [{ op: 'when_tap' }, { op: 'hop', n: 1 }, { op: 'say', text: '醒啦' }, { op: 'end' }],
  },
  'tsv-s1-a3-b': {
    pageId: 'tsv-a3-b-page',
    background: 'sunset',
    characterId: 'dot-dot',
    scriptId: 'dot-dot-tap',
    asset: '/story-blocks/tiny-star-village/characters/dot-dot/resting.svg',
    start: { gx: 10, gy: 8, size: 1, rot: 0 },
    target: [{ op: 'when_tap' }, { op: 'hop', n: 1 }, { op: 'end' }],
  },
  'tsv-s1-a3-d': {
    pageId: 'tsv-a3-d-page',
    background: 'sunset',
    characterId: 'dot-dot',
    scriptId: 'dot-dot-event',
    asset: '/story-blocks/tiny-star-village/characters/dot-dot/resting.svg',
    start: { gx: 10, gy: 8, size: 1, rot: 0 },
    target: [{ op: 'when_tap' }, { op: 'hop', n: 1 }, { op: 'end' }],
  },
  'tsv-s1-a3-s': {
    pageId: 'tsv-a3-s-page',
    background: 'sunset',
    characterId: 'dot-dot',
    scriptId: 'dot-dot-surprise',
    asset: '/story-blocks/tiny-star-village/characters/dot-dot/resting.svg',
    start: { gx: 10, gy: 8, size: 1, rot: 0 },
    target: [{ op: 'when_tap' }, { op: 'hop', n: 1 }, { op: 'end' }],
  },
  'tsv-s1-a4-h': {
    pageId: 'tsv-a4-h-page',
    background: 'meadow',
    characterId: 'breakfast-cart',
    scriptId: 'breakfast-cart-flag',
    asset: '/story-blocks/tiny-star-village/props/breakfast-cart.svg',
    start: { gx: 4, gy: 10, size: 1, rot: 0 },
    target: [{ op: 'when_flag' }, { op: 'move_right', n: 1 }, { op: 'end' }],
    sceneTarget: { id: 'breakfast-table', name: 'Breakfast Table', gx: 7, gy: 10, size: 0.9 },
  },
  'tsv-s1-a4-b': {
    pageId: 'tsv-a4-b-page',
    background: 'meadow',
    characterId: 'breakfast-cart',
    scriptId: 'breakfast-cart-build',
    asset: '/story-blocks/tiny-star-village/props/breakfast-cart.svg',
    start: { gx: 4, gy: 10, size: 1, rot: 0 },
    target: [{ op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'end' }],
    sceneTarget: { id: 'breakfast-table', name: 'Breakfast Table', gx: 7, gy: 10, size: 0.9 },
  },
  'tsv-s1-a4-d': {
    pageId: 'tsv-a4-d-page',
    background: 'meadow',
    characterId: 'breakfast-cart',
    scriptId: 'breakfast-cart-debug',
    asset: '/story-blocks/tiny-star-village/props/breakfast-cart.svg',
    start: { gx: 4, gy: 10, size: 1, rot: 0 },
    target: [{ op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'end' }],
    sceneTarget: { id: 'breakfast-table', name: 'Breakfast Table', gx: 7, gy: 10, size: 0.9 },
  },
  // Journey to the West S1/C1-P4 — the chapter's Build 1 (scene-specs
  // JTW-S1-C1-P4). The child selects play_sound(Chime)/show/hop(1)/say from the
  // palette (grow/turn are live distractors the exact-target match rejects) and
  // orders them between the reserved when_flag+hide and end.
  'jtw-s1-c1-p4': {
    pageId: 'jtw-c1-p4-page',
    background: 'jtw-s1-c1-flower-fruit-stone',
    characterId: 'stone-monkey',
    scriptId: 'stone-monkey-arrival-build',
    asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
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
    asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
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
    asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
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
    asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
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
  'jtw-s1-c2-p5': {
    pageId: 'jtw-c2-p5-page',
    background: 'jtw-s1-c2-stage-base',
    characterId: 'water-curtain-trigger',
    scriptId: 'water-curtain-open',
    asset: '/story-blocks/journey-to-the-west/props/water-curtain-trigger/initial-v01.png',
    target: [
      { op: 'when_bump' },
      { op: 'hide' },
      { op: 'play_sound', n: 2 },
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
    asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
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
};

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

function blockMatches(actual: Block | undefined, target: Block): boolean {
  return actual?.op === target.op && actual.n === target.n && actual.text === target.text;
}

function missionBlockMatches(
  actual: Block | undefined,
  target: Block,
  mission: StoryMissionProgramContract,
): boolean {
  if (target.op === 'say' && mission.allowedSayText) {
    return actual?.op === 'say' && mission.allowedSayText.includes(actual.text ?? '');
  }
  return blockMatches(actual, target);
}

export function storyMissionProgramMatches(project: BlocksProject, lessonId: string): boolean {
  const mission = TINY_STAR_MISSION_CONTRACTS[lessonId];
  if (!mission) return false;

  const page = project.pages.find((candidate) => candidate.id === mission.pageId);
  const character = page?.characters.find((candidate) => candidate.id === mission.characterId);
  const script = character?.scripts.find((candidate) => candidate.id === mission.scriptId);
  const blocks = script?.blocks ?? [];
  const sceneTarget = mission.sceneTarget
    ? page?.characters.find((candidate) => candidate.id === mission.sceneTarget?.id)
    : undefined;
  const startMatches =
    !mission.start ||
    (character?.start.gx === mission.start.gx &&
      character.start.gy === mission.start.gy &&
      character.start.size === mission.start.size &&
      character.start.rot === mission.start.rot);
  const targetMatches =
    !mission.sceneTarget ||
    (sceneTarget?.name === mission.sceneTarget.name &&
      sceneTarget.start.gx === mission.sceneTarget.gx &&
      sceneTarget.start.gy === mission.sceneTarget.gy &&
      sceneTarget.start.size === mission.sceneTarget.size &&
      sceneTarget.scripts.length === 0 &&
      page?.characters.length === 2);

  if (lessonId === 'tsv-s1-a3-b') {
    const responseBlocks = blocks.slice(1, -1);
    const responsesAreVisible =
      responseBlocks.length >= 1 &&
      responseBlocks.length <= 2 &&
      responseBlocks.every(
        (block) =>
          (block.op === 'hop' && block.n === 1) ||
          (block.op === 'say' && Boolean(block.text?.trim())),
      );
    return (
      project.lessonId === lessonId &&
      page?.background === mission.background &&
      page.characters.length === 1 &&
      character?.asset === mission.asset &&
      startMatches &&
      blocks[0]?.op === 'when_tap' &&
      blocks.at(-1)?.op === 'end' &&
      responsesAreVisible
    );
  }

  if (lessonId === 'tsv-s1-a3-s') {
    const allowedAssets = [
      '/story-blocks/tiny-star-village/characters/dot-dot/resting.svg',
      '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
      '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
    ];
    const response = blocks[1];
    const responseIsVisible =
      (response?.op === 'hop' && response.n === 1) ||
      (response?.op === 'grow' && response.n === 1) ||
      (response?.op === 'say' && ['Surprise!', 'Tap sparkle!', 'Hello, friend!'].includes(response.text ?? ''));
    return project.lessonId === lessonId && page?.background === mission.background &&
      page.characters.length === 1 && character?.id === 'dot-dot' &&
      allowedAssets.includes(character.asset ?? '') && startMatches && blocks.length === 3 &&
      blocks[0]?.op === 'when_tap' && responseIsVisible && blocks[2]?.op === 'end';
  }

  if (lessonId === 'tsv-s1-a2-s') {
    const endpoint = sceneTarget?.start.gx;
    const direction = endpoint === 6 ? 'move_left' : endpoint === 10 ? 'move_right' : undefined;
    return (
      project.lessonId === lessonId && page?.background === mission.background &&
      character?.asset === mission.asset && startMatches && page?.characters.length === 2 &&
      sceneTarget?.name === 'My Home Star' && sceneTarget.start.gy === 10 &&
      sceneTarget.start.size === 0.8 && sceneTarget.scripts.length === 0 &&
      blocks.length === 4 && blocks[0]?.op === 'when_flag' && blocks[3]?.op === 'end' &&
      blocks[1]?.op === direction && blocks[1]?.n === 1 &&
      blocks[2]?.op === direction && blocks[2]?.n === 1
    );
  }
  if (lessonId === 'jtw-s1-c1-p5') {
    // Both greeting orders are valid; the verified prefix (incl. Show) and the
    // End are mandatory, and the Say must be one of the preset greetings.
    const prefixOk =
      blocks.length === 7 &&
      blocks[0]?.op === 'when_flag' &&
      blocks[1]?.op === 'hide' &&
      blocks[2]?.op === 'play_sound' &&
      blocks[2]?.n === 2 &&
      blocks[3]?.op === 'show' &&
      blocks[6]?.op === 'end';
    const sayOk = (block: Block | undefined) =>
      block?.op === 'say' && (JTW_GREETING_CHOICES as readonly string[]).includes(block.text ?? '');
    const hopOk = (block: Block | undefined) => block?.op === 'hop' && block.n === 1;
    const greetingOk =
      (hopOk(blocks[4]) && sayOk(blocks[5])) || (sayOk(blocks[4]) && hopOk(blocks[5]));
    return (
      project.lessonId === lessonId &&
      page?.background === mission.background &&
      character?.asset === mission.asset &&
      startMatches &&
      prefixOk &&
      greetingOk
    );
  }

  if (lessonId === 'jtw-s1-c1-p7') {
    // Personal Ship: the child's own two actions vary, so there is no exact
    // target — the fixed frame, the visible-action rules, the optional wait
    // and the preset greeting are enforced structurally.
    return (
      project.lessonId === lessonId &&
      page?.background === mission.background &&
      character?.asset === mission.asset &&
      startMatches &&
      jtwPersonalArrivalDesign(blocks) !== null
    );
  }

  if (lessonId === 'jtw-s1-c2-p5') {
    const monkey = page?.characters.find((candidate) => candidate.id === 'stone-monkey');
    const curtain = page?.characters.find(
      (candidate) => candidate.id === 'water-curtain-trigger',
    );
    const cave = page?.characters.find((candidate) => candidate.id === 'cave-entrance');
    const route = monkey?.scripts.find(
      (candidate) => candidate.id === 'stone-monkey-route-to-curtain',
    )?.blocks;
    const curtainBlocks = curtain?.scripts.find(
      (candidate) => candidate.id === 'water-curtain-open',
    )?.blocks;
    const caveBlocks = cave?.scripts.find(
      (candidate) => candidate.id === 'cave-entrance-reveal',
    )?.blocks;
    const routeTarget = TINY_STAR_MISSION_CONTRACTS['jtw-s1-c2-p4'].target;
    return (
      project.lessonId === lessonId &&
      page?.background === mission.background &&
      page.characters.length === 3 &&
      monkey?.start.gx === 2 &&
      monkey.start.gy === 8 &&
      route?.length === routeTarget.length &&
      routeTarget.every((target, index) => blockMatches(route[index], target)) &&
      curtain?.asset === mission.asset &&
      curtain.start.visible !== false &&
      curtain.start.reach === 0.5 &&
      curtainBlocks?.length === 4 &&
      blockMatches(curtainBlocks[0], { op: 'when_bump' }) &&
      blockMatches(curtainBlocks[1], { op: 'hide' }) &&
      blockMatches(curtainBlocks[2], { op: 'play_sound', n: 2 }) &&
      blockMatches(curtainBlocks[3], { op: 'end' }) &&
      cave?.asset ===
        '/story-blocks/journey-to-the-west/props/cave-entrance/revealed-v01.png' &&
      cave.start.visible === false &&
      cave.start.reach === 0.5 &&
      caveBlocks?.length === 4 &&
      blockMatches(caveBlocks[0], { op: 'when_bump' }) &&
      blockMatches(caveBlocks[1], { op: 'show' }) &&
      blockMatches(caveBlocks[2], { op: 'say', text: '桥、干地、石座、清水。' }) &&
      blockMatches(caveBlocks[3], { op: 'end' })
    );
  }

  return (
    project.lessonId === lessonId &&
    page?.background === mission.background &&
    character?.asset === mission.asset &&
    startMatches &&
    targetMatches &&
    blocks.length === mission.target.length &&
    mission.target.every((target, index) => missionBlockMatches(blocks[index], target, mission))
  );
}

/** Preset dialogue choices the Say editor offers for a mission, if any. */
export function storyMissionSayChoices(lessonId: string | undefined): readonly string[] | null {
  if (!lessonId) return null;
  return TINY_STAR_MISSION_CONTRACTS[lessonId]?.allowedSayText ?? null;
}

export function storyMissionScriptId(lessonId: string): string | undefined {
  return TINY_STAR_MISSION_CONTRACTS[lessonId]?.scriptId;
}
