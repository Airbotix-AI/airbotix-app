// smplr GM-soundfont loading — the Tier-1 timbre engine (music-stage-prd §6.1).
//
// Each §5 instrument style maps to a General MIDI program (melodic slots) or a
// sampled drum machine (drums slot). Everything loads lazily per program and is
// raced against a timeout so a slow/offline network degrades to the Tone.js
// fallback voices instead of stalling playback (AC-11). The styles themselves
// stay frontend-only constants — never in the score JSON or the backend.

import { DrumMachine, Soundfont } from 'smplr';
import * as Tone from 'tone';

import { DRUM_HITS, type DrumHit } from './scoreTypes';
import { noteToMidi } from './scoreUtils';

// Default = smplr's official soundfont source. Before launch these files move
// to our own S3 + CloudFront and VITE_SOUNDFONT_BASE_URL points there
// (music-stage-prd OQ-3 — third-party CDN is not a shippable dependency).
export const SOUNDFONT_DEFAULT_BASE_URL = 'https://gleitz.github.io/midi-js-soundfonts';
export const SOUNDFONT_KIT = 'FluidR3_GM';
export const SOUNDFONT_LOAD_TIMEOUT_MS = 8000;

const MIDI_VELOCITY_MAX = 127;

export function soundfontBaseUrl(): string {
  return import.meta.env.VITE_SOUNDFONT_BASE_URL ?? SOUNDFONT_DEFAULT_BASE_URL;
}

/**
 * GM program (1-indexed, exactly the §5 table) → gleitz-layout soundfont name.
 * Only the programs the style system uses are mapped — an unknown program is a
 * "no soundfont" signal and the caller keeps its Tone.js voice.
 */
export const GM_PROGRAM_SOUNDFONTS: Record<number, string> = {
  1: 'acoustic_grand_piano', // 🎹 Grand
  5: 'electric_piano_1', // 🎛️ Dreamy EP
  11: 'music_box', // 🎹 Music Box
  17: 'drawbar_organ', // 🎛️ Gritty Organ
  25: 'acoustic_guitar_steel', // 🎸 Acoustic
  27: 'electric_guitar_clean', // 🎸 Clean Funk
  29: 'overdriven_guitar', // 🎸 Electric Crunch
  33: 'electric_bass_finger', // 🎻 Round & Warm
  34: 'electric_bass_pick', // 🎻 Picked Rock
  39: 'synth_bass_1', // 🎻 Deep Sub
  82: 'lead_2_sawtooth', // 🎹 Synth Arp
  90: 'pad_2_warm', // 🎛️ Cloud Pad
};

/**
 * Drum styles → smplr sampled drum machines standing in for the GM kits
 * (§5: Standard / Room-softened / Electronic). These load from smplr's
 * drum-machine source; they migrate to our CDN together with OQ-3.
 */
export const DRUM_MACHINE_FOR_STYLE: Record<string, string> = {
  rockkit: 'LM-2', // GM Standard Kit stand-in — punchy sampled acoustic drums
  lofikit: 'Casio-RZ1', // GM Room Kit stand-in — soft lo-fi samples
  electro: 'TR-808', // GM Electronic Kit
};

/** Full melodic soundfont URL for a GM program, or null when unmapped. */
export function soundfontUrlFor(program: number): string | null {
  const name = GM_PROGRAM_SOUNDFONTS[program];
  return name ? `${soundfontBaseUrl()}/${SOUNDFONT_KIT}/${name}-mp3.js` : null;
}

/**
 * Warm the HTTP cache for the programs a generation will need, fired during
 * the composing animation so the 2–5s LLM wait masks the download (§6.1).
 * Drum-machine samples are small and stay lazy. Fire-and-forget by design.
 */
export function preloadPrograms(programs: readonly number[]): void {
  for (const program of new Set(programs)) {
    const url = soundfontUrlFor(program);
    if (url) void fetch(url, { cache: 'force-cache' }).catch(() => undefined);
  }
}

/** A ready-to-play smplr voice routed into the track's Tone.Channel. */
export interface SoundfontVoice {
  engine: 'smplr';
  trigger(note: string, durationSec: number, time: number, velocity: number): void;
  dispose(): void;
}

/** Minimal surface of a smplr instrument that this module relies on. */
interface SmplrInstrument {
  ready: Promise<unknown>;
  start(event: {
    note: string | number;
    time?: number;
    duration?: number;
    velocity?: number;
  }): unknown;
  stop(): void;
}

