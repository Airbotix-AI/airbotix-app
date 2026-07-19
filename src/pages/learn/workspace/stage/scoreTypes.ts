// Canonical types for the `POST /llm/music-score` JSON contract
// (music-workspace-tech-spec §5.3 · music-stage-prd §6.2). The score carries
// STRUCTURE only — instrument timbre/style is a frontend concern
// (INSTRUMENT_STYLES in stageData.ts) and never enters the score JSON.

/** The 14 instrument kinds the LLM may emit (SUPPORTED_INSTRUMENTS). */
export const SUPPORTED_INSTRUMENTS = [
  'lead_vocals',
  'backing_vocals',
  'drums',
  'bass',
  'guitar',
  'keyboard',
  'percussion',
  'synth',
  'strings',
  'piano',
  'brass',
  'pad',
  'flute',
  'other',
] as const;
export type InstrumentKind = (typeof SUPPORTED_INSTRUMENTS)[number];

export type TrackRole = 'lead' | 'rhythm' | 'harmony' | 'percussion' | 'fx';

/** Drum-track note names ("note" holds a hit name instead of a pitch). */
export const DRUM_HITS = ['kick', 'snare', 'hat', 'ride', 'clap', 'tom'] as const;
export type DrumHit = (typeof DRUM_HITS)[number];

export interface ScoreNote {
  /** Beats from 0 — quarter note = 1.0. */
  time: number;
  /** Scientific pitch ("C4", "F#3") or a DrumHit name on drum/percussion tracks. */
  note: string;
  /** Tone.js duration: "1n" | "2n" | "4n" | "8n" | "16n". */
  duration: string;
  lyric?: string;
  /** Optional dynamics 0–1 (music-stage-prd §6.2). */
  velocity?: number;
}

export interface ScoreTrack {
  instrument: InstrumentKind;
  role?: TrackRole;
  notes: ScoreNote[];
}

export interface MusicScore {
  /** Kid-friendly song title picked by the LLM (≤14 chars). */
  title: string;
  /** BPM, 60–200. */
  tempo: number;
  key: string;
  genre?: string;
  tracks: ScoreTrack[];
}

/** Octave-shift bounds for the lane Edit drawer (track-editing PRD §3-A). */
export const TRACK_OCTAVE_MIN = -2;
export const TRACK_OCTAVE_MAX = 2;

/**
 * The kid's 0⭐ per-instrument tweaks from the lane Edit drawer — keyed by
 * INSTRUMENT KIND like mute/solo/volume so they survive version switches even
 * when the LLM reorders tracks (music-stage-prd AC-7).
 */
export interface TrackTweak {
  /** Custom lane display name (metadata only). */
  name?: string;
  /** Whole-octave pitch shift, TRACK_OCTAVE_MIN..TRACK_OCTAVE_MAX; drums ignore it. */
  octave?: number;
  /** Stereo pan −1 (left) .. 1 (right). */
  pan?: number;
}

export type StageTweaks = Partial<Record<InstrumentKind, TrackTweak>>;

export interface LaneColor {
  /** Accent — a K-12 brand token hex (mirrors tailwind.config.js `brand`). */
  hex: string;
  /** Fill — the matching `wash` token hex. */
  soft: string;
}

// K-12 brand palette (single source: tailwind.config.js). Kept as constants
// because piano-roll note blocks are colored via inline style per instrument.
const CORAL: LaneColor = { hex: '#FF7A66', soft: '#FFEFE9' };
const BUBBLEGUM: LaneColor = { hex: '#FF6BA9', soft: '#FFEAF3' };
const SUNSHINE: LaneColor = { hex: '#FFD43B', soft: '#FFF7D6' };
const SKY: LaneColor = { hex: '#5DAEFF', soft: '#E8F2FF' };
const MINT: LaneColor = { hex: '#3DD9A9', soft: '#DCF6EC' };
const SLATE: LaneColor = { hex: '#6B6478', soft: '#C7C0D5' };

export interface InstrumentMeta {
  emoji: string;
  label: string;
  color: LaneColor;
}

export const INSTRUMENT_META: Record<InstrumentKind, InstrumentMeta> = {
  lead_vocals:    { emoji: '🎤', label: 'Lead Vocals',    color: CORAL },
  backing_vocals: { emoji: '🎙️', label: 'Backing Vocals', color: BUBBLEGUM },
  drums:          { emoji: '🥁', label: 'Drums',          color: MINT },
  bass:           { emoji: '🎻', label: 'Bass',           color: SKY },
  guitar:         { emoji: '🎸', label: 'Guitar',         color: BUBBLEGUM },
  keyboard:       { emoji: '🎛️', label: 'Keyboard',       color: SUNSHINE },
  percussion:     { emoji: '🪘', label: 'Percussion',     color: MINT },
  synth:          { emoji: '🎚', label: 'Synth',          color: SKY },
  strings:        { emoji: '🎻', label: 'Strings',        color: SUNSHINE },
  piano:          { emoji: '🎹', label: 'Piano',          color: CORAL },
  brass:          { emoji: '🎺', label: 'Brass',          color: SUNSHINE },
  pad:            { emoji: '☁️', label: 'Pad',            color: SKY },
  flute:          { emoji: '🪈', label: 'Flute',          color: MINT },
  other:          { emoji: '🎵', label: 'Track',          color: SLATE },
};
