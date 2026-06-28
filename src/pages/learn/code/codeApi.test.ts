import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the HTTP client so we can inspect the EXACT request body saveVfs builds.
// (projectPersistence.test.ts mocks saveVfs itself, so it never exercises this —
// which is how the version/expected_version field-name bug shipped: every save
// 400'd and silently fell back to the offline "queued" state, losing edits.)
const api = vi.fn();
vi.mock('@/lib/api', () => ({
  api: (...a: unknown[]) => api(...a),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
      public details?: unknown,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

import { saveVfs, CODE_TEMPLATES } from './codeApi';

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

describe('CODE_TEMPLATES — starter labels', () => {
  it('renders the game starter as "Game Playground" (display rename; id stays tiny_game)', () => {
    const game = CODE_TEMPLATES.find((t) => t.id === 'tiny_game');
    expect(game?.title).toBe('Game Playground');
  });
});
