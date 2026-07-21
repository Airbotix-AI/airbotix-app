// @vitest-environment jsdom

// Voice controller (PRD §6.1): instant Tone.js fallback, in-place smplr
// upgrade, loud console degrade on load failure (AC-11), and safe disposal
// mid-load. smplr + the fallback recipes are mocked — scheduling stays put.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  makeFallbackVoice: vi.fn(),
  loadMelodicSoundfont: vi.fn(),
  loadDrumSoundfont: vi.fn(),
  smplrEnabled: vi.fn(() => true),
}));

vi.mock('./toneFallbackVoices', () => ({ makeFallbackVoice: h.makeFallbackVoice }));
vi.mock('./soundfont', () => ({
  loadMelodicSoundfont: h.loadMelodicSoundfont,
  loadDrumSoundfont: h.loadDrumSoundfont,
  smplrEnabled: h.smplrEnabled,
}));

import { createTrackVoice } from './voices';
import type * as ToneType from 'tone';

const channel = {} as unknown as ToneType.Channel;

function fallbackVoice() {
  return { engine: 'tone' as const, trigger: vi.fn(), dispose: vi.fn() };
}
function smplrVoice() {
  return { engine: 'smplr' as const, trigger: vi.fn(), dispose: vi.fn() };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.smplrEnabled.mockReturnValue(true);
});

describe('createTrackVoice', () => {
  it('starts on the Tone.js fallback, then upgrades to smplr in place', async () => {
    const fallback = fallbackVoice();
    const smplr = smplrVoice();
    h.makeFallbackVoice.mockReturnValue(fallback);
    h.loadMelodicSoundfont.mockResolvedValue(smplr);

    const voice = createTrackVoice('piano', 'grand', channel);
    expect(voice.engine).toBe('tone');
    voice.trigger('C4', 0.5, 0, 0.9);
    expect(fallback.trigger).toHaveBeenCalledWith('C4', 0.5, 0, 0.9);
    expect(h.loadMelodicSoundfont).toHaveBeenCalledWith(1, channel); // 🎩 Grand → GM 1

    await voice.ready;
    expect(voice.engine).toBe('smplr');
    expect(fallback.dispose).toHaveBeenCalled(); // old voice freed on swap
    voice.trigger('E4', 0.5, 1, 0.7);
    expect(smplr.trigger).toHaveBeenCalledWith('E4', 0.5, 1, 0.7);
  });

  it('drum slots load the drum machine for the style, not a melodic program', async () => {
    h.makeFallbackVoice.mockReturnValue(fallbackVoice());
    h.loadDrumSoundfont.mockResolvedValue(smplrVoice());
    const voice = createTrackVoice('drums', 'electro', channel);
    await voice.ready;
    expect(h.loadDrumSoundfont).toHaveBeenCalledWith('electro', channel);
    expect(h.loadMelodicSoundfont).not.toHaveBeenCalled();
    expect(voice.engine).toBe('smplr');
  });

  it('stays on the fallback and warns when the soundfont fails (AC-11)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fallback = fallbackVoice();
    h.makeFallbackVoice.mockReturnValue(fallback);
    h.loadMelodicSoundfont.mockRejectedValue(new Error('offline'));

    const voice = createTrackVoice('guitar', 'crunch', channel);
    await voice.ready; // must settle, not reject — playback never interrupts
    expect(voice.engine).toBe('tone');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('guitar/crunch'),
      expect.any(Error),
    );
    expect(String(warn.mock.calls[0][0])).toContain('Tone.js fallback');
    voice.trigger('E3', 0.5, 0, 0.9);
    expect(fallback.trigger).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('never attempts a soundfont when the smplr path is gated off (OQ-3 launch gate)', async () => {
    h.smplrEnabled.mockReturnValue(false);
    h.makeFallbackVoice.mockReturnValue(fallbackVoice());
    const voice = createTrackVoice('piano', 'grand', channel);
    await voice.ready; // settles immediately — no network, no degrade warning
    expect(h.loadMelodicSoundfont).not.toHaveBeenCalled();
    expect(h.loadDrumSoundfont).not.toHaveBeenCalled();
    expect(voice.engine).toBe('tone');
  });

  it('never attempts a soundfont for style = None', async () => {
    h.makeFallbackVoice.mockReturnValue(fallbackVoice());
    const voice = createTrackVoice('keys', 'none', channel);
    await voice.ready;
    expect(h.loadMelodicSoundfont).not.toHaveBeenCalled();
    expect(h.loadDrumSoundfont).not.toHaveBeenCalled();
    expect(voice.engine).toBe('tone');
  });

  it('vocal tracks sing via the choir programs, not the slot style', async () => {
    h.makeFallbackVoice.mockReturnValue(fallbackVoice());
    h.loadMelodicSoundfont.mockResolvedValue(smplrVoice());
    // A lead-vocal melody lands on the piano slot; the Pop preset's syntharp
    // (GM 82) must NOT win — vocals load Choir Aahs (GM 53).
    const lead = createTrackVoice('piano', 'syntharp', channel, 'lead_vocals');
    await lead.ready;
    expect(h.loadMelodicSoundfont).toHaveBeenCalledWith(53, channel);

    h.loadMelodicSoundfont.mockClear();
    const backing = createTrackVoice('keys', 'ep', channel, 'backing_vocals');
    await backing.ready;
    expect(h.loadMelodicSoundfont).toHaveBeenCalledWith(54, channel); // Voice Oohs
  });

  it('style = None silences vocal tracks too — the kid’s mute wins', async () => {
    h.makeFallbackVoice.mockReturnValue(fallbackVoice());
    const voice = createTrackVoice('piano', 'none', channel, 'lead_vocals');
    await voice.ready;
    expect(h.loadMelodicSoundfont).not.toHaveBeenCalled();
    expect(voice.engine).toBe('tone');
  });

  it('non-vocal tracks still follow the slot style (guitar stays guitar)', async () => {
    h.makeFallbackVoice.mockReturnValue(fallbackVoice());
    h.loadMelodicSoundfont.mockResolvedValue(smplrVoice());
    const voice = createTrackVoice('guitar', 'crunch', channel, 'guitar');
    await voice.ready;
    expect(h.loadMelodicSoundfont).toHaveBeenCalledWith(29, channel); // ⚡ Crunch
  });

  it('disposing mid-load discards the late soundfont and mutes triggers', async () => {
    const fallback = fallbackVoice();
    const smplr = smplrVoice();
    h.makeFallbackVoice.mockReturnValue(fallback);
    let resolveLoad: (v: typeof smplr) => void = () => undefined;
    h.loadMelodicSoundfont.mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );

    const voice = createTrackVoice('bass', 'sub', channel);
    voice.dispose();
    expect(fallback.dispose).toHaveBeenCalledTimes(1);
    resolveLoad(smplr);
    await voice.ready;
    expect(smplr.dispose).toHaveBeenCalled(); // late arrival is torn down
    voice.trigger('E2', 0.5, 0, 0.9);
    expect(fallback.trigger).not.toHaveBeenCalled();
    expect(smplr.trigger).not.toHaveBeenCalled();
  });
});
