import type { BlocksProject } from '../blocksModel';
import { jtwC4DualBuildMatches, jtwC4PlacedBlocks } from '../jtwC4DualBuild';

export const C4_P4_PART_ID = 'jtw-s1-c4-p4';
export const C4_P4_NEXT_PART_ID = 'jtw-s1-c4-p5';
export const C4_P4_TEMPLATE_ID = 'blocks_jtw_c4_p4';
export const C4_P4_CONTINUE_LABEL = 'Choose a small display';

export const C4_P4_STORY_BEFORE = [
  'The master gave Stone Monkey the surname "Sun" and the name "Wukong". This name is not just a decorative label: from now on, his friends and the audience can recognise him by the same name. He came from Flower-Fruit Mountain as Stone Monkey, and his next adventures will be as Sun Wukong.',
  'Wukong has studied at his master’s school for a long time. This course uses one small skill demonstration to show how different triggers work: Go tells how he received his name, and a real Tap starts his action. A few blocks do not represent all of his training or the seventy-two transformations.',
];

export const C4_P4_CLASSIC_CARD =
  'Chapters 1 to 2 of the original work describe the story of the Monkey King who, after many years of searching, became a disciple and learned his skills. The course respects the role of the master and does not allow the AI ​​Coach to imitate religious authority, nor does it turn spiritual practice into rewards at the touch of a button.';

export const C4_P4_STORY_BRIDGE =
  'Start carries "the name that happens when you enter the scene"; On Tap carries "the display that happens after the audience invites it". Two Triggers represent two different story conditions.';

export const C4_P4_PREDICTION_OPTIONS = [
  {
    id: 'skill-quiet',
    label: 'Just press Go: the name chain runs, the skill chain remains quiet',
    correct: true,
  },
  {
    id: 'both-run',
    label: 'Just press Go: the two chains of name and skill run together',
    correct: false,
  },
] as const;

export const C4_P4_TAP_OPTIONS = [
  {
    id: 'leaf-after-tap',
    label: 'The leaf pattern target will light up only after Tap',
    correct: true,
  },
  { id: 'leaf-before-tap', label: 'Go rear leaf pattern target has been lit up', correct: false },
] as const;

export const C4_P4_RESOLVED_WORLD_CHANGE =
  'The nameplate lights up steadily from Start; the leaf pattern target only lights up after Tap, and the two chains each go to End.';
export const C4_P4_STORY_AFTER =
  'The partner first remembers the name "Sun Wukong" and only sees the small display after receiving the invitation. Master asked Wukong to choose how to respond next, instead of rushing to perform before the invitation.';

export interface C4P4BuildEvidence {
  projectId: string;
  placedBlocks: string[];
  programMatches: boolean;
  dualRunCompleted: boolean;
}

export function c4p4BuildEvidence(
  projectId: string,
  project: BlocksProject,
  completedLessonIds: readonly string[],
): C4P4BuildEvidence {
  return {
    projectId,
    placedBlocks: jtwC4PlacedBlocks(project),
    programMatches: jtwC4DualBuildMatches(project),
    dualRunCompleted: completedLessonIds.includes(C4_P4_PART_ID),
  };
}

export function c4p4PredictionCorrect(value: string | null): boolean {
  return C4_P4_PREDICTION_OPTIONS.some((option) => option.id === value && option.correct);
}

export function c4p4TapPredictionCorrect(value: string | null): boolean {
  return C4_P4_TAP_OPTIONS.some((option) => option.id === value && option.correct);
}
