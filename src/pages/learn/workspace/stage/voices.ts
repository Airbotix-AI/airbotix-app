// Per-track voice controller: starts on the Tone.js fallback synth instantly,
// then upgrades in place to the best sampled engine that loads (music-stage-prd
// §5 + §6.1, D-MS19). Tier order: SpessaSynth (real SF2 synthesis, per-track
// dry output routed into this track's Tone.Channel) → smplr GM soundfont →
// stay on the Tone.js fallback. Any load failure degrades one tier, never
// stalls playback — AC-11. Swaps happen behind a stable `trigger`, so the
// Tone.Part scheduling in useScorePlayback is untouched by style changes.

import type * as Tone from 'tone';

import { loadDrumSoundfont, loadMelodicSoundfont, smplrEnabled, type SoundfontVoice } from './soundfont';
import type { InstrumentKind } from './scoreTypes';
import { loadSpessaVoice, spessaEnabled, type SpessaVoice } from './spessaEngine';
import { STYLE_NONE, styleOf, type StageSlotId } from './stageData';
import { makeFallbackVoice, type FallbackVoice } from './toneFallbackVoices';

export type VoiceEngine = 'tone' | 'smplr' | 'spessa';

// Vocal tracks sing, they don't follow the piano/keys slot style: a lead-vocal
// melody rendered on the Pop preset's syntharp reads as a synthesizer, not a
// voice. These GM programs (1-indexed: 53 Choir Aahs / 54 Voice Oohs) override
// the slot style for vocal instruments only; every other track keeps §5 rules.
export const VOCAL_GM_PROGRAMS: Partial<Record<InstrumentKind, number>> = {
  lead_vocals: 53,
  backing_vocals: 54,
};

export interface TrackVoice {
  /** Current engine — 'tone' until a sampled engine lands. */
  readonly engine: VoiceEngine;
  /** Settles once the engine is final (sampled voice loaded or fallback kept). */
  readonly ready: Promise<void>;
  trigger(note: string, durationSec: number, time: number, velocity: number): void;
  dispose(): void;
}

/**
 * Create the voice for one track. `slot` decides the timbre family and
 * `styleId` the §5 preset; drum-slot voices consume hit names, melodic ones
 * pitch names. The voice is routed into `channel` (mute/solo/vol stay there).
 * `trackIdx` claims the SpessaSynth MIDI channel — callers without a stable
 * track index (style preview) skip the spessa tier and use smplr directly.
 */
export function createTrackVoice(
  slot: StageSlotId,
  styleId: string,
  channel: Tone.Channel,
  instrument?: InstrumentKind,
  trackIdx?: number,
): TrackVoice {
  let disposed = false;
  let active: FallbackVoice | SoundfontVoice | SpessaVoice = makeFallbackVoice(
    slot,
    styleId,
    channel,
  );

  // STYLE_NONE is the kid silencing the slot — it wins over everything,
  // including the vocal override below.
  const vocalProgram = instrument ? (VOCAL_GM_PROGRAMS[instrument] ?? null) : null;
  const gmProgram =
    styleId === STYLE_NONE ? null : (vocalProgram ?? styleOf(slot, styleId)?.gmProgram ?? null);
  // Production without a self-hosted sample source keeps every sampled engine
  // closed (music-stage-prd OQ-3 gate): stay on the Tone.js fallback (AC-11).
  // The enabled() helpers log their single explanatory line themselves.
  const wantsSpessa = gmProgram !== null && trackIdx !== undefined && spessaEnabled();
  const wantsSmplr = gmProgram !== null && smplrEnabled();

  const loadSampled = async (): Promise<SoundfontVoice | SpessaVoice> => {
    if (wantsSpessa) {
      try {
        return await loadSpessaVoice(
          trackIdx,
          slot === 'drums'
            ? { kind: 'drums', kit0: gmProgram }
            : { kind: 'melodic', gmProgram1: gmProgram },
          channel,
        );
      } catch (e) {
        if (disposed || !wantsSmplr) throw e;
        // Degrade one tier, loudly in the console, silently for the kid.
        console.warn(
          `[music-stage] spessa engine unavailable for ${slot}/${styleId} — trying the smplr soundfont`,
          e,
        );
      }
    }
    if (!wantsSmplr) throw new Error('sampled engines gated off');
    return slot === 'drums'
      ? loadDrumSoundfont(styleId, channel)
      : loadMelodicSoundfont(gmProgram, channel);
  };

  const ready: Promise<void> =
    wantsSpessa || wantsSmplr
      ? loadSampled().then(
          (voice) => {
            if (disposed) {
              voice.dispose();
              return;
            }
            active.dispose();
            active = voice;
          },
          (e: unknown) => {
            if (disposed) return;
            // AC-11: degrade loudly in the console, silently for the kid.
            console.warn(
              `[music-stage] sampled voice for ${slot}/${styleId} unavailable — staying on the Tone.js fallback synth`,
              e,
            );
          },
        )
      : Promise.resolve();

  return {
    get engine() {
      return active.engine;
    },
    ready,
    trigger: (note, durationSec, time, velocity) => {
      if (disposed) return;
      active.trigger(note, durationSec, time, velocity);
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      active.dispose();
    },
  };
}
