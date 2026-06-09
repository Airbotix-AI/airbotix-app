import { describe, it, expect } from 'vitest';

import { getDoc, searchDocs } from './helpApi';
import type { HelpDoc } from './helpTypes';

// A representative fixture mirroring the backend corpus shape (the real content is
// fetched from GET /help/docs at runtime; these are the search/ranking invariants).
const DOCS: HelpDoc[] = [
  {
    id: 'phaser/arcade-physics',
    pillar: 'phaser',
    title: 'Arcade physics (gravity, jumping)',
    tags: ['physics', 'gravity', 'jump', 'fall'],
    blocks: [
      { kind: 'heading', text: 'Make things fall and jump', anchor: 'gravity' },
      { kind: 'para', tier: 'lite', text: 'Gravity makes your player fall.' },
      { kind: 'code', tier: 'pro', code: 'this.player.body.setVelocityY(-450); // setGravityY too' },
    ],
  },
  {
    id: 'basics/moving-with-input',
    pillar: 'basics',
    title: 'Moving your player',
    tags: ['move', 'input', 'keys'],
    blocks: [
      { kind: 'heading', text: 'Listen for keys, then move', anchor: 'overview' },
      { kind: 'code', tier: 'pro', code: 'this.player.body.setVelocityX(-200);' },
    ],
  },
  {
    id: 'basics/sprites-and-objects',
    pillar: 'basics',
    title: 'Sprites and game objects',
    tags: ['sprite', 'guy', 'character'],
    blocks: [{ kind: 'heading', text: 'The things in your game', anchor: 'overview' }],
  },
  {
    id: 'basics/score-and-lives',
    pillar: 'basics',
    title: 'Score and lives',
    tags: ['score', 'points'],
    blocks: [{ kind: 'heading', text: 'Keeping count', anchor: 'overview' }],
  },
];

describe('getDoc', () => {
  it('finds a doc by id, undefined for unknown', () => {
    expect(getDoc(DOCS, 'phaser/arcade-physics')?.title).toBeTruthy();
    expect(getDoc(DOCS, 'nope/missing')).toBeUndefined();
  });
});

describe('searchDocs ranking', () => {
  it('returns nothing for an empty / too-short query', () => {
    expect(searchDocs(DOCS, '')).toEqual([]);
    expect(searchDocs(DOCS, 'a')).toEqual([]);
  });

  it('ranks a tag hit ("jump") to arcade-physics with its anchor', () => {
    const top = searchDocs(DOCS, 'jump')[0];
    expect(top.id).toBe('phaser/arcade-physics');
    expect(top.anchor).toBe('gravity');
    expect(top.snippet).toBeTruthy();
  });

  it('strips punctuation so "how do I jump?" still matches', () => {
    expect(searchDocs(DOCS, 'how do I jump?')[0].id).toBe('phaser/arcade-physics');
  });

  it('finds docs from kid synonyms; a title hit outranks a body hit', () => {
    expect(searchDocs(DOCS, 'move').map((r) => r.id)).toContain('basics/moving-with-input');
    expect(searchDocs(DOCS, 'guy').map((r) => r.id)).toContain('basics/sprites-and-objects');
    expect(searchDocs(DOCS, 'score')[0].id).toBe('basics/score-and-lives');
  });

  it('excludes Pro-only passages from a Lite search', () => {
    expect(searchDocs(DOCS, 'setVelocityX', 'lite')).toEqual([]);
    expect(searchDocs(DOCS, 'setVelocityX', 'pro').map((r) => r.id)).toContain('basics/moving-with-input');
  });
});
