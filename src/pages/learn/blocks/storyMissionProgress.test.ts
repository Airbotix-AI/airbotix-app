import { describe, expect, it } from 'vitest';

import { type Block, blankProject } from './blocksModel';
import {
  TINY_STAR_DUET_CAST,
  TINY_STAR_DUET_FIRST_GX,
  TINY_STAR_DUET_FIRST_ID,
  TINY_STAR_DUET_FIRST_SCRIPT,
  TINY_STAR_DUET_GREETINGS,
  TINY_STAR_DUET_GY,
  TINY_STAR_DUET_HOP_N,
  TINY_STAR_DUET_SECOND_GX,
  TINY_STAR_DUET_SECOND_ID,
  TINY_STAR_DUET_SECOND_SCRIPT,
} from './tinyStarDuet';
import {
  TINY_STAR_BOUNCE_MS,
  TINY_STAR_RELAY_BUG_WAIT_N,
  TINY_STAR_RELAY_MAX_GAP_MS,
  TINY_STAR_RELAY_MIN_GAP_MS,
  TINY_STAR_RELAY_WAITS,
  TINY_STAR_TURN_MIN_GAP_MS,
  TINY_STAR_TURN_WAIT_N,
  storyMissionProgramMatches,
  tinyStarBounceGapMs,
  tinyStarBounceRelayInTime,
  tinyStarBounceRelayTooLate,
  tinyStarGreetingTookTurns,
} from './storyMissionProgress';

function correctedMissionProject() {
  const project = blankProject('Tiny Star Village');
  project.lessonId = 'tsv-s1-a1-h';
  project.pages[0] = {
    id: 'tsv-a1-h-page',
    background: 'tsv-window-room-dim',
    characters: [
      {
        id: 'little-light',
        name: 'Lumilo',
        emoji: '⭐',
        asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
        start: { gx: 8, gy: 10, size: 1, rot: 0 },
        scripts: [
          {
            id: 'little-light-flag',
            blocks: [
              { op: 'when_flag' },
              { op: 'hop', n: 1 },
              { op: 'say', text: 'Morning!' },
              { op: 'end' },
            ],
          },
        ],
      },
    ],
  };
  return project;
}

function completedBuildMissionProject() {
  const project = correctedMissionProject();
  project.lessonId = 'tsv-s1-a1-b';
  project.pages[0].id = 'tsv-a1-b-page';
  return project;
}

function correctedDebugMissionProject() {
  const project = correctedMissionProject();
  project.lessonId = 'tsv-s1-a1-d';
  project.pages[0].id = 'tsv-a1-d-page';
  return project;
}

function personalShipMissionProject(greeting = 'Good morning, village!') {
  const project = correctedMissionProject();
  project.lessonId = 'tsv-s1-a1-s';
  project.pages[0].id = 'tsv-a1-s-page';
  project.pages[0].characters[0].scripts[0].blocks[2] = { op: 'say', text: greeting };
  return project;
}

function directionHookProject() {
  const project = blankProject('Tiny Star Village · Which Way?');
  project.lessonId = 'tsv-s1-a2-h';
  project.pages[0] = {
    id: 'tsv-a2-h-page',
    background: 'tsv-cloud-path-meadow',
    characters: [
      {
        id: 'tuan-tuan',
        name: 'Tuan Tuan',
        emoji: '☁️',
        asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
        start: { gx: 8, gy: 10, size: 1, rot: 0 },
        scripts: [
          {
            id: 'tuan-tuan-flag',
            blocks: [{ op: 'when_flag' }, { op: 'move_left', n: 3 }, { op: 'end' }],
          },
        ],
      },
      {
        id: 'plaza-target',
        name: 'Plaza Star',
        emoji: '⭐',
        start: { gx: 11, gy: 10, size: 0.8, rot: 0 },
        scripts: [],
      },
    ],
  };
  return project;
}

function completedDirectionBuildProject() {
  const project = directionHookProject();
  project.lessonId = 'tsv-s1-a2-b';
  project.pages[0].id = 'tsv-a2-b-page';
  project.pages[0].characters[0].scripts[0].blocks = [
    { op: 'when_flag' },
    { op: 'move_right', n: 3 },
    { op: 'end' },
  ];
  return project;
}

function directionDebugProject() {
  const project = directionHookProject();
  project.lessonId = 'tsv-s1-a2-d';
  project.pages[0].id = 'tsv-a2-d-page';
  return project;
}

function personalDirectionProject(endpoint: 6 | 10 = 10) {
  const project = directionHookProject();
  project.lessonId = 'tsv-s1-a2-s';
  project.pages[0].id = 'tsv-a2-s-page';
  project.pages[0].characters[1].name = 'My Home Star';
  project.pages[0].characters[1].start.gx = endpoint;
  const op = endpoint === 6 ? 'move_left' : 'move_right';
  project.pages[0].characters[0].scripts[0].blocks = [
    { op: 'when_flag' }, { op, n: 1 }, { op, n: 1 }, { op: 'end' },
  ];
  return project;
}

function tapResponseProject(response: { op: 'hop'; n: number } | { op: 'say'; text: string }) {
  const project = blankProject('Dot Dot responds to a tap');
  project.lessonId = 'tsv-s1-a3-b';
  project.pages = [{
    id: 'tsv-a3-b-page',
    background: 'sunset',
    characters: [{
      id: 'dot-dot',
      name: 'Dot Dot',
      emoji: '🐱',
      asset: '/story-blocks/tiny-star-village/characters/dot-dot/resting.svg',
      start: { gx: 10, gy: 8, size: 1, rot: 0 },
      scripts: [{
        id: 'dot-dot-tap',
        blocks: [{ op: 'when_tap' }, response, { op: 'end' }],
      }],
    }],
  }];
  return project;
}

