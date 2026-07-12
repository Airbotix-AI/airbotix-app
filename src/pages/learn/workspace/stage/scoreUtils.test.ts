import { describe, expect, it } from 'vitest';

import type { MusicScore } from './scoreTypes';
import {
  fmtTime,
  isDrumNote,
  noteToMidi,
  parseDurationBeats,
  scoreDurationSeconds,
  stepIndexAt,
} from './scoreUtils';

describe('parseDurationBeats', () => {
  it('maps Tone.js notation to beats', () => {
    expect(parseDurationBeats('1n')).toBe(4);
    expect(parseDurationBeats('2n')).toBe(2);
    expect(parseDurationBeats('4n')).toBe(1);
    expect(parseDurationBeats('8n')).toBe(0.5);
    expect(parseDurationBeats('16n')).toBe(0.25);
  });

  it('falls back to 0.5 beats on junk', () => {
    expect(parseDurationBeats('nope')).toBe(0.5);
  });
});

describe('noteToMidi', () => {
  it('parses scientific pitch with accidentals', () => {
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('C#4')).toBe(61);
    expect(noteToMidi('Db4')).toBe(61);
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('E1')).toBe(28);
  });

  it('defaults to middle C for drum hits / junk', () => {
    expect(noteToMidi('kick')).toBe(60);
  });
});

describe('isDrumNote', () => {
  it('recognises the six drum hit names only', () => {
    for (const hit of ['kick', 'snare', 'hat', 'ride', 'clap', 'tom']) {
      expect(isDrumNote(hit)).toBe(true);
    }
    expect(isDrumNote('C4')).toBe(false);
  });
});

describe('scoreDurationSeconds', () => {
  it('uses the latest note end across tracks, converted at the score tempo', () => {
    const score: MusicScore = {
      title: 'T',
      tempo: 120,
      key: 'C major',
      tracks: [
        { instrument: 'piano', notes: [{ time: 0, note: 'C4', duration: '4n' }] },
        { instrument: 'drums', notes: [{ time: 7, note: 'kick', duration: '4n' }] },
      ],
    };
    // last end = beat 8 → at 120 BPM that is 4 seconds
    expect(scoreDurationSeconds(score)).toBe(4);
  });
});

describe('stepIndexAt', () => {
  it('walks 16 sixteenth-note steps per bar and wraps', () => {
    expect(stepIndexAt(0, 120)).toBe(0);
    expect(stepIndexAt(0.125, 120)).toBe(1); // one 16th at 120 BPM = 0.125s
    expect(stepIndexAt(2, 120)).toBe(0); // exactly one bar later
    expect(stepIndexAt(2.125, 120)).toBe(1);
  });

  it('is safe on zero tempo / negative position', () => {
    expect(stepIndexAt(1, 0)).toBe(0);
    expect(stepIndexAt(-1, 120)).toBe(0);
  });
});

describe('fmtTime', () => {
  it('formats m:ss', () => {
    expect(fmtTime(0)).toBe('0:00');
    expect(fmtTime(65)).toBe('1:05');
    expect(fmtTime(NaN)).toBe('0:00');
  });
});
