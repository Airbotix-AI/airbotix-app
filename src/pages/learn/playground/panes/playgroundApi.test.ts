// @vitest-environment jsdom
// jsdom gives FileReader/Blob for fetchAssetDataUrl; the rest is pure request-shape.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the shared api client so we assert the request shape without a network.
const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiMock(...args) }));
// Mock the readVfs the resolver delegates to (its own module is tested elsewhere).
vi.mock('../../code/codeApi', () => ({ readVfs: vi.fn() }));

import { createGameProject, fetchAssetDataUrl, listClassAssets, transcribeVoice } from './playgroundApi';

describe('createGameProject (PRD J1)', () => {
  beforeEach(() => apiMock.mockReset());

  it('POSTs a kind=game project with the kid title + Phaser template', async () => {
    apiMock.mockResolvedValue({ id: 'game-1' });
    const res = await createGameProject({
      kidId: 'kid-1',
      familyId: 'fam-1',
      title: 'SUPERCAT',
      template: 'phaser_pong',
    });
    expect(res).toEqual({ id: 'game-1' });
    expect(apiMock).toHaveBeenCalledWith('/projects', {
      method: 'POST',
      body: {
        title: 'SUPERCAT',
        product_line: 'line_b_coding',
        kind: 'game',
        template: 'phaser_pong',
        kid_id: 'kid-1',
        family_id: 'fam-1',
      },
    });
  });

  it('omits kid/family ids when absent (DEV / no auth)', async () => {
    apiMock.mockResolvedValue({ id: 'game-2' });
    await createGameProject({ kidId: null, familyId: null, title: 'My Game', template: 'phaser_blank' });
    const [, opts] = apiMock.mock.calls[0];
    expect(opts.body).not.toHaveProperty('kid_id');
    expect(opts.body).not.toHaveProperty('family_id');
  });
});

describe('listClassAssets (class-shared-assets-prd)', () => {
  beforeEach(() => apiMock.mockReset());

  it('GETs the project class-assets endpoint via the shared api client', async () => {
    const assets = [
      {
        id: 'ca-1',
        class_id: 'class-1',
        name: 'hero.png',
        kind: 'image',
        mime_type: 'image/png',
        size_bytes: 2048,
        created_at: '2026-06-23T00:00:00Z',
        download_url: 'https://signed.example/hero.png?sig=abc',
      },
    ];
    apiMock.mockResolvedValue(assets);
    const res = await listClassAssets('proj-1');
    expect(res).toEqual(assets);
    expect(apiMock).toHaveBeenCalledWith('/projects/proj-1/class-assets');
  });
});

describe('fetchAssetDataUrl (class asset → VFS data URL)', () => {
  it('downloads the signed URL and reads the bytes as a data URL', async () => {
    const blob = new Blob(['hello'], { type: 'image/png' });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) });
    vi.stubGlobal('fetch', fetchMock);
    const dataUrl = await fetchAssetDataUrl('https://signed.example/x.png?sig=z');
    expect(fetchMock).toHaveBeenCalledWith('https://signed.example/x.png?sig=z');
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    vi.unstubAllGlobals();
  });

  it('throws when the signed URL responds non-OK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(fetchAssetDataUrl('https://signed.example/x.png')).rejects.toThrow(/403/);
    vi.unstubAllGlobals();
  });
});

describe('transcribeVoice (UDL / OD-6 — backend STT, never a direct LLM)', () => {
  beforeEach(() => apiMock.mockReset());

  it('posts the audio data URL to the backend STT route', async () => {
    apiMock.mockResolvedValue({ text: 'a flappy bird game' });
    const res = await transcribeVoice({ audioDataUrl: 'data:audio/webm;base64,AAA' });
    expect(res.text).toBe('a flappy bird game');
    expect(apiMock).toHaveBeenCalledWith('/llm/transcribe', {
      method: 'POST',
      body: { audio: 'data:audio/webm;base64,AAA' },
    });
  });
});
