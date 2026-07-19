// Pure-logic coverage for the client-side export path (track-editing PRD
// §3-A/§3-C): the audibility rule the render shares with the live channels,
// the WAV container, and the download filenames. `renderScore` itself needs a
// real AudioContext — its wiring is covered in MusicStagePane.test (mocked)
// and audibly by the harness journey (AC-7 machine-hearing proof).

import { describe, expect, it } from 'vitest';

import {
  audioBufferToWavBlob,
  exportFilename,
  isInstrumentAudible,
  type MixSnapshot,
} from './offlineRender';

const mix = (over: Partial<MixSnapshot> = {}): MixSnapshot => ({
  muted: {},
  solo: null,
  silenced: new Set<string>(),
  volumes: {},
  ...over,
});

describe('isInstrumentAudible — the ONE rule stage playback and exports share', () => {
  it('everything plays by default', () => {
    expect(isInstrumentAudible('guitar', mix())).toBe(true);
  });

  it('muted is silent', () => {
    expect(isInstrumentAudible('guitar', mix({ muted: { guitar: true } }))).toBe(false);
  });

  it('style=None is silent', () => {
    expect(isInstrumentAudible('bass', mix({ silenced: new Set(['bass']) }))).toBe(false);
  });

  it('solo silences everyone else', () => {
    expect(isInstrumentAudible('drums', mix({ solo: 'guitar' }))).toBe(false);
    expect(isInstrumentAudible('guitar', mix({ solo: 'guitar' }))).toBe(true);
  });
});

/** Minimal stand-in for AudioBuffer (jsdom has no real one). */
function fakeBuffer(channels: number, data: number[][], sampleRate = 44100): AudioBuffer {
  return {
    numberOfChannels: channels,
    length: data[0].length,
    sampleRate,
    getChannelData: (c: number) => Float32Array.from(data[c]),
  } as unknown as AudioBuffer;
}

describe('audioBufferToWavBlob', () => {
  it('writes a valid 16-bit PCM RIFF header sized to the samples', async () => {
    const blob = audioBufferToWavBlob(fakeBuffer(2, [[0, 0.5, -0.5, 1], [0, 0, 0, -1]]));
    expect(blob.type).toBe('audio/wav');
    const bytes = new DataView(await blob.arrayBuffer());
    const ascii = (off: number, len: number) =>
      Array.from({ length: len }, (_, i) => String.fromCharCode(bytes.getUint8(off + i))).join('');
    expect(ascii(0, 4)).toBe('RIFF');
    expect(ascii(8, 4)).toBe('WAVE');
    expect(bytes.getUint16(22, true)).toBe(2); // channels
    expect(bytes.getUint32(24, true)).toBe(44100); // sample rate
    expect(bytes.getUint32(40, true)).toBe(4 * 2 * 2); // frames × ch × 2 bytes
    expect(blob.size).toBe(44 + 16);
  });

  it('interleaves channels and clamps overs to full-scale PCM', async () => {
    const blob = audioBufferToWavBlob(fakeBuffer(2, [[1, 2], [-1, -2]]));
    const bytes = new DataView(await blob.arrayBuffer());
    expect(bytes.getInt16(44, true)).toBe(0x7fff); // L0 full scale
    expect(bytes.getInt16(46, true)).toBe(-0x7fff); // R0 interleaved next
    expect(bytes.getInt16(48, true)).toBe(0x7fff); // L1 clamped from 2.0
  });
});

describe('exportFilename', () => {
  it('slugs the title and appends the track label for stems', () => {
    expect(exportFilename('Star Puppy Jam')).toBe('star-puppy-jam.wav');
    expect(exportFilename('Star Puppy Jam', 'Guitar')).toBe('star-puppy-jam-guitar.wav');
  });

  it('survives emoji/punctuation titles and blank input', () => {
    expect(exportFilename('🚀 Pup!!')).toBe('pup.wav');
    expect(exportFilename('★★★')).toBe('my-song.wav');
    expect(exportFilename('My Song', 'Lead Axe 🎸')).toBe('my-song-lead-axe.wav');
  });
});
