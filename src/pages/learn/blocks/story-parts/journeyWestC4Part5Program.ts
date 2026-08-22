import type { BlocksProject } from '../blocksModel';
import { jtwC4P5Choice, jtwC4PlacedBlocks } from '../jtwC4DualBuild';

export const C4_P5_PART_ID = 'jtw-s1-c4-p5';
export const C4_P5_NEXT_PART_ID = 'jtw-s1-c4-p6';
export const C4_P5_TEMPLATE_ID = 'blocks_jtw_c4_p5';
export const C4_P5_CONTINUE_LABEL = 'Check the queue for troubleshooting';

export const C4_P5_STORY_BEFORE = [
  "Wukong has studied at his master's school for a long time. Today he does not need to prove himself first: Start introduces his name, and the gentle demonstration begins only when his partner is ready and taps him.",
  'These three choices only express one response, do not represent a complete practice, nor do they pretend to be the seventy-two transformations. Selection changes the action, order, and visible results of the Tap chain.',
];

export const C4_P5_MOTIVE_OPTIONS = [
  {
    id: 'audience-ready',
    label: 'Because the partner was ready first, Wukong responded to the invitation',
    correct: true,
  },
  {
    id: 'show-off-first',
    label: 'Because Wukong wants to prove that he is the best before his name.',
    correct: false,
  },
] as const;

export const C4_P5_VERSION_OPTIONS = [
  {
    id: 'hop',
    label: 'Jumping over the leaf pattern: Hop 2 → "I\'m waiting for the invitation" → End',
  },
  {
    id: 'turn',
    label: 'Turn around and point to home: Turn Left 2 → Wait 1 → “Home is over there” → End',
  },
  { id: 'reappear', label: 'Screen reproduction: Hide → Wait 1 → Show → “Look here again” → End' },
] as const;

export const C4_P5_PREDICTION_OPTIONS = [
  {
    id: 'chosen-after-tap',
    label: 'Go only displays the name; the response I selected appears after Tap',
    correct: true,
  },
  {
    id: 'chosen-on-go',
    label: 'Go automatically plays the name and the response I choose',
    correct: false,
  },
] as const;

export interface C4P5BuildEvidence {
  projectId: string;
  placedBlocks: string[];
  version: string | null;
  dualRunCompleted: boolean;
}

export function c4p5BuildEvidence(
  projectId: string,
  project: BlocksProject,
  completedLessonIds: readonly string[],
): C4P5BuildEvidence {
  return {
    projectId,
    placedBlocks: jtwC4PlacedBlocks(project),
    version: jtwC4P5Choice(project),
    dualRunCompleted: completedLessonIds.includes(C4_P5_PART_ID),
  };
}

export function c4p5MotiveCorrect(value: string | null): boolean {
  return C4_P5_MOTIVE_OPTIONS.some((option) => option.id === value && option.correct);
}

export function c4p5PredictionCorrect(value: string | null): boolean {
  return C4_P5_PREDICTION_OPTIONS.some((option) => option.id === value && option.correct);
}
