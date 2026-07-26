import type { BlocksProject } from './blocksModel';

const ROUTE = [
  'when_flag',
  'move_right',
  'move_right',
  'move_up',
  'move_right',
  'move_right',
  'end',
] as const;

function ops(project: BlocksProject, characterId: string, scriptId: string): string[] {
  return (
    project.pages[0]?.characters
      .find((character) => character.id === characterId)
      ?.scripts.find((script) => script.id === scriptId)
      ?.blocks.map((block) => block.op) ?? []
  );
}

export function jtwC2P5ProgramMatches(project: BlocksProject): boolean {
  if (project.lessonId !== 'jtw-s1-c2-p5') return false;
  const page = project.pages.find((candidate) => candidate.id === 'jtw-c2-p5-page');
  if (!page) return false;
  const monkey = page.characters.find((character) => character.id === 'stone-monkey');
  const curtain = page.characters.find((character) => character.id === 'water-curtain-trigger');
  const cave = page.characters.find((character) => character.id === 'cave-entrance');
  if (!monkey || !curtain || !cave) return false;
  if (
    monkey.start.gx !== 2 ||
    monkey.start.gy !== 8 ||
    curtain.start.gx !== 6 ||
    curtain.start.gy !== 7 ||
    cave.start.visible !== false
  ) {
    return false;
  }
  const route = ops(project, monkey.id, 'stone-monkey-route-to-curtain');
  const curtainOps = ops(project, curtain.id, 'water-curtain-open');
  const caveOps = ops(project, cave.id, 'cave-entrance-reveal');
  return (
    route.join('|') === ROUTE.join('|') &&
    curtainOps.join('|') === 'when_bump|hide|play_sound|end' &&
    caveOps.join('|') === 'when_bump|show|say|end'
  );
}
