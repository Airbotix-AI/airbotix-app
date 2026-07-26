import type { Block, BlocksProject } from '../blocksModel';

const LESSON_ID = 'jtw-s1-c2-p5';

function ops(blocks: Block[] | undefined): string[] {
  return (blocks ?? []).map(({ op }) => op);
}

export function c2p5ProgramMatches(project: BlocksProject): boolean {
  if (project.lessonId !== LESSON_ID) return false;
  const actors = project.pages.find((page) => page.id === 'jtw-c2-p5-page')?.characters;
  const curtain = actors?.find((actor) => actor.id === 'water-curtain-trigger');
  const cave = actors?.find((actor) => actor.id === 'cave-entrance');
  const curtainOps = ops(
    curtain?.scripts.find((script) => script.id === 'water-curtain-open')?.blocks,
  );
  const caveOps = ops(cave?.scripts.find((script) => script.id === 'cave-entrance-reveal')?.blocks);
  return (
    curtain?.start.visible === true &&
    cave?.start.visible === false &&
    curtain?.start.reach === 1 &&
    cave?.start.reach === 1 &&
    curtainOps.join(',') === 'when_bump,hide,play_sound,end' &&
    caveOps.join(',') === 'when_bump,show,say,end'
  );
}