describe('storyMissionProgramMatches', () => {
  it('accepts only the exact saved Lumi mission program', () => {
    expect(storyMissionProgramMatches(correctedMissionProject(), 'tsv-s1-a1-h')).toBe(true);
  });

  it('accepts the same exact program on the A1-B Complete scene identity', () => {
    expect(storyMissionProgramMatches(completedBuildMissionProject(), 'tsv-s1-a1-b')).toBe(true);
  });

  it('accepts the exact reordered program on the A1-D manual Fix identity', () => {
    expect(storyMissionProgramMatches(correctedDebugMissionProject(), 'tsv-s1-a1-d')).toBe(true);
  });

  it('accepts each A1-S greeting only when the saved logical chain stays exact', () => {
    for (const greeting of ['Good morning, village!', "I'm awake!", "Let's go!"]) {
      expect(storyMissionProgramMatches(personalShipMissionProject(greeting), 'tsv-s1-a1-s')).toBe(
        true,
      );
    }

    expect(
      storyMissionProgramMatches(personalShipMissionProject('Choose my greeting'), 'tsv-s1-a1-s'),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(personalShipMissionProject('Anything else'), 'tsv-s1-a1-s'),
    ).toBe(false);

    const wrongOrder = personalShipMissionProject();
    const blocks = wrongOrder.pages[0].characters[0].scripts[0].blocks;
    [blocks[1], blocks[2]] = [blocks[2], blocks[1]];
    expect(storyMissionProgramMatches(wrongOrder, 'tsv-s1-a1-s')).toBe(false);
  });

  it('accepts A2-H only while the wrong-way starter, formal assets, and target stay exact', () => {
    expect(storyMissionProgramMatches(directionHookProject(), 'tsv-s1-a2-h')).toBe(true);

    const fixedTooSoon = directionHookProject();
    fixedTooSoon.pages[0].characters[0].scripts[0].blocks[1] = { op: 'move_right', n: 3 };
    expect(storyMissionProgramMatches(fixedTooSoon, 'tsv-s1-a2-h')).toBe(false);

    const movedTarget = directionHookProject();
    movedTarget.pages[0].characters[1].start.gx = 5;
    expect(storyMissionProgramMatches(movedTarget, 'tsv-s1-a2-h')).toBe(false);

    const movedBear = directionHookProject();
    movedBear.pages[0].characters[0].start.gx = 7;
    expect(storyMissionProgramMatches(movedBear, 'tsv-s1-a2-h')).toBe(false);

    const wrongAsset = directionHookProject();
    wrongAsset.pages[0].characters[0].asset = '/wrong.svg';
    expect(storyMissionProgramMatches(wrongAsset, 'tsv-s1-a2-h')).toBe(false);
  });

  it('accepts A2-B only for the exact Right 3 path to the unchanged plaza target', () => {
    expect(storyMissionProgramMatches(completedDirectionBuildProject(), 'tsv-s1-a2-b')).toBe(true);

    const left = completedDirectionBuildProject();
    left.pages[0].characters[0].scripts[0].blocks[1] = { op: 'move_left', n: 3 };
    expect(storyMissionProgramMatches(left, 'tsv-s1-a2-b')).toBe(false);

    const wrongDistance = completedDirectionBuildProject();
    wrongDistance.pages[0].characters[0].scripts[0].blocks[1] = { op: 'move_right', n: 2 };
    expect(storyMissionProgramMatches(wrongDistance, 'tsv-s1-a2-b')).toBe(false);

    const missingEnd = completedDirectionBuildProject();
    missingEnd.pages[0].characters[0].scripts[0].blocks.pop();
    expect(storyMissionProgramMatches(missingEnd, 'tsv-s1-a2-b')).toBe(false);
  });

  it('accepts A2-D only after Left 3 is replaced by Right 3 and every other block stays exact', () => {
    const repaired = directionDebugProject();
    repaired.pages[0].characters[0].scripts[0].blocks[1] = { op: 'move_right', n: 3 };
    expect(storyMissionProgramMatches(repaired, 'tsv-s1-a2-d')).toBe(true);

    expect(storyMissionProgramMatches(directionDebugProject(), 'tsv-s1-a2-d')).toBe(false);

    const wrongDistance = directionDebugProject();
    wrongDistance.pages[0].characters[0].scripts[0].blocks[1] = { op: 'move_right', n: 2 };
    expect(storyMissionProgramMatches(wrongDistance, 'tsv-s1-a2-d')).toBe(false);

    const extraChange = directionDebugProject();
    extraChange.pages[0].characters[0].scripts[0].blocks = [
      { op: 'when_flag' },
      { op: 'move_right', n: 3 },
      { op: 'hop', n: 1 },
      { op: 'end' },
    ];
    expect(storyMissionProgramMatches(extraChange, 'tsv-s1-a2-d')).toBe(false);
  });

  it('accepts A2-S only when both one-step arrows match the chosen endpoint', () => {
    expect(storyMissionProgramMatches(personalDirectionProject(6), 'tsv-s1-a2-s')).toBe(true);
    expect(storyMissionProgramMatches(personalDirectionProject(10), 'tsv-s1-a2-s')).toBe(true);
    const mixed = personalDirectionProject(10);
    mixed.pages[0].characters[0].scripts[0].blocks[1] = { op: 'move_left', n: 1 };
    expect(storyMissionProgramMatches(mixed, 'tsv-s1-a2-s')).toBe(false);
    const neutral = personalDirectionProject(10);
    neutral.pages[0].characters[1].start.gx = 8;
    expect(storyMissionProgramMatches(neutral, 'tsv-s1-a2-s')).toBe(false);
  });

  it('accepts A3-H only for Dot Dot’s exact saved On Tap response', () => {
    const project = blankProject('Dot Dot wakes on tap');
    project.lessonId = 'tsv-s1-a3-h';
    project.pages = [{
      id: 'tsv-a3-h-page',
      background: 'sunset',
      characters: [{
        id: 'dot-dot',
        name: 'Dot Dot',
        emoji: '🐱',
        asset: '/story-blocks/tiny-star-village/characters/dot-dot/resting.svg',
        start: { gx: 10, gy: 8, size: 1, rot: 0 },
        scripts: [{
          id: 'dot-dot-tap',
          blocks: [
            { op: 'when_tap' },
            { op: 'hop', n: 1 },
            { op: 'say', text: "I'm awake!" },
            { op: 'end' },
          ],
        }],
      }],
    }];
    expect(storyMissionProgramMatches(project, 'tsv-s1-a3-h')).toBe(true);

    project.pages[0].characters[0].scripts[0].blocks[0] = { op: 'when_flag' };
    expect(storyMissionProgramMatches(project, 'tsv-s1-a3-h')).toBe(false);
  });

  it('accepts A3-B only when the child adds one or two visible tap responses', () => {
    const hop = tapResponseProject({ op: 'hop', n: 1 });
    expect(storyMissionProgramMatches(hop, 'tsv-s1-a3-b')).toBe(true);

    const say = tapResponseProject({ op: 'say', text: "I'm awake!" });
    expect(storyMissionProgramMatches(say, 'tsv-s1-a3-b')).toBe(true);

    const both = tapResponseProject({ op: 'hop', n: 1 });
    both.pages[0].characters[0].scripts[0].blocks.splice(2, 0, { op: 'say', text: "I'm awake!" });
    expect(storyMissionProgramMatches(both, 'tsv-s1-a3-b')).toBe(true);

    hop.pages[0].characters[0].scripts[0].blocks[0] = { op: 'when_flag' };
    expect(storyMissionProgramMatches(hop, 'tsv-s1-a3-b')).toBe(false);
    expect(storyMissionProgramMatches(tapResponseProject({ op: 'hop', n: 2 }), 'tsv-s1-a3-b')).toBe(false);
    expect(storyMissionProgramMatches(tapResponseProject({ op: 'say', text: '   ' }), 'tsv-s1-a3-b')).toBe(false);
  });

  it('accepts A3-D only after Start is replaced with On Tap and nothing else changes', () => {
    const repaired = tapResponseProject({ op: 'hop', n: 1 });
    repaired.lessonId = 'tsv-s1-a3-d';
    repaired.pages[0].id = 'tsv-a3-d-page';
    repaired.pages[0].characters[0].scripts[0].id = 'dot-dot-event';
    expect(storyMissionProgramMatches(repaired, 'tsv-s1-a3-d')).toBe(true);

    repaired.pages[0].characters[0].scripts[0].blocks[0] = { op: 'when_flag' };
    expect(storyMissionProgramMatches(repaired, 'tsv-s1-a3-d')).toBe(false);
    repaired.pages[0].characters[0].scripts[0].blocks[0] = { op: 'when_tap' };
    repaired.pages[0].characters[0].scripts[0].blocks[1] = { op: 'hop', n: 2 };
    expect(storyMissionProgramMatches(repaired, 'tsv-s1-a3-d')).toBe(false);
  });

  it('accepts A3-S only for one saved personal character response', () => {
    const personal = tapResponseProject({ op: 'hop', n: 1 });
    personal.lessonId = 'tsv-s1-a3-s';
    personal.pages[0].id = 'tsv-a3-s-page';
    personal.pages[0].characters[0].name = 'Tuan Tuan';
    personal.pages[0].characters[0].asset = '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg';
    personal.pages[0].characters[0].scripts[0].id = 'dot-dot-surprise';
    expect(storyMissionProgramMatches(personal, 'tsv-s1-a3-s')).toBe(true);

    personal.pages[0].characters[0].scripts[0].blocks.splice(2, 0, { op: 'grow', n: 1 });
    expect(storyMissionProgramMatches(personal, 'tsv-s1-a3-s')).toBe(false);
    personal.pages[0].characters[0].scripts[0].blocks.splice(2, 1);
    personal.pages[0].characters[0].asset = '/unapproved.svg';
    expect(storyMissionProgramMatches(personal, 'tsv-s1-a3-s')).toBe(false);
  });

  it('accepts A4-H only for the unchanged one-space breakfast-cart program', () => {
    const project = correctedMissionProject();
    project.lessonId = 'tsv-s1-a4-h';
    project.pages[0].id = 'tsv-a4-h-page';
    project.pages[0].background = 'meadow';
    project.pages[0].characters[0].id = 'breakfast-cart';
    project.pages[0].characters[0].asset = '/story-blocks/tiny-star-village/props/breakfast-cart.svg';
    project.pages[0].characters[0].start.gx = 4;
    project.pages[0].characters[0].scripts[0].id = 'breakfast-cart-flag';
    project.pages[0].characters[0].scripts[0].blocks = [{ op: 'when_flag' }, { op: 'move_right', n: 1 }, { op: 'end' }];
    project.pages[0].characters.push({ id: 'breakfast-table', name: 'Breakfast Table', emoji: '🍽️', start: { gx: 7, gy: 10, size: 0.9, rot: 0 }, scripts: [] });
    expect(storyMissionProgramMatches(project, 'tsv-s1-a4-h')).toBe(true);
    project.pages[0].characters[0].scripts[0].blocks[1] = { op: 'move_right', n: 3 };
    expect(storyMissionProgramMatches(project, 'tsv-s1-a4-h')).toBe(false);
  });

  it('accepts A4-B only after the breakfast cart parameter changes to three', () => {
    const project = correctedMissionProject();
    project.lessonId = 'tsv-s1-a4-b';
    project.pages[0].id = 'tsv-a4-b-page';
    project.pages[0].background = 'meadow';
    project.pages[0].characters[0].id = 'breakfast-cart';
    project.pages[0].characters[0].asset = '/story-blocks/tiny-star-village/props/breakfast-cart.svg';
    project.pages[0].characters[0].start.gx = 4;
    project.pages[0].characters[0].scripts[0].id = 'breakfast-cart-build';
    project.pages[0].characters[0].scripts[0].blocks = [{ op: 'when_flag' }, { op: 'move_right', n: 1 }, { op: 'end' }];
    project.pages[0].characters.push({ id: 'breakfast-table', name: 'Breakfast Table', emoji: '🍽️', start: { gx: 7, gy: 10, size: 0.9, rot: 0 }, scripts: [] });
    expect(storyMissionProgramMatches(project, 'tsv-s1-a4-b')).toBe(false);
    project.pages[0].characters[0].scripts[0].blocks[1] = { op: 'move_right', n: 3 };
    expect(storyMissionProgramMatches(project, 'tsv-s1-a4-b')).toBe(true);
    project.pages[0].characters[0].scripts[0].blocks.push({ op: 'hop', n: 1 });
    expect(storyMissionProgramMatches(project, 'tsv-s1-a4-b')).toBe(false);
  });

  it('accepts A4-D only after Right 4 is repaired to Right 3', () => {
    const project = correctedMissionProject();
    project.lessonId = 'tsv-s1-a4-d';
    project.pages[0].id = 'tsv-a4-d-page';
    project.pages[0].background = 'meadow';
    project.pages[0].characters[0].id = 'breakfast-cart';
    project.pages[0].characters[0].asset = '/story-blocks/tiny-star-village/props/breakfast-cart.svg';
    project.pages[0].characters[0].start.gx = 4;
    project.pages[0].characters[0].scripts[0].id = 'breakfast-cart-debug';
    project.pages[0].characters[0].scripts[0].blocks = [{ op: 'when_flag' }, { op: 'move_right', n: 4 }, { op: 'end' }];
    project.pages[0].characters.push({ id: 'breakfast-table', name: 'Breakfast Table', emoji: '🍽️', start: { gx: 7, gy: 10, size: 0.9, rot: 0 }, scripts: [] });
    expect(storyMissionProgramMatches(project, 'tsv-s1-a4-d')).toBe(false);
    project.pages[0].characters[0].scripts[0].blocks[1] = { op: 'move_right', n: 3 };
    expect(storyMissionProgramMatches(project, 'tsv-s1-a4-d')).toBe(true);
    project.pages[0].characters[0].start.gx = 5;
    expect(storyMissionProgramMatches(project, 'tsv-s1-a4-d')).toBe(false);
  });

  it('accepts A4-S only when the movement number matches the chosen delivery stop', () => {
    const deliveryProject = (stopGx: number, stopName: string, stopEmoji: string, n: number) => {
      const project = correctedMissionProject();
      project.lessonId = 'tsv-s1-a4-s';
      project.pages[0].id = 'tsv-a4-s-page';
      project.pages[0].background = 'meadow';
      project.pages[0].characters[0].id = 'breakfast-cart';
      project.pages[0].characters[0].asset = '/story-blocks/tiny-star-village/props/breakfast-cart.svg';
      project.pages[0].characters[0].start.gx = 4;
      project.pages[0].characters[0].scripts[0].id = 'breakfast-cart-ship';
      project.pages[0].characters[0].scripts[0].blocks = [{ op: 'when_flag' }, { op: 'move_right', n }, { op: 'end' }];
      project.pages[0].characters.push({ id: 'breakfast-table', name: stopName, emoji: stopEmoji, start: { gx: stopGx, gy: 10, size: 0.9, rot: 0 }, scripts: [] });
      return project;
    };

    // Every legal (stop, number) pair completes — there is no single answer.
    expect(storyMissionProgramMatches(deliveryProject(5, 'Apple Breakfast', '🍎', 1), 'tsv-s1-a4-s')).toBe(true);
    expect(storyMissionProgramMatches(deliveryProject(6, 'Gift Breakfast', '🎁', 2), 'tsv-s1-a4-s')).toBe(true);
    expect(storyMissionProgramMatches(deliveryProject(7, 'Star Breakfast', '⭐', 3), 'tsv-s1-a4-s')).toBe(true);

    // A mismatched number, the unchosen starter stop, an out-of-band stop, an
    // unapproved parcel, a mismatched emoji and a wrong direction all fail.
    expect(storyMissionProgramMatches(deliveryProject(7, 'Star Breakfast', '⭐', 2), 'tsv-s1-a4-s')).toBe(false);
    expect(storyMissionProgramMatches(deliveryProject(4, 'My Delivery Stop', '📦', 0), 'tsv-s1-a4-s')).toBe(false);
    expect(storyMissionProgramMatches(deliveryProject(8, 'Star Breakfast', '⭐', 4), 'tsv-s1-a4-s')).toBe(false);
    expect(storyMissionProgramMatches(deliveryProject(6, 'Cake Breakfast', '🍰', 2), 'tsv-s1-a4-s')).toBe(false);
    expect(storyMissionProgramMatches(deliveryProject(6, 'Gift Breakfast', '🍎', 2), 'tsv-s1-a4-s')).toBe(false);

    const leftward = deliveryProject(6, 'Gift Breakfast', '🎁', 2);
    leftward.pages[0].characters[0].scripts[0].blocks[1] = { op: 'move_left', n: 2 };
    expect(storyMissionProgramMatches(leftward, 'tsv-s1-a4-s')).toBe(false);

    // Extra blocks, a moved cart and a scripted stop are all rejected.
    const extra = deliveryProject(6, 'Gift Breakfast', '🎁', 2);
    extra.pages[0].characters[0].scripts[0].blocks.splice(2, 0, { op: 'hop', n: 1 });
    expect(storyMissionProgramMatches(extra, 'tsv-s1-a4-s')).toBe(false);

    const movedCart = deliveryProject(6, 'Gift Breakfast', '🎁', 2);
    movedCart.pages[0].characters[0].start.gx = 5;
    expect(storyMissionProgramMatches(movedCart, 'tsv-s1-a4-s')).toBe(false);

    const scriptedStop = deliveryProject(6, 'Gift Breakfast', '🎁', 2);
    scriptedStop.pages[0].characters[1].scripts.push({ id: 'stop-flag', blocks: [{ op: 'when_flag' }, { op: 'end' }] });
    expect(storyMissionProgramMatches(scriptedStop, 'tsv-s1-a4-s')).toBe(false);
  });

  it('accepts A5-H only while both greeting chains are the untouched ones', () => {
    const greetingHookProject = () => {
      const project = blankProject('Tiny Star Village · Who Is Speaking?');
      project.lessonId = 'tsv-s1-a5-h';
      project.pages[0] = {
        id: 'tsv-a5-h-page',
        background: 'candy',
        characters: [
          {
            id: 'little-light',
            name: 'Lumilo',
            emoji: '⭐',
            asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
            start: { gx: 7, gy: 10, size: 1, rot: 0 },
            scripts: [
              {
                id: 'little-light-greeting',
                blocks: [{ op: 'when_flag' }, { op: 'say', text: 'Morning!' }, { op: 'end' }],
              },
            ],
          },
          {
            id: 'tuan-tuan',
            name: 'Tuan Tuan',
            emoji: '🐻',
            asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
            start: { gx: 12, gy: 10, size: 1, rot: 0 },
            scripts: [
              {
                id: 'tuan-tuan-greeting',
                blocks: [{ op: 'when_flag' }, { op: 'say', text: 'Morning too!' }, { op: 'end' }],
              },
            ],
          },
        ],
      };
      return project;
    };

    expect(storyMissionProgramMatches(greetingHookProject(), 'tsv-s1-a5-h')).toBe(true);

    // The Explore scene is for looking only: inserting the A5-B Wait, dropping a
    // block, retyping a greeting, silencing one friend, moving a friend off the
    // shipped square or deleting one of the two voices all break the contract.
    const waited = greetingHookProject();
    waited.pages[0].characters[1].scripts[0].blocks.splice(1, 0, { op: 'wait', n: 5 });
    expect(storyMissionProgramMatches(waited, 'tsv-s1-a5-h')).toBe(false);

    const shortened = greetingHookProject();
    shortened.pages[0].characters[0].scripts[0].blocks.splice(1, 1);
    expect(storyMissionProgramMatches(shortened, 'tsv-s1-a5-h')).toBe(false);

    const retyped = greetingHookProject();
    retyped.pages[0].characters[1].scripts[0].blocks[1] = { op: 'say', text: 'Hello!' };
    expect(storyMissionProgramMatches(retyped, 'tsv-s1-a5-h')).toBe(false);

    const hopping = greetingHookProject();
    hopping.pages[0].characters[0].scripts[0].blocks[1] = { op: 'hop', n: 1 };
    expect(storyMissionProgramMatches(hopping, 'tsv-s1-a5-h')).toBe(false);

    const moved = greetingHookProject();
    moved.pages[0].characters[1].start.gx = 9;
    expect(storyMissionProgramMatches(moved, 'tsv-s1-a5-h')).toBe(false);

    const soloed = greetingHookProject();
    soloed.pages[0].characters.pop();
    expect(storyMissionProgramMatches(soloed, 'tsv-s1-a5-h')).toBe(false);

    const secondScript = greetingHookProject();
    secondScript.pages[0].characters[0].scripts.push({
      id: 'little-light-extra',
      blocks: [{ op: 'when_tap' }, { op: 'end' }],
    });
    expect(storyMissionProgramMatches(secondScript, 'tsv-s1-a5-h')).toBe(false);

    const wrongAsset = greetingHookProject();
    wrongAsset.pages[0].characters[1].asset = '/unapproved.svg';
    expect(storyMissionProgramMatches(wrongAsset, 'tsv-s1-a5-h')).toBe(false);

    const wrongStage = greetingHookProject();
    wrongStage.pages[0].background = 'meadow';
    expect(storyMissionProgramMatches(wrongStage, 'tsv-s1-a5-h')).toBe(false);
  });

  it('accepts A5-B only when the Wait sits before Tuan Tuan’s Say', () => {
    const turnBuildProject = (tuanTuanBlocks: Block[]) => {
      const project = blankProject('Tiny Star Village · Wait a Moment');
      project.lessonId = 'tsv-s1-a5-b';
      project.pages[0] = {
        id: 'tsv-a5-b-page',
        background: 'candy',
        characters: [
          {
            id: 'little-light',
            name: 'Lumilo',
            emoji: '⭐',
            asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
            start: { gx: 7, gy: 10, size: 1, rot: 0 },
            scripts: [
              {
                id: 'little-light-greeting',
                blocks: [{ op: 'when_flag' }, { op: 'say', text: 'Morning!' }, { op: 'end' }],
              },
            ],
          },
          {
            id: 'tuan-tuan',
            name: 'Tuan Tuan',
            emoji: '🐻',
            asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
            start: { gx: 12, gy: 10, size: 1, rot: 0 },
            scripts: [{ id: 'tuan-tuan-greeting', blocks: tuanTuanBlocks }],
          },
        ],
      };
      return project;
    };
    const built: Block[] = [
      { op: 'when_flag' },
      { op: 'wait', n: TINY_STAR_TURN_WAIT_N },
      { op: 'say', text: 'Morning too!' },
      { op: 'end' },
    ];

    expect(storyMissionProgramMatches(turnBuildProject(built), 'tsv-s1-a5-b')).toBe(true);

    // The shipped starter is the A5-H collision — it must not complete itself.
    expect(
      storyMissionProgramMatches(
        turnBuildProject([
          { op: 'when_flag' },
          { op: 'say', text: 'Morning too!' },
          { op: 'end' },
        ]),
        'tsv-s1-a5-b',
      ),
    ).toBe(false);

    // A Wait AFTER the Say is the scene's real wrong answer: the block exists,
    // but Tuan Tuan still opens its mouth on the same tick as Lumilo.
    expect(
      storyMissionProgramMatches(
        turnBuildProject([
          { op: 'when_flag' },
          { op: 'say', text: 'Morning too!' },
          { op: 'wait', n: TINY_STAR_TURN_WAIT_N },
          { op: 'end' },
        ]),
        'tsv-s1-a5-b',
      ),
    ).toBe(false);

    // A retuned number belongs to A5-D, an extra block breaks the exact chain,
    // and swapping the Wait for a silent stand-in never delays anything.
    expect(
      storyMissionProgramMatches(
        turnBuildProject([
          { op: 'when_flag' },
          { op: 'wait', n: 9 },
          { op: 'say', text: 'Morning too!' },
          { op: 'end' },
        ]),
        'tsv-s1-a5-b',
      ),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(
        turnBuildProject([
          { op: 'when_flag' },
          { op: 'wait', n: TINY_STAR_TURN_WAIT_N },
          { op: 'wait', n: TINY_STAR_TURN_WAIT_N },
          { op: 'say', text: 'Morning too!' },
          { op: 'end' },
        ]),
        'tsv-s1-a5-b',
      ),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(
        turnBuildProject([
          { op: 'when_flag' },
          { op: 'hop', n: 1 },
          { op: 'say', text: 'Morning too!' },
          { op: 'end' },
        ]),
        'tsv-s1-a5-b',
      ),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(
        turnBuildProject([
          { op: 'when_flag' },
          { op: 'wait', n: TINY_STAR_TURN_WAIT_N },
          { op: 'say', text: 'Hello!' },
          { op: 'end' },
        ]),
        'tsv-s1-a5-b',
      ),
    ).toBe(false);

    // Lumilo is the fixed half: giving the first voice a Wait too, or silencing
    // it, destroys the head start the scene is supposed to prove.
    const lumiloWaited = turnBuildProject(built);
    lumiloWaited.pages[0].characters[0].scripts[0].blocks.splice(1, 0, {
      op: 'wait',
      n: TINY_STAR_TURN_WAIT_N,
    });
    expect(storyMissionProgramMatches(lumiloWaited, 'tsv-s1-a5-b')).toBe(false);

    const lumiloSilenced = turnBuildProject(built);
    lumiloSilenced.pages[0].characters[0].scripts[0].blocks.splice(1, 1);
    expect(storyMissionProgramMatches(lumiloSilenced, 'tsv-s1-a5-b')).toBe(false);

    // A second track on Tuan Tuan, a moved friend, a dropped friend and a
    // different stage all fail.
    const extraTrack = turnBuildProject(built);
    extraTrack.pages[0].characters[1].scripts.push({
      id: 'tuan-tuan-extra',
      blocks: [{ op: 'when_tap' }, { op: 'end' }],
    });
    expect(storyMissionProgramMatches(extraTrack, 'tsv-s1-a5-b')).toBe(false);

    const moved = turnBuildProject(built);
    moved.pages[0].characters[1].start.gx = 9;
    expect(storyMissionProgramMatches(moved, 'tsv-s1-a5-b')).toBe(false);

    const soloed = turnBuildProject(built);
    soloed.pages[0].characters.pop();
    expect(storyMissionProgramMatches(soloed, 'tsv-s1-a5-b')).toBe(false);

    const wrongStage = turnBuildProject(built);
    wrongStage.pages[0].background = 'meadow';
    expect(storyMissionProgramMatches(wrongStage, 'tsv-s1-a5-b')).toBe(false);

    // The A5-H stage never satisfies A5-B and vice versa.
    const hookPage = turnBuildProject(built);
    hookPage.pages[0].id = 'tsv-a5-h-page';
    expect(storyMissionProgramMatches(hookPage, 'tsv-s1-a5-b')).toBe(false);
    expect(storyMissionProgramMatches(turnBuildProject(built), 'tsv-s1-a5-h')).toBe(false);
  });

  it('reads the A5-B turn from the measured gap between the two greetings', () => {
    // One voice alone proves nothing, and the A5-H collision opens both bubbles
    // inside the same interpreter tick — neither is a turn.
    expect(tinyStarGreetingTookTurns(new Map([['little-light', 1_000]]))).toBe(false);
    expect(
      tinyStarGreetingTookTurns(
        new Map([
          ['little-light', 1_000],
          ['tuan-tuan', 1_001],
        ]),
      ),
    ).toBe(false);
    // Tuan Tuan starting FIRST is not the turn this scene asks for either.
    expect(
      tinyStarGreetingTookTurns(
        new Map([
          ['tuan-tuan', 1_000],
          ['little-light', 1_000 + TINY_STAR_TURN_MIN_GAP_MS],
        ]),
      ),
    ).toBe(false);
    expect(
      tinyStarGreetingTookTurns(
        new Map([
          ['little-light', 1_000],
          ['tuan-tuan', 1_000 + TINY_STAR_TURN_MIN_GAP_MS],
        ]),
      ),
    ).toBe(true);
    // The gap the shipped Wait actually produces (500 ms) clears the bar.
    expect(TINY_STAR_TURN_MIN_GAP_MS).toBeLessThan(TINY_STAR_TURN_WAIT_N * 100);
  });

  // ── A5-D · 等太久了 (Twist & Debug) ────────────────────────────────────────
  // The chain is complete and correctly ordered; only Tuan Tuan's Wait number is
  // wrong. Several numbers repair the rhythm, so the contract is a band, and the
  // relay itself is measured from the real run in BlocksStudioPage.
  const relayProject = (tuanTuanBlocks: Block[]) => {
    const project = blankProject('Tiny Star Village · That Wait Was Too Long');
    project.lessonId = 'tsv-s1-a5-d';
    project.pages[0] = {
      id: 'tsv-a5-d-page',
      background: 'candy',
      characters: [
        {
          id: 'little-light',
          name: 'Lumilo',
          emoji: '⭐',
          asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
          start: { gx: 7, gy: 10, size: 1, rot: 0 },
          scripts: [
            {
              id: 'little-light-bounce',
              blocks: [{ op: 'when_flag' }, { op: 'hop', n: 1 }, { op: 'end' }],
            },
          ],
        },
        {
          id: 'tuan-tuan',
          name: 'Tuan Tuan',
          emoji: '🐻',
          asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
          start: { gx: 12, gy: 10, size: 1, rot: 0 },
          scripts: [{ id: 'tuan-tuan-bounce', blocks: tuanTuanBlocks }],
        },
      ],
    };
    return project;
  };
  const relayChain = (n: number): Block[] => [
    { op: 'when_flag' },
    { op: 'wait', n },
    { op: 'hop', n: 1 },
    { op: 'end' },
  ];

  it('accepts A5-D only for a Wait number inside the just-right relay band', () => {
    // Every value the band allows repairs the rhythm — the scene deliberately
    // has no single right answer (teaching script §7.6 Checkpoint B).
    for (const n of TINY_STAR_RELAY_WAITS) {
      expect(storyMissionProgramMatches(relayProject(relayChain(n)), 'tsv-s1-a5-d')).toBe(true);
    }

    // The shipped bug must not complete itself, and neither may a child who
    // decides bigger is better or drops the wait to nothing.
    expect(
      storyMissionProgramMatches(relayProject(relayChain(TINY_STAR_RELAY_BUG_WAIT_N)), 'tsv-s1-a5-d'),
    ).toBe(false);
    expect(storyMissionProgramMatches(relayProject(relayChain(8)), 'tsv-s1-a5-d')).toBe(false);
    expect(storyMissionProgramMatches(relayProject(relayChain(3)), 'tsv-s1-a5-d')).toBe(false);
    expect(storyMissionProgramMatches(relayProject(relayChain(1)), 'tsv-s1-a5-d')).toBe(false);

    // Only the NUMBER may change: deleting, reordering, duplicating or swapping
    // a block all fail even when the remaining number is legal.
    expect(
      storyMissionProgramMatches(
        relayProject([{ op: 'when_flag' }, { op: 'hop', n: 1 }, { op: 'end' }]),
        'tsv-s1-a5-d',
      ),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(
        relayProject([
          { op: 'when_flag' },
          { op: 'hop', n: 1 },
          { op: 'wait', n: TINY_STAR_TURN_WAIT_N },
          { op: 'end' },
        ]),
        'tsv-s1-a5-d',
      ),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(
        relayProject([
          { op: 'when_flag' },
          { op: 'wait', n: TINY_STAR_TURN_WAIT_N },
          { op: 'wait', n: TINY_STAR_TURN_WAIT_N },
          { op: 'hop', n: 1 },
          { op: 'end' },
        ]),
        'tsv-s1-a5-d',
      ),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(
        relayProject([
          { op: 'when_flag' },
          { op: 'wait', n: TINY_STAR_TURN_WAIT_N },
          { op: 'say', text: 'Morning too!' },
          { op: 'end' },
        ]),
        'tsv-s1-a5-d',
      ),
    ).toBe(false);
    // A taller bounce is a different beat: the relay window is measured against
    // a one-space hop.
    expect(
      storyMissionProgramMatches(
        relayProject([
          { op: 'when_flag' },
          { op: 'wait', n: TINY_STAR_TURN_WAIT_N },
          { op: 'hop', n: 2 },
          { op: 'end' },
        ]),
        'tsv-s1-a5-d',
      ),
    ).toBe(false);

    // Lumilo is the fixed half of the relay — the beat the child times against.
    const leaderWaited = relayProject(relayChain(TINY_STAR_TURN_WAIT_N));
    leaderWaited.pages[0].characters[0].scripts[0].blocks.splice(1, 0, { op: 'wait', n: 1 });
    expect(storyMissionProgramMatches(leaderWaited, 'tsv-s1-a5-d')).toBe(false);

    const leaderSilent = relayProject(relayChain(TINY_STAR_TURN_WAIT_N));
    leaderSilent.pages[0].characters[0].scripts[0].blocks.splice(1, 1);
    expect(storyMissionProgramMatches(leaderSilent, 'tsv-s1-a5-d')).toBe(false);

    const leaderMoved = relayProject(relayChain(TINY_STAR_TURN_WAIT_N));
    leaderMoved.pages[0].characters[0].start.gx = 4;
    expect(storyMissionProgramMatches(leaderMoved, 'tsv-s1-a5-d')).toBe(false);

    // A second track, a moved friend, a dropped friend and a restaged page fail.
    const extraTrack = relayProject(relayChain(TINY_STAR_TURN_WAIT_N));
    extraTrack.pages[0].characters[1].scripts.push({
      id: 'tuan-tuan-extra',
      blocks: [{ op: 'when_tap' }, { op: 'end' }],
    });
    expect(storyMissionProgramMatches(extraTrack, 'tsv-s1-a5-d')).toBe(false);

    const moved = relayProject(relayChain(TINY_STAR_TURN_WAIT_N));
    moved.pages[0].characters[1].start.gx = 9;
    expect(storyMissionProgramMatches(moved, 'tsv-s1-a5-d')).toBe(false);

    const soloed = relayProject(relayChain(TINY_STAR_TURN_WAIT_N));
    soloed.pages[0].characters.pop();
    expect(storyMissionProgramMatches(soloed, 'tsv-s1-a5-d')).toBe(false);

    const wrongStage = relayProject(relayChain(TINY_STAR_TURN_WAIT_N));
    wrongStage.pages[0].background = 'meadow';
    expect(storyMissionProgramMatches(wrongStage, 'tsv-s1-a5-d')).toBe(false);

    // A5-B and A5-D never satisfy each other.
    const buildPage = relayProject(relayChain(TINY_STAR_TURN_WAIT_N));
    buildPage.pages[0].id = 'tsv-a5-b-page';
    expect(storyMissionProgramMatches(buildPage, 'tsv-s1-a5-d')).toBe(false);
    expect(
      storyMissionProgramMatches(relayProject(relayChain(TINY_STAR_TURN_WAIT_N)), 'tsv-s1-a5-b'),
    ).toBe(false);
  });

  it('reads the A5-D repair from the measured gap between the two bounces', () => {
    const gap = (ms: number) =>
      new Map([
        ['little-light', 1_000],
        ['tuan-tuan', 1_000 + ms],
      ]);

    // One bouncer alone is not a relay, and neither is Tuan Tuan jumping first.
    expect(tinyStarBounceGapMs(new Map([['little-light', 1_000]]))).toBeNull();
    expect(tinyStarBounceGapMs(gap(-50))).toBeNull();
    expect(tinyStarBounceRelayInTime(gap(-50))).toBe(false);
    expect(tinyStarBounceRelayTooLate(gap(-50))).toBe(false);

    // Bouncing together (the A5-B collision shape) is too early; the repaired
    // numbers all land inside the window; the shipped bug is past its ceiling.
    expect(tinyStarBounceRelayInTime(gap(0))).toBe(false);
    expect(tinyStarBounceRelayInTime(gap(TINY_STAR_RELAY_MIN_GAP_MS - 1))).toBe(false);
    for (const n of TINY_STAR_RELAY_WAITS) {
      expect(tinyStarBounceRelayInTime(gap(n * 100))).toBe(true);
      expect(tinyStarBounceRelayTooLate(gap(n * 100))).toBe(false);
    }
    expect(tinyStarBounceRelayInTime(gap(TINY_STAR_RELAY_BUG_WAIT_N * 100))).toBe(false);
    expect(tinyStarBounceRelayTooLate(gap(TINY_STAR_RELAY_BUG_WAIT_N * 100))).toBe(true);
    expect(tinyStarBounceRelayTooLate(gap(TINY_STAR_RELAY_MAX_GAP_MS))).toBe(false);

    // The window is anchored to the real bounce: the second friend may not lift
    // off before the first has landed, and the shipped bug really is outside it.
    expect(TINY_STAR_RELAY_MIN_GAP_MS).toBe(TINY_STAR_BOUNCE_MS);
    expect(TINY_STAR_RELAY_BUG_WAIT_N * 100).toBeGreaterThan(TINY_STAR_RELAY_MAX_GAP_MS);
  });

  // ── A5-S · 我的双人问候 (Personal Ship) ───────────────────────────────────
  // Nothing here is a fixed answer: the child casts two of the three friends,
  // decides which of them greets first, builds both hellos and chooses the Wait.
  // The starter deliberately casts ONE friend into BOTH spots.
  const duetProject = (options: {
    first?: (typeof TINY_STAR_DUET_CAST)[number];
    second?: (typeof TINY_STAR_DUET_CAST)[number];
    firstBlocks?: Block[];
    secondBlocks?: Block[];
  }) => {
    const first = options.first ?? TINY_STAR_DUET_CAST[0];
    const second = options.second ?? TINY_STAR_DUET_CAST[1];
    const project = blankProject('Tiny Star Village · My Two-Friend Greeting');
    project.lessonId = 'tsv-s1-a5-s';
    project.pages[0] = {
      id: 'tsv-a5-s-page',
      background: 'candy',
      characters: [
        {
          id: TINY_STAR_DUET_FIRST_ID,
          name: first.name,
          emoji: first.emoji,
          asset: first.asset,
          start: { gx: TINY_STAR_DUET_FIRST_GX, gy: TINY_STAR_DUET_GY, size: 1, rot: 0 },
          scripts: [
            {
              id: TINY_STAR_DUET_FIRST_SCRIPT,
              blocks: options.firstBlocks ?? [
                { op: 'when_flag' },
                { op: 'hop', n: TINY_STAR_DUET_HOP_N },
                { op: 'end' },
              ],
            },
          ],
        },
        {
          id: TINY_STAR_DUET_SECOND_ID,
          name: second.name,
          emoji: second.emoji,
          asset: second.asset,
          start: { gx: TINY_STAR_DUET_SECOND_GX, gy: TINY_STAR_DUET_GY, size: 1, rot: 0 },
          scripts: [
            {
              id: TINY_STAR_DUET_SECOND_SCRIPT,
              blocks: options.secondBlocks ?? [
                { op: 'when_flag' },
                { op: 'wait', n: TINY_STAR_TURN_WAIT_N },
                { op: 'say', text: TINY_STAR_DUET_GREETINGS[1] },
                { op: 'end' },
              ],
            },
          ],
        },
      ],
    };
    return project;
  };

  it('accepts A5-S for any legal cast, order, greeting pair and Wait', () => {
    // A bounce leading a spoken answer, a spoken lead answered by a bounce, and
    // a swapped cast are all equally complete: the scene has no single answer.
    expect(storyMissionProgramMatches(duetProject({}), 'tsv-s1-a5-s')).toBe(true);
    expect(
      storyMissionProgramMatches(
        duetProject({
          first: TINY_STAR_DUET_CAST[2],
          second: TINY_STAR_DUET_CAST[0],
          firstBlocks: [
            { op: 'when_flag' },
            { op: 'say', text: TINY_STAR_DUET_GREETINGS[0] },
            { op: 'end' },
          ],
          secondBlocks: [
            { op: 'when_flag' },
            { op: 'wait', n: 9 },
            { op: 'hop', n: TINY_STAR_DUET_HOP_N },
            { op: 'end' },
          ],
        }),
        'tsv-s1-a5-s',
      ),
    ).toBe(true);
  });

  it('refuses an A5-S duet that is unbuilt, one-friend or out of band', () => {
    // The shipped starter: one friend in both spots and two empty chains.
    expect(
      storyMissionProgramMatches(
        duetProject({
          first: TINY_STAR_DUET_CAST[0],
          second: TINY_STAR_DUET_CAST[0],
          firstBlocks: [{ op: 'when_flag' }, { op: 'end' }],
          secondBlocks: [{ op: 'when_flag' }, { op: 'end' }],
        }),
        'tsv-s1-a5-s',
      ),
    ).toBe(false);
    // Casting the same friend twice never becomes a duet, however well built.
    expect(
      storyMissionProgramMatches(
        duetProject({ first: TINY_STAR_DUET_CAST[1], second: TINY_STAR_DUET_CAST[1] }),
        'tsv-s1-a5-s',
      ),
    ).toBe(false);
    // No Wait at all is the A5-H collision; a Wait behind the greeting is the
    // A5-B wrong answer; a bounce answered too late is the A5-D bug.
    expect(
      storyMissionProgramMatches(
        duetProject({
          secondBlocks: [
            { op: 'when_flag' },
            { op: 'say', text: TINY_STAR_DUET_GREETINGS[1] },
            { op: 'end' },
          ],
        }),
        'tsv-s1-a5-s',
      ),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(
        duetProject({
          secondBlocks: [
            { op: 'when_flag' },
            { op: 'say', text: TINY_STAR_DUET_GREETINGS[1] },
            { op: 'wait', n: TINY_STAR_TURN_WAIT_N },
            { op: 'end' },
          ],
        }),
        'tsv-s1-a5-s',
      ),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(
        duetProject({
          secondBlocks: [
            { op: 'when_flag' },
            { op: 'wait', n: TINY_STAR_RELAY_BUG_WAIT_N },
            { op: 'hop', n: TINY_STAR_DUET_HOP_N },
            { op: 'end' },
          ],
        }),
        'tsv-s1-a5-s',
      ),
    ).toBe(false);
    // Free-typed dialogue is not one of the preset greetings.
    expect(
      storyMissionProgramMatches(
        duetProject({
          firstBlocks: [{ op: 'when_flag' }, { op: 'say', text: 'hi there' }, { op: 'end' }],
        }),
        'tsv-s1-a5-s',
      ),
    ).toBe(false);
    // A moved friend, a restaged page and a crowded stage all fail.
    const moved = duetProject({});
    moved.pages[0].characters[1].start.gx = 9;
    expect(storyMissionProgramMatches(moved, 'tsv-s1-a5-s')).toBe(false);

    const restaged = duetProject({});
    restaged.pages[0].background = 'meadow';
    expect(storyMissionProgramMatches(restaged, 'tsv-s1-a5-s')).toBe(false);

    const crowded = duetProject({});
    crowded.pages[0].characters.push({
      id: 'plaza-target',
      name: 'Plaza Star',
      emoji: '⭐',
      start: { gx: 2, gy: 10, size: 0.8, rot: 0 },
      scripts: [],
    });
    expect(storyMissionProgramMatches(crowded, 'tsv-s1-a5-s')).toBe(false);

    // A5-S and the rest of chapter five never satisfy each other.
    const otherPage = duetProject({});
    otherPage.pages[0].id = 'tsv-a5-b-page';
    expect(storyMissionProgramMatches(otherPage, 'tsv-s1-a5-s')).toBe(false);
    expect(storyMissionProgramMatches(duetProject({}), 'tsv-s1-a5-d')).toBe(false);
    expect(storyMissionProgramMatches(relayProject(relayChain(5)), 'tsv-s1-a5-s')).toBe(false);
  });

  // ── A6-H · 三张钟楼卡 (Story Hook) ────────────────────────────────────────
  // The chapter's Explore scene ships a route that runs to the end while
  // skipping its middle step. Nothing may be built or repaired, so the saved
  // contract is "the shipped Bell Tower stage is untouched"; the run-time proof
  // lives in `tinyStarBellTower.test.ts` and `BlocksStudioPage.test.tsx`.
  const bellHookProject = () => {
    const project = blankProject('Tiny Star Village · Three Bell Tower Cards');
    project.lessonId = 'tsv-s1-a6-h';
    project.pages[0] = {
      id: 'tsv-a6-h-page',
      background: 'sunset',
      characters: [
        {
          id: 'little-light',
          name: 'Lumilo',
          emoji: '⭐',
          asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
          start: { gx: 5, gy: 10, size: 1, rot: 0 },
          scripts: [
            {
              id: 'little-light-bell-route',
              blocks: [
                { op: 'when_flag' },
                { op: 'move_right', n: 3 },
                { op: 'pop' },
                { op: 'end' },
              ],
            },
          ],
        },
        {
          id: 'bell-tower',
          name: 'Bell Tower',
          emoji: '⭐',
          start: { gx: 8, gy: 7, size: 0.8, rot: 0 },
          scripts: [],
        },
      ],
    };
    return project;
  };

  it('accepts A6-H only while the shipped Bell Tower route is untouched', () => {
    expect(storyMissionProgramMatches(bellHookProject(), 'tsv-s1-a6-h')).toBe(true);

    // Adding the missing Hop is A6-B's lesson, not this one.
    const repaired = bellHookProject();
    repaired.pages[0].characters[0].scripts[0].blocks.splice(2, 0, { op: 'hop', n: 1 });
    expect(storyMissionProgramMatches(repaired, 'tsv-s1-a6-h')).toBe(false);

    // Nor may the child silence the bell, retune the walk, reorder the route,
    // move the ringer or the tower, or give the tower a script of its own.
    const silenced = bellHookProject();
    silenced.pages[0].characters[0].scripts[0].blocks.splice(2, 1);
    expect(storyMissionProgramMatches(silenced, 'tsv-s1-a6-h')).toBe(false);

    const retuned = bellHookProject();
    retuned.pages[0].characters[0].scripts[0].blocks[1] = { op: 'move_right', n: 2 };
    expect(storyMissionProgramMatches(retuned, 'tsv-s1-a6-h')).toBe(false);

    const reordered = bellHookProject();
    const route = reordered.pages[0].characters[0].scripts[0].blocks;
    [route[1], route[2]] = [route[2], route[1]];
    expect(storyMissionProgramMatches(reordered, 'tsv-s1-a6-h')).toBe(false);

    const walked = bellHookProject();
    walked.pages[0].characters[0].start.gx = 8;
    expect(storyMissionProgramMatches(walked, 'tsv-s1-a6-h')).toBe(false);

    const draggedTower = bellHookProject();
    draggedTower.pages[0].characters[1].start.gy = 10;
    expect(storyMissionProgramMatches(draggedTower, 'tsv-s1-a6-h')).toBe(false);

    const scriptedTower = bellHookProject();
    scriptedTower.pages[0].characters[1].scripts.push({
      id: 'bell-tower-tap',
      blocks: [{ op: 'when_tap' }, { op: 'end' }],
    });
    expect(storyMissionProgramMatches(scriptedTower, 'tsv-s1-a6-h')).toBe(false);

    const restaged = bellHookProject();
    restaged.pages[0].background = 'candy';
    expect(storyMissionProgramMatches(restaged, 'tsv-s1-a6-h')).toBe(false);

    const reskinned = bellHookProject();
    reskinned.pages[0].characters[0].asset = '/unapproved.svg';
    expect(storyMissionProgramMatches(reskinned, 'tsv-s1-a6-h')).toBe(false);

    // Chapter six's Hook and chapter five's scenes never satisfy each other.
    const otherPage = bellHookProject();
    otherPage.pages[0].id = 'tsv-a6-b-page';
    expect(storyMissionProgramMatches(otherPage, 'tsv-s1-a6-h')).toBe(false);
    expect(storyMissionProgramMatches(bellHookProject(), 'tsv-s1-a5-h')).toBe(false);
  });

  // ── A6-B · 补上那一步 (Logic Build) ─────────────────────────────────────────
  // The chapter's Hook route returns on a page of its own with the same missing
  // middle card, and the child puts it back: a `hop 1` between the walk and the
  // bell. The run-time half (hop really reached before the bell) lives in
  // `tinyStarBellTower.test.ts` and `BlocksStudioPage.test.tsx`.
  const bellBuildProject = (route?: Array<{ op: string; n?: number; text?: string }>) => {
    const project = bellHookProject();
    project.lessonId = 'tsv-s1-a6-b';
    project.pages[0].id = 'tsv-a6-b-page';
    project.pages[0].characters[0].scripts[0].blocks = (route ?? [
      { op: 'when_flag' },
      { op: 'move_right', n: 3 },
      { op: 'hop', n: 1 },
      { op: 'pop' },
      { op: 'end' },
    ]) as Block[];
    return project;
  };

  it('accepts A6-B only when the Hop sits between the walk and the bell', () => {
    expect(storyMissionProgramMatches(bellBuildProject(), 'tsv-s1-a6-b')).toBe(true);

    // The starter itself — the route the Hook shipped — cannot complete it.
    expect(
      storyMissionProgramMatches(
        bellBuildProject([
          { op: 'when_flag' },
          { op: 'move_right', n: 3 },
          { op: 'pop' },
          { op: 'end' },
        ]),
        'tsv-s1-a6-b',
      ),
    ).toBe(false);

    // A palette tap appends the Hop before the terminal End — after the bell.
    expect(
      storyMissionProgramMatches(
        bellBuildProject([
          { op: 'when_flag' },
          { op: 'move_right', n: 3 },
          { op: 'pop' },
          { op: 'hop', n: 1 },
          { op: 'end' },
        ]),
        'tsv-s1-a6-b',
      ),
    ).toBe(false);

    // A hop before the walk jumps in the middle of the square.
    expect(
      storyMissionProgramMatches(
        bellBuildProject([
          { op: 'when_flag' },
          { op: 'hop', n: 1 },
          { op: 'move_right', n: 3 },
          { op: 'pop' },
          { op: 'end' },
        ]),
        'tsv-s1-a6-b',
      ),
    ).toBe(false);

    // The Hop block's own default is 2; §1.2 and the spec both want one space.
    expect(
      storyMissionProgramMatches(
        bellBuildProject([
          { op: 'when_flag' },
          { op: 'move_right', n: 3 },
          { op: 'hop', n: 2 },
          { op: 'pop' },
          { op: 'end' },
        ]),
        'tsv-s1-a6-b',
      ),
    ).toBe(false);

    // Another Motion block in the gap is not the missing card, and neither the
    // walk nor the bell may be retuned, silenced or reordered.
    expect(
      storyMissionProgramMatches(
        bellBuildProject([
          { op: 'when_flag' },
          { op: 'move_right', n: 3 },
          { op: 'grow', n: 1 },
          { op: 'pop' },
          { op: 'end' },
        ]),
        'tsv-s1-a6-b',
      ),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(
        bellBuildProject([
          { op: 'when_flag' },
          { op: 'move_right', n: 2 },
          { op: 'hop', n: 1 },
          { op: 'pop' },
          { op: 'end' },
        ]),
        'tsv-s1-a6-b',
      ),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(
        bellBuildProject([
          { op: 'when_flag' },
          { op: 'move_right', n: 3 },
          { op: 'hop', n: 1 },
          { op: 'end' },
        ]),
        'tsv-s1-a6-b',
      ),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(
        bellBuildProject([
          { op: 'when_flag' },
          { op: 'pop' },
          { op: 'move_right', n: 3 },
          { op: 'hop', n: 1 },
          { op: 'end' },
        ]),
        'tsv-s1-a6-b',
      ),
    ).toBe(false);
  });

  it('keeps the rest of chapter six’s stage out of the child’s reach in A6-B', () => {
    const walked = bellBuildProject();
    walked.pages[0].characters[0].start.gx = 8;
    expect(storyMissionProgramMatches(walked, 'tsv-s1-a6-b')).toBe(false);

    const draggedTower = bellBuildProject();
    draggedTower.pages[0].characters[1].start.gy = 10;
    expect(storyMissionProgramMatches(draggedTower, 'tsv-s1-a6-b')).toBe(false);

    const scriptedTower = bellBuildProject();
    scriptedTower.pages[0].characters[1].scripts.push({
      id: 'bell-tower-tap',
      blocks: [{ op: 'when_tap' }, { op: 'end' }],
    });
    expect(storyMissionProgramMatches(scriptedTower, 'tsv-s1-a6-b')).toBe(false);

    const restaged = bellBuildProject();
    restaged.pages[0].background = 'candy';
    expect(storyMissionProgramMatches(restaged, 'tsv-s1-a6-b')).toBe(false);

    const reskinned = bellBuildProject();
    reskinned.pages[0].characters[0].asset = '/unapproved.svg';
    expect(storyMissionProgramMatches(reskinned, 'tsv-s1-a6-b')).toBe(false);

    const secondScript = bellBuildProject();
    secondScript.pages[0].characters[0].scripts.push({
      id: 'little-light-extra',
      blocks: [{ op: 'when_tap' }, { op: 'hop', n: 1 }, { op: 'end' }],
    });
    expect(storyMissionProgramMatches(secondScript, 'tsv-s1-a6-b')).toBe(false);

    // Chapter six's two scenes never satisfy each other, on either page.
    const hookPage = bellBuildProject();
    hookPage.pages[0].id = 'tsv-a6-h-page';
    expect(storyMissionProgramMatches(hookPage, 'tsv-s1-a6-b')).toBe(false);
    expect(storyMissionProgramMatches(bellBuildProject(), 'tsv-s1-a6-h')).toBe(false);
    expect(storyMissionProgramMatches(bellHookProject(), 'tsv-s1-a6-b')).toBe(false);
  });

  // ── A6-D · 钟先响了 (Twist & Debug) ──────────────────────────────────────
  // All three cards are on the page at last, but the bell has slipped to the
  // FRONT of the chain. The child moves that one card behind the Hop and may
  // change nothing else. The run-time half ("this run really rang before the
  // jump") lives in `tinyStarBellTower.test.ts` and `BlocksStudioPage.test.tsx`.
  const bellFixProject = (route?: Array<{ op: string; n?: number; text?: string }>) => {
    const project = bellHookProject();
    project.lessonId = 'tsv-s1-a6-d';
    project.pages[0].id = 'tsv-a6-d-page';
    project.pages[0].characters[0].scripts[0].blocks = (route ?? [
      { op: 'when_flag' },
      { op: 'move_right', n: 3 },
      { op: 'hop', n: 1 },
      { op: 'pop' },
      { op: 'end' },
    ]) as Block[];
    return project;
  };

  it('accepts A6-D only when the bell has moved behind the jump', () => {
    expect(storyMissionProgramMatches(bellFixProject(), 'tsv-s1-a6-d')).toBe(true);

    // The shipped bug: every block is present, and the bell rings first.
    expect(
      storyMissionProgramMatches(
        bellFixProject([
          { op: 'when_flag' },
          { op: 'pop' },
          { op: 'move_right', n: 3 },
          { op: 'hop', n: 1 },
          { op: 'end' },
        ]),
        'tsv-s1-a6-d',
      ),
    ).toBe(false);

    // Dragged one slot only — the bell still rings before the jump.
    expect(
      storyMissionProgramMatches(
        bellFixProject([
          { op: 'when_flag' },
          { op: 'move_right', n: 3 },
          { op: 'pop' },
          { op: 'hop', n: 1 },
          { op: 'end' },
        ]),
        'tsv-s1-a6-d',
      ),
    ).toBe(false);

    // Dragged past the terminal End — the story never rings.
    expect(
      storyMissionProgramMatches(
        bellFixProject([
          { op: 'when_flag' },
          { op: 'move_right', n: 3 },
          { op: 'hop', n: 1 },
          { op: 'end' },
          { op: 'pop' },
        ]),
        'tsv-s1-a6-d',
      ),
    ).toBe(false);

    // Rebuilding instead of moving: a deleted bell, a duplicated bell, a
    // retuned walk and a retuned jump all keep the mission open.
    expect(
      storyMissionProgramMatches(
        bellFixProject([
          { op: 'when_flag' },
          { op: 'move_right', n: 3 },
          { op: 'hop', n: 1 },
          { op: 'end' },
        ]),
        'tsv-s1-a6-d',
      ),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(
        bellFixProject([
          { op: 'when_flag' },
          { op: 'pop' },
          { op: 'move_right', n: 3 },
          { op: 'hop', n: 1 },
          { op: 'pop' },
          { op: 'end' },
        ]),
        'tsv-s1-a6-d',
      ),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(
        bellFixProject([
          { op: 'when_flag' },
          { op: 'move_right', n: 1 },
          { op: 'hop', n: 1 },
          { op: 'pop' },
          { op: 'end' },
        ]),
        'tsv-s1-a6-d',
      ),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(
        bellFixProject([
          { op: 'when_flag' },
          { op: 'move_right', n: 3 },
          { op: 'hop', n: 2 },
          { op: 'pop' },
          { op: 'end' },
        ]),
        'tsv-s1-a6-d',
      ),
    ).toBe(false);
  });

  it('keeps the rest of chapter six’s stage out of the child’s reach in A6-D', () => {
    const walked = bellFixProject();
    walked.pages[0].characters[0].start.gx = 8;
    expect(storyMissionProgramMatches(walked, 'tsv-s1-a6-d')).toBe(false);

    const draggedTower = bellFixProject();
    draggedTower.pages[0].characters[1].start.gy = 10;
    expect(storyMissionProgramMatches(draggedTower, 'tsv-s1-a6-d')).toBe(false);

    const scriptedTower = bellFixProject();
    scriptedTower.pages[0].characters[1].scripts.push({
      id: 'bell-tower-tap',
      blocks: [{ op: 'when_tap' }, { op: 'pop' }, { op: 'end' }],
    });
    expect(storyMissionProgramMatches(scriptedTower, 'tsv-s1-a6-d')).toBe(false);

    const restaged = bellFixProject();
    restaged.pages[0].background = 'candy';
    expect(storyMissionProgramMatches(restaged, 'tsv-s1-a6-d')).toBe(false);

    const reskinned = bellFixProject();
    reskinned.pages[0].characters[0].asset = '/unapproved.svg';
    expect(storyMissionProgramMatches(reskinned, 'tsv-s1-a6-d')).toBe(false);

    const secondScript = bellFixProject();
    secondScript.pages[0].characters[0].scripts.push({
      id: 'little-light-extra',
      blocks: [{ op: 'when_tap' }, { op: 'pop' }, { op: 'end' }],
    });
    expect(storyMissionProgramMatches(secondScript, 'tsv-s1-a6-d')).toBe(false);

    // Chapter six's three scenes never satisfy each other. A6-B and A6-D end on
    // the SAME route, so only the page and the lesson keep them apart — and they
    // do, on both sides.
    const buildPage = bellFixProject();
    buildPage.pages[0].id = 'tsv-a6-b-page';
    expect(storyMissionProgramMatches(buildPage, 'tsv-s1-a6-d')).toBe(false);
    expect(storyMissionProgramMatches(bellFixProject(), 'tsv-s1-a6-b')).toBe(false);
    expect(storyMissionProgramMatches(bellFixProject(), 'tsv-s1-a6-h')).toBe(false);
    expect(storyMissionProgramMatches(bellBuildProject(), 'tsv-s1-a6-d')).toBe(false);
    expect(storyMissionProgramMatches(bellHookProject(), 'tsv-s1-a6-d')).toBe(false);
  });

  // ── A6-S · 我的晨光结局 (Personal Ship, and the season's last scene) ────────
  // The three-step core ships built and settled; the child chooses who rings the
  // bell and what happens once the morning light is back. The run-time half
  // ("this run rang, then played my ending") lives in `tinyStarBellTower.test.ts`
  // and `BlocksStudioPage.test.tsx`.
  const bellFinaleProject = (
    options: {
      ending?: Block | null;
      cast?: { name: string; emoji: string; asset: string } | null;
    } = {},
  ) => {
    const cast = options.cast === undefined ? TINY_STAR_DUET_CAST[2] : options.cast;
    const ending =
      options.ending === undefined ? ({ op: 'say', text: 'We did it!' } as Block) : options.ending;
    const project = bellHookProject();
    project.lessonId = 'tsv-s1-a6-s';
    project.pages[0].id = 'tsv-a6-s-page';
    const blocks: Block[] = [
      { op: 'when_flag' },
      { op: 'move_right', n: 3 },
      { op: 'hop', n: 1 },
      { op: 'pop' },
      { op: 'end' },
    ];
    if (ending) blocks.splice(4, 0, ending);
    project.pages[0].characters[0] = {
      id: 'bell-ringer',
      name: cast ? cast.name : 'Who will ring it?',
      emoji: cast ? cast.emoji : '❓',
      asset: cast ? cast.asset : undefined,
      start: { gx: 5, gy: 10, size: 1, rot: 0 },
      scripts: [{ id: 'bell-ringer-finale', blocks }],
    };
    return project;
  };

  it('accepts A6-S once a friend rings the bell and the child owns the ending', () => {
    expect(storyMissionProgramMatches(bellFinaleProject(), 'tsv-s1-a6-s')).toBe(true);
    // Every cast member and every ending the scene offers really completes it.
    for (const friend of TINY_STAR_DUET_CAST) {
      expect(storyMissionProgramMatches(bellFinaleProject({ cast: friend }), 'tsv-s1-a6-s')).toBe(
        true,
      );
      expect(
        storyMissionProgramMatches(
          bellFinaleProject({ cast: friend, ending: { op: 'hop', n: 2 } }),
          'tsv-s1-a6-s',
        ),
      ).toBe(true);
      expect(
        storyMissionProgramMatches(
          bellFinaleProject({ cast: friend, ending: { op: 'grow', n: 2 } }),
          'tsv-s1-a6-s',
        ),
      ).toBe(true);
    }

    // The shipped starter: the route runs, but nobody is standing there and the
    // morning has no ending — neither of the child's decisions can be inherited.
    expect(
      storyMissionProgramMatches(bellFinaleProject({ cast: null, ending: null }), 'tsv-s1-a6-s'),
    ).toBe(false);
    expect(storyMissionProgramMatches(bellFinaleProject({ cast: null }), 'tsv-s1-a6-s')).toBe(false);
    expect(storyMissionProgramMatches(bellFinaleProject({ ending: null }), 'tsv-s1-a6-s')).toBe(
      false,
    );
    // Free-typed words are not one of teaching script §8.7's short endings.
    expect(
      storyMissionProgramMatches(
        bellFinaleProject({ ending: { op: 'say', text: 'Hi!' } }),
        'tsv-s1-a6-s',
      ),
    ).toBe(false);
    // Chapter five's timing model is not chapter six's ending.
    expect(
      storyMissionProgramMatches(bellFinaleProject({ ending: { op: 'wait', n: 5 } }), 'tsv-s1-a6-s'),
    ).toBe(false);
    // Bigger than the Age A band §1.2 allows.
    expect(
      storyMissionProgramMatches(bellFinaleProject({ ending: { op: 'grow', n: 5 } }), 'tsv-s1-a6-s'),
    ).toBe(false);
  });

  it('keeps A6-S’s settled core and its stage out of the child’s reach', () => {
    // The ending belongs after the bell: before it, the last word happens while
    // the morning light is still missing.
    const early = bellFinaleProject({ ending: null });
    early.pages[0].characters[0].scripts[0].blocks.splice(3, 0, {
      op: 'say',
      text: 'We did it!',
    } as Block);
    expect(storyMissionProgramMatches(early, 'tsv-s1-a6-s')).toBe(false);

    const doubled = bellFinaleProject();
    doubled.pages[0].characters[0].scripts[0].blocks.splice(5, 0, { op: 'hop', n: 1 } as Block);
    expect(storyMissionProgramMatches(doubled, 'tsv-s1-a6-s')).toBe(false);

    // A6-D's own bug, brought back into the finale.
    const bellFirst = bellFinaleProject({ ending: null });
    bellFirst.pages[0].characters[0].scripts[0].blocks = [
      { op: 'when_flag' },
      { op: 'pop' },
      { op: 'move_right', n: 3 },
      { op: 'hop', n: 1 },
      { op: 'say', text: 'We did it!' },
      { op: 'end' },
    ] as Block[];
    expect(storyMissionProgramMatches(bellFirst, 'tsv-s1-a6-s')).toBe(false);

    const retuned = bellFinaleProject({ ending: null });
    retuned.pages[0].characters[0].scripts[0].blocks = [
      { op: 'when_flag' },
      { op: 'move_right', n: 2 },
      { op: 'hop', n: 1 },
      { op: 'pop' },
      { op: 'say', text: 'We did it!' },
      { op: 'end' },
    ] as Block[];
    expect(storyMissionProgramMatches(retuned, 'tsv-s1-a6-s')).toBe(false);

    const walked = bellFinaleProject();
    walked.pages[0].characters[0].start.gx = 8;
    expect(storyMissionProgramMatches(walked, 'tsv-s1-a6-s')).toBe(false);

    const draggedTower = bellFinaleProject();
    draggedTower.pages[0].characters[1].start.gy = 10;
    expect(storyMissionProgramMatches(draggedTower, 'tsv-s1-a6-s')).toBe(false);

    const scriptedTower = bellFinaleProject();
    scriptedTower.pages[0].characters[1].scripts.push({
      id: 'bell-tower-tap',
      blocks: [{ op: 'when_tap' }, { op: 'end' }],
    });
    expect(storyMissionProgramMatches(scriptedTower, 'tsv-s1-a6-s')).toBe(false);

    const restaged = bellFinaleProject();
    restaged.pages[0].background = 'candy';
    expect(storyMissionProgramMatches(restaged, 'tsv-s1-a6-s')).toBe(false);

    const crowded = bellFinaleProject();
    crowded.pages[0].characters.push({
      id: 'extra-friend',
      name: 'Tuan Tuan',
      emoji: '🐻',
      start: { gx: 2, gy: 10, size: 1, rot: 0 },
      scripts: [],
    });
    expect(storyMissionProgramMatches(crowded, 'tsv-s1-a6-s')).toBe(false);

    const secondScript = bellFinaleProject();
    secondScript.pages[0].characters[0].scripts.push({
      id: 'bell-ringer-extra',
      blocks: [{ op: 'when_tap' }, { op: 'hop', n: 1 }, { op: 'end' }],
    });
    expect(storyMissionProgramMatches(secondScript, 'tsv-s1-a6-s')).toBe(false);

    // Chapter six's four scenes never satisfy each other.
    const fixPage = bellFinaleProject();
    fixPage.pages[0].id = 'tsv-a6-d-page';
    expect(storyMissionProgramMatches(fixPage, 'tsv-s1-a6-s')).toBe(false);
    expect(storyMissionProgramMatches(bellFinaleProject(), 'tsv-s1-a6-b')).toBe(false);
    expect(storyMissionProgramMatches(bellFinaleProject(), 'tsv-s1-a6-d')).toBe(false);
    expect(storyMissionProgramMatches(bellFinaleProject(), 'tsv-s1-a6-h')).toBe(false);
    expect(storyMissionProgramMatches(bellFixProject(), 'tsv-s1-a6-s')).toBe(false);
    expect(storyMissionProgramMatches(bellHookProject(), 'tsv-s1-a6-s')).toBe(false);
  });

  it('does not confuse A1-H and A1-B page identities', () => {
    expect(storyMissionProgramMatches(correctedMissionProject(), 'tsv-s1-a1-b')).toBe(false);
    expect(storyMissionProgramMatches(completedBuildMissionProject(), 'tsv-s1-a1-h')).toBe(false);
    expect(storyMissionProgramMatches(correctedDebugMissionProject(), 'tsv-s1-a1-b')).toBe(false);
    expect(storyMissionProgramMatches(personalShipMissionProject(), 'tsv-s1-a1-d')).toBe(false);
    expect(storyMissionProgramMatches(directionHookProject(), 'tsv-s1-a1-s')).toBe(false);
    expect(storyMissionProgramMatches(completedDirectionBuildProject(), 'tsv-s1-a2-h')).toBe(false);
  });

  it('rejects a correct-looking sequence on the wrong character or script', () => {
    const wrongCharacter = correctedMissionProject();
    wrongCharacter.pages[0].characters[0].id = 'someone-else';
    expect(storyMissionProgramMatches(wrongCharacter, 'tsv-s1-a1-h')).toBe(false);

    const wrongScript = correctedMissionProject();
    wrongScript.pages[0].characters[0].scripts[0].id = 'other-flag';
    expect(storyMissionProgramMatches(wrongScript, 'tsv-s1-a1-h')).toBe(false);
  });

  it('rejects extra blocks, wrong dialogue, or a missing formal asset', () => {
    const extraBlock = correctedMissionProject();
    extraBlock.pages[0].characters[0].scripts[0].blocks.splice(2, 0, { op: 'wait', n: 1 });
    expect(storyMissionProgramMatches(extraBlock, 'tsv-s1-a1-h')).toBe(false);

    const wrongWords = correctedMissionProject();
    wrongWords.pages[0].characters[0].scripts[0].blocks[2] = { op: 'say', text: 'Hi!' };
    expect(storyMissionProgramMatches(wrongWords, 'tsv-s1-a1-h')).toBe(false);

    const noAsset = correctedMissionProject();
    delete noAsset.pages[0].characters[0].asset;
    expect(storyMissionProgramMatches(noAsset, 'tsv-s1-a1-h')).toBe(false);
  });
});

