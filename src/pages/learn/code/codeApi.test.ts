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

import { saveVfs } from './codeApi';

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
    expect(opts.body.files).toEqual([file('main.js', 'edited')]);
  });

  it('returns the server snapshot (files + bumped version) on success', async () => {
    api.mockResolvedValue({ version: 9, files: [file('main.js', 'saved')] });
    const snap = await saveVfs({ projectId: 'p1', files: [file('main.js', 'saved')], version: 8 });
    expect(snap).toEqual({ version: 9, files: [file('main.js', 'saved')] });
  });
});
