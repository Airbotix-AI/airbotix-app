import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { api } from '@/lib/api';
import { mockApiResolved, mockUseMe } from '@/test/mocks';
import { useCodeStudio } from './useCodeStudio';
import {
  CODE_PROJECT_KIND,
  getProject,
  readVfs,
  runAgentTurn,
  type AgentTurnResult,
  type CodeProject,
} from './codeApi';

const project: CodeProject = {
  id: 'cp1',
  title: 'My Site',
  kind: CODE_PROJECT_KIND,
  visibility: 'private',
  updated_at: '2026-06-01T10:00:00Z',
  created_at: '2026-06-01T09:00:00Z',
};

function turn(over: Partial<AgentTurnResult>): AgentTurnResult {
  return {
    turn_id: 't0',
    requires_approval: false,
    plan: null,
    changes: [],
    files: [],
    summary: '',
    stars_charged: 0,
    tools_fired: [],
    ...over,
  };
}

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
  mockedGetProject.mockResolvedValue(project);
  mockedReadVfs.mockResolvedValue([]);
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
    mockedRun.mockResolvedValue(
      turn({
        files: [{ path: 'index.html', content: '<h1>Hi</h1>', kind: 'text', size: 11 }],
        summary: 'Built it',
        stars_charged: 2,
      }),
    );

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
    mockedRun.mockResolvedValue(
      turn({
        requires_approval: true,
        turn_id: 't1',
        changes: [{ path: 'index.html', before: '', after: '<h1>Hi</h1>', lines_added: 1, lines_removed: 0 }],
        plan: { plan_text: 'I will edit index.html. OK?', planned_tools: [] },
      }),
    );

    const { result } = renderHook(() => useCodeStudio('cp1'), { wrapper: makeWrapper() });
    await act(async () => {
      await result.current.send('rebuild everything');
    });

    expect(result.current.pendingPlan).toEqual({ prompt: 'rebuild everything' });
    expect(result.current.chat.some((c) => c.text.includes('I will edit index.html'))).toBe(true);
  });
});
