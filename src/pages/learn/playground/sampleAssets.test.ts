import { describe, it, expect } from 'vitest';
import { SAMPLE_ASSETS, isPreloadedAsset, withPreloadedAssets } from './sampleAssets';

describe('sample assets — never persisted, and the strip covers all of them', () => {
  it('flags every seeded sample as preloaded, so the save-strip excludes them all', () => {
    // PlaygroundApp saves `files.filter((f) => !isPreloadedAsset(f.path))`. If any
    // seeded sample weren't flagged it would be persisted (bloat) and — for the
    // audio/video ones — used to fail the whole save (VFS_EXTENSION_FORBIDDEN).
    const seeded = withPreloadedAssets([]);
    expect(seeded.length).toBeGreaterThan(0);
    for (const f of seeded) expect(isPreloadedAsset(f.path)).toBe(true);
    // The strip removes everything withPreloadedAssets adds.
    expect(seeded.filter((f) => !isPreloadedAsset(f.path))).toEqual([]);
  });

  it('seeds audio AND video samples (the backend allow-list must permit these)', () => {
    const paths = SAMPLE_ASSETS.map((a) => a.path);
    expect(paths.some((p) => /\.(wav|mp3|ogg|m4a)$/.test(p))).toBe(true);
    expect(paths.some((p) => /\.(mp4|webm)$/.test(p))).toBe(true);
  });
});
