// @vitest-environment jsdom

// Save-to-My-Works flow (music-stage-prd §2 step ⑤): promotes a score into a
// creative project via the EXISTING endpoints only — POST /projects →
// upload-url → S3 PUT → register artifact — mirroring the backend's own
// score persistence shape (inline score + summary metadata + upload_failed).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MusicScore } from './scoreTypes';

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: apiMock }));

import { SCORE_MIME_TYPE, generateMusicScore, saveScoreToMyWorks } from './musicScoreApi';

const SCORE: MusicScore = {
  title: 'Space Pup',
  tempo: 118,
  key: 'D minor',
  genre: 'rock',
  tracks: [
    { instrument: 'guitar', notes: [{ time: 0, note: 'E3', duration: '8n' }] },
    { instrument: 'drums', notes: [{ time: 0, note: 'kick', duration: '8n' }] },
  ],
};

const SIGNED = {
  url: 'https://s3.example/put',
  method: 'PUT' as const,
  headers: { 'Content-Type': SCORE_MIME_TYPE },
  s3_key: 'families/f1/projects/k1/1/text/x.json',
};

function mockApiRoutes() {
  apiMock.mockImplementation(async (path: string) => {
    if (path === '/projects') return { id: 'p1' };
    if (path === '/projects/p1/artifacts/upload-url') return SIGNED;
    if (path === '/projects/p1/artifacts') return { id: 'a1' };
    throw new Error(`unexpected api call: ${path}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saveScoreToMyWorks', () => {
  it('creates a creative project titled after the song, PUTs the JSON, registers the artifact', async () => {
    mockApiRoutes();
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await saveScoreToMyWorks(SCORE);
    expect(res).toEqual({ project_id: 'p1', artifact_id: 'a1' });

    expect(apiMock).toHaveBeenNthCalledWith(1, '/projects', {
      method: 'POST',
      body: { title: 'Space Pup', product_line: 'line_a_creative' },
    });

    const json = JSON.stringify(SCORE, null, 2);
    expect(apiMock).toHaveBeenNthCalledWith(2, '/projects/p1/artifacts/upload-url', {
      method: 'POST',
      body: {
        kind: 'text',
        mime_type: SCORE_MIME_TYPE,
        size_bytes: new TextEncoder().encode(json).length,
        filename: 'score.json',
      },
    });

    // The PUT uses the signed method/headers verbatim and ships the same JSON.
    expect(fetchMock).toHaveBeenCalledWith(SIGNED.url, {
      method: 'PUT',
      headers: SIGNED.headers,
      body: json,
    });

    const register = apiMock.mock.calls[2][1] as {
      body: { kind: string; s3_key: string; mime_type: string; metadata: Record<string, unknown> };
    };
    expect(register.body.kind).toBe('text');
    expect(register.body.s3_key).toBe(SIGNED.s3_key);
    expect(register.body.mime_type).toBe(SCORE_MIME_TYPE);
    // Metadata mirrors the backend's project-scoped persistence shape.
    expect(register.body.metadata).toMatchObject({
      source: 'music-score',
      title: 'Space Pup',
      tempo: 118,
      key: 'D minor',
      instruments: ['guitar', 'drums'],
      upload_failed: false,
      score: SCORE,
    });
  });

  it('still registers (upload_failed) when the S3 PUT fails — inline score is the render source', async () => {
    mockApiRoutes();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    const res = await saveScoreToMyWorks(SCORE);
    expect(res.artifact_id).toBe('a1');
    const register = apiMock.mock.calls[2][1] as { body: { metadata: { upload_failed: boolean } } };
    expect(register.body.metadata.upload_failed).toBe(true);
  });

  it('still registers when the S3 PUT throws (offline)', async () => {
    mockApiRoutes();
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))));
    const res = await saveScoreToMyWorks(SCORE);
    expect(res.artifact_id).toBe('a1');
    const register = apiMock.mock.calls[2][1] as { body: { metadata: { upload_failed: boolean } } };
    expect(register.body.metadata.upload_failed).toBe(true);
  });

  it('falls back to a friendly project title when the score title is blank', async () => {
    mockApiRoutes();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
    await saveScoreToMyWorks({ ...SCORE, title: '   ' });
    expect(apiMock.mock.calls[0][1]).toMatchObject({ body: { title: 'My Song' } });
  });
});

describe('generateMusicScore', () => {
  it('forwards style_changes on the POST body (PRD §8 audit counter)', async () => {
    apiMock.mockResolvedValue({});
    await generateMusicScore({ prompt: 'space pup', style_changes: 3 });
    expect(apiMock).toHaveBeenCalledWith('/llm/music-score', {
      method: 'POST',
      body: expect.objectContaining({ prompt: 'space pup', style_changes: 3 }),
    });
  });
});
