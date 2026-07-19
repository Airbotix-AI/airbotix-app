// Client-side score → audio-file rendering (track-editing PRD §3-A/§3-C).
//
// `Tone.Offline` re-runs the fallback-voice graph in an OfflineAudioContext,
// honouring the SAME mix the kid hears on the stage: per-instrument volume,
// mute/solo, style=None silencing, Edit-drawer octave/pan, and the style's
// fallback timbre recipe. Zero network, zero stars, no artifact rows — the
// file lands straight in the browser's downloads (parent PRD AC-11).
//
// v1 renders with the Tone.js fallback voices (deterministic, offline-safe);
// smplr sample timbres in exports are an open question (track-editing OQ).

import * as Tone from 'tone';

import type { MusicScore, StageTweaks } from './scoreTypes';
import { isDrumNote, parseDurationBeats, scoreDurationSeconds, transposeNote } from './scoreUtils';
import { INSTRUMENT_STYLES, STYLE_NONE, stageSlotFor, type StageStyles } from './stageData';
import { makeFallbackVoice } from './toneFallbackVoices';

/** Let releases/reverb tails ring out instead of clipping at the last note. */
export const RENDER_TAIL_SECONDS = 1.5;
export const DEFAULT_RENDER_VOLUME = 0.85;
const DEFAULT_VELOCITY = 0.9;
const WAV_HEADER_BYTES = 44;
const PCM16_MAX = 0x7fff;

/** The stage mixer state a render must honour (all keyed by instrument kind). */
export interface MixSnapshot {
  muted: Readonly<Record<string, boolean>>;
  solo: string | null;
  /** Instruments silenced by style = None. */
  silenced: ReadonlySet<string>;
  volumes: Readonly<Record<string, number>>;
  tweaks?: StageTweaks;
}

/** Same audibility rule the live channels apply (useScorePlayback). */
export function isInstrumentAudible(instrument: string, mix: MixSnapshot): boolean {
  if (mix.muted[instrument]) return false;
  if (mix.silenced.has(instrument)) return false;
  if (mix.solo !== null && mix.solo !== instrument) return false;
  return true;
}

function styleForSlot(styles: StageStyles, slot: keyof StageStyles): string {
  const styleId = styles[slot];
  // A solo'd single-track download may target a style=None lane — render it
  // with the slot's default timbre instead of producing a silent file.
  return !styleId || styleId === STYLE_NONE ? INSTRUMENT_STYLES[slot][0].id : styleId;
}

/**
 * Render the score (or one track of it) into an AudioBuffer with the stage mix
 * applied. `onlyTrack` bypasses mute/solo — downloading a muted lane must
 * still produce its sound, that's the whole point of a stem download.
 */
export async function renderScore(
  score: MusicScore,
  styles: StageStyles,
  mix: MixSnapshot,
  onlyTrack?: number,
): Promise<AudioBuffer> {
  const secondsPerBeat = 60 / score.tempo;
  const duration = scoreDurationSeconds(score) + RENDER_TAIL_SECONDS;

  const rendered = await Tone.Offline(() => {
    score.tracks.forEach((track, idx) => {
      if (onlyTrack !== undefined ? idx !== onlyTrack : !isInstrumentAudible(track.instrument, mix)) {
        return;
      }
      const slot = stageSlotFor(track.instrument);
      const tweak = mix.tweaks?.[track.instrument];
      const channel = new Tone.Channel({
        volume: Tone.gainToDb(mix.volumes[track.instrument] ?? DEFAULT_RENDER_VOLUME),
        pan: Math.max(-1, Math.min(1, tweak?.pan ?? 0)),
      }).toDestination();
      const voice = makeFallbackVoice(slot, styleForSlot(styles, slot), channel);
      const semitones = (tweak?.octave ?? 0) * 12;
      for (const n of track.notes) {
        const note =
          semitones !== 0 && !isDrumNote(n.note) ? transposeNote(n.note, semitones) : n.note;
        voice.trigger(
          note,
          parseDurationBeats(n.duration) * secondsPerBeat,
          n.time * secondsPerBeat,
          n.velocity ?? DEFAULT_VELOCITY,
        );
      }
    });
  }, duration);

  return rendered.get() as AudioBuffer;
}

/** Interleaved 16-bit PCM WAV — universally playable, no encoder dependency. */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const bytesPerFrame = channels * 2;
  const dataBytes = frames * bytesPerFrame;
  const out = new DataView(new ArrayBuffer(WAV_HEADER_BYTES + dataBytes));

  const writeAscii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) out.setUint8(offset + i, s.charCodeAt(i));
  };
  writeAscii(0, 'RIFF');
  out.setUint32(4, 36 + dataBytes, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  out.setUint32(16, 16, true); // PCM chunk size
  out.setUint16(20, 1, true); // PCM format
  out.setUint16(22, channels, true);
  out.setUint32(24, buffer.sampleRate, true);
  out.setUint32(28, buffer.sampleRate * bytesPerFrame, true);
  out.setUint16(32, bytesPerFrame, true);
  out.setUint16(34, 16, true); // bits per sample
  writeAscii(36, 'data');
  out.setUint32(40, dataBytes, true);

  const channelData = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let offset = WAV_HEADER_BYTES;
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[c][i]));
      out.setInt16(offset, Math.round(sample * PCM16_MAX), true);
      offset += 2;
    }
  }
  return new Blob([out.buffer], { type: 'audio/wav' });
}

/** "Star Puppy Jam" + "guitar" → "star-puppy-jam-guitar.wav". */
export function exportFilename(title: string, trackLabel?: string): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const base = slug(title) || 'my-song';
  return trackLabel ? `${base}-${slug(trackLabel)}.wav` : `${base}.wav`;
}

/** Hand a blob to the browser's download flow (object URL, revoked after). */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
