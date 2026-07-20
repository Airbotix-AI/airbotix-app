// Riff Pad model (music-stage-prd §5A D-MS11): the kid's OWN 16-step motif,
// tapped on a scale-locked grid — 0⭐, no AI — then sent as the `seedScore`
// the finished song must keep recognisable. Pure data + conversions here;
// the component is RiffPad.tsx and the request field rides musicScoreApi.
//
// Scale lock: melody rows are C major PENTATONIC (C4–E5). Every combination
// of pentatonic notes sounds consonant — the grid is the first piece of music
// theory the kid absorbs without being told ("you can't hit a wrong note").

import type { MusicScore, ScoreNote, ScoreTrack } from './scoreTypes';

export const RIFF_STEPS = 16;
/** One grid step = an eighth note (0.5 beat) — 16 steps = 2 bars of 4/4. */
export const RIFF_STEP_BEATS = 0.5;
export const RIFF_STEP_DURATION = '8n';
export const RIFF_TEMPO = 100;
export const RIFF_KEY = 'C major';
/** Playable-preview title (never sent to the backend — seeds carry no text). */
export const RIFF_TITLE = 'My riff';

/** Melody rows top → bottom: C major pentatonic, high to low (8 rows). */
export const RIFF_MELODY_PITCHES = ['E5', 'D5', 'C5', 'A4', 'G4', 'E4', 'D4', 'C4'] as const;

export interface RiffDrumRow {
  hit: 'hat' | 'snare' | 'kick';
  label: string;
  emoji: string;
}
/** Drum rows top → bottom, classic drum-machine order. */
export const RIFF_DRUM_ROWS: RiffDrumRow[] = [
  { hit: 'hat', label: 'Hat', emoji: '🎩' },
  { hit: 'snare', label: 'Snare', emoji: '👏' },
  { hit: 'kick', label: 'Kick', emoji: '🦶' },
];

export type RiffSection = 'melody' | 'drums';

export interface RiffGrid {
  /** [RIFF_MELODY_PITCHES.length][RIFF_STEPS] */
  melody: boolean[][];
  /** [RIFF_DRUM_ROWS.length][RIFF_STEPS] */
  drums: boolean[][];
}

/**
 * The request-side seed shape (backend `seedScoreShape`): a mini score with
 * machine-shaped fields only — no title/genre/lyric free text, which is why
 * the seed needs no firewall pass (music-stage §5A OQ-7).
 */
export interface SeedScore {
  tempo?: number;
  key?: string;
  tracks: ScoreTrack[];
}

function emptyRows(rows: number): boolean[][] {
  return Array.from({ length: rows }, () => Array.from({ length: RIFF_STEPS }, () => false));
}

export function emptyRiff(): RiffGrid {
  return { melody: emptyRows(RIFF_MELODY_PITCHES.length), drums: emptyRows(RIFF_DRUM_ROWS.length) };
}

/** Immutable cell toggle — the grid is React state. */
export function toggleRiffCell(
  grid: RiffGrid,
  section: RiffSection,
  row: number,
  step: number,
): RiffGrid {
  const next = grid[section].map((r, i) =>
    i === row ? r.map((on, s) => (s === step ? !on : on)) : r,
  );
  return section === 'melody' ? { ...grid, melody: next } : { ...grid, drums: next };
}

export function riffNoteCount(grid: RiffGrid): number {
  const count = (rows: boolean[][]) =>
    rows.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  return count(grid.melody) + count(grid.drums);
}

function rowNotes(rows: boolean[][], noteAt: (row: number) => string): ScoreNote[] {
  const notes: ScoreNote[] = [];
  for (let step = 0; step < RIFF_STEPS; step += 1) {
    for (let row = 0; row < rows.length; row += 1) {
      if (rows[row][step]) {
        notes.push({ time: step * RIFF_STEP_BEATS, note: noteAt(row), duration: RIFF_STEP_DURATION });
      }
    }
  }
  return notes;
}

/**
 * Grid → the `seedScore` request field. Melody lands on the guitar/lead slot
 * (the stage's leftmost hero); drum steps become the groove foundation.
 * Returns null for an empty grid — nothing to seed.
 */
export function riffToSeedScore(grid: RiffGrid): SeedScore | null {
  const melody = rowNotes(grid.melody, (row) => RIFF_MELODY_PITCHES[row]);
  const drums = rowNotes(grid.drums, (row) => RIFF_DRUM_ROWS[row].hit);
  const tracks: ScoreTrack[] = [];
  if (melody.length) tracks.push({ instrument: 'guitar', role: 'lead', notes: melody });
  if (drums.length) tracks.push({ instrument: 'drums', role: 'percussion', notes: drums });
  if (!tracks.length) return null;
  return { tempo: RIFF_TEMPO, key: RIFF_KEY, tracks };
}

/**
 * A seed as a playable MusicScore for `useScorePlayback` — powers the pad's
 * 0⭐ loop audition AND the permanent 🎹 frame 0 ("hear just mine") compare.
 */
export function seedToPlayableScore(seed: SeedScore | null): MusicScore | null {
  if (!seed || !seed.tracks.length) return null;
  return {
    title: RIFF_TITLE,
    tempo: seed.tempo ?? RIFF_TEMPO,
    key: seed.key ?? RIFF_KEY,
    tracks: seed.tracks,
  };
}

/**
 * Parse a persisted frame-0 seed off session-message metadata (the backend
 * echoes `seedScore` there — llm.service musicScore). Defensive: metadata is
 * server JSON, not a typed contract on this side.
 */
export function seedRiffFromMetadata(value: unknown): SeedScore | null {
  if (!value || typeof value !== 'object') return null;
  const tracks = (value as { tracks?: unknown }).tracks;
  if (!Array.isArray(tracks) || tracks.length === 0) return null;
  const shaped = tracks.every(
    (t) =>
      t &&
      typeof t === 'object' &&
      Array.isArray((t as { notes?: unknown }).notes) &&
      ((t as { notes: unknown[] }).notes.length > 0),
  );
  return shaped ? (value as SeedScore) : null;
}
