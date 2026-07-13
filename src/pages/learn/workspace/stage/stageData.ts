// Music Stage constants + kid-facing copy (music-stage-prd.md §2–§5).
// Everything here is a frontend concern: stage slots, 0⭐ instrument styles
// (GM programs wired by the smplr task, PRD §6.1), genres, suggestion cards
// and the AI-bubble template. None of it enters the score JSON.

import type { InstrumentKind, MusicScore } from './scoreTypes';

/** Stars charged per generation / suggestion-card iteration (parent PRD §4). */
export const MUSIC_GENERATION_COST_STARS = 3;

// ─── Stage slots (5 fixed positions, left → right per PRD §3.1) ─────────────

export type StageSlotId = 'guitar' | 'bass' | 'drums' | 'piano' | 'keys';

export interface StageSlot {
  id: StageSlotId;
  emoji: string;
  label: string;
}

export const STAGE_SLOTS: StageSlot[] = [
  { id: 'guitar', emoji: '🎸', label: 'Guitar' },
  { id: 'bass',   emoji: '🎻', label: 'Bass' },
  { id: 'drums',  emoji: '🥁', label: 'Drums' },
  { id: 'piano',  emoji: '🎹', label: 'Piano' },
  { id: 'keys',   emoji: '🎛️', label: 'Keyboard' },
];

// Extra tracks (percussion, strings…) pulse the NEAREST stage instrument
// (PRD §4 — every generated track still gets its own lane).
const SLOT_FOR_INSTRUMENT: Record<InstrumentKind, StageSlotId> = {
  guitar: 'guitar',
  brass: 'guitar',
  bass: 'bass',
  drums: 'drums',
  percussion: 'drums',
  piano: 'piano',
  strings: 'piano',
  flute: 'piano',
  lead_vocals: 'piano',
  keyboard: 'keys',
  synth: 'keys',
  pad: 'keys',
  backing_vocals: 'keys',
  other: 'keys',
};

export function stageSlotFor(instrument: InstrumentKind): StageSlotId {
  return SLOT_FOR_INSTRUMENT[instrument] ?? 'keys';
}

// ─── Instrument styles (0⭐ timbre layer, PRD §5: 3 per instrument + None) ──

export const STYLE_NONE = 'none';

export interface InstrumentStyle {
  id: string;
  label: string;
  emoji: string;
  /** General MIDI program for smplr (PRD §6.1); null = None/silence. */
  gmProgram: number | null;
}

const NONE_STYLE: InstrumentStyle = { id: STYLE_NONE, label: 'None', emoji: '🚫', gmProgram: null };

export const INSTRUMENT_STYLES: Record<StageSlotId, InstrumentStyle[]> = {
  guitar: [
    { id: 'acoustic', label: 'Acoustic',        emoji: '🪵', gmProgram: 25 },
    { id: 'crunch',   label: 'Electric Crunch', emoji: '⚡', gmProgram: 29 },
    { id: 'funk',     label: 'Clean Funk',      emoji: '🕺', gmProgram: 27 },
    NONE_STYLE,
  ],
  bass: [
    { id: 'round',  label: 'Round & Warm', emoji: '🫧', gmProgram: 33 },
    { id: 'picked', label: 'Picked Rock',  emoji: '🎯', gmProgram: 34 },
    { id: 'sub',    label: 'Deep Sub',     emoji: '🌊', gmProgram: 39 },
    NONE_STYLE,
  ],
  drums: [
    { id: 'rockkit', label: 'Rock Kit',    emoji: '🔥', gmProgram: 0 },
    { id: 'lofikit', label: 'Lo-fi Kit',   emoji: '☕', gmProgram: 8 },
    { id: 'electro', label: 'Electro Kit', emoji: '🤖', gmProgram: 24 },
    NONE_STYLE,
  ],
  piano: [
    { id: 'grand',    label: 'Grand',     emoji: '🎩', gmProgram: 1 },
    { id: 'musicbox', label: 'Music Box', emoji: '🎠', gmProgram: 11 },
    { id: 'syntharp', label: 'Synth Arp', emoji: '✨', gmProgram: 82 },
    NONE_STYLE,
  ],
  keys: [
    { id: 'organ', label: 'Gritty Organ', emoji: '🌶️', gmProgram: 17 },
    { id: 'ep',    label: 'Dreamy EP',    emoji: '💭', gmProgram: 5 },
    { id: 'pad',   label: 'Cloud Pad',    emoji: '☁️', gmProgram: 90 },
    NONE_STYLE,
  ],
};