describe('Journey to the West C1-P4 arrival build contract', () => {
  function jtwBuildProject(middle: Array<{ op: string; n?: number; text?: string }>) {
    return {
      version: 1,
      name: '西游记 · 搭出完整出世链',
      lessonId: 'jtw-s1-c1-p4',
      pages: [
        {
          id: 'jtw-c1-p4-page',
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
                  id: 'stone-monkey-arrival-build',
                  blocks: [{ op: 'when_flag' }, { op: 'hide' }, ...middle, { op: 'end' }],
                },
              ],
            },
          ],
        },
      ],
    } as never;
  }
  const target = [
    { op: 'play_sound', n: 2 },
    { op: 'show' },
    { op: 'hop', n: 1 },
    { op: 'say', text: '你好，我刚刚来到这里。' },
  ];

  it('accepts exactly the six-block arrival chain', () => {
    expect(storyMissionProgramMatches(jtwBuildProject(target), 'jtw-s1-c1-p4')).toBe(true);
  });

  it('rejects distractor blocks and wrong order (Show must precede Hop/Say)', () => {
    const grow = [...target];
    grow[1] = { op: 'grow', n: 2 }; // Grow instead of Show
    expect(storyMissionProgramMatches(jtwBuildProject(grow), 'jtw-s1-c1-p4')).toBe(false);

    const turned = [...target, { op: 'turn_right', n: 3 }]; // extra distractor
    expect(storyMissionProgramMatches(jtwBuildProject(turned), 'jtw-s1-c1-p4')).toBe(false);

    const sayBeforeShow = [target[0], target[3], target[1], target[2]];
    expect(storyMissionProgramMatches(jtwBuildProject(sayBeforeShow), 'jtw-s1-c1-p4')).toBe(false);

    const wrongWords = [...target];
    wrongWords[3] = { op: 'say', text: 'Hello!' };
    expect(storyMissionProgramMatches(jtwBuildProject(wrongWords), 'jtw-s1-c1-p4')).toBe(false);
  });
});

