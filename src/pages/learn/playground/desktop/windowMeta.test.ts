// Kind-derived window labels (creative-code-studio-website-prd D-WEB-21). The
// display layer flips per project kind while the stable PgWindowId is unchanged:
// the RUNNER ('game') reads "Website", the GUIDE ('help') reads "Website Guide"
// vs "Game Guide". Everything else is kind-invariant.

import { BookOpen, Globe } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { WINDOW_META, windowDisplay } from './windowMeta';

describe('windowDisplay: kind-aware Guide label (D-WEB-21)', () => {
  it('the Guide reads "Game Guide" on a game project (default kind)', () => {
    expect(windowDisplay('help', 'game').title).toBe('Game Guide');
    expect(windowDisplay('help').title).toBe('Game Guide'); // kind defaults to game
  });

  it('the Guide reads "Website Guide" on a website project', () => {
    expect(windowDisplay('help', 'website').title).toBe('Website Guide');
  });

  it('keeps the Guide icon (BookOpen) for both kinds', () => {
    expect(windowDisplay('help', 'game').Icon).toBe(BookOpen);
    expect(windowDisplay('help', 'website').Icon).toBe(BookOpen);
    expect(windowDisplay('help', 'website').Icon).toBe(WINDOW_META.help.Icon);
  });
});

describe('windowDisplay: runner label unchanged by the Guide change', () => {
  it('the runner still reads "Website" + globe on a website project', () => {
    expect(windowDisplay('game', 'website')).toEqual({ title: 'Website', Icon: Globe });
  });

  it('a game runner + every other window keep their base metadata', () => {
    expect(windowDisplay('game', 'game')).toEqual(WINDOW_META.game);
    expect(windowDisplay('code', 'website')).toEqual(WINDOW_META.code);
    expect(windowDisplay('db', 'website')).toEqual(WINDOW_META.db);
  });
});