export type StageStyles = Record<StageSlotId, string>;

export function styleOf(slot: StageSlotId, styleId: string): InstrumentStyle | null {
  return INSTRUMENT_STYLES[slot].find((s) => s.id === styleId) ?? null;
}

// ─── Genres ──────────────────────────────────────────────────────────────────

export type GenreId = 'rock' | 'pop' | 'lofi' | 'space';

export interface GenreMeta {
  id: GenreId;
  label: string;
  /** Human genre word sent to the backend as `options.genre`. */
  promptLabel: string;
  /** Neon marquee text (PRD §3.1). */
  marquee: string;
  /** Style preset the AI "picks" after the first generation (PRD §5). */
  presetStyles: StageStyles;
}

export const GENRES: GenreMeta[] = [
  {
    id: 'rock', label: '🤘 Rock', promptLabel: 'Rock', marquee: 'ROCK ★ LIVE',
    presetStyles: { guitar: 'crunch', bass: 'picked', drums: 'rockkit', piano: 'grand', keys: 'organ' },
  },
  {
    id: 'pop', label: '🎉 Pop', promptLabel: 'Pop', marquee: 'POP ✦ PARTY',
    presetStyles: { guitar: 'funk', bass: 'round', drums: 'electro', piano: 'syntharp', keys: 'ep' },
  },
  {
    id: 'lofi', label: '☕ Lo-fi', promptLabel: 'Lo-fi', marquee: 'LO-FI ☾ CHILL',
    presetStyles: { guitar: 'acoustic', bass: 'round', drums: 'lofikit', piano: 'grand', keys: 'ep' },
  },
  {
    id: 'space', label: '🚀 Space', promptLabel: 'Space', marquee: 'SPACE ▲ ODYSSEY',
    presetStyles: { guitar: 'crunch', bass: 'sub', drums: 'electro', piano: 'syntharp', keys: 'pad' },
  },
];

export const GENRE_BY_ID: Record<GenreId, GenreMeta> = Object.fromEntries(
  GENRES.map((g) => [g.id, g]),
) as Record<GenreId, GenreMeta>;

export const EMPTY_MARQUEE = 'YOUR BAND AWAITS';

/**
 * Neon marquee for a generated song: match the score's own genre text first
 * (e.g. "lo-fi hip hop" → LO-FI ☾ CHILL), else the kid's current genre pill.
 */
export function marqueeFor(scoreGenre: string | undefined, fallback: GenreId): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  const fromScore = scoreGenre
    ? GENRES.find((g) => norm(scoreGenre).includes(norm(g.id)) || norm(scoreGenre).includes(norm(g.promptLabel)))
    : undefined;
  return (fromScore ?? GENRE_BY_ID[fallback]).marquee;
}

// ─── Composer bar ────────────────────────────────────────────────────────────

export const PROMPT_MAX_LENGTH = 120;
export const PROMPT_PLACEHOLDER = 'e.g. A song about a space puppy adventure — make it epic!';

/** Inspiration chips (mockup). The emoji stays in the chip, not the prompt. */
export const IDEA_CHIPS: { emoji: string; prompt: string }[] = [
  { emoji: '🚀', prompt: 'A space puppy going on a big adventure' },
  { emoji: '🎂', prompt: 'A birthday song for my little sister' },
  { emoji: '🐉', prompt: 'A brave knight battling a fire dragon' },
  { emoji: '🌊', prompt: 'A sleepy lullaby under the sea' },
  { emoji: '🏆', prompt: 'A victory song — I just won the game!' },
  { emoji: '👾', prompt: 'Background music for a pixel game level' },
];

// ─── Suggestion cards (3⭐ conversational iteration, PRD §3.4) ───────────────

/**
 * Structured modifier key sent to `POST /llm/music-score` — never free text.
 * CANONICAL cross-repo enum (music-stage-prd §3.4): must match the backend's
 * `SCORE_MODIFIER_KEYS` (platform-backend `src/llm/music-score.ts`) exactly —
 * the DTO enum-validates it and the audit `modifier` field carries it verbatim.
 */
export type SuggestionKey = 'energy+1' | 'energy-1' | 'drums+' | 'guitar_solo' | 'surprise';

