// The run-report collector (D-PAP-40/41) — the pure state-folding behind the
// post-apply verification loop. Classification, caps + `dropped` transparency,
// de-duping, and asset-manifest mapping are all asserted here so GameFrame's
// wiring stays a thin feed. Mirror contract: keep the shapes in lockstep with
// platform-backend/src/code-sessions/run-report.ts.
import { describe, expect, it } from 'vitest';

import type { AssetManifestEntry, ConsoleLine } from './buildGamePreview';
import {
  createRunCollector,
  isAssetMessage,
  isRunReportMessage,
  MAX_REPORT_ERRORS,
  MAX_REPORT_REJECTIONS,
  MAX_REPORT_WARNS,
  MAX_REPORT_WINDOW_ERRORS,
  RUN_REPORT_VERSION,
  type RunCollectorOptions,
} from './runReport';

const line = (level: ConsoleLine['level'], text: string, loc?: ConsoleLine['loc']): ConsoleLine => ({
  level,
  text,
  loc,
});

function collector(overrides: Partial<RunCollectorOptions> = {}) {
  return createRunCollector({ engine: 'phaser', attempt: 1, assetManifest: [], ...overrides });
}

describe('createRunCollector — console classification', () => {
  it('routes rejections / window errors / console errors / warns to their buckets', () => {
    const c = collector();
    c.feedConsole(line('error', 'Unhandled promise: boom'));
    c.feedConsole(line('error', 'TypeError: x is undefined', { file: 'main.js', line: 3, col: 1 }));
    c.feedConsole(line('error', 'Could not load the game engine'));
    c.feedConsole(line('warn', 'this API is deprecated'));
    c.feedConsole(line('log', 'hello'));
    c.feedConsole(line('info', 'ready'));
    const r = c.finalize(4000);
    expect(r.unhandledRejections).toEqual(['Unhandled promise: boom']);
    expect(r.windowErrors).toEqual(['TypeError: x is undefined (main.js:3)']);
    expect(r.consoleErrors).toEqual(['Could not load the game engine']);
    expect(r.consoleWarns).toEqual(['this API is deprecated']);
  });

  it("skips the shim's 'ready' handshake and blank lines", () => {
    const c = collector();
    c.feedConsole(line('error', 'ready'));
    c.feedConsole(line('error', '   '));
    const r = c.finalize(0);
    expect(r.consoleErrors).toEqual([]);
  });

  it('PROMOTES a curated failure warn into consoleErrors (dirties the report)', () => {
    // The backend clean-run predicate treats consoleWarns as advisory — a
    // Phaser missing texture (console.warn) must land error-class or a broken
    // game would verify clean.
    const c = collector();
    c.feedConsole(line('warn', '[airbotix] 3D model failed to load: hero.glb — 404'));
    c.feedConsole(line('warn', 'Texture "hero" not found in cache'));
    c.feedConsole(line('warn', 'Scene "Main" not found'));
    c.feedConsole(line('warn', 'Failed to process file: image "bg"'));
    c.feedConsole(line('warn', 'just a chatty kid warn'));
    const r = c.finalize(0);
    expect(r.consoleErrors).toEqual([
      '[airbotix] 3D model failed to load: hero.glb — 404',
      'Texture "hero" not found in cache',
      'Scene "Main" not found',
      'Failed to process file: image "bg"',
    ]);
    expect(r.consoleWarns).toEqual(['just a chatty kid warn']);
  });

  it('de-dupes identical lines (merged, not counted as dropped)', () => {
    const c = collector();
    for (let i = 0; i < 5; i++) c.feedConsole(line('error', 'same boom'));
    const r = c.finalize(0);
    expect(r.consoleErrors).toEqual(['same boom']);
    expect(r.dropped.errors).toBe(0);
  });

  it('caps each bucket and counts the overflow in dropped — never silently', () => {
    const c = collector();
    for (let i = 0; i < MAX_REPORT_ERRORS + 2; i++) c.feedConsole(line('error', `err ${i}`));
    for (let i = 0; i < MAX_REPORT_WARNS + 3; i++) c.feedConsole(line('warn', `warn ${i}`));
    for (let i = 0; i < MAX_REPORT_REJECTIONS + 1; i++)
      c.feedConsole(line('error', `Unhandled promise: rej ${i}`));
    for (let i = 0; i < MAX_REPORT_WINDOW_ERRORS + 1; i++)
      c.feedConsole(line('error', `win ${i}`, { file: 'main.js', line: i + 1, col: 1 }));
    const r = c.finalize(0);
    expect(r.consoleErrors).toHaveLength(MAX_REPORT_ERRORS);
    expect(r.consoleWarns).toHaveLength(MAX_REPORT_WARNS);
    expect(r.unhandledRejections).toHaveLength(MAX_REPORT_REJECTIONS);
    expect(r.windowErrors).toHaveLength(MAX_REPORT_WINDOW_ERRORS);
    // window-error overflow is error-class → counted under dropped.errors.
    expect(r.dropped).toEqual({ errors: 3, warns: 3, rejections: 1 });
  });

  it('clips every line to 300 chars', () => {
    const c = collector();
    c.feedConsole(line('error', 'x'.repeat(500)));
    expect(c.finalize(0).consoleErrors[0]).toHaveLength(300);
  });
});

