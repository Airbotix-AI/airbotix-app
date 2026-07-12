// @vitest-environment jsdom

// §5 fallback-voice recipes: right synth family per style, style transposes
// (Deep Sub −12st / Music Box +12st), effect chains, and the drum-kit split
// between membrane (kick/tom) and noise (snare/hat/ride/clap) voices.

import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeToneNode {
  ctorArgs: unknown[];
  connect: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  triggerAttackRelease: ReturnType<typeof vi.fn>;
}

const h = vi.hoisted(() => {
  const created: Record<string, FakeToneNodeShape[]> = {};
  interface FakeToneNodeShape {
    ctorArgs: unknown[];
    connect: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    triggerAttackRelease: ReturnType<typeof vi.fn>;
  }
  function makeClass(name: string) {
    return class {
      ctorArgs: unknown[];
      connect = vi.fn();
      dispose = vi.fn();
      start = vi.fn(() => this);
      triggerAttackRelease = vi.fn();
      constructor(...args: unknown[]) {
        this.ctorArgs = args;
        (created[name] ??= []).push(this);
      }
    };
  }
  return {
    created,
    PolySynth: makeClass('PolySynth'),
    MonoSynth: makeClass('MonoSynth'),
    PluckSynth: makeClass('PluckSynth'),
    MembraneSynth: makeClass('MembraneSynth'),
    NoiseSynth: makeClass('NoiseSynth'),
    Distortion: makeClass('Distortion'),
    Filter: makeClass('Filter'),
    Tremolo: makeClass('Tremolo'),
    Synth: makeClass('Synth'),
  };
});

vi.mock('tone', () => ({
  PolySynth: h.PolySynth,
  MonoSynth: h.MonoSynth,
  PluckSynth: h.PluckSynth,
  MembraneSynth: h.MembraneSynth,
  NoiseSynth: h.NoiseSynth,
  Distortion: h.Distortion,
  Filter: h.Filter,
  Tremolo: h.Tremolo,
  Synth: h.Synth,
}));

import { makeFallbackVoice } from './toneFallbackVoices';
import type * as ToneType from 'tone';

const channel = { name: 'channel' } as unknown as ToneType.Channel;

function last(name: string): FakeToneNode {
  const list = h.created[name];
  return list[list.length - 1] as FakeToneNode;
}

beforeEach(() => {
  for (const key of Object.keys(h.created)) delete h.created[key];
});

describe('makeFallbackVoice — melodic recipes', () => {
  it('guitar/acoustic uses a PluckSynth straight into the channel', () => {
    makeFallbackVoice('guitar', 'acoustic', channel);
    expect(h.created.PluckSynth).toHaveLength(1);
    expect(last('PluckSynth').connect).toHaveBeenCalledWith(channel);
  });

  it('guitar/crunch chains a square PolySynth through a Distortion (WaveShaper)', () => {
    makeFallbackVoice('guitar', 'crunch', channel);
    const distortion = last('Distortion');
    expect(distortion.connect).toHaveBeenCalledWith(channel);
    expect(last('PolySynth').connect).toHaveBeenCalledWith(distortion);
  });

  it('bass/sub plays a sine an octave down (E2 → ~41.2 Hz)', () => {
    const voice = makeFallbackVoice('bass', 'sub', channel);
    voice.trigger('E2', 0.5, 1, 0.8);
    const call = last('MonoSynth').triggerAttackRelease.mock.calls[0];
    expect(call[0]).toBeCloseTo(41.2034, 3);
    expect(call[1]).toBe(0.5);
    expect(call[2]).toBe(1);
    expect(call[3]).toBe(0.8);
  });

  it('piano/musicbox rings an octave up (C4 → ~523.25 Hz)', () => {
    const voice = makeFallbackVoice('piano', 'musicbox', channel);
    voice.trigger('C4', 0.25, 0, 0.6);
    const call = last('PolySynth').triggerAttackRelease.mock.calls[0];
    expect(call[0]).toBeCloseTo(523.2511, 3);
  });

  it('keys/organ starts its tremolo LFO; keys/pad low-passes detuned saws', () => {
    makeFallbackVoice('keys', 'organ', channel);
    expect(last('Tremolo').start).toHaveBeenCalled();
    makeFallbackVoice('keys', 'pad', channel);
    expect(last('Filter').ctorArgs).toEqual([1200, 'lowpass']);
  });

  it('unknown styles (incl. "none") fall back to a neutral voice without throwing', () => {
    const voice = makeFallbackVoice('piano', 'none', channel);
    voice.trigger('C4', 0.5, 0, 0.9);
    expect(last('PolySynth').triggerAttackRelease).toHaveBeenCalledWith('C4', 0.5, 0, 0.9);
  });

  it('dispose tears down the synth and its effects', () => {
    const voice = makeFallbackVoice('guitar', 'crunch', channel);
    voice.dispose();
    expect(last('PolySynth').dispose).toHaveBeenCalled();
    expect(last('Distortion').dispose).toHaveBeenCalled();
  });
});

describe('makeFallbackVoice — drum kits', () => {
  it('routes kick/tom to the membrane voice and snare/hat to the noise voice', () => {
    const voice = makeFallbackVoice('drums', 'rockkit', channel);
    voice.trigger('kick', 0.5, 0, 1);
    expect(last('MembraneSynth').triggerAttackRelease).toHaveBeenCalledWith('C1', '8n', 0, 1);
    voice.trigger('hat', 0.25, 0.5, 1);
    expect(last('NoiseSynth').triggerAttackRelease).toHaveBeenCalledWith('32n', 0.5, 0.3);
  });

  it('lofikit softens: low-pass in front of the channel + scaled velocity', () => {
    const voice = makeFallbackVoice('drums', 'lofikit', channel);
    const filter = last('Filter');
    expect(filter.ctorArgs).toEqual([2000, 'lowpass']);
    expect(filter.connect).toHaveBeenCalledWith(channel);
    voice.trigger('snare', 0.25, 0, 1);
    const call = last('NoiseSynth').triggerAttackRelease.mock.calls[0];
    expect(call[2]).toBeCloseTo(0.9 * 0.8, 5);
  });

  it('unknown hit names land on the kick voice instead of crashing', () => {
    const voice = makeFallbackVoice('drums', 'electro', channel);
    voice.trigger('cowbell', 0.25, 0, 1);
    expect(last('MembraneSynth').triggerAttackRelease).toHaveBeenCalledWith('C1', '8n', 0, 1);
  });
});
