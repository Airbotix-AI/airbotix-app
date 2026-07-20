import { describe, expect, it, vi } from 'vitest';

import { BlocksRunner } from '../learn/blocks/interpreter';
import { sceneId } from '../learn/blocks/library';
import { parseProject, serializeProject } from '../learn/blocks/blocksModel';
import { JOURNEY_TO_WEST_C1_PROJECT } from './journeyToWestC1Project';

describe('Journey to the West C1 runtime preview', () => {
  it('round-trips through the real parser with the approved first-party assets', () => {
    const parsed = parseProject(serializeProject(JOURNEY_TO_WEST_C1_PROJECT));
    const page = parsed.pages[0];
    const stoneMonkey = page.characters[0];

    expect(page.background).toBe('jtw-s1-c1-flower-fruit-stone');
    expect(sceneId(page.background)).toBe('jtw-s1-c1-flower-fruit-stone');
    expect(stoneMonkey.asset).toBe(
      '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
    );
    expect(stoneMonkey.name).toBe('Stone Monkey');
    expect(stoneMonkey.start).toMatchObject({ gx: 8, gy: 9, size: 3 });
    expect(stoneMonkey.scripts[0].blocks.map((block) => block.op)).toEqual([
      'when_flag',
      'hide',
      'play_sound',
      'wait',
      'show',
      'hop',
      'say',
      'end',
    ]);
  });

  it('runs hide, chime, show, hop and the child-facing greeting in order', async () => {
    const page = parseProject(serializeProject(JOURNEY_TO_WEST_C1_PROJECT)).pages[0];
    const visibility: boolean[] = [];
    const yPositions: number[] = [];
    const sounds: number[] = [];
    const speech: Array<string | null> = [];
    const steps: number[] = [];
    const runner = new BlocksRunner(
      page,
      {
        onSprite: (_id, state) => {
          visibility.push(state.visible);
          yPositions.push(state.gy);
        },
        onSay: (_id, text) => speech.push(text),
        onNote: vi.fn(),
        onSound: (sound) => sounds.push(sound),
        onGotoPage: vi.fn(),
        onStep: (_id, _scriptId, index) => steps.push(index),
      },
      async () => undefined,
    );

    await runner.runFlag();

    expect(visibility).toContain(false);
    expect(visibility.at(-1)).toBe(true);
    expect(sounds).toEqual([2]);
    expect(Math.min(...yPositions)).toBe(8);
    expect(speech).toContain("Hello! I'm new here!");
    expect(steps).toEqual([1, 2, 3, 4, 5, 6, 7, -1]);
  });
});
