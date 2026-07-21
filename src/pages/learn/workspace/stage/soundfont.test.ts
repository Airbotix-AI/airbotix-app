// @vitest-environment jsdom

// smplr soundfont layer (music-stage-prd §5 + §6.1): style→GM mapping
// completeness, URL building/override, cache preload and load/degrade paths.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeSmplr {
  ready: Promise<unknown>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  getGroupNames: ReturnType<typeof vi.fn>;
  getSampleNames: ReturnType<typeof vi.fn>;
}

const h = vi.hoisted(() => {
  const state: {
    instance: FakeSmplr | null;
    soundfontOpts: Record<string, unknown> | null;
    drumOpts: Record<string, unknown> | null;
    gainNode: { disconnect: ReturnType<typeof vi.fn>; connect: ReturnType<typeof vi.fn> };
  } = {
    instance: null,
    soundfontOpts: null,
    drumOpts: null,
    gainNode: { disconnect: vi.fn(), connect: vi.fn() },
  };
  return state;
});

function makeInstance(ready: Promise<unknown>, groups: string[] = []): FakeSmplr {
  return {
    ready,
    start: vi.fn(),
    stop: vi.fn(),
    getGroupNames: vi.fn(() => groups),
    getSampleNames: vi.fn(() => []),
  };
}

vi.mock('smplr', () => ({
  Soundfont: vi.fn((_ctx: unknown, opts: Record<string, unknown>) => {
    h.soundfontOpts = opts;
    return h.instance;
  }),
  DrumMachine: vi.fn((_ctx: unknown, opts: Record<string, unknown>) => {
    h.drumOpts = opts;
    return h.instance;
  }),
}));

vi.mock('tone', () => ({
  getContext: () => ({ rawContext: { createGain: () => h.gainNode } }),
  connect: vi.fn(),
}));

const gainNode = h.gainNode;

import {
  DRUM_MACHINE_DEFAULT_BASE_URL,
  DRUM_MACHINE_FOR_STYLE,
  GM_PROGRAM_SOUNDFONTS,
  SOUNDFONT_DEFAULT_BASE_URL,
  SOUNDFONT_LOAD_TIMEOUT_MS,
  drumMachineUrlFor,
  loadDrumSoundfont,
  loadMelodicSoundfont,
  preloadPrograms,
  resetSmplrGateForTests,
  smplrEnabled,
  soundfontBaseUrl,
  soundfontUrlFor,
} from './soundfont';
import { INSTRUMENT_STYLES, STYLE_NONE } from './stageData';
import type * as ToneType from 'tone';

const channel = {} as unknown as ToneType.Channel;

