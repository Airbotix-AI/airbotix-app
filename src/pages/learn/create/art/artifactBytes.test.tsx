// @vitest-environment jsdom

// Same-origin artifact bytes proxy (image-studio-prd D-IS-24) — the pixel
// loader behind canvas bases, reopened pictures and "use in my game". First
// spec for this module: auth header, error surface, object-URL hook contract.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', () => ({ BASE_URL: 'http://api.test' }));
vi.mock('@/auth/authStore', () => ({
  surfacePrincipal: () => 'kid',
  useAuthStore: { getState: () => ({ tokens: { kid: 'tok_kid', user: null } }) },
}));

import { fetchArtifactBlob, useArtifactBlobUrl } from './artifactBytes';
import type { Artifact } from '../shared/useStudio';

const ARTIFACT: Artifact = {
  id: 'art_1',
  project_id: 'proj_1',
  kind: 'image',
  s3_key: 'families/fam_1/x.png',
  mime_type: 'image/png',
  size_bytes: 4,
  created_at: '2026-07-21T00:00:00Z',
  metadata: {},
};

describe('fetchArtifactBlob', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('hits the same-origin bytes proxy with the surface token', async () => {
    const blob = new Blob([new Uint8Array([1, 2])], { type: 'image/png' });
    fetchMock.mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) });

    await expect(fetchArtifactBlob(ARTIFACT)).resolves.toBe(blob);
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/projects/proj_1/artifacts/art_1/bytes', {
      headers: { Authorization: 'Bearer tok_kid' },
    });
  });

  it('throws a status-carrying error when the proxy rejects (no silent blank canvas)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    await expect(fetchArtifactBlob(ARTIFACT)).rejects.toThrow('bytes 404');
  });
});

describe('useArtifactBlobUrl', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    // jsdom has no createObjectURL — the hook's output IS this value.
    (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = vi.fn(
      () => 'blob:art_1',
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );

  it('resolves an object URL for the artifact bytes', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob([new Uint8Array([1])], { type: 'image/png' })),
    });
    const { result } = renderHook(() => useArtifactBlobUrl(ARTIFACT), { wrapper });
    await waitFor(() => expect(result.current).toBe('blob:art_1'));
  });

  it('stays null (and never fetches) without an artifact', () => {
    const { result } = renderHook(() => useArtifactBlobUrl(undefined), { wrapper });
    expect(result.current).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
