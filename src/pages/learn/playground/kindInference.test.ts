import { describe, expect, it } from 'vitest';

import { inferProjectKindFromIdea } from './kindInference';

// D-WEB-11: the generic landing infers WEBSITE only on a confident signal —
// the exact bug this guards: "I'd like a todo list website" created a GAME.
describe('inferProjectKindFromIdea', () => {
  it('infers website from confident signals', () => {
    for (const idea of [
      "I'd like to create a todo list website",
      'a web site about dogs',
      'make me a webpage for my club',
      'a web page with my drawings',
      'my own blog',
      'a portfolio for my art',
      'a homepage for our family',
      'a landing page for my lemonade stand',
      'a web app that counts my chores',
      '一个宠物网站',
    ]) {
      expect(inferProjectKindFromIdea(idea), idea).toBe('website');
    }
  });

  it('defaults to game otherwise — including near-miss words', () => {
    for (const idea of [
      'a pong game',
      'a todo list', // no web signal → could be a game/tool; game default stands
      'a campsite adventure game', // bare "site" inside a word is NOT a signal
      'a game where you build a website empire tycoon', // hmm — contains "website"
    ]) {
      if (idea.includes('website')) continue; // documented: "website" always wins
      expect(inferProjectKindFromIdea(idea), idea).toBe('game');
    }
  });

  it('an idea that says both "game" and "website" resolves to website (the rarer, explicit ask)', () => {
    expect(inferProjectKindFromIdea('a game website')).toBe('website');
  });
});
