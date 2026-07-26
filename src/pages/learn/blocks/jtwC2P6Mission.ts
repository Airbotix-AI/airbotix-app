import type { Block, BlocksProject } from './blocksModel';

export const JTW_C2_P6_BUG: Block[] = [
  { op: 'when_flag' },
  { op: 'move_left', n: 2 },
  { op: 'move_left', n: 2 },
  { op: 'move_down', n: 1 },
  { op: 'end' },
];

const FIXED: Block[] = [
  { op: 'when_flag' },
  { op: 'move_left', n: 2 },
  { op: 'move_down', n: 1 },
  { op: 'move_left', n: 2 },
  { op: 'end' },
];

const OUTBOUND: Block[] = [
  { op: 'when_flag' },
  { op: 'move_right', n: 1 },
  { op: 'move_right', n: 1 },
  { op: 'move_up', n: 1 },
  { op: 'move_right', n: 1 },
  { op: 'move_right', n: 1 },
  { op: 'end' },
];

function blocksMatch(actual: readonly Block[], expected: readonly Block[]): boolean {
  return (
    actual.length === expected.length &&
    expected.every(
      (block, index) =>
        actual[index]?.op === block.op &&
        (block.n === undefined || actual[index]?.n === block.n) &&
        actual[index]?.text === block.text,
    )
  );
}

export function jtwC2P6ProgramMatches(project: BlocksProject): boolean {
  if (project.lessonId !== 'jtw-s1-c2-p6' || project.pages.length !== 2) return false;
  const returnPage = project.pages.find((page) => page.id === 'jtw-c2-p6-return-page');
  const proofPage = project.pages.find((page) => page.id === 'jtw-c2-p6-outbound-proof');
  const monkey = returnPage?.characters.find((character) => character.id === 'stone-monkey');
  const waiting = returnPage?.characters.find((character) => character.id === 'waiting-monkeys');
  const proof = proofPage?.characters.find(
    (character) => character.id === 'stone-monkey-outbound-proof',
  );
  if (!returnPage || !proofPage || !monkey || !waiting || !proof) return false;
  if (
    returnPage.background !== 'jtw-s1-c2-actor-free-base' ||
    proofPage.background !== 'jtw-s1-c2-actor-free-base' ||
    monkey.start.gx !== 6 ||
    monkey.start.gy !== 7 ||
    waiting.start.gx !== 2 ||
    waiting.start.gy !== 8 ||
    proof.start.gx !== 2 ||
    proof.start.gy !== 8
  ) {
    return false;
  }
  const returnBlocks =
    monkey.scripts.find((script) => script.id === 'stone-monkey-return-debug')?.blocks ?? [];
  const outboundBlocks =
    proof.scripts.find((script) => script.id === 'stone-monkey-route-to-curtain')?.blocks ?? [];
  return blocksMatch(returnBlocks, FIXED) && blocksMatch(outboundBlocks, OUTBOUND);
}

export function jtwC2P6ProjectDiff(project: BlocksProject): string[] {
  const blocks =
    project.pages
      .find((page) => page.id === 'jtw-c2-p6-return-page')
      ?.characters.find((character) => character.id === 'stone-monkey')
      ?.scripts.find((script) => script.id === 'stone-monkey-return-debug')?.blocks ?? [];
  if (!blocksMatch(blocks, FIXED)) return [];
  return ['move_down:4->3', 'move_left:3->4'];
}