describe('createRunCollector — frames / probe / finalize shape', () => {
  it('booted follows the max engine frames seen; fps is the last tick', () => {
    const c = collector();
    expect(c.finalize(0).booted).toBe(false);
    c.feedFrames(10, 60);
    c.feedFrames(240, 58);
    c.feedFrames(0, 0); // a late zero tick never un-boots the run
    const r = c.finalize(4000);
    expect(r.booted).toBe(true);
    expect(r.framesAdvanced).toBe(240);
    expect(r.fps).toBe(0);
  });

  it('finalize produces the full v1 shape with clamped observedMs', () => {
    const c = collector({ engine: 'three', attempt: 2 });
    c.feedProbe({ present: true, nonBlank: true, sampled: 64 });
    const r = c.finalize(999_999);
    expect(r).toMatchObject({
      reportVersion: RUN_REPORT_VERSION,
      attempt: 2,
      engine: 'three',
      observedMs: 120_000,
      booted: false,
      framesAdvanced: 0,
      canvas: { present: true, nonBlank: true, sampled: 64 },
      dropped: { errors: 0, warns: 0, rejections: 0 },
    });
    expect(r.probeError).toBeUndefined();
  });

  it('setProbeError marks the run inconclusive (first reason wins)', () => {
    const c = collector();
    c.setProbeError('no-response');
    c.setProbeError('later');
    expect(c.finalize(0).probeError).toBe('no-response');
  });

  it('feedProbe tolerates a malformed sample (nonBlank stays null)', () => {
    const c = collector();
    c.feedProbe({ present: true, nonBlank: 'yes' as unknown as boolean, sampled: 99999 });
    expect(c.finalize(0).canvas).toEqual({ present: true, nonBlank: null, sampled: 4096 });
  });
});

describe('createRunCollector — asset mapping', () => {
  const manifest: AssetManifestEntry[] = [
    { path: 'assets/hero.png', prefix: 'data:image/png;base64,AAAA', length: 26 },
    { path: 'assets/robot.glb', prefix: 'data:model/gltf-binary;base64,BBBB', length: 34 },
  ];

  it('maps a data: URL back to the kid path by prefix+length', () => {
    const c = collector({ assetManifest: manifest });
    c.feedAsset({ url: 'data:image/png;base64,AAAA', len: 26, ok: true });
    c.feedAsset({ url: 'data:model/gltf-binary;base64,BBBB', len: 34, ok: false, error: 'bad glTF' });
    expect(c.finalize(0).assets).toEqual([
      { path: 'assets/hero.png', status: 'loaded' },
      { path: 'assets/robot.glb', status: 'failed', detail: 'bad glTF' },
    ]);
  });

  it('same prefix but different length is NOT a manifest match', () => {
    const c = collector({ assetManifest: manifest });
    c.feedAsset({ url: 'data:image/png;base64,AAAA', len: 9999, ok: false });
    expect(c.finalize(0).assets[0].path).toBe('data:image/png;base64,AAAA');
  });

  it('flags a raw relative path (never rewritten by the inliner) as missing-ref', () => {
    const c = collector({ assetManifest: manifest });
    c.feedAsset({ url: 'assets/ghost.glb', len: 16, ok: false, error: '404' });
    expect(c.finalize(0).assets).toEqual([
      { path: 'assets/ghost.glb', status: 'missing-ref', detail: '404' },
    ]);
  });

  it('records http(s) urls by outcome and de-dupes by path with a 20 cap', () => {
    const c = collector();
    c.feedAsset({ url: 'https://example.com/a.png', len: 25, ok: true });
    c.feedAsset({ url: 'https://example.com/a.png', len: 25, ok: false }); // dupe
    for (let i = 0; i < 30; i++) c.feedAsset({ url: `https://example.com/${i}.png`, len: 20, ok: true });
    const r = c.finalize(0);
    expect(r.assets[0]).toEqual({ path: 'https://example.com/a.png', status: 'loaded' });
    expect(r.assets).toHaveLength(20);
  });
});

describe('message guards', () => {
  it('isRunReportMessage / isAssetMessage accept only their tagged shapes', () => {
    expect(isRunReportMessage({ __airbotixRunReport: true, canvas: { present: true, nonBlank: null, sampled: 0 } })).toBe(true);
    expect(isRunReportMessage({ __airbotixRunReport: false })).toBe(false);
    expect(isRunReportMessage(null)).toBe(false);
    expect(isAssetMessage({ __airbotixAsset: true, url: 'x', len: 1, ok: true })).toBe(true);
    expect(isAssetMessage({ __airbotixStat: true })).toBe(false);
    expect(isAssetMessage('nope')).toBe(false);
  });
});
