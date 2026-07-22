// @vitest-environment jsdom

// SpessaSynth engine gating + static mappings (D-MS19). The engine itself is
// worklet-bound and exercised through the voices.test tier contract; here we
// lock the pure surface: the OQ-3 self-hosting gate, the soundfont URL, and
// the GM percussion map covering the score's whole drum vocabulary.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { DRUM_HITS } from './scoreTypes';
import {
  DRUM_MIDI_NOTES,
  SPESSA_DEFAULT_SF_URL,
  SPESSA_SF_PATH,
  resetSpessaGateForTests,
  spessaEnabled,
  spessaSoundfontUrl,
} from './spessaEngine';

afterEach(() => {
  vi.unstubAllEnvs();
  resetSpessaGateForTests();
});

describe('spessaEnabled (music-stage-prd OQ-3 gate)', () => {
  it('is on with a self-hosted base configured', () => {
    vi.stubEnv('VITE_SOUNDFONT_BASE_URL', 'https://cdn.airbotix.ai/soundfonts');
    expect(spessaEnabled()).toBe(true);
    expect(spessaSoundfontUrl()).toBe(`https://cdn.airbotix.ai/soundfonts/${SPESSA_SF_PATH}`);
  });

  it('production without the env var keeps the engine closed, one log only', () => {
    vi.stubEnv('VITE_SOUNDFONT_BASE_URL', '');
    vi.stubEnv('DEV', false);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    expect(spessaEnabled()).toBe(false);
    expect(spessaEnabled()).toBe(false);
    expect(spessaSoundfontUrl()).toBeNull();
    expect(info).toHaveBeenCalledTimes(1);
    info.mockRestore();
  });

  it('DEV builds fall back to the external soundfont for local work', () => {
    vi.stubEnv('VITE_SOUNDFONT_BASE_URL', '');
    vi.stubEnv('DEV', true);
    expect(spessaEnabled()).toBe(true);
    expect(spessaSoundfontUrl()).toBe(SPESSA_DEFAULT_SF_URL);
  });
});

describe('DRUM_MIDI_NOTES', () => {
  it('covers every drum hit the score vocabulary can contain', () => {
    for (const hit of DRUM_HITS) {
      expect(DRUM_MIDI_NOTES[hit], `missing GM note for "${hit}"`).toBeTypeOf('number');
    }
  });
});
