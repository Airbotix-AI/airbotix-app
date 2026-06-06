import { describe, it, expect } from 'vitest';
import { runGen } from './assetGen';

describe('asset generation stub', () => {
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