interface SmplrDrumInstrument extends SmplrInstrument {
  getSampleNames(): string[];
  getGroupNames(): string[];
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (v) => {
        window.clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

/** Native gain bridged into the Tone graph so channel mute/solo/vol apply. */
function bridgeIntoChannel(channel: Tone.Channel): GainNode {
  const raw = Tone.getContext().rawContext;
  const gain = raw.createGain();
  Tone.connect(gain, channel);
  return gain;
}

function toMidiVelocity(velocity: number): number {
  return Math.max(1, Math.min(MIDI_VELOCITY_MAX, Math.round(velocity * MIDI_VELOCITY_MAX)));
}

/** Load a melodic GM program; rejects on unmapped program, error or timeout. */
export async function loadMelodicSoundfont(
  program: number,
  channel: Tone.Channel,
): Promise<SoundfontVoice> {
  const instrumentUrl = soundfontUrlFor(program);
  if (!instrumentUrl) throw new Error(`No soundfont mapped for GM program ${program}`);
  const gain = bridgeIntoChannel(channel);
  try {
    const voice = Soundfont(Tone.getContext().rawContext, {
      instrumentUrl,
      destination: gain,
    }) as unknown as SmplrInstrument;
    await withTimeout(voice.ready, SOUNDFONT_LOAD_TIMEOUT_MS, `soundfont program ${program}`);
    return {
      engine: 'smplr',
      trigger: (note, durationSec, time, velocity) => {
        voice.start({
          note: noteToMidi(note),
          time,
          duration: durationSec,
          velocity: toMidiVelocity(velocity),
        });
      },
      dispose: () => {
        try {
          voice.stop();
        } catch {
          // already torn down — losing the tail is fine
        }
        gain.disconnect();
      },
    };
  } catch (e) {
    gain.disconnect();
    throw e;
  }
}

// Fuzzy matchers, first hit wins. Later patterns are musical stand-ins so a
// machine without e.g. a ride still resolves every hit the score can contain.
const HIT_MATCHERS: Record<DrumHit, RegExp[]> = {
  kick: [/kick/i, /\bbd\b/i, /bass-?drum/i],
  snare: [/snare/i, /\bsd\b/i],
  hat: [/hat.*close|close.*hat/i, /hi-?hat/i, /\bhat\b/i, /\bhh\b/i],
  ride: [/ride/i, /cymbal/i, /hat.*open|open.*hat/i, /hi-?hat/i],
  clap: [/clap/i, /snare/i],
  tom: [/\btom\b|tom-?\d|tom-(lo|mid|hi)/i, /tom/i, /conga/i, /kick/i],
};

function resolveDrumHits(names: readonly string[]): Record<DrumHit, string> | null {
  const resolved = {} as Record<DrumHit, string>;
  for (const hit of DRUM_HITS) {
    const match = HIT_MATCHERS[hit]
      .map((re) => names.find((n) => re.test(n)))
      .find((n) => n !== undefined);
    if (!match) return null; // an unusable kit — caller falls back to Tone.js
    resolved[hit] = match;
  }
  return resolved;
}

/** Load the sampled drum machine standing in for a §5 drum style. */
export async function loadDrumSoundfont(
  styleId: string,
  channel: Tone.Channel,
): Promise<SoundfontVoice> {
  const machine = DRUM_MACHINE_FOR_STYLE[styleId];
  if (!machine) throw new Error(`No drum machine mapped for style "${styleId}"`);
  const gain = bridgeIntoChannel(channel);
  try {
    const voice = DrumMachine(Tone.getContext().rawContext, {
      instrument: machine,
      destination: gain,
    }) as unknown as SmplrDrumInstrument;
    await withTimeout(voice.ready, SOUNDFONT_LOAD_TIMEOUT_MS, `drum machine ${machine}`);
    const groups = voice.getGroupNames();
    const hits = resolveDrumHits(groups.length > 0 ? groups : voice.getSampleNames());
    if (!hits) throw new Error(`Drum machine ${machine} has no usable kick/snare/hat samples`);
    return {
      engine: 'smplr',
      trigger: (note, _durationSec, time, velocity) => {
        const sample = hits[note as DrumHit] ?? hits.kick;
        // No duration: drum samples ring out naturally.
        voice.start({ note: sample, time, velocity: toMidiVelocity(velocity) });
      },
      dispose: () => {
        try {
          voice.stop();
        } catch {
          // already torn down — losing the tail is fine
        }
        gain.disconnect();
      },
    };
  } catch (e) {
    gain.disconnect();
    throw e;
  }
}
