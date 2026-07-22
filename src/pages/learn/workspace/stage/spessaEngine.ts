// SpessaSynth engine — the Tier-0 timbre engine (music-stage-prd §6.1, D-MS19).
//
// A single WorkletSynthesizer (Apache-2.0, real SF2 synthesis: envelopes, loop
// points, filters, modulators) plays the GeneralUser GS soundfont. The worklet
// exposes 17 stereo outputs — [0] = wet effects bus, [1..16] = one DRY output
// per MIDI channel — so each score track claims its own MIDI channel and its
// dry output is routed into that track's existing Tone.Channel: mute / solo /
// volume / pan keep working through the exact same mixer graph as the other
// engines. The effects bus is deliberately left unrouted — routing it to the
// destination would leak a muted track's reverb send past its channel strip
// (solo'ing one lane must silence everything else, no ghost tails).
//
// Loading is lazy (dynamic import + 32MB soundfont fetch) and raced against a
// timeout; any failure falls back to the smplr sample path, then the Tone.js
// synth voices (AC-11 — playback never stalls).

import * as Tone from 'tone';

import type { DrumHit } from './scoreTypes';
import { noteToMidi } from './scoreUtils';

/** Where the soundfont lives under the self-hosted sample origin. */
export const SPESSA_SF_PATH = 'sf2/GeneralUser-GS.sf2';
/** DEV-build convenience only — production requires the self-hosted origin. */
export const SPESSA_DEFAULT_SF_URL =
  'https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/main/GeneralUser-GS.sf2';
/** 32MB over school wifi — generous, but bounded (AC-11). */
export const SPESSA_LOAD_TIMEOUT_MS = 30_000;

/** Worklet output 0 is the wet effects bus; dry channel N is output N + 1. */
const CHANNEL_OUTPUT_OFFSET = 1;
/** MIDI channels available to tracks (SCORE_MAX_TRACKS is 8 — well inside). */
export const SPESSA_MAX_TRACKS = 16;
const MIDI_VELOCITY_MAX = 127;

/** GM percussion key numbers for the score's drum vocabulary. */
export const DRUM_MIDI_NOTES: Record<DrumHit, number> = {
  kick: 36, // Bass Drum 1
  snare: 38, // Acoustic Snare
  hat: 42, // Closed Hi-Hat
  ride: 51, // Ride Cymbal 1
  clap: 39, // Hand Clap
  tom: 45, // Low Tom
};

let spessaDisabledLogged = false;

/** Test hook: the "spessa disabled" notice logs once per page load. */
export function resetSpessaGateForTests(): void {
  spessaDisabledLogged = false;
  enginePromise = null;
}

function configuredBaseUrl(): string | null {
  const base = import.meta.env.VITE_SOUNDFONT_BASE_URL as string | undefined;
  return base ? base.replace(/\/+$/, '') : null;
}

/**
 * Whether the SpessaSynth path may run at all — same self-hosting gate as
 * smplr (music-stage-prd OQ-3): self-hosted origin → yes; DEV build → yes;
 * production without VITE_SOUNDFONT_BASE_URL → no, with a single log.
 */
export function spessaEnabled(): boolean {
  if (configuredBaseUrl() !== null) return true;
  if (import.meta.env.DEV) return true;
  if (!spessaDisabledLogged) {
    spessaDisabledLogged = true;
    console.info(
      '[music-stage] VITE_SOUNDFONT_BASE_URL is not configured — the SpessaSynth engine is disabled in production builds (music-stage-prd OQ-3 gate).',
    );
  }
  return false;
}

/** Soundfont URL, or null when the spessa path is gated off. */
export function spessaSoundfontUrl(): string | null {
  const base = configuredBaseUrl();
  if (base) return `${base}/${SPESSA_SF_PATH}`;
  return import.meta.env.DEV ? SPESSA_DEFAULT_SF_URL : null;
}

/** The subset of the WorkletSynthesizer surface this module drives. */
interface SpessaSynthLike {
  isReady: Promise<unknown>;
  soundBankManager: { addSoundBank(buffer: ArrayBuffer, id: string): Promise<void> };
  midiChannels: { setDrums(isDrum: boolean): void }[];
  programChange(channel: number, programNumber: number): void;
  noteOn(channel: number, midiNote: number, velocity: number, opts?: { time: number }): void;
  noteOff(channel: number, midiNote: number, opts?: { time: number }): void;
  controllerChange(channel: number, controller: number, value: number, opts?: { time: number }): void;
}

interface SpessaEngine {
  synth: SpessaSynthLike;
  node: AudioWorkletNode;
}

let enginePromise: Promise<SpessaEngine> | null = null;

