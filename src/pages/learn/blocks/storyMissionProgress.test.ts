import { describe, expect, it } from 'vitest';

import { blankProject } from './blocksModel';
import { storyMissionProgramMatches } from './storyMissionProgress';

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
