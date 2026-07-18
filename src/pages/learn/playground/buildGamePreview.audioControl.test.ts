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

/**
 * jsdom has no real media playback (`HTMLMediaElement.prototype.play` throws
 * "Not implemented"). Give the prototype safe play/pause/paused stubs BEFORE the
 * shim wraps `play()`, model `paused` via a `__playing` flag, then restore — so a
 * bare `new Audio()` behaves like a real looping element the shim can silence.
 */
function withStubbedMedia(body: () => void): void {
  const proto = window.HTMLMediaElement.prototype as unknown as {
    play: () => Promise<void>;
    pause: () => void;
  };
  const origPlay = proto.play;
  const origPause = proto.pause;
  const origPaused = Object.getOwnPropertyDescriptor(window.HTMLMediaElement.prototype, 'paused');
  proto.play = function (this: { __playing?: boolean }) {
    this.__playing = true;
    return Promise.resolve();
  };
  proto.pause = function (this: { __playing?: boolean }) {
    this.__playing = false;
  };
  Object.defineProperty(window.HTMLMediaElement.prototype, 'paused', {
    configurable: true,
    get(this: { __playing?: boolean }) {
      return !this.__playing;
    },
  });
  try {
    body();
  } finally {
    proto.play = origPlay;
    proto.pause = origPause;
    if (origPaused) Object.defineProperty(window.HTMLMediaElement.prototype, 'paused', origPaused);
  }
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

  // The most common way a hand-written BGM slips past the DOM query: a bare
  // `new Audio(src)` that loops but is never appended to the document.
  it('mutes and pauses a bare new Audio() that was never added to the DOM', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
    withStubbedMedia(() => {
      runShim();
      const bgm = new Audio('song.mp3');
      bgm.loop = true;
      void bgm.play(); // starts playing; never inserted into the document
      expect(document.querySelector('audio')).toBeNull(); // truly not in the DOM

      control('mute');
      expect(bgm.muted).toBe(true);
      control('unmute');
      expect(bgm.muted).toBe(false);

      control('pause');
      expect(bgm.paused).toBe(true);
      control('resume');
      expect(bgm.paused).toBe(false);
    });
  });

  it('silences a detached BGM that only starts playing AFTER mute (sticky state)', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
    withStubbedMedia(() => {
      runShim();
      control('mute'); // muted while nothing is playing yet
      const bgm = new Audio('late.mp3');
      void bgm.play(); // begins after the mute — must be born silenced
      expect(bgm.muted).toBe(true);
    });
  });

  it('a WebAudio context created after mute is born with its master gain at 0 (sticky state)', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
    runShim();
    control('mute'); // muted before the game creates its context
    const ctx = new (window as unknown as { AudioContext: new () => MockAudioContext }).AudioContext();
    expect(ctx.__airbotixGain?.gain.value).toBe(0);
  });
});
