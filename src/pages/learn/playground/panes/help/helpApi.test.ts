import { describe, it, expect } from 'vitest';

import { getHelpDoc, listHelpDocs, searchHelp } from './helpApi';
import { HELP_DOCS } from './helpContent';

describe('helpApi list/get', () => {
  it('lists every doc as metadata', () => {
    expect(listHelpDocs()).toHaveLength(HELP_DOCS.length);
    expect(listHelpDocs()[0]).toMatchObject({ id: expect.any(String), pillar: expect.any(String), title: expect.any(String) });
  });

  it('gets a doc by id, undefined for unknown', () => {
    expect(getHelpDoc('phaser/arcade-physics')?.title).toBeTruthy();
    expect(getHelpDoc('nope/missing')).toBeUndefined();
  });
});

describe('searchHelp ranking', () => {
  it('returns nothing for an empty / too-short query', () => {
    expect(searchHelp('')).toEqual([]);
    expect(searchHelp('a')).toEqual([]);
  });

  it('ranks a tag hit ("jump") to the arcade-physics doc', () => {
    const top = searchHelp('jump')[0];
    expect(top.id).toBe('phaser/arcade-physics');
    expect(top.anchor).toBe('gravity'); // its first heading anchor
    expect(top.snippet).toBeTruthy();
  });

  it('finds the movement doc from a kid synonym ("guy")', () => {
    // "guy" is a tag synonym on the sprites doc; "move" hits the movement doc.
    expect(searchHelp('move').map((r) => r.id)).toContain('basics/moving-with-input');
    expect(searchHelp('guy').map((r) => r.id)).toContain('basics/sprites-and-objects');
  });

  it('a title hit outranks a body-only hit', () => {
    const results = searchHelp('score');
    expect(results[0].id).toBe('basics/score-and-lives'); // title contains "Score"
  });
});

describe('searchHelp tier filtering', () => {
  // `setVelocityX` appears ONLY in a Pro-tier code block (not a title/tag), so it
  // must surface under Pro but be invisible under Lite.
  it('excludes Pro-only passages from a Lite search', () => {
    expect(searchHelp('setVelocityX', 'lite')).toEqual([]);
    expect(searchHelp('setVelocityX', 'pro').map((r) => r.id)).toContain('basics/moving-with-input');
  });
});
