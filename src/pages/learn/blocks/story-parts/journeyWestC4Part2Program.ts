import type { BlockOp, BlocksProject } from '../blocksModel';

export const C4_P2_STORY = [
  'Stone Monkey originally had no human name. Master named him "Sun" and gave him the Dharma name "Wukong" according to his ranking in the family. This name is not just another decorative sticker: from now on, partners and viewers will know him by the same name.',
  "Wukong has studied at his master’s school for a long time. Today's small demonstration practises two triggers: Go completes the name story, and a real Tap starts the action. A few blocks do not mean learning every skill at once.",
] as const;

export const C4_P2_PREDICTIONS = [
  { id: 'name-only', label: 'When the name appears, the ability remains quiet', correct: true },
  { id: 'hop-alone', label: 'He will hop first without waiting for tap', correct: false },
] as const;

export const C4_P2_PROJECT: BlocksProject = {
  version: 1,
  name: 'Journey to the West · C4 — Two Beginnings',
  lessonId: 'jtw-s1-c4-p2',
  pages: [
    {
      id: 'jtw-c4-p2-page',
      background: 'jtw-s1-c3-page3-resolved-v01',
      characters: [
        {
          id: 'sun-wukong',
          name: 'Sun Wukong',
          emoji: '🐵',
          asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
          start: { gx: 8, gy: 9, size: 3, rot: 0 },
          scripts: [
            {
              id: 'sun-wukong-wrong-start',
              blocks: [
                { op: 'when_flag' },
                { op: 'show' },
                { op: 'say', text: 'I am Sun Wukong' },
                { op: 'hop', n: 1 },
                { op: 'end' },
              ],
            },
            {
              id: 'sun-wukong-tap-example',
              blocks: [{ op: 'when_tap' }, { op: 'turn_right', n: 2 }, { op: 'end' }],
            },
          ],
        },
      ],
    },
  ],
};

export function c4p2PredictionDone(value: string | null): boolean {
  return C4_P2_PREDICTIONS.find((option) => option.id === value)?.correct === true;
}

export function c4p2TraceDone(trace: readonly BlockOp[], trigger: BlockOp): boolean {
  if (trigger === 'when_flag') {
    return trace.join(',') === 'when_flag,show,say,hop,end';
  }
  return trace.join(',') === 'when_tap,turn_right,end';
}
