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
};

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

export function storyMissionScriptId(lessonId: string): string | undefined {
  return TINY_STAR_MISSION_CONTRACTS[lessonId]?.scriptId;
}
