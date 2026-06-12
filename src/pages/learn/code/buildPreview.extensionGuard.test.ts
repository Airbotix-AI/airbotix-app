// @vitest-environment jsdom
// Extension-noise guard (wallet extensions inject into every frame; inside the
// opaque-origin sandbox their localStorage touch throws an uncaught
// SecurityError). The guard must be the FIRST script in every srcdoc, cancel
// error events from extension URLs, and never swallow the kid's own errors.

import { describe, expect, it } from 'vitest';

import { buildGameSrcDoc } from '../playground/buildGamePreview';
import { CONSOLE_CAPTURE, EXTENSION_NOISE_GUARD, buildSrcDoc } from './buildPreview';

const JS = (tag: string) => tag.replace(/<\/?script>/g, '');

describe('EXTENSION_NOISE_GUARD placement', () => {
  it('is the first script in the game srcdoc (before the console relay)', () => {
    const doc = buildGameSrcDoc([
      { path: 'main.js', kind: 'text', content: 'x', size: 1 },
    ] as never);
    const guardAt = doc.indexOf('extension:');
    expect(guardAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(doc.indexOf('__airbotixConsole'));
    expect(doc.indexOf('<script>')).toBe(doc.indexOf(EXTENSION_NOISE_GUARD.trim().slice(0, 8)));
  });

  it('is in the code-studio preview srcdoc too', () => {
    const doc = buildSrcDoc([
      { path: 'index.html', kind: 'text', content: '<p>hi</p>', size: 1 },
    ] as never);
    expect(doc.indexOf('extension:')).toBeLessThan(doc.indexOf('__airbotixConsole'));
  });
});

describe('guard behaviour (evaluated in a window)', () => {
  function arm() {
    (0, eval)(JS(EXTENSION_NOISE_GUARD));
  }
  const fire = (filename: string) => {
    const e = new ErrorEvent('error', { cancelable: true, message: 'SecurityError', filename });
    window.dispatchEvent(e);
    return e;
  };

  it('cancels errors sourced from extension URLs (all major schemes)', () => {
    arm();
    for (const src of [
      'chrome-extension://abc/requestProvider.js',
      'moz-extension://abc/inject.js',
      'safari-web-extension://abc/x.js',
    ]) {
      expect(fire(src).defaultPrevented, src).toBe(true);
    }
  });

  it("never cancels the kid's own errors (sourceURL'd files, blob, srcdoc)", () => {
    arm();
    for (const src of ['src/scenes/Game.js', 'about:srcdoc', 'blob:https://x/y', '']) {
      expect(fire(src).defaultPrevented, src || '(empty)').toBe(false);
    }
  });
});

describe('console relay filter', () => {
  it('the relay skips extension-source errors (race belt-and-braces)', () => {
    expect(CONSOLE_CAPTURE).toContain("-extension:/.test(e.filename || '')");
  });
});
