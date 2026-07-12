// Tone.js fallback voices — one synth recipe per §5 style (the table's
// "Tone.js fallback" column). Used until the smplr soundfont for the style is
// loaded, and permanently when it can't load (weak network / low-end device /
// blocked CDN — AC-11). All voices route through the track's Tone.Channel so
// mute/solo/volume behave identically on both engines.

import * as Tone from 'tone';

import type { DrumHit } from './scoreTypes';
import { noteToMidi } from './scoreUtils';
import type { StageSlotId } from './stageData';

const A4_MIDI = 69;
const A4_HZ = 440;
const OCTAVE_SEMITONES = 12;

/** Style-transposed pitch: "E2" −12st → 41.2 Hz. */
function midiShiftToHz(note: string, semitones: number): number {
  return A4_HZ * Math.pow(2, (noteToMidi(note) + semitones - A4_MIDI) / OCTAVE_SEMITONES);
}

export interface FallbackVoice {
  engine: 'tone';
  trigger(note: string, durationSec: number, time: number, velocity: number): void;
  dispose(): void;
}

interface MelodicRecipe {
  build(): { synth: MelodicSynth; effects: DisposableNode[] };
  /** Semitone shift applied per note (Deep Sub −12, Music Box +12). */
  transpose: number;
}

type MelodicSynth = Tone.PolySynth | Tone.MonoSynth | Tone.PluckSynth;
type DisposableNode = { dispose(): void; connect(dest: Tone.InputNode): unknown };

const NO_SHIFT = 0;

// ── melodic recipes (guitar / bass / piano / keys × 3 styles) ───────────────

const MELODIC_RECIPES: Record<string, MelodicRecipe> = {
  // 🎸 Guitar
  'guitar/acoustic': {
    transpose: NO_SHIFT,
    build: () => ({
      synth: new Tone.PluckSynth({ attackNoise: 1, dampening: 4000, resonance: 0.9 }),
      effects: [],
    }),
  },
  'guitar/crunch': {
    transpose: NO_SHIFT,
    build: () => ({
      // Square wave into a wave-shaper (distortion) — "Electric Crunch".
      synth: new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'square' },
        envelope: { attack: 0.01, decay: 0.25, sustain: 0.35, release: 0.4 },
      }),
      effects: [new Tone.Distortion(0.6)],
    }),
  },
  'guitar/funk': {
    transpose: NO_SHIFT,
    build: () => ({
      // Short, choked square hits — "Clean Funk".
      synth: new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'square' },
        envelope: { attack: 0.005, decay: 0.12, sustain: 0.05, release: 0.12 },
      }),
      effects: [],
    }),
  },
  // 🎻 Bass
  'bass/round': {
    transpose: NO_SHIFT,
    build: () => ({
      synth: new Tone.MonoSynth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.25, sustain: 0.5, release: 0.5 },
        filter: { Q: 1, type: 'lowpass', rolloff: -12 },
      }),
      effects: [],
    }),
  },
  'bass/picked': {
    transpose: NO_SHIFT,
    build: () => ({
      synth: new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.6 },
        filter: { Q: 2, type: 'lowpass', rolloff: -24 },
      }),
      effects: [],
    }),
  },
  'bass/sub': {
    transpose: -OCTAVE_SEMITONES, // sine an octave down — "Deep Sub"
    build: () => ({
      synth: new Tone.MonoSynth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.7, release: 0.6 },
        filter: { Q: 0.5, type: 'lowpass', rolloff: -12 },
      }),
      effects: [],
    }),
  },
  // 🎹 Piano
  'piano/grand': {
    transpose: NO_SHIFT,
    build: () => ({
      synth: new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.2, release: 1 },
      }),
      effects: [],
    }),
  },
  'piano/musicbox': {
    transpose: OCTAVE_SEMITONES, // bell an octave up — "Music Box"
    build: () => ({
      synth: new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.002, decay: 0.8, sustain: 0, release: 1.2 },
      }),
      effects: [],
    }),
  },
  'piano/syntharp': {
    transpose: NO_SHIFT,
    build: () => ({
      // Saw with a filter-envelope sweep — "Synth Arp".
      synth: new Tone.PolySynth(Tone.MonoSynth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.005, decay: 0.2, sustain: 0.3, release: 0.3 },
        filterEnvelope: { attack: 0.01, decay: 0.25, sustain: 0.2, release: 0.3, baseFrequency: 300, octaves: 3 },
      }),
      effects: [],
    }),
  },
  // 🎛️ Keyboard
  'keys/organ': {
    transpose: NO_SHIFT,
    build: () => {
      // Additive-ish sine stack with tremolo — "Gritty Organ".
      const tremolo = new Tone.Tremolo(5, 0.4).start();
      return {
        synth: new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine4' }, // sine + 4 harmonics ≈ additive organ
          envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.2 },
        }),
        effects: [tremolo],
      };
    },
  },
  'keys/ep': {
    transpose: NO_SHIFT,
    build: () => ({
      // Detuned sines — "Dreamy EP".
      synth: new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsine', count: 3, spread: 18 },
        envelope: { attack: 0.01, decay: 0.5, sustain: 0.4, release: 1 },
      }),
      effects: [],
    }),
  },
  'keys/pad': {
    transpose: NO_SHIFT,
    build: () => ({
      // Detuned saws through a low-pass — "Cloud Pad".
      synth: new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 3, spread: 24 },
        envelope: { attack: 0.6, decay: 0.2, sustain: 0.8, release: 1.5 },
      }),
      effects: [new Tone.Filter(1200, 'lowpass')],
    }),
  },
};

