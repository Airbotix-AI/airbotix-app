// @vitest-environment jsdom
// D-HARN-11a — the console shim relays Error-object STACKS (clipped to
// STACK_CLIP_CHARS) on error lines, so the console's "Ask AI to fix" can send
// real fix evidence. The shim is evaluated in the jsdom window (the same pattern
// as the extension-guard test); in jsdom `parent === window`, so the shim's
// `parent.postMessage` lands on our capture stub.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CONSOLE_CAPTURE, STACK_CLIP_CHARS } from './buildPreview';

const JS = (tag: string) => tag.replace(/<\/?script>/g, '');

interface RelayedLine {
  __airbotixConsole?: boolean;
  level?: string;
  text?: string;
  loc?: { file: string; line: number; col: number };
  stack?: string;
}

describe('CONSOLE_CAPTURE — Error-stack relay (D-HARN-11a)', () => {
  const posted: RelayedLine[] = [];
  let origPostMessage: typeof window.postMessage;

  beforeAll(() => {
    // Capture postMessage BEFORE arming so the shim's boot "ready" line (and
    // every relay) lands here instead of jsdom's async dispatch. Armed ONCE —
    // re-evaluating would double-wrap the console methods.
    origPostMessage = window.postMessage;
    (window as { postMessage: unknown }).postMessage = (msg: unknown) => {
      if (msg && typeof msg === 'object' && (msg as RelayedLine).__airbotixConsole) {
        posted.push(msg as RelayedLine);
      }
    };
    (0, eval)(JS(CONSOLE_CAPTURE));
  });
  beforeEach(() => {
    posted.length = 0;
  });
  afterAll(() => {
    (window as { postMessage: unknown }).postMessage = origPostMessage;
  });

  const fireWindowError = (init: ErrorEventInit) => {
    window.dispatchEvent(new ErrorEvent('error', init));
    return posted.at(-1);
  };

  it('an uncaught window error posts its Error stack alongside text + loc', () => {
    const error = new Error('boom');
    error.stack = 'TypeError: boom\n    at Scene.create (src/scenes/Game.js:12:5)';
    const line = fireWindowError({
      message: 'TypeError: boom',
      filename: 'src/scenes/Game.js',
      lineno: 12,
      colno: 5,
      error,
    });
    expect(line?.level).toBe('error');
    expect(line?.text).toBe('TypeError: boom');
    expect(line?.loc).toEqual({ file: 'src/scenes/Game.js', line: 12, col: 5 });
    expect(line?.stack).toBe('TypeError: boom\n    at Scene.create (src/scenes/Game.js:12:5)');
  });

  it('a window error WITHOUT an Error object posts no stack', () => {
    const line = fireWindowError({ message: 'Script error.', filename: 'main.js', lineno: 1 });
    expect(line?.level).toBe('error');
    expect(line?.stack).toBeUndefined();
  });

  it(`clips a huge stack to STACK_CLIP_CHARS (${STACK_CLIP_CHARS})`, () => {
    const error = new Error('big');
    error.stack = 'x'.repeat(STACK_CLIP_CHARS * 5);
    const line = fireWindowError({ message: 'big', filename: 'main.js', lineno: 1, error });
    expect(line?.stack).toHaveLength(STACK_CLIP_CHARS);
  });

  it('console.error with an Error argument posts its (clipped) stack', () => {
    const error = new Error('kaput');
    error.stack = 'Error: kaput\n    at update (main.js:3:1)';
    console.error('something broke:', error);
    const line = posted.at(-1);
    expect(line?.level).toBe('error');
    expect(line?.text).toContain('kaput');
    expect(line?.stack).toBe('Error: kaput\n    at update (main.js:3:1)');
  });

  it('console.error with only strings posts no stack', () => {
    console.error('plain', 'strings');
    const line = posted.at(-1);
    expect(line?.level).toBe('error');
    expect(line?.text).toBe('plain strings');
    expect(line?.stack).toBeUndefined();
  });

  it('non-error levels never scan for stacks (warn with an Error stays stack-free)', () => {
    console.warn(new Error('just a warning'));
    const line = posted.at(-1);
    expect(line?.level).toBe('warn');
    expect(line?.stack).toBeUndefined();
  });
});
