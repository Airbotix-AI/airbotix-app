import type { Block, BlocksProject } from './blocksModel';

export const JTW_C5_P4_ID = 'jtw-s1-c5-p4';
export const JTW_C5_P5_ID = 'jtw-s1-c5-p5';
export const JTW_C5_P7_ID = 'jtw-s1-c5-p7';
export const JTW_C6_P4_ID = 'jtw-s1-c6-p4';
export const JTW_C6_P5_ID = 'jtw-s1-c6-p5';
export const JTW_C6_P8_ID = 'jtw-s1-c6-p8';

export const JTW_C5_C6_SAY_CHOICES: Readonly<Record<string, readonly string[]>> = {
  [JTW_C5_P5_ID]: ['Suitability is the goal'],
  [JTW_C5_P7_ID]: ['Suitability is the goal'],
  [JTW_C6_P4_ID]: ['Responsible for Tianma', 'Monkey King'],
  [JTW_C6_P5_ID]: ['Tiangong responds'],
  [JTW_C6_P8_ID]: [
    'Responsible for Tianma',
    'Monkey King',
    'Tiangong responds',
    'Stop here on the first trip',
  ],
};

const exact = (actual: readonly Block[] | undefined, expected: readonly Block[]) =>
  actual?.length === expected.length &&
  expected.every((block, index) => {
    const candidate = actual[index];
    return (
      candidate?.op === block.op &&
      (block.n === undefined || candidate.n === block.n) &&
      (block.text === undefined || candidate.text === block.text)
    );
  });

export const C5_P4_TARGET: readonly Block[] = [
  { op: 'when_flag' },
  { op: 'grow', n: 2 },
  { op: 'wait', n: 5 },
  { op: 'reset_size' },
  { op: 'shrink', n: 2 },
  { op: 'end' },
];
export const C5_P5_TARGET: readonly Block[] = [
  { op: 'when_flag' },
  { op: 'grow', n: 2 },
  { op: 'reset_size' },
  { op: 'wait', n: 5 },
  { op: 'shrink', n: 2 },
  { op: 'say', text: 'Suitability is the goal' },
  { op: 'end' },
];
export const C5_P7_TARGETS: readonly (readonly Block[])[] = [3, 5].flatMap((wait) => [
  [
    { op: 'when_flag' },
    { op: 'grow', n: 2 },
    { op: 'wait', n: wait },
    { op: 'reset_size' },
    { op: 'shrink', n: 2 },
    { op: 'wait', n: wait },
    { op: 'say', text: 'Suitability is the goal' },
    { op: 'end' },
  ] as const,
  [
    { op: 'when_flag' },
    { op: 'grow', n: 2 },
    { op: 'reset_size' },
    { op: 'wait', n: wait },
    { op: 'shrink', n: 2 },
    { op: 'wait', n: wait },
    { op: 'say', text: 'Suitability is the goal' },
    { op: 'end' },
  ] as const,
]);

export const C6_PAGE_ONE: readonly Block[] = [
  { op: 'when_flag' },
  { op: 'say', text: 'Responsible for Tianma' },
  { op: 'wait', n: 5 },
  { op: 'set_speed', n: 2 },
  { op: 'move_right', n: 2 },
  { op: 'say', text: 'Monkey King' },
  { op: 'goto_page', n: 2 },
];
export const C6_PAGE_TWO: readonly Block[] = [
  { op: 'when_flag' },
  { op: 'show' },
  { op: 'wait', n: 5 },
  { op: 'say', text: 'Tiangong responds' },
  { op: 'set_speed', n: 1 },
  { op: 'wait', n: 5 },
  { op: 'goto_page', n: 3 },
];
export const C6_PAGE_THREE: readonly Block[] = [
  { op: 'when_flag' },
  { op: 'say', text: 'Stop here on the first trip' },
  { op: 'wait', n: 5 },
  { op: 'end' },
];

function script(project: BlocksProject, pageId: string) {
  return project.pages.find((page) => page.id === pageId)?.characters[0]?.scripts[0]?.blocks;
}

export function jtwC5C6BuildMatches(project: BlocksProject, lessonId = project.lessonId): boolean {
  if (project.lessonId !== lessonId) return false;
  if (lessonId === JTW_C5_P4_ID) return exact(script(project, 'jtw-c5-p4-page'), C5_P4_TARGET);
  if (lessonId === JTW_C5_P5_ID) return exact(script(project, 'jtw-c5-p5-page'), C5_P5_TARGET);
  if (lessonId === JTW_C5_P7_ID)
    return C5_P7_TARGETS.some((target) => exact(script(project, 'jtw-c5-p7-page'), target));
  if (lessonId === JTW_C6_P4_ID) return exact(script(project, 'jtw-c6-page-1'), C6_PAGE_ONE);
  if (lessonId === JTW_C6_P5_ID) return exact(script(project, 'jtw-c6-page-2'), C6_PAGE_TWO);
  if (lessonId === JTW_C6_P8_ID) {
    return (
      project.name === "My Monkey King's First Journey" &&
      project.pages.length === 3 &&
      exact(script(project, 'jtw-c6-page-1'), C6_PAGE_ONE) &&
      exact(script(project, 'jtw-c6-page-2'), C6_PAGE_TWO) &&
      exact(script(project, 'jtw-c6-page-3'), C6_PAGE_THREE)
    );
  }
  return false;
}