beforeEach(() => {
  vi.clearAllMocks();
  h.instance = null;
  h.soundfontOpts = null;
  h.drumOpts = null;
  resetSmplrGateForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('style → GM mapping completeness (PRD §5: 15 styles + None per slot)', () => {
  it('has exactly 3 styles + None per slot, 15 styled entries total', () => {
    const slots = Object.keys(INSTRUMENT_STYLES);
    expect(slots).toHaveLength(5);
    let styled = 0;
    for (const styles of Object.values(INSTRUMENT_STYLES)) {
      expect(styles).toHaveLength(4);
      const none = styles.filter((s) => s.id === STYLE_NONE);
      expect(none).toHaveLength(1);
      expect(none[0].gmProgram).toBeNull();
      styled += styles.filter((s) => s.id !== STYLE_NONE).length;
    }
    expect(styled).toBe(15);
  });

  it('maps every melodic style to a soundfont and every drum style to a machine', () => {
    for (const [slot, styles] of Object.entries(INSTRUMENT_STYLES)) {
      for (const style of styles) {
        if (style.id === STYLE_NONE) continue;
        if (slot === 'drums') {
          expect(DRUM_MACHINE_FOR_STYLE[style.id], `drums/${style.id}`).toBeTruthy();
        } else {
          expect(style.gmProgram).not.toBeNull();
          expect(
            GM_PROGRAM_SOUNDFONTS[style.gmProgram as number],
            `${slot}/${style.id} → GM ${style.gmProgram}`,
          ).toBeTruthy();
        }
      }
    }
  });
});

describe('soundfontUrlFor', () => {
  it('builds the gleitz-layout URL from the default base', () => {
    expect(soundfontUrlFor(25)).toBe(
      `${SOUNDFONT_DEFAULT_BASE_URL}/MusyngKite/acoustic_guitar_steel-mp3.js`,
    );
  });

  it('honours VITE_SOUNDFONT_BASE_URL (our S3+CloudFront override)', () => {
    vi.stubEnv('VITE_SOUNDFONT_BASE_URL', 'https://cdn.airbotix.ai/soundfonts');
    expect(soundfontUrlFor(1)).toBe(
      'https://cdn.airbotix.ai/soundfonts/MusyngKite/acoustic_grand_piano-mp3.js',
    );
  });

  it('returns null for unmapped programs (e.g. drum-kit numbers)', () => {
    expect(soundfontUrlFor(0)).toBeNull();
    expect(soundfontUrlFor(8)).toBeNull();
  });
});

describe('production gating (music-stage-prd OQ-3 launch gate)', () => {
  it('DEV builds may use the external default sources', () => {
    // vitest runs as a DEV build; no env override configured.
    expect(smplrEnabled()).toBe(true);
    expect(soundfontBaseUrl()).toBe(SOUNDFONT_DEFAULT_BASE_URL);
    expect(drumMachineUrlFor('electro')).toBe(
      `${DRUM_MACHINE_DEFAULT_BASE_URL}/TR-808/dm.json`,
    );
  });

  it('production without VITE_SOUNDFONT_BASE_URL closes the whole smplr path with ONE log', () => {
    vi.stubEnv('DEV', false);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    expect(smplrEnabled()).toBe(false);
    expect(smplrEnabled()).toBe(false); // repeated checks don't re-log
    expect(info).toHaveBeenCalledTimes(1);
    expect(String(info.mock.calls[0][0])).toContain('Tone.js fallback');
    expect(soundfontBaseUrl()).toBeNull();
    expect(soundfontUrlFor(1)).toBeNull();
    expect(drumMachineUrlFor('rockkit')).toBeNull();
    info.mockRestore();
  });

  it('production with a self-hosted base keeps smplr on, same-origin drums included', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SOUNDFONT_BASE_URL', 'https://cdn.airbotix.ai/soundfonts/');
    expect(smplrEnabled()).toBe(true);
    // trailing slash normalised; drum machines live under the SAME origin.
    expect(soundfontUrlFor(1)).toBe(
      'https://cdn.airbotix.ai/soundfonts/MusyngKite/acoustic_grand_piano-mp3.js',
    );
    expect(drumMachineUrlFor('lofikit')).toBe(
      'https://cdn.airbotix.ai/soundfonts/drum-machines/Casio-RZ1/dm.json',
    );
  });

  it('does not preload anything while gated off', () => {
    vi.stubEnv('DEV', false);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const fetchMock = vi.fn(() => Promise.resolve());
    vi.stubGlobal('fetch', fetchMock);
    preloadPrograms([1, 29, 34]);
    expect(fetchMock).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it('load calls reject instead of touching external sources while gated off', async () => {
    vi.stubEnv('DEV', false);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    await expect(loadMelodicSoundfont(1, channel)).rejects.toThrow('smplr gated off');
    await expect(loadDrumSoundfont('rockkit', channel)).rejects.toThrow('smplr gated off');
    expect(h.soundfontOpts).toBeNull();
    expect(h.drumOpts).toBeNull();
    info.mockRestore();
  });
});

describe('preloadPrograms', () => {
  it('warms the HTTP cache once per unique mapped program, skipping drums', () => {
    const fetchMock = vi.fn(() => Promise.resolve());
    vi.stubGlobal('fetch', fetchMock);
    preloadPrograms([29, 34, 0, 1, 17, 29]);
    expect(fetchMock).toHaveBeenCalledTimes(4); // 0 unmapped, 29 deduped
    expect(fetchMock).toHaveBeenCalledWith(soundfontUrlFor(29), { cache: 'force-cache' });
  });
});

describe('loadMelodicSoundfont', () => {
  it('resolves a voice that starts smplr notes with MIDI pitch + 0–127 velocity', async () => {
    const inst = makeInstance(Promise.resolve());
    h.instance = inst;
    const voice = await loadMelodicSoundfont(1, channel);
    expect(voice.engine).toBe('smplr');
    expect(h.soundfontOpts?.instrumentUrl).toBe(soundfontUrlFor(1));
    voice.trigger('C4', 0.5, 1.25, 0.5);
    expect(inst.start).toHaveBeenCalledWith({
      note: 60,
      time: 1.25,
      duration: 0.5,
      velocity: 64,
    });
    // velocity clamps into MIDI range
    voice.trigger('C4', 0.5, 0, 2);
    expect(inst.start).toHaveBeenLastCalledWith(
      expect.objectContaining({ velocity: 127 }),
    );
    voice.dispose();
    expect(inst.stop).toHaveBeenCalled();
    expect(gainNode.disconnect).toHaveBeenCalled();
  });

  it('rejects for unmapped programs without touching smplr', async () => {
    await expect(loadMelodicSoundfont(999, channel)).rejects.toThrow('No soundfont mapped');
  });

  it('rejects and disconnects when smplr fails to load', async () => {
    h.instance = makeInstance(Promise.reject(new Error('404')));
    await expect(loadMelodicSoundfont(1, channel)).rejects.toThrow('404');
    expect(gainNode.disconnect).toHaveBeenCalled();
  });

  it('times out on a stalled network (AC-11 degrade trigger)', async () => {
    vi.useFakeTimers();
    h.instance = makeInstance(new Promise(() => {})); // never settles
    const pending = loadMelodicSoundfont(1, channel);
    const assertion = expect(pending).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(SOUNDFONT_LOAD_TIMEOUT_MS + 1);
    await assertion;
    expect(gainNode.disconnect).toHaveBeenCalled();
  });
});

describe('loadDrumSoundfont', () => {
  it('maps score hit names onto the machine sample groups (fuzzy)', async () => {
    const inst = makeInstance(Promise.resolve(), [
      'kick',
      'snare',
      'hat-closed',
      'hat-open',
      'clap',
      'tom-low',
    ]);
    h.instance = inst;
    const voice = await loadDrumSoundfont('electro', channel);
    expect(h.drumOpts?.instrument).toBe(DRUM_MACHINE_FOR_STYLE.electro);
    // The sample source is ALWAYS explicit — never smplr's baked-in default.
    expect(h.drumOpts?.url).toBe(drumMachineUrlFor('electro'));
    voice.trigger('hat', 0.25, 2, 0.4);
    expect(inst.start).toHaveBeenCalledWith({
      note: 'hat-closed',
      time: 2,
      velocity: 51,
    });
    voice.trigger('ride', 0.25, 2.5, 0.4); // no ride sample → open hat stands in
    expect(inst.start).toHaveBeenLastCalledWith(
      expect.objectContaining({ note: 'hat-open' }),
    );
  });

  it('rejects when the kit lacks usable kick/snare/hat samples', async () => {
    h.instance = makeInstance(Promise.resolve(), ['cowbell']);
    await expect(loadDrumSoundfont('rockkit', channel)).rejects.toThrow('no usable');
    expect(gainNode.disconnect).toHaveBeenCalled();
  });

  it('rejects unknown drum styles', async () => {
    await expect(loadDrumSoundfont('jazzkit', channel)).rejects.toThrow(
      'No drum machine mapped',
    );
  });
});
