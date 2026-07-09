// @vitest-environment jsdom
//
// The pause/mute buttons must actually SILENCE a running game, not just freeze
// its render loop. The engine shims call `loop.sleep()` / `cancelAnimationFrame`,
// which leave Web Audio (running on the AudioContext hardware clock) untouched —
// so looping background music kept playing through a "pause", and three.js games
// (which rarely wire the optional `setMuted`) ignored "mute" entirely.
//
// The engine-AGNOSTIC `AUDIO_CONTROL` shim fixes both by patching the
// `AudioContext` constructor (before any engine boots) to track every context and
// route it through a master gain, then reacting to the control messages. This test
// executes that exact injected script against a mocked AudioContext + a real
// <audio> element and asserts pause suspends / mute zeroes the gain.
import { afterEach, describe, expect, it } from 'vitest';
import { buildGamePreview } from './buildGamePreview';
import type { VfsFile } from '../code/codeApi';

const FILES: VfsFile[] = [
  { path: 'main.js', content: 'new Phaser.Game({});', kind: 'text', size: 20 },
];

/** Pull the `AUDIO_CONTROL` shim's inner JS straight out of the built srcDoc. */
function audioControlSource(): string {
  const doc = buildGamePreview(FILES).srcDoc;
  const marker = doc.indexOf('__airbotixTracked');
  const open = doc.lastIndexOf('<script>', marker) + '<script>'.length;
  const close = doc.indexOf('</script>', marker);
  return doc.slice(open, close);
}

/** Run the shim in the jsdom global scope (where `window`/`document` live). */
function runShim(): void {
  new Function(audioControlSource())();
}

class MockGain {
  gain = { value: 1 };
  connected: unknown = null;
  connect(dest: unknown): void {
    this.connected = dest;
  }
}

class MockAudioContext {
  destination: unknown = { real: true };
  suspendCalls = 0;
  resumeCalls = 0;
  __airbotixGain?: MockGain;
  createGain(): MockGain {
    return new MockGain();
  }
  suspend(): Promise<void> {
    this.suspendCalls += 1;
    return Promise.resolve();
  }
  resume(): Promise<void> {
    this.resumeCalls += 1;
    return Promise.resolve();
  }
}

function control(action: 'pause' | 'resume' | 'mute' | 'unmute'): void {
  window.dispatchEvent(new MessageEvent('message', { data: { __airbotixControl: true, action } }));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('AUDIO_CONTROL shim (pause/mute actually silence the game)', () => {
  it('patches the AudioContext constructor and re-routes it through a master gain', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
    runShim();
    const ctx = new (window as unknown as { AudioContext: new () => MockAudioContext }).AudioContext();
    // The kid's audio graph now flows through our gain, which feeds the real output.
    expect(ctx.__airbotixGain).toBeInstanceOf(MockGain);
    expect((ctx as unknown as { destination: unknown }).destination).toBe(ctx.__airbotixGain);
    expect(ctx.__airbotixGain?.connected).toEqual({ real: true });
  });

  it('pause suspends the audio context; resume wakes it (music no longer plays through pause)', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
    runShim();
    const ctx = new (window as unknown as { AudioContext: new () => MockAudioContext }).AudioContext();
    control('pause');
    expect(ctx.suspendCalls).toBe(1);
    control('resume');
    expect(ctx.resumeCalls).toBe(1);
  });

  it('mute zeroes the master gain; unmute restores it (audio silenced while the game runs)', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
    runShim();
    const ctx = new (window as unknown as { AudioContext: new () => MockAudioContext }).AudioContext();
    control('mute');
    expect(ctx.__airbotixGain?.gain.value).toBe(0);
    control('unmute');
    expect(ctx.__airbotixGain?.gain.value).toBe(1);
  });

  it('also controls raw <audio>/<video> media elements (not just engine WebAudio)', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
    runShim();
    const el = document.createElement('audio');
    document.body.appendChild(el);
    let paused = false;
    Object.defineProperty(el, 'paused', { get: () => paused, configurable: true });
    el.pause = () => {
      paused = true;
    };
    el.play = () => {
      paused = false;
      return Promise.resolve();
    };

    control('mute');
    expect(el.muted).toBe(true);
    control('unmute');
    expect(el.muted).toBe(false);

    control('pause');
    expect(paused).toBe(true);
    control('resume');
    expect(paused).toBe(false);
  });
});