describe('Journey to the West C2-P4 five-block route contract', () => {
  function routeProject(
    middle: Array<{ op: string; n?: number; text?: string }>,
    start: { gx: number; gy: number; size: number; rot: number } = { gx: 2, gy: 8, size: 3, rot: 0 },
  ) {
    return {
      version: 1,
      name: '西游记 · 刚好到达，不多也不少',
      lessonId: 'jtw-s1-c2-p4',
      pages: [
        {
          id: 'jtw-c2-p4-page',
          background: 'jtw-s1-c1-flower-fruit-stone',
          characters: [
            {
              id: 'stone-monkey',
              name: 'Stone Monkey',
              emoji: '🐵',
              asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
              start,
              scripts: [
                {
                  id: 'stone-monkey-route-to-curtain',
                  blocks: [{ op: 'when_flag' }, ...middle, { op: 'end' }],
                },
              ],
            },
          ],
        },
      ],
    } as never;
  }
  const right1 = { op: 'move_right', n: 1 };
  const up1 = { op: 'move_up', n: 1 };
  const target = [right1, right1, up1, right1, right1];

  it('accepts exactly the five child-placed one-step blocks in route order', () => {
    expect(storyMissionProgramMatches(routeProject(target), 'jtw-s1-c2-p4')).toBe(true);
  });

  it('rejects the shipped bare frame and the parameter-merged 右2/上1/右2 shortcut', () => {
    expect(storyMissionProgramMatches(routeProject([]), 'jtw-s1-c2-p4')).toBe(false);
    // 只改参数不通过: three merged blocks reach the same cell but are not the
    // five blocks the child must own.
    const merged = [
      { op: 'move_right', n: 2 },
      { op: 'move_up', n: 1 },
      { op: 'move_right', n: 2 },
    ];
    expect(storyMissionProgramMatches(routeProject(merged), 'jtw-s1-c2-p4')).toBe(false);
  });

  it('rejects wrong orders — Up first or Up last stops on the wrong stones', () => {
    expect(
      storyMissionProgramMatches(routeProject([up1, right1, right1, right1, right1]), 'jtw-s1-c2-p4'),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(routeProject([right1, right1, right1, right1, up1]), 'jtw-s1-c2-p4'),
    ).toBe(false);
  });

  it('rejects one step short and one step over — no overshoot tolerance exists', () => {
    expect(
      storyMissionProgramMatches(routeProject([right1, right1, up1, right1]), 'jtw-s1-c2-p4'),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(
        routeProject([right1, right1, up1, right1, right1, right1]),
        'jtw-s1-c2-p4',
      ),
    ).toBe(false);
  });

  it('rejects live distractors (Left/Down/Wait) inside the chain', () => {
    expect(
      storyMissionProgramMatches(
        routeProject([right1, right1, { op: 'move_down', n: 1 }, right1, right1]),
        'jtw-s1-c2-p4',
      ),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(
        routeProject([right1, { op: 'wait', n: 1 }, up1, right1, right1]),
        'jtw-s1-c2-p4',
      ),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(
        routeProject([right1, right1, up1, right1, { op: 'move_left', n: 1 }]),
        'jtw-s1-c2-p4',
      ),
    ).toBe(false);
  });

  it('rejects a moved start — the 2/8 wet-stone start is part of the contract', () => {
    expect(
      storyMissionProgramMatches(
        routeProject(target, { gx: 8, gy: 9, size: 3, rot: 0 }),
        'jtw-s1-c2-p4',
      ),
    ).toBe(false);
  });
});

