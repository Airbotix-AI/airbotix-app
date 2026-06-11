// The bundled 3-page BlocksProject for `/try/blocks` (try-demo-mode-prd §4):
// "Cat's Day Out" — full scripts ready to play, exercising the real block
// language (`when_flag`, motion, `say`, `when_tap`, `send_message`/
// `when_message`, `goto_page`, `wait`, `grow`, `hide`/`show`, `forever`, `end`).
// Every op/character/scene is a REAL catalogue entry (`blocksModel.ts` /
// `library.ts`); `demoStory.blocks.test.ts` asserts the document round-trips
// through the real `parseProject` unchanged and plays via the real interpreter.
//
// ⚠️ Demo parity (D-DEMO-07): if the block catalogue or model shape changes,
// update this story (and its tests + overlay copy) in the same task.

import type { BlocksProject } from '../learn/blocks/blocksModel';

export const CATS_DAY_OUT: BlocksProject = {
  version: 1,
  name: "Cat's Day Out",
  pages: [
    {
      id: 'try-page-1',
      background: 'meadow',
      characters: [
        {
          id: 'try-cat-1',
          name: 'Cat',
          emoji: '🐱',
          start: { gx: 3, gy: 10, size: 1, rot: 0 },
          scripts: [
            {
              id: 'try-cat-1-flag',
              blocks: [
                { op: 'when_flag' },
                { op: 'say', text: "A sunny day! Let's go!" },
                { op: 'move_right', n: 4 },
                { op: 'hop', n: 2 },
                { op: 'send_message' },
                { op: 'end' },
              ],
            },
            {
              id: 'try-cat-1-tap',
              blocks: [
                { op: 'when_tap' },
                { op: 'say', text: 'That tickles!' },
                { op: 'hop', n: 1 },
              ],
            },
          ],
        },
        {
          id: 'try-butterfly-1',
          name: 'Butterfly',
          emoji: '🦋',
          start: { gx: 14, gy: 4, size: 1, rot: 0 },
          scripts: [
            {
              id: 'try-butterfly-1-msg',
              blocks: [
                { op: 'when_message' },
                { op: 'move_left', n: 3 },
                { op: 'hop', n: 1 },
                { op: 'say', text: 'Follow me!' },
                { op: 'end' },
              ],
            },
          ],
        },
        {
          id: 'try-sun-1',
          name: 'Sun',
          emoji: '☀️',
          start: { gx: 17, gy: 2, size: 1, rot: 0 },
          scripts: [
            {
              id: 'try-sun-1-tap',
              blocks: [
                { op: 'when_tap' },
                { op: 'say', text: 'To the beach!' },
                { op: 'goto_page', n: 2 },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'try-page-2',
      background: 'beach',
      characters: [
        {
          id: 'try-cat-2',
          name: 'Cat',
          emoji: '🐱',
          start: { gx: 3, gy: 10, size: 1, rot: 0 },
          scripts: [
            {
              id: 'try-cat-2-flag',
              blocks: [
                { op: 'when_flag' },
                { op: 'move_right', n: 5 },
                { op: 'say', text: 'The beach!' },
                { op: 'end' },
              ],
            },
            {
              id: 'try-cat-2-tap',
              blocks: [
                { op: 'when_tap' },
                { op: 'hop', n: 2 },
                { op: 'say', text: 'Splash!' },
              ],
            },
          ],
        },
        {
          id: 'try-crab-2',
          name: 'Crab',
          emoji: '🦀',
          start: { gx: 12, gy: 12, size: 1, rot: 0 },
          scripts: [
            {
              id: 'try-crab-2-flag',
              blocks: [
                { op: 'when_flag' },
                { op: 'move_left', n: 2 },
                { op: 'move_right', n: 2 },
                { op: 'forever' },
              ],
            },
          ],
        },
        {
          id: 'try-boat-2',
          name: 'Boat',
          emoji: '⛵',
          start: { gx: 17, gy: 6, size: 1, rot: 0 },
          scripts: [
            {
              id: 'try-boat-2-tap',
              blocks: [
                { op: 'when_tap' },
                { op: 'say', text: 'Off we go!' },
                { op: 'goto_page', n: 3 },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'try-page-3',
      background: 'sunset',
      characters: [
        {
          id: 'try-cat-3',
          name: 'Cat',
          emoji: '🐱',
          start: { gx: 4, gy: 10, size: 1, rot: 0 },
          scripts: [
            {
              id: 'try-cat-3-flag',
              blocks: [
                { op: 'when_flag' },
                { op: 'move_right', n: 3 },
                { op: 'say', text: 'What a day!' },
                { op: 'grow', n: 2 },
                { op: 'end' },
              ],
            },
          ],
        },
        {
          id: 'try-owl-3',
          name: 'Owl',
          emoji: '🦉',
          start: { gx: 15, gy: 4, size: 1, rot: 0 },
          scripts: [
            {
              id: 'try-owl-3-flag',
              blocks: [
                { op: 'when_flag' },
                { op: 'hide' },
                { op: 'wait', n: 5 },
                { op: 'show' },
                { op: 'say', text: 'Good night!' },
                { op: 'end' },
              ],
            },
            {
              id: 'try-owl-3-tap',
              blocks: [
                { op: 'when_tap' },
                { op: 'hop', n: 1 },
                { op: 'say', text: 'Hoo!' },
              ],
            },
          ],
        },
      ],
    },
  ],
};