async function createEngine(): Promise<SpessaEngine> {
  const sfUrl = spessaSoundfontUrl();
  if (!sfUrl) throw new Error('spessa gated off — no soundfont source');

  // Both the worklet processor (~380KB) and the lib stay out of the main
  // bundle until the first song actually plays.
  const [{ WorkletSynthesizer }, worklet] = await Promise.all([
    import('spessasynth_lib'),
    import('spessasynth_lib/dist/spessasynth_processor.min.js?url'),
  ]);
  const ctx = Tone.getContext().rawContext as AudioContext;
  await ctx.audioWorklet.addModule(worklet.default);

  // Capture the AudioWorkletNode the synth creates — its per-channel dry
  // outputs are the whole point of this integration, and the node is not
  // otherwise reachable on the public surface.
  let node: AudioWorkletNode | null = null;
  const synth = new WorkletSynthesizer(ctx, {
    audioNodeCreators: {
      worklet: (c, name, options) => {
        node = new AudioWorkletNode(c as AudioContext, name, options);
        return node;
      },
    },
  }) as unknown as SpessaSynthLike;

  const response = await fetch(sfUrl);
  if (!response.ok) throw new Error(`soundfont fetch failed: HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  // The CloudFront SPA error page answers 200 text/html for missing objects —
  // exactly the failure mode that hid the 2026-07 sample outage. Refuse it.
  if (contentType.startsWith('text/html')) {
    throw new Error('soundfont origin served the SPA fallback page');
  }
  await synth.soundBankManager.addSoundBank(await response.arrayBuffer(), 'main');
  await synth.isReady;
  if (!node) throw new Error('spessa worklet node was never created');
  return { synth, node };
}

/** Shared engine, created on first use. A failed init clears the memo so a
 *  later song can retry (e.g. wifi came back). */
export function getSpessaEngine(): Promise<SpessaEngine> {
  if (!enginePromise) {
    enginePromise = createEngine();
    enginePromise.catch(() => {
      enginePromise = null;
    });
  }
  return enginePromise;
}

/**
 * Kick the engine init (worklet + 32MB soundfont) during the composing
 * animation — the LLM wait masks the download, same trick as
 * `preloadPrograms`. Fire-and-forget by design.
 */
export function warmSpessaEngine(): void {
  if (!spessaEnabled()) return;
  void getSpessaEngine().catch(() => undefined);
}

/** What a track needs from the engine: a melodic GM program (1-indexed, the §5
 *  table's numbering) or a drum kit (0-indexed GM kit — the §5 drum rows). */
export type SpessaVoiceSpec =
  | { kind: 'melodic'; gmProgram1: number }
  | { kind: 'drums'; kit0: number };

/** A ready spessa voice: same trigger contract as the other engines. */
export interface SpessaVoice {
  engine: 'spessa';
  trigger(note: string, durationSec: number, time: number, velocity: number): void;
  dispose(): void;
}

function toMidiVelocity(velocity: number): number {
  return Math.max(1, Math.min(MIDI_VELOCITY_MAX, Math.round(velocity * MIDI_VELOCITY_MAX)));
}

const CC_ALL_NOTES_OFF = 123;

/**
 * Claim MIDI channel `trackIdx` for one track, route its dry output into the
 * track's Tone.Channel and set its program. Rejects on timeout/any failure —
 * the caller falls back to smplr (voices.ts owns the tier order).
 */
export async function loadSpessaVoice(
  trackIdx: number,
  spec: SpessaVoiceSpec,
  channel: Tone.Channel,
): Promise<SpessaVoice> {
  if (trackIdx < 0 || trackIdx >= SPESSA_MAX_TRACKS) {
    throw new Error(`no spessa MIDI channel for track ${trackIdx}`);
  }
  const { synth, node } = await withTimeout(
    getSpessaEngine(),
    SPESSA_LOAD_TIMEOUT_MS,
    'spessa engine',
  );
  const midiChannel = trackIdx;
  const isDrums = spec.kind === 'drums';
  synth.midiChannels[midiChannel]?.setDrums(isDrums);
  synth.programChange(midiChannel, isDrums ? spec.kit0 : spec.gmProgram1 - 1);
  Tone.connect(node, channel, CHANNEL_OUTPUT_OFFSET + midiChannel, 0);

  let disposed = false;
  return {
    engine: 'spessa',
    trigger: (note, durationSec, time, velocity) => {
      if (disposed) return;
      const midi = isDrums
        ? (DRUM_MIDI_NOTES[note as DrumHit] ?? DRUM_MIDI_NOTES.kick)
        : noteToMidi(note);
      synth.noteOn(midiChannel, midi, toMidiVelocity(velocity), { time });
      synth.noteOff(midiChannel, midi, { time: time + durationSec });
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      synth.controllerChange(midiChannel, CC_ALL_NOTES_OFF, 0);
      try {
        Tone.disconnect(node, channel, CHANNEL_OUTPUT_OFFSET + midiChannel, 0);
      } catch {
        // channel already disposed — nothing left to detach from
      }
    },
  };
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