/** Neutral voice for style=None (channel is muted anyway) / unknown styles. */
const DEFAULT_RECIPE: MelodicRecipe = MELODIC_RECIPES['piano/grand'];

// ── drum kits (Membrane for kick/tom + Noise for snare/hat/ride/clap) ───────

interface DrumHitParams {
  pitch: string;
  duration: string;
  velocity: number;
}

const DRUM_HIT_PARAMS: Record<DrumHit, DrumHitParams> = {
  kick: { pitch: 'C1', duration: '8n', velocity: 1 },
  tom: { pitch: 'G1', duration: '8n', velocity: 0.9 },
  snare: { pitch: 'A1', duration: '16n', velocity: 0.9 },
  clap: { pitch: 'B1', duration: '16n', velocity: 0.8 },
  hat: { pitch: 'A4', duration: '32n', velocity: 0.3 },
  ride: { pitch: 'D5', duration: '16n', velocity: 0.25 },
};

const MEMBRANE_HITS: ReadonlySet<string> = new Set(['kick', 'tom']);

interface DrumKitFlavor {
  /** Envelope decay for the membrane voice (Electro = tighter). */
  membraneDecay: number;
  /** Noise-voice decay. */
  noiseDecay: number;
  /** Extra low-pass in front of the channel (Lo-fi Kit softening). */
  lowpassHz: number | null;
  /** Overall velocity scale (Lo-fi plays softer). */
  velocityScale: number;
}

const DRUM_KIT_FLAVORS: Record<string, DrumKitFlavor> = {
  rockkit: { membraneDecay: 0.4, noiseDecay: 0.2, lowpassHz: null, velocityScale: 1 },
  lofikit: { membraneDecay: 0.35, noiseDecay: 0.15, lowpassHz: 2000, velocityScale: 0.8 },
  electro: { membraneDecay: 0.2, noiseDecay: 0.08, lowpassHz: null, velocityScale: 1 },
};

const DEFAULT_DRUM_FLAVOR = DRUM_KIT_FLAVORS.rockkit;

function makeDrumVoice(styleId: string, channel: Tone.Channel): FallbackVoice {
  const flavor = DRUM_KIT_FLAVORS[styleId] ?? DEFAULT_DRUM_FLAVOR;
  const out: DisposableNode | Tone.Channel = flavor.lowpassHz
    ? new Tone.Filter(flavor.lowpassHz, 'lowpass')
    : channel;
  if (out !== channel) out.connect(channel);

  const membrane = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 6,
    envelope: { attack: 0.001, decay: flavor.membraneDecay, sustain: 0, release: flavor.membraneDecay },
  });
  membrane.connect(out as Tone.InputNode);
  const noise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: flavor.noiseDecay, sustain: 0 },
  });
  noise.connect(out as Tone.InputNode);

  return {
    engine: 'tone',
    trigger: (note, _durationSec, time, velocity) => {
      const hit: DrumHit = note in DRUM_HIT_PARAMS ? (note as DrumHit) : 'kick';
      const params = DRUM_HIT_PARAMS[hit];
      const v = params.velocity * velocity * flavor.velocityScale;
      if (MEMBRANE_HITS.has(hit)) {
        membrane.triggerAttackRelease(params.pitch, params.duration, time, v);
      } else {
        noise.triggerAttackRelease(params.duration, time, v);
      }
    },
    dispose: () => {
      membrane.dispose();
      noise.dispose();
      if (out !== channel) out.dispose();
    },
  };
}

// ── public factory ───────────────────────────────────────────────────────────

/**
 * Build the §5 fallback voice for a stage slot + style, wired into `channel`.
 * Drum-slot voices expect hit names ("kick"), melodic voices pitch names.
 */
export function makeFallbackVoice(
  slot: StageSlotId,
  styleId: string,
  channel: Tone.Channel,
): FallbackVoice {
  if (slot === 'drums') return makeDrumVoice(styleId, channel);

  const recipe = MELODIC_RECIPES[`${slot}/${styleId}`] ?? DEFAULT_RECIPE;
  const { synth, effects } = recipe.build();
  let head: Tone.InputNode = channel;
  for (const effect of effects) {
    effect.connect(head);
    head = effect as Tone.InputNode;
  }
  synth.connect(head);

  return {
    engine: 'tone',
    trigger: (note, durationSec, time, velocity) => {
      const target =
        recipe.transpose === NO_SHIFT ? note : midiShiftToHz(note, recipe.transpose);
      (synth as Tone.PolySynth).triggerAttackRelease(target, durationSec, time, velocity);
    },
    dispose: () => {
      synth.dispose();
      for (const effect of effects) effect.dispose();
    },
  };
}
