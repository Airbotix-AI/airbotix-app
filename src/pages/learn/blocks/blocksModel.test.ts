import { describe, expect, it } from 'vitest';

import {
  BLOCK_DEFS,
  CATEGORIES,
  blankProject,
  blockDef,
  isTrigger,
  parseProject,
  serializeProject,
} from './blocksModel';

describe('blocksModel', () => {
  it('serialize → parse round-trips a project', () => {
    const p = blankProject('Round trip');
    p.pages[0].characters[0].scripts.push({
      id: 'script-1',
      blocks: [{ op: 'when_flag' }, { op: 'move_right', n: 4 }, { op: 'say', text: 'Hi!' }],
    });
    const out = parseProject(serializeProject(p));
    expect(out.name).toBe('Round trip');
    expect(out.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_flag' },
      { op: 'move_right', n: 4 },
      { op: 'say', text: 'Hi!' },
    ]);
  });

  it('parses the backend starter shape (blocks_story contract)', () => {
    // Mirrors platform-backend blocks-templates.ts STORY — the cross-repo contract.
    const raw = JSON.stringify({
      version: 1,
      name: 'The cat and the ball',
      pages: [
        {
          id: 'page-1',
          background: 'meadow',
          characters: [
            {
              id: 'char-cat',
              name: 'Cat',
              emoji: '🐱',
              start: { gx: 4, gy: 10, size: 1, rot: 0 },
              scripts: [
                {
                  id: 'script-1',
                  blocks: [
                    { op: 'when_flag' },
                    { op: 'move_right', n: 4 },
                    { op: 'say', text: 'Hi!' },
                    { op: 'hop', n: 2 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const p = parseProject(raw);
    expect(p.pages[0].characters[0].name).toBe('Cat');
    expect(p.pages[0].characters[0].scripts[0].blocks).toHaveLength(4);
  });

  it('drops unknown ops, clamps params, and falls back to blank on garbage', () => {
    const messy = JSON.stringify({
      version: 1,
      name: 'Messy',
      pages: [
        {
          id: 'p',
          background: 'meadow',
          characters: [
            {
              id: 'c',
              name: 'X',
              emoji: '🐱',
              start: { gx: 999, gy: -5, size: 1, rot: 0 },
              scripts: [
                {
                  id: 's',
                  blocks: [{ op: 'when_flag' }, { op: 'evil_op' }, { op: 'move_right', n: 999 }],
                },
                { id: 'headless', blocks: [{ op: 'move_left', n: 1 }] }, // no trigger → dropped
              ],
            },
          ],
        },
      ],
    });
    const p = parseProject(messy);
    const char = p.pages[0].characters[0];
    expect(char.start.gx).toBe(19); // clamped to grid
    expect(char.start.gy).toBe(0);
    expect(char.scripts).toHaveLength(1); // headless script dropped
    expect(char.scripts[0].blocks).toEqual([{ op: 'when_flag' }, { op: 'move_right', n: 9 }]);

    expect(parseProject('not json').pages).toHaveLength(1); // blank fallback
    expect(parseProject('{"version":2}').pages).toHaveLength(1);
  });

  it('keeps first-party character assets and rejects remote image URLs', () => {
    const project = blankProject();
    project.pages[0].characters[0].asset =
      '/story-blocks/tiny-star-village/characters/little-light/resting.svg';
    const parsed = parseProject(serializeProject(project));
    expect(parsed.pages[0].characters[0].asset).toBe(project.pages[0].characters[0].asset);

    project.pages[0].characters[0].asset = 'https://example.com/tracker.png';
    const unsafe = parseProject(serializeProject(project));
    expect(unsafe.pages[0].characters[0].asset).toBeUndefined();
    expect(unsafe.pages[0].characters[0].emoji).toBe('🐱');
  });

  it('keeps a safe curriculum lesson id and drops malformed ids', () => {
    const project = blankProject();
    project.lessonId = 'tsv-s1-a1-h';
    expect(parseProject(serializeProject(project)).lessonId).toBe('tsv-s1-a1-h');

    project.lessonId = '../../not-a-lesson';
    expect(parseProject(serializeProject(project)).lessonId).toBeUndefined();
  });

  it('recognises A1-H projects created before lesson ids were added', () => {
    const project = blankProject('Old A1-H');
    project.pages[0].background = 'tsv-window-room-dim';
    const character = project.pages[0].characters[0];
    character.asset = '/story-blocks/tiny-star-village/characters/little-light/resting.svg';
    character.scripts = [{
      id: 'little-light-flag',
      blocks: [
        { op: 'when_flag' },
        { op: 'say', text: 'Morning!' },
        { op: 'hop', n: 1 },
        { op: 'end' },
      ],
    }];

    expect(parseProject(serializeProject(project)).lessonId).toBe('tsv-s1-a1-h');
  });

  it('persists numbered notes and picture sounds, and still accepts legacy Pop', () => {
    const project = blankProject('Sound story');
    project.pages[0].characters[0].scripts = [{
      id: 'sound-script',
      blocks: [
        { op: 'when_flag' },
        { op: 'play_note', n: 7 },
        { op: 'play_sound', n: 6 },
        { op: 'pop' },
      ],
    }];

    const parsed = parseProject(serializeProject(project));
    expect(parsed.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_flag' },
      { op: 'play_note', n: 7 },
      { op: 'play_sound', n: 6 },
      { op: 'pop' },
    ]);
  });

  it('migrates a bounded Junior If target into a structural multi-block body', () => {
    const project = blankProject('Conditional story');
    project.pages[0].characters[0].scripts = [{
      id: 'conditional-script',
      blocks: [
        { op: 'when_flag' },
        { op: 'if_touching', text: 'friend-2' },
        { op: 'hop', n: 1 },
      ],
    }];

    const parsed = parseProject(serializeProject(project));
    expect(parsed.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_flag' },
      { op: 'if_touching', text: 'friend-2', body: [{ op: 'hop', n: 1 }] },
    ]);
  });

  it('covers all six categories in the catalogue', () => {
    const cats = new Set(BLOCK_DEFS.map((d) => d.category));
    expect([...cats].sort()).toEqual(
      [...CATEGORIES.map((c) => c.id)].sort(),
    );
    expect(isTrigger('when_flag')).toBe(true);
    expect(isTrigger('move_right')).toBe(false);
    expect(blockDef('wait').hasN).toBe(true);
  });
});
