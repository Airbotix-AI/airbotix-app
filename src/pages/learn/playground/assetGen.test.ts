import { describe, it, expect, vi } from 'vitest';
import { runGen, type AssetGenDeps } from './assetGen';

describe('asset generation — stub fallback (DEV sandbox, no projectId)', () => {
  it('returns an SVG data URL for images', async () => {
    const r = await runGen({ kind: 'image', prompt: 'a cheerful barista' });
    expect(r.mime).toBe('image/svg+xml');
    expect(r.dataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(r.meta?.stub).toBe(true);
  });

  it('returns a WAV data URL for audio', async () => {
    const r = await runGen({ kind: 'audio', prompt: 'coin pickup ding' });
    expect(r.mime).toBe('audio/wav');
    expect(r.dataUrl.startsWith('data:audio/wav;base64,')).toBe(true);
  });

  it('is deterministic for the same input', async () => {
    const a = await runGen({ kind: 'image', prompt: 'same prompt' });
    const b = await runGen({ kind: 'image', prompt: 'same prompt' });
    expect(a.dataUrl).toBe(b.dataUrl);
  });

  it('differs for different prompts', async () => {
    const a = await runGen({ kind: 'image', prompt: 'red truck' });
    const b = await runGen({ kind: 'image', prompt: 'blue truck' });
    expect(a.dataUrl).not.toBe(b.dataUrl);
  });
});

describe('asset generation — real backend (authed studio, projectId set)', () => {
  it('routes through the injected backend dep when a projectId is present', async () => {
    const generate = vi.fn().mockResolvedValue({ dataUrl: 'data:image/png;base64,AA', mime: 'image/png' });
    const deps: AssetGenDeps = { generate };
    const req = { projectId: 'game-1', kind: 'image' as const, prompt: 'a pixel coin' };

    const r = await runGen(req, deps);

    expect(generate).toHaveBeenCalledWith(req);
    expect(r.mime).toBe('image/png');
  });

  it('never falls back to the stub when a projectId is present', async () => {
    const generate = vi.fn().mockResolvedValue({ dataUrl: 'data:image/png;base64,AA', mime: 'image/png' });
    const r = await runGen({ projectId: 'game-1', kind: 'image', prompt: 'x' }, { generate });
    // A stub result would be image/svg+xml with meta.stub — assert it is NOT that.
    expect(r.mime).not.toBe('image/svg+xml');
    expect(r.meta?.stub).toBeUndefined();
  });
});
