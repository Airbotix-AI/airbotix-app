import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the HTTP client so we can inspect the EXACT request body saveVfs builds.
// (projectPersistence.test.ts mocks saveVfs itself, so it never exercises this —
// which is how the version/expected_version field-name bug shipped: every save
// 400'd and silently fell back to the offline "queued" state, losing edits.)
const api = vi.fn();
vi.mock('@/lib/api', () => ({
  api: (...a: unknown[]) => api(...a),
  ApiError: class ApiError extends Error {
    // Mirror the real 4-arg signature (status, code, message, details) so tests can
    // assert on `code` exactly as production does.
    constructor(
      public status: number,
      public code: string,
      message: string,
      public details?: unknown,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

import {
  saveVfs,
  CODE_TEMPLATES,
  runAgentTurn,
  signChatImageUpload,
  uploadChatImage,
  type ChatImageRef,
} from './codeApi';

const file = (path: string, content = 'x') => ({ path, content, kind: 'text' as const, size: content.length });

describe('saveVfs — PUT /projects/:id/code/files', () => {
  beforeEach(() => api.mockReset());

  it('sends `expected_version` (the backend DTO field), never a bare `version`', async () => {
    api.mockResolvedValue({ version: 6, files: [file('main.js')] });

    await saveVfs({ projectId: 'p1', files: [file('main.js', 'edited')], version: 5 });

    expect(api).toHaveBeenCalledTimes(1);
    const [path, opts] = api.mock.calls[0] as [string, { method: string; body: Record<string, unknown> }];
    expect(path).toBe('/projects/p1/code/files');
    expect(opts.method).toBe('PUT');
    // The contract: optimistic-concurrency field is `expected_version`. A plain
    // `version` is dropped by the DTO → 400 Validation → the save never syncs.
    expect(opts.body).toHaveProperty('expected_version', 5);
    expect(opts.body).not.toHaveProperty('version');
    expect(typeof opts.body.idempotency_key).toBe('string');
    // The manifest sends text inline as {path, content} (no kind/size on the wire).
    expect(opts.body.files).toEqual([{ path: 'main.js', content: 'edited' }]);
  });

  it('returns the server snapshot (files + bumped version) on success', async () => {
    api.mockResolvedValue({ version: 9, files: [file('main.js', 'saved')] });
    const snap = await saveVfs({ projectId: 'p1', files: [file('main.js', 'saved')], version: 8 });
    expect(snap).toEqual({ version: 9, files: [file('main.js', 'saved')] });
  });

  const asset = (path: string) => ({
    path,
    content: 'data:image/png;base64,aGVsbG8=',
    kind: 'asset' as const,
    size: 5,
  });

  it('uploads a DIRTY asset straight to S3, then sends it as a reference (no base64 in the save)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', fetchMock);
    api
      .mockResolvedValueOnce({ url: 'https://s3.test/mock/assets/cat.png', s3_key: 'k' }) // sign-upload
      .mockResolvedValueOnce({ version: 2, files: [] }); // save manifest

    await saveVfs({
      projectId: 'p1',
      files: [file('main.js', 'x'), asset('assets/cat.png')],
      version: 1,
      dirtyAssetPaths: new Set(['assets/cat.png']),
    });

    // 1) presign + 2) direct browser→S3 PUT (raw fetch, NOT the api client)
    expect(api).toHaveBeenNthCalledWith(
      1,
      '/projects/p1/vfs/assets/sign-upload',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ path: 'assets/cat.png', content_type: 'image/png' }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://s3.test/mock/assets/cat.png',
      expect.objectContaining({ method: 'PUT' }),
    );
    // 3) the manifest: text inline, asset as a reference
    const saveCall = api.mock.calls[1] as [string, { body: { files: unknown[] } }];
    expect(saveCall[0]).toBe('/projects/p1/code/files');
    expect(saveCall[1].body.files).toEqual([
      { path: 'main.js', content: 'x' },
      { path: 'assets/cat.png', uploaded: true },
    ]);
    vi.unstubAllGlobals();
  });

  it('does NOT re-upload a CLEAN asset (not dirty) — references it directly', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    api.mockResolvedValueOnce({ version: 2, files: [] });

    await saveVfs({
      projectId: 'p1',
      files: [asset('assets/cat.png')],
      version: 1,
      dirtyAssetPaths: new Set(), // already in S3
    });

    expect(fetchMock).not.toHaveBeenCalled(); // no S3 upload
    expect(api).toHaveBeenCalledTimes(1); // only the save PUT, no sign-upload
    expect((api.mock.calls[0][1] as { body: { files: unknown[] } }).body.files).toEqual([
      { path: 'assets/cat.png', uploaded: true },
    ]);
    vi.unstubAllGlobals();
  });
});

// ── Chat-input images (D-PAP-33..37) ───────────────────────────────────────

describe('runAgentTurn — images in the body only when present', () => {
  beforeEach(() => api.mockReset());

  const images: ChatImageRef[] = [{ s3_key: 'chat-input/p1/abc', mime: 'image/png' }];

  it('includes `images` only when a non-empty list is passed', async () => {
    api.mockResolvedValue({ turn_id: 't', changes: [], files: [], stars_charged: 0 });
    await runAgentTurn({ projectId: 'p1', prompt: 'use this', mode: 'lite', images });
    const [path, opts] = api.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(path).toBe('/projects/p1/code/turn');
    expect(opts.body.images).toEqual(images);
  });

  it('omits `images` for a plain text turn (no key on the wire)', async () => {
    api.mockResolvedValue({ turn_id: 't', changes: [], files: [], stars_charged: 0 });
    await runAgentTurn({ projectId: 'p1', prompt: 'just text', mode: 'lite' });
    const opts = api.mock.calls[0][1] as { body: Record<string, unknown> };
    expect(opts.body).not.toHaveProperty('images');
  });

  it('omits `images` when an EMPTY list is passed (never sends `images: []`)', async () => {
    api.mockResolvedValue({ turn_id: 't', changes: [], files: [], stars_charged: 0 });
    await runAgentTurn({ projectId: 'p1', prompt: 'x', mode: 'lite', images: [] });
    const opts = api.mock.calls[0][1] as { body: Record<string, unknown> };
    expect(opts.body).not.toHaveProperty('images');
  });
});

describe('signChatImageUpload + uploadChatImage — presign then S3 PUT', () => {
  beforeEach(() => api.mockReset());

  it('signChatImageUpload POSTs the chat-image presign with content_type + size_bytes', async () => {
    api.mockResolvedValue({ url: 'https://s3.test/k', method: 'PUT', s3_key: 'chat-input/p1/u' });
    const signed = await signChatImageUpload('p1', { contentType: 'image/jpeg', sizeBytes: 1234 });
    expect(api).toHaveBeenCalledWith(
      '/projects/p1/code/chat-image/sign-upload',
      expect.objectContaining({
        method: 'POST',
        body: { content_type: 'image/jpeg', size_bytes: 1234 },
      }),
    );
    expect(signed.s3_key).toBe('chat-input/p1/u');
  });

  it('uploadChatImage presigns then PUTs the bytes to S3 and returns the ref', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', fetchMock);
    api.mockResolvedValue({ url: 'https://s3.test/up', s3_key: 'chat-input/p1/img', method: 'PUT' });
    // A tiny PNG blob (GIFs/canvas downscale are skipped in jsdom; createImageBitmap
    // is absent here, so the bytes upload verbatim).
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });

    const ref = await uploadChatImage('p1', blob);

    expect(api).toHaveBeenCalledWith(
      '/projects/p1/code/chat-image/sign-upload',
      expect.objectContaining({ method: 'POST', body: expect.objectContaining({ content_type: 'image/png' }) }),
    );
    // Raw browser→S3 PUT (NOT the api client).
    expect(fetchMock).toHaveBeenCalledWith('https://s3.test/up', expect.objectContaining({ method: 'PUT' }));
    expect(ref).toEqual({ s3_key: 'chat-input/p1/img', mime: 'image/png' });
    vi.unstubAllGlobals();
  });

  it('rejects a non-allow-listed MIME BEFORE any network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const bad = new Blob(['x'], { type: 'image/svg+xml' });
    await expect(uploadChatImage('p1', bad)).rejects.toMatchObject({ code: 'IMAGE_TYPE_UNSUPPORTED' });
    expect(api).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('rejects an oversized image (>5MB) BEFORE any network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    // 5MB + 1 byte of png-typed data.
    const big = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' });
    await expect(uploadChatImage('p1', big)).rejects.toMatchObject({ code: 'IMAGE_TOO_LARGE' });
    expect(api).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('surfaces an ApiError when the S3 PUT fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403 } as Response);
    vi.stubGlobal('fetch', fetchMock);
    api.mockResolvedValue({ url: 'https://s3.test/up', s3_key: 'k', method: 'PUT' });
    const blob = new Blob([new Uint8Array([1])], { type: 'image/png' });
    await expect(uploadChatImage('p1', blob)).rejects.toMatchObject({ code: 'UPLOAD_FAILED' });
    vi.unstubAllGlobals();
  });
});

describe('CODE_TEMPLATES — starter labels', () => {
  it('renders the game starter as "Game Playground" (display rename; id stays tiny_game)', () => {
    const game = CODE_TEMPLATES.find((t) => t.id === 'tiny_game');
    expect(game?.title).toBe('Game Playground');
  });
});
