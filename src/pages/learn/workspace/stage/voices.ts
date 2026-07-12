// Per-track voice controller: starts on the Tone.js fallback synth instantly,
// then upgrades in place to the smplr GM soundfont for the slot's style
// (music-stage-prd §5 + §6.1). If the soundfont can't load (offline, slow CDN,
// low-end device) the controller stays on the fallback and playback never
// stops — AC-11. Swaps happen behind a stable `trigger`, so the Tone.Part
// scheduling in useScorePlayback is untouched by style changes.

import type * as Tone from 'tone';

import { loadDrumSoundfont, loadMelodicSoundfont, type SoundfontVoice } from './soundfont';
import { STYLE_NONE, styleOf, type StageSlotId } from './stageData';
import { makeFallbackVoice, type FallbackVoice } from './toneFallbackVoices';

export type VoiceEngine = 'tone' | 'smplr';

export interface TrackVoice {
  /** Current engine — 'tone' until the soundfont upgrade lands. */
  readonly engine: VoiceEngine;
  /** Settles once the engine is final (soundfont loaded or fallback kept). */
  readonly ready: Promise<void>;
  trigger(note: string, durationSec: number, time: number, velocity: number): void;
  dispose(): void;
}

/**
 * Create the voice for one track. `slot` decides the timbre family and
 * `styleId` the §5 preset; drum-slot voices consume hit names, melodic ones
 * pitch names. The voice is routed into `channel` (mute/solo/vol stay there).
 */
export function createTrackVoice(
  slot: StageSlotId,
  styleId: string,
  channel: Tone.Channel,
): TrackVoice {
  let disposed = false;
  let active: FallbackVoice | SoundfontVoice = makeFallbackVoice(slot, styleId, channel);

  const gmProgram = styleId === STYLE_NONE ? null : (styleOf(slot, styleId)?.gmProgram ?? null);
  const wantsSoundfont = gmProgram !== null;

  const ready: Promise<void> = wantsSoundfont
    ? (slot === 'drums'
        ? loadDrumSoundfont(styleId, channel)
        : loadMelodicSoundfont(gmProgram, channel)
      ).then(
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
            `[music-stage] soundfont for ${slot}/${styleId} unavailable — staying on the Tone.js fallback synth`,
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