export interface SuggestionCard {
  key: SuggestionKey;
  label: string;
  /** Short version-pill tag (PRD §3.5). */
  tag: string;
  /** Surprise re-rolls the whole arrangement: same prompt, no existingScore. */
  freshSeed: boolean;
}

export const SUGGESTION_CARDS: SuggestionCard[] = [
  { key: 'energy+1',    label: '⚡ More hype',       tag: 'Hype+',     freshSeed: false },
  { key: 'energy-1',    label: '🌙 Softer & calmer', tag: 'Calm+',     freshSeed: false },
  { key: 'drums+',      label: '🥁 Bigger drums',    tag: 'Big drums', freshSeed: false },
  { key: 'guitar_solo', label: '🎸 Guitar solo',     tag: 'Solo',      freshSeed: false },
  { key: 'surprise',    label: '🎲 Surprise me',     tag: 'Surprise',  freshSeed: true },
];

export const FIRST_VERSION_TAG = 'First take';
export const REWRITE_VERSION_TAG = 'Rewrite';

// ─── Kid-facing copy (AI bubble, overlay, errors) ────────────────────────────

export const INITIAL_BUBBLE =
  "I'm your band conductor! Describe your song up top and I'll compose it — " +
  'then you can ask me to change it, or give any instrument a new sound.';

export const EMPTY_STAGE_HINT = 'Your band is waiting for a song 🎤';
export const EMPTY_STAGE_HINT_SUB = 'Describe one up top and let the AI get to work!';

export const COMPOSING_TITLE = '✨ The AI is composing your song…';
export const FIRST_COMPOSE_SUBTITLE =
  'Hearing your idea — picking a key, writing the melody, laying the beat';

export function iterationSubtitle(tag: string): string {
  return `Remixing it your way: ${tag}`;
}

export const COMPOSE_FAILED_BUBBLE =
  'Hmm, my song machine hiccupped and no Stars were charged. Want me to try again?';

export const SAVE_FAILED_BUBBLE =
  "I couldn't save that one to My Works just now — your song is still right here, try 💾 again!";

// 🎧 Make it real (§2 step ⑥) — the score becomes an actual audio track.
export const REAL_SONG_DONE_BUBBLE =
  "🎧 I recorded your song for real! It's in the Mixer below — press play and hear it.";

export const REAL_SONG_FAILED_BUBBLE =
  "The recording studio hiccupped and no Stars were charged. Your song is safe — try 🎧 again!";

export function outOfStarsBubble(balance: number): string {
  return (
    `⭐ Not enough Stars — composing costs ${MUSIC_GENERATION_COST_STARS}⭐ and you have ${balance}⭐. ` +
    'Finish a mission to earn more!'
  );
}

const MODIFIER_CHANGE_TEXT: Record<SuggestionKey, string> = {
  'energy+1': 'I pushed the tempo up and packed the beat tighter — energy up! ⚡',
  'energy-1': 'I slowed it down and gave the music more room to breathe 🌙',
  'drums+': 'I made the kick heavier and dropped in a drum fill 🥁',
  guitar_solo: 'The guitar takes over the melody for a solo in bar two 🎸',
  surprise: 'I rolled the dice and rebuilt the whole arrangement — same idea, new song 🎲',
};

export interface AiBubbleArgs {
  score: MusicScore;
  /** The suggestion card that produced this version, if any. */
  modifier?: SuggestionKey;
  /** True only for the very first song of the session. */
  isFirst: boolean;
}

/**
 * "AI says" bubble — assembled from score metadata + the modifier on the
 * frontend (PRD §3.3: template only, never an extra LLM call).
 */
export function buildAiBubble({ score, modifier, isFirst }: AiBubbleArgs): string {
  const genreBit = score.genre ? ` ${score.genre}` : '';
  const head = `“${score.title}” is ready! ${score.key}, ${score.tempo} BPM${genreBit}.`;
  if (modifier) {
    return `${head} ${MODIFIER_CHANGE_TEXT[modifier]} Not it? Pick another card or hop back a version.`;
  }
  if (isFirst) {
    return (
      `${head} I picked a sound for every instrument — tap one on stage to swap it (free!). ` +
      'Want the music itself changed? That’s my job — pick a card below.'
    );
  }
  return `${head} A fresh take on your new idea — the cards below can push it further.`;
}
