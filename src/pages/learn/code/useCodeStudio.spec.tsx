import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { api } from '@/lib/api';
import { mockApiResolved, mockUseMe } from '@/test/mocks';
import { useCodeStudio } from './useCodeStudio';
import { getProject, readVfs, runAgentTurn } from './codeApi';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));
vi.mock('./codeApi', async (orig) => ({
  ...(await orig<typeof import('./codeApi')>()),
  getProject: vi.fn(),
  readVfs: vi.fn(),
  runAgentTurn: vi.fn(),
  approveTurn: vi.fn(),
}));

const mockedGetProject = vi.mocked(getProject);
const mockedReadVfs = vi.mocked(readVfs);
const mockedRun = vi.mocked(runAgentTurn);

const kid = (age: number): AuthPrincipal =>
  ({ kind: 'kid', sub: 'k1', nickname: 'Robo', age, family_id: 'f1' }) as AuthPrincipal;

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(api).mockReset();
  mockedGetProject.mockReset();
  mockedReadVfs.mockReset();
  mockedRun.mockReset();
  mockUseMe(kid(14));
  mockedGetProject.mockResolvedValue({ id: 'cp1', title: 'My Site', visibility: 'private' } as never);
  mockedReadVfs.mockResolvedValue([] as never);
  mockApiResolved({ stars_balance: 10 });
});

describe('useCodeStudio', () => {
  it('runs Lite for 8-11 and Pro for 12+ (forcePro always Pro)', () => {
    mockUseMe(kid(9));
    expect(renderHook(() => useCodeStudio('cp1'), { wrapper: makeWrapper() }).result.current.mode).toBe('lite');

    mockUseMe(kid(14));
    expect(renderHook(() => useCodeStudio('cp1'), { wrapper: makeWrapper() }).result.current.mode).toBe('pro');

    mockUseMe(kid(9));
    expect(
      renderHook(() => useCodeStudio('cp1', { forcePro: true }), { wrapper: makeWrapper() }).result.current.mode,
    ).toBe('pro');
  });

  it('applies a non-approval turn directly to chat + files', async () => {
    mockedRun.mockResolvedValue({
      requires_approval: false,
      files: [{ path: 'index.html', content: '<h1>Hi</h1>', kind: 'text', size: 11 }],
      summary: 'Built it',
      changes: [],
      stars_charged: 2,
      tools_fired: [],
    } as never);

    const { result } = renderHook(() => useCodeStudio('cp1'), { wrapper: makeWrapper() });
    await act(async () => {
      await result.current.send('make a button');
    });

    expect(result.current.chat.some((c) => c.role === 'kid' && c.text === 'make a button')).toBe(true);
    expect(result.current.chat.some((c) => c.role === 'agent' && c.text === 'Built it')).toBe(true);
    expect(result.current.files).toHaveLength(1);
    expect(result.current.pendingPlan).toBeNull();
  });

  it('stages a plan when the backend requires approval', async () => {
    mockedRun.mockResolvedValue({
      requires_approval: true,
      turn_id: 't1',
      files: [],
      summary: '',
      changes: [{ path: 'index.html' }],
      tools_fired: [],
      plan: { plan_text: 'I will edit index.html. OK?' },
    } as never);

    const { result } = renderHook(() => useCodeStudio('cp1'), { wrapper: makeWrapper() });
    await act(async () => {
      await result.current.send('rebuild everything');
    });

    expect(result.current.pendingPlan).toEqual({ prompt: 'rebuild everything' });
    expect(result.current.chat.some((c) => c.text.includes('I will edit index.html'))).toBe(true);
  });
});