describe('Journey to the West C1-P5 greeting-order contract', () => {
  function p5Project(middle: Array<{ op: string; n?: number; text?: string }>) {
    return {
      version: 1,
      name: '西游记 · 我的第一次问候',
      lessonId: 'jtw-s1-c1-p5',
      pages: [
        {
          id: 'jtw-c1-p5-page',
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
                  id: 'stone-monkey-first-greeting',
                  blocks: [
                    { op: 'when_flag' },
                    { op: 'hide' },
                    { op: 'play_sound', n: 2 },
                    { op: 'show' },
                    ...middle,
                    { op: 'end' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    } as never;
  }
  const hop = { op: 'hop', n: 1 };
  const say = { op: 'say', text: '你们好，我可以过来吗？' };

  it('accepts BOTH valid greeting orders (Hop→Say and Say→Hop)', () => {
    expect(storyMissionProgramMatches(p5Project([hop, say]), 'jtw-s1-c1-p5')).toBe(true);
    expect(storyMissionProgramMatches(p5Project([say, hop]), 'jtw-s1-c1-p5')).toBe(true);
  });

  it('rejects removed Show, non-preset dialogue and other orders', () => {
    // Show deleted: prefix broken.
    const noShow = p5Project([hop, say]) as { pages: Array<{ characters: Array<{ scripts: Array<{ blocks: Array<{ op: string }> }> }> }> };
    noShow.pages[0].characters[0].scripts[0].blocks.splice(3, 1);
    expect(storyMissionProgramMatches(noShow as never, 'jtw-s1-c1-p5')).toBe(false);

    // Free-typed dialogue is not a preset.
    expect(
      storyMissionProgramMatches(p5Project([hop, { op: 'say', text: '随便写的' }]), 'jtw-s1-c1-p5'),
    ).toBe(false);

    // Doubling a block or adding a distractor fails the exact length.
    expect(storyMissionProgramMatches(p5Project([hop, hop]), 'jtw-s1-c1-p5')).toBe(false);
    expect(
      storyMissionProgramMatches(p5Project([hop, say, { op: 'grow', n: 2 }]), 'jtw-s1-c1-p5'),
    ).toBe(false);
  });
});

describe('Journey to the West C1-P6 order-debug contract', () => {
  function p6Project(blocks: Array<{ op: string; n?: number; text?: string }>) {
    return {
      version: 1,
      name: '西游记 · 修好乱序的亮相',
      lessonId: 'jtw-s1-c1-p6',
      pages: [
        {
          id: 'jtw-c1-p6-page',
          background: 'jtw-s1-c1-flower-fruit-stone',
          characters: [
            {
              id: 'stone-monkey',
              name: 'Stone Monkey',
              emoji: '🐵',
              asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
              start: { gx: 8, gy: 9, size: 3, rot: 0 },
              scripts: [{ id: 'stone-monkey-arrival-debug', blocks }],
            },
          ],
        },
      ],
    } as never;
  }
  const prefix = [{ op: 'when_flag' }, { op: 'hide' }, { op: 'play_sound', n: 2 }];
  const show = { op: 'show' };
  const hop = { op: 'hop', n: 1 };
  const say = { op: 'say', text: '你好，我刚刚来到这里。' };
  const end = { op: 'end' };

  it('accepts ONLY the repaired order Show → Hop → Say', () => {
    expect(
      storyMissionProgramMatches(p6Project([...prefix, show, hop, say, end]), 'jtw-s1-c1-p6'),
    ).toBe(true);
  });

  it('rejects the shipped bug order and every partial reorder', () => {
    // The starter's bug (Say → Hop → Show) never passes as-is.
    expect(
      storyMissionProgramMatches(p6Project([...prefix, say, hop, show, end]), 'jtw-s1-c1-p6'),
    ).toBe(false);
    // Half-fixed orders still hide a cause from the audience.
    expect(
      storyMissionProgramMatches(p6Project([...prefix, show, say, hop, end]), 'jtw-s1-c1-p6'),
    ).toBe(false);
    expect(
      storyMissionProgramMatches(p6Project([...prefix, hop, show, say, end]), 'jtw-s1-c1-p6'),
    ).toBe(false);
  });

  it('rejects sound/endpoint tampering, deletions and rebuild shortcuts', () => {
    // Changing the sound to dodge the order problem is forbidden.
    const otherSound = [{ op: 'when_flag' }, { op: 'hide' }, { op: 'play_sound', n: 4 }];
    expect(
      storyMissionProgramMatches(p6Project([...otherSound, show, hop, say, end]), 'jtw-s1-c1-p6'),
    ).toBe(false);
    // Deleting a block (no Hop) fails the exact chain.
    expect(
      storyMissionProgramMatches(p6Project([...prefix, show, say, end]), 'jtw-s1-c1-p6'),
    ).toBe(false);
    // Dropping the End endpoint fails.
    expect(
      storyMissionProgramMatches(p6Project([...prefix, show, hop, say]), 'jtw-s1-c1-p6'),
    ).toBe(false);
    // Rebuilding with a changed greeting is not "move only the target blocks".
    expect(
      storyMissionProgramMatches(
        p6Project([...prefix, show, hop, { op: 'say', text: '大家好！' }, end]),
        'jtw-s1-c1-p6',
      ),
    ).toBe(false);
    // Adding a distractor fails the exact length.
    expect(
      storyMissionProgramMatches(
        p6Project([...prefix, show, hop, say, { op: 'grow', n: 2 }, end]),
        'jtw-s1-c1-p6',
      ),
    ).toBe(false);
  });
});

describe('Journey to the West C1-P7 personal-arrival contract', () => {
  function p7Project(
    blocks: Array<{ op: string; n?: number; text?: string }>,
    background = 'jtw-s1-c1-flower-fruit-stone',
  ) {
    return {
      version: 1,
      name: '西游记 · 我的石猴亮相',
      lessonId: 'jtw-s1-c1-p7',
      pages: [
        {
          id: 'jtw-c1-p7-page',
          background,
          characters: [
            {
              id: 'stone-monkey',
              name: 'Stone Monkey',
              emoji: '🐵',
              asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
              start: { gx: 8, gy: 9, size: 3, rot: 0 },
              scripts: [{ id: 'stone-monkey-personal-arrival', blocks }],
            },
          ],
        },
      ],
    } as never;
  }
  const prefix = [{ op: 'when_flag' }, { op: 'hide' }, { op: 'play_sound', n: 2 }, { op: 'show' }];
  const say = { op: 'say', text: '你好，我刚刚来到这里。' };
  const end = { op: 'end' };
  const hop = { op: 'hop', n: 2 };
  const grow = { op: 'grow', n: 2 };

  it('accepts the child-owned designs: any two visible actions, either order, any of the six sounds', () => {
    expect(
      storyMissionProgramMatches(p7Project([...prefix, hop, grow, say, end]), 'jtw-s1-c1-p7'),
    ).toBe(true);
    expect(
      storyMissionProgramMatches(p7Project([...prefix, grow, hop, say, end]), 'jtw-s1-c1-p7'),
    ).toBe(true);
    // A different sound cue and a different preset greeting are the child's call.
    expect(
      storyMissionProgramMatches(
        p7Project([
          { op: 'when_flag' },
          { op: 'hide' },
          { op: 'play_sound', n: 5 },
          { op: 'show' },
          { op: 'turn_right', n: 3 },
          { op: 'shrink', n: 2 },
          { op: 'say', text: '你们好，我可以过来吗？' },
          end,
        ]),
        'jtw-s1-c1-p7',
      ),
    ).toBe(true);
  });

  it('accepts the optional wait(1..3) ONLY between the two actions', () => {
    expect(
      storyMissionProgramMatches(
        p7Project([...prefix, hop, { op: 'wait', n: 2 }, grow, say, end]),
        'jtw-s1-c1-p7',
      ),
    ).toBe(true);
    // Wait out of range (per the contract 1..3).
    expect(
      storyMissionProgramMatches(
        p7Project([...prefix, hop, { op: 'wait', n: 5 }, grow, say, end]),
        'jtw-s1-c1-p7',
      ),
    ).toBe(false);
    // Wait outside the between-actions slot.
    expect(
      storyMissionProgramMatches(
        p7Project([...prefix, { op: 'wait', n: 2 }, hop, grow, say, end]),
        'jtw-s1-c1-p7',
      ),
    ).toBe(false);
  });

  it('reset_size only counts as visible straight after a grow/shrink', () => {
    expect(
      storyMissionProgramMatches(
        p7Project([...prefix, grow, { op: 'reset_size' }, say, end]),
        'jtw-s1-c1-p7',
      ),
    ).toBe(true);
    // Nothing changed size before it — an invisible non-action.
    expect(
      storyMissionProgramMatches(
        p7Project([...prefix, { op: 'reset_size' }, hop, say, end]),
        'jtw-s1-c1-p7',
      ),
    ).toBe(false);
  });

  it('rejects a single action, invisible fillers and ops outside the allowed set', () => {
    // Only one visible action.
    expect(storyMissionProgramMatches(p7Project([...prefix, hop, say, end]), 'jtw-s1-c1-p7')).toBe(
      false,
    );
    // A sound is not a visible personality action.
    expect(
      storyMissionProgramMatches(
        p7Project([...prefix, hop, { op: 'play_sound', n: 3 }, say, end]),
        'jtw-s1-c1-p7',
      ),
    ).toBe(false);
    // move_right is not in the allowed action set.
    expect(
      storyMissionProgramMatches(
        p7Project([...prefix, hop, { op: 'move_right', n: 2 }, say, end]),
        'jtw-s1-c1-p7',
      ),
    ).toBe(false);
    // A third action overflows the 8–9 block frame.
    expect(
      storyMissionProgramMatches(
        p7Project([...prefix, hop, grow, { op: 'turn_left', n: 3 }, say, end]),
        'jtw-s1-c1-p7',
      ),
    ).toBe(false);
  });

  it('rejects frame tampering: removed Show/hide, free-typed dialogue, missing End, swapped stage', () => {
    // Show deleted — the greeting would come from thin air again.
    expect(
      storyMissionProgramMatches(
        p7Project([
          { op: 'when_flag' },
          { op: 'hide' },
          { op: 'play_sound', n: 2 },
          hop,
          grow,
          { op: 'wait', n: 1 },
          say,
          end,
        ]),
        'jtw-s1-c1-p7',
      ),
    ).toBe(false);
    // hide deleted breaks the fixed frame.
    expect(
      storyMissionProgramMatches(
        p7Project([
          { op: 'when_flag' },
          { op: 'play_sound', n: 2 },
          { op: 'show' },
          hop,
          { op: 'wait', n: 1 },
          grow,
          say,
          end,
        ]),
        'jtw-s1-c1-p7',
      ),
    ).toBe(false);
    // Free-typed dialogue is not a preset greeting.
    expect(
      storyMissionProgramMatches(
        p7Project([...prefix, hop, grow, { op: 'say', text: '随便写的' }, end]),
        'jtw-s1-c1-p7',
      ),
    ).toBe(false);
    // Dropping the End endpoint fails.
    expect(
      storyMissionProgramMatches(p7Project([...prefix, hop, grow, say]), 'jtw-s1-c1-p7'),
    ).toBe(false);
    // Only swapping the background is NOT a personal design.
    expect(
      storyMissionProgramMatches(
        p7Project([...prefix, hop, grow, say, end], 'meadow'),
        'jtw-s1-c1-p7',
      ),
    ).toBe(false);
  });
});
