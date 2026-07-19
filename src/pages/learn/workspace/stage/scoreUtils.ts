// Pure score math shared by the Stage playback hook, lanes and tests.

import { DRUM_HITS, type MusicScore } from './scoreTypes';

export const STAGE_STEPS = 16; // one bar of 16th-note walk lights
const BEATS_PER_STEP = 0.25;

/** Tone.js duration → beats ("1n"=4, "2n"=2, "4n"=1, "8n"=0.5, "16n"=0.25). */
export function parseDurationBeats(d: string): number {
  const m = d.match(/^(\d+)n$/);
  if (m) return 4 / Number(m[1]);
  const f = parseFloat(d);
  return Number.isNaN(f) ? 0.5 : f;
}

/** "C4" → 60, "C#4" → 61, "Db4" → 61. Unknown strings → 60. */
export function noteToMidi(note: string): number {
  const m = note.match(/^([A-Ga-g])([#b]?)(\d+)$/);
  if (!m) return 60;
  const semis: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let n = semis[m[1].toUpperCase()] + 12 * (Number(m[3]) + 1);
  if (m[2] === '#') n += 1;
  if (m[2] === 'b') n -= 1;
  return n;
}

export function isDrumNote(note: string): boolean {
  return (DRUM_HITS as readonly string[]).includes(note);
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** 60 → "C4", 61 → "C#4" (sharps only — the LLM contract never emits flats). */
export function midiToNote(midi: number): string {
  const clamped = Math.max(0, Math.min(127, Math.round(midi)));
  return `${NOTE_NAMES[clamped % 12]}${Math.floor(clamped / 12) - 1}`;
}

/** Pitch shifted by semitones; drum hit names pass through untouched. */
export function transposeNote(note: string, semitones: number): string {
  if (semitones === 0 || isDrumNote(note)) return note;
  return midiToNote(noteToMidi(note) + semitones);
}

/** Song length in seconds: latest note end across all tracks, beats → seconds. */
export function scoreDurationSeconds(score: MusicScore): number {
  let maxBeat = 0;
  for (const t of score.tracks) {
    for (const n of t.notes) {
      const end = n.time + parseDurationBeats(n.duration);
      if (end > maxBeat) maxBeat = end;
    }
  }
  return (maxBeat * 60) / score.tempo;
}

/** 16-step walk-light index for a transport position (wraps per bar). */
export function stepIndexAt(positionSeconds: number, tempo: number): number {
  if (tempo <= 0 || positionSeconds < 0) return 0;
  const stepSeconds = (60 / tempo) * BEATS_PER_STEP;
  return Math.floor(positionSeconds / stepSeconds) % STAGE_STEPS;
}

export function fmtTime(s: number): string {
  if (!isFinite(s) || s <= 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
