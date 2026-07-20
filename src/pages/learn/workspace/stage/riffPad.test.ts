import { describe, expect, it } from 'vitest';

import {
  emptyRiff,
  riffNoteCount,
  riffToSeedScore,
  seedRiffFromMetadata,
  seedToPlayableScore,
  toggleRiffCell,
  RIFF_DRUM_ROWS,
  RIFF_KEY,
  RIFF_MELODY_PITCHES,
  RIFF_STEPS,
  RIFF_TEMPO,
  RIFF_TITLE,
} from './riffPad';

describe('riff grid model', () => {
  it('starts empty: full-size rows, zero notes, nothing to seed', () => {
    const grid = emptyRiff();
    expect(grid.melody).toHaveLength(RIFF_MELODY_PITCHES.length);
    expect(grid.drums).toHaveLength(RIFF_DRUM_ROWS.length);
    expect(grid.melody.every((row) => row.length === RIFF_STEPS)).toBe(true);
    expect(riffNoteCount(grid)).toBe(0);
    expect(riffToSeedScore(grid)).toBeNull();
    expect(seedToPlayableScore(null)).toBeNull();
  });

  it('toggleRiffCell is immutable and reversible', () => {
    const grid = emptyRiff();
    const on = toggleRiffCell(grid, 'melody', 2, 5);
    expect(grid.melody[2][5]).toBe(false); // original untouched (React state)
    expect(on.melody[2][5]).toBe(true);
    expect(riffNoteCount(on)).toBe(1);
    const off = toggleRiffCell(on, 'melody', 2, 5);
    expect(off.melody[2][5]).toBe(false);
    expect(riffNoteCount(off)).toBe(0);
  });
});

describe('riffToSeedScore (the seedScore request field, §5A D-MS11)', () => {
  function tapped(): ReturnType<typeof emptyRiff> {
    let g = emptyRiff();
    g = toggleRiffCell(g, 'melody', 7, 0); // C4 @ step 0
    g = toggleRiffCell(g, 'melody', 5, 2); // E4 @ step 2
    g = toggleRiffCell(g, 'melody', 2, 4); // C5 @ step 4
    g = toggleRiffCell(g, 'drums', 2, 0); // kick @ step 0
    g = toggleRiffCell(g, 'drums', 0, 1); // hat  @ step 1
    return g;
  }

  it('maps grid cells to beat times + scale-locked pitches, melody then drums', () => {
    const seed = riffToSeedScore(tapped());
    expect(seed).not.toBeNull();
    expect(seed).toMatchObject({ tempo: RIFF_TEMPO, key: RIFF_KEY });
    expect(seed?.tracks).toHaveLength(2);
    expect(seed?.tracks[0]).toMatchObject({ instrument: 'guitar', role: 'lead' });
    expect(seed?.tracks[0].notes).toEqual([
      { time: 0, note: 'C4', duration: '8n' },
      { time: 1, note: 'E4', duration: '8n' },
      { time: 2, note: 'C5', duration: '8n' },
    ]);
    expect(seed?.tracks[1]).toMatchObject({ instrument: 'drums', role: 'percussion' });
    expect(seed?.tracks[1].notes).toEqual([
      { time: 0, note: 'kick', duration: '8n' },
      { time: 0.5, note: 'hat', duration: '8n' },
    ]);
  });

  it('carries NO free-text fields — a seed never needs the firewall', () => {
    const seed = riffToSeedScore(tapped());
    expect(seed && 'title' in seed).toBe(false);
    for (const track of seed?.tracks ?? []) {
      for (const note of track.notes) {
        expect('lyric' in note).toBe(false);
      }
    }
  });

  it('a drums-only riff seeds a single groove track', () => {
    let g = emptyRiff();
    g = toggleRiffCell(g, 'drums', 2, 0);
    const seed = riffToSeedScore(g);
    expect(seed?.tracks).toHaveLength(1);
    expect(seed?.tracks[0].instrument).toBe('drums');
  });
});

describe('seedToPlayableScore / seedRiffFromMetadata (frame 0)', () => {
  it('wraps a seed as a playable score for the shared engine', () => {
    let g = emptyRiff();
    g = toggleRiffCell(g, 'melody', 0, 0);
    const playable = seedToPlayableScore(riffToSeedScore(g));
    expect(playable).toMatchObject({ title: RIFF_TITLE, tempo: RIFF_TEMPO, key: RIFF_KEY });
    expect(playable?.tracks[0].notes[0].note).toBe(RIFF_MELODY_PITCHES[0]);
  });

  it('parses a persisted metadata seed and rejects junk shapes', () => {
    let g = emptyRiff();
    g = toggleRiffCell(g, 'melody', 1, 3);
    const seed = riffToSeedScore(g);
    expect(seedRiffFromMetadata(seed)).toEqual(seed);
    expect(seedRiffFromMetadata(null)).toBeNull();
    expect(seedRiffFromMetadata('nope')).toBeNull();
    expect(seedRiffFromMetadata({ tracks: [] })).toBeNull();
    expect(seedRiffFromMetadata({ tracks: [{ notes: [] }] })).toBeNull();
  });
});
