import type { BlocksProject } from './blocksModel';

const TINY_STAR_A1_LESSON = 'tsv-s1-a1-h';
const TINY_STAR_A1_PAGE = 'tsv-a1-h-page';
const LUMILO_CHARACTER = 'little-light';
const LUMILO_FLAG_SCRIPT = 'little-light-flag';
const LUMILO_ASSET =
  '/story-blocks/tiny-star-village/characters/little-light/resting.svg';

export function storyMissionProgramMatches(
  project: BlocksProject,
  lessonId: string,
): boolean {
  if (lessonId !== TINY_STAR_A1_LESSON) return false;

  const page = project.pages.find((candidate) => candidate.id === TINY_STAR_A1_PAGE);
  const lumilo = page?.characters.find((character) => character.id === LUMILO_CHARACTER);
  const script = lumilo?.scripts.find((candidate) => candidate.id === LUMILO_FLAG_SCRIPT);
  const blocks = script?.blocks ?? [];

  return page?.background === 'tsv-window-room-dim'
    && lumilo?.asset === LUMILO_ASSET
    && blocks.length === 4
    && blocks[0]?.op === 'when_flag'
    && blocks[1]?.op === 'hop'
    && blocks[1]?.n === 1
    && blocks[2]?.op === 'say'
    && blocks[2]?.text === 'Morning!'
    && blocks[3]?.op === 'end';
}

export function storyMissionScriptId(lessonId: string): string | undefined {
  return lessonId === TINY_STAR_A1_LESSON ? LUMILO_FLAG_SCRIPT : undefined;
}
