import { describe, expect, it } from 'vitest';

import { SUPPORTED_INSTRUMENTS, type MusicScore } from './scoreTypes';
import {
  GENRES,
  INSTRUMENT_STYLES,
  STAGE_SLOTS,
  STYLE_NONE,
  SUGGESTION_CARDS,
  buildAiBubble,
  marqueeFor,
  stageSlotFor,
  styleOf,
} from './stageData';

const SCORE: MusicScore = {
  title: 'Space Pup',
  tempo: 118,
  key: 'D minor',
  genre: 'rock',
  tracks: [],
};

describe('stageSlotFor', () => {
  it('maps every supported instrument onto one of the 5 stage slots', () => {
    const slotIds = new Set(STAGE_SLOTS.map((s) => s.id));
    for (const instrument of SUPPORTED_INSTRUMENTS) {
      expect(slotIds.has(stageSlotFor(instrument))).toBe(true);
    }
  });

  it('keeps the PRD anchor mappings', () => {
    expect(stageSlotFor('guitar')).toBe('guitar');
    expect(stageSlotFor('bass')).toBe('bass');
    expect(stageSlotFor('percussion')).toBe('drums');
    expect(stageSlotFor('strings')).toBe('piano');
    expect(stageSlotFor('synth')).toBe('keys');
  });
});

describe('instrument styles', () => {
  it('offers 3 styles + None per stage slot (PRD §5)', () => {
    for (const slot of STAGE_SLOTS) {
      const styles = INSTRUMENT_STYLES[slot.id];
      expect(styles).toHaveLength(4);
      expect(styles[styles.length - 1].id).toBe(STYLE_NONE);
      expect(styles[styles.length - 1].gmProgram).toBeNull();
    }
  });

  it('genre presets only reference real style ids', () => {
    for (const genre of GENRES) {
      for (const slot of STAGE_SLOTS) {
        const styleId = genre.presetStyles[slot.id];
        expect(styleOf(slot.id, styleId), `${genre.id}/${slot.id}/${styleId}`).not.toBeNull();
        expect(styleId).not.toBe(STYLE_NONE);
      }
    }
  });
});

describe('suggestion cards', () => {
  it('ships the 5 fixed cards with the CANONICAL backend keys (PRD §3.4)', () => {
    // Cross-repo contract: must equal platform-backend SCORE_MODIFIER_KEYS —
    // the DTO enum-validates the modifier, so any drift here 400s the card.
    expect(SUGGESTION_CARDS.map((c) => c.key)).toEqual([
      'energy+1',
      'energy-1',
      'drums+',
      'guitar_solo',
      'surprise',
    ]);
    // only "surprise" starts from a fresh arrangement
    expect(SUGGESTION_CARDS.filter((c) => c.freshSeed).map((c) => c.key)).toEqual(['surprise']);
  });
});

describe('buildAiBubble', () => {
  it('includes title, key, BPM and genre from score metadata', () => {
    const text = buildAiBubble({ score: SCORE, isFirst: true });
    expect(text).toContain('Space Pup');
    expect(text).toContain('D minor');
    expect(text).toContain('118 BPM');
    expect(text).toContain('rock');
  });

  it('explains the change when a modifier produced the version', () => {
    const text = buildAiBubble({ score: SCORE, modifier: 'energy+1', isFirst: false });
    expect(text).toContain('Space Pup');
    expect(text.toLowerCase()).toContain('tempo');
  });
});

describe('marqueeFor', () => {
  it('matches the score genre text loosely', () => {
    expect(marqueeFor('Lo-Fi hip hop', 'rock')).toBe('LO-FI ☾ CHILL');
    expect(marqueeFor('Space electro', 'rock')).toBe('SPACE ▲ ODYSSEY');
  });

  it('falls back to the selected genre pill', () => {
    expect(marqueeFor(undefined, 'pop')).toBe('POP ✦ PARTY');
    expect(marqueeFor('baroque', 'rock')).toBe('ROCK ★ LIVE');
  });
});
