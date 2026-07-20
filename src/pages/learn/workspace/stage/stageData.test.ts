import { describe, expect, it } from 'vitest';

import { SUPPORTED_INSTRUMENTS, type MusicScore } from './scoreTypes';
import {
  GENRES,
  INSTRUMENT_STYLES,
  MAX_DIFF_CHIPS,
  RIFF_FRAME_LABEL,
  STAGE_SLOTS,
  STYLE_NONE,
  SUGGESTION_CARDS,
  buildAiBubble,
  buildScoreDiff,
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

// ── §5A D-MS12: the visible-theory layer ────────────────────────

describe('buildScoreDiff (musical diff chips)', () => {
  const base = (tracks: MusicScore['tracks'], tempo = 112, key = 'C major'): MusicScore => ({
    title: 'T',
    tempo,
    key,
    tracks,
  });
  const notes = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ time: i * 0.5, note: 'C4', duration: '8n' }));

  it('reports a tempo change with a kid-level BPM explanation', () => {
    const chips = buildScoreDiff(base([], 112), base([], 120));
    expect(chips).toHaveLength(1);
    expect(chips[0].label).toBe('🕒 112→120 BPM');
    expect(chips[0].explain).toContain('beats per minute');
  });

  it('reports key changes, joined instruments and density stories', () => {
    const prev = base([{ instrument: 'drums', role: 'percussion', notes: notes(16) }]);
    const next = base(
      [
        { instrument: 'drums', role: 'percussion', notes: notes(24) },
        { instrument: 'guitar', role: 'lead', notes: notes(8) },
      ],
      112,
      'A minor',
    );
    const labels = buildScoreDiff(prev, next).map((c) => c.label);
    expect(labels).toContain('🎼 C major → A minor');
    expect(labels).toContain('➕ 🎸 Guitar joined');
    expect(labels).toContain('🥁 Drums busier (16→24 notes)');
  });

  it('reports a removed instrument and calmer density', () => {
    const prev = base([
      { instrument: 'drums', role: 'percussion', notes: notes(24) },
      { instrument: 'piano', role: 'harmony', notes: notes(16) },
    ]);
    const next = base([{ instrument: 'drums', role: 'percussion', notes: notes(16) }]);
    const labels = buildScoreDiff(prev, next).map((c) => c.label);
    expect(labels).toContain('🥁 Drums calmer (24→16 notes)');
    expect(labels).toContain('➖ 🎹 Piano left');
  });

  it('ignores arrangement noise below the density threshold and returns [] for identical metadata', () => {
    const prev = base([{ instrument: 'drums', role: 'percussion', notes: notes(30) }]);
    const next = base([{ instrument: 'drums', role: 'percussion', notes: notes(31) }]);
    expect(buildScoreDiff(prev, next)).toEqual([]);
  });

  it('caps the row at MAX_DIFF_CHIPS', () => {
    const prev = base([], 112, 'C major');
    const next = base(
      [
        { instrument: 'drums', role: 'percussion', notes: notes(8) },
        { instrument: 'guitar', role: 'lead', notes: notes(8) },
        { instrument: 'bass', role: 'rhythm', notes: notes(8) },
        { instrument: 'piano', role: 'harmony', notes: notes(8) },
        { instrument: 'keyboard', role: 'harmony', notes: notes(8) },
      ],
      140,
      'A minor',
    );
    expect(buildScoreDiff(prev, next)).toHaveLength(MAX_DIFF_CHIPS);
  });
});

describe('buildAiBubble — why-layer + seeded story (§5A D-MS12/D-MS11)', () => {
  it('every modifier bubble teaches the WHY behind the change', () => {
    for (const card of SUGGESTION_CARDS) {
      const bubble = buildAiBubble({ score: SCORE, modifier: card.key, isFirst: false });
      expect(bubble).toContain('Why it works:');
    }
  });

  it('a seeded first take credits the kid’s riff and points at frame 0', () => {
    const bubble = buildAiBubble({ score: SCORE, isFirst: true, seeded: true });
    expect(bubble).toContain('YOUR riff');
    expect(bubble).toContain(RIFF_FRAME_LABEL);
  });
});
