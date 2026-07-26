import type { BlocksProject } from '../learn/blocks/blocksModel';

export const JOURNEY_TO_WEST_C1_PREVIEW_ID = 'jtw-s1-c1-runtime-preview';

export const JOURNEY_TO_WEST_C1_PROJECT: BlocksProject = {
  version: 1,
  name: 'Journey to the West · Chapter 1: The Stone Monkey Is Born',
  pages: [
    {
      id: 'jtw-s1-c1-page-1',
      background: 'jtw-s1-c1-flower-fruit-stone',
      characters: [
        {
          id: 'stone-monkey',
          name: 'Stone Monkey',
          emoji: '🐵',
          asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
          start: { gx: 8, gy: 9, size: 3, rot: 0 },
          scripts: [
            {
              id: 'stone-monkey-arrival',
              blocks: [
                { op: 'when_flag' },
                { op: 'hide' },
                { op: 'play_sound', n: 2 },
                { op: 'wait', n: 2 },
                { op: 'show' },
                { op: 'hop', n: 1 },
                { op: 'say', text: "Hello! I'm new here!" },
                { op: 'end' },
              ],
            },
          ],
        },
      ],
    },
  ],
};
