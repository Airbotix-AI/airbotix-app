import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { mockApiResolved } from '@/test/mocks';
import { useExitSummary } from './useSession';

const navigate = vi.fn();
// useSession only pulls useNavigate from react-router-dom, so a thin mock is enough.
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);

beforeEach(() => {
  navigate.mockReset();
  mockedApi.mockReset();
});

describe('useExitSummary', () => {
  it('navigates home when ending with no active session', async () => {
    const { result } = renderHook(() => useExitSummary());
    await act(async () => {
      await result.current.endNow(null);
    });
    expect(navigate).toHaveBeenCalledWith('/learn/create');
  });

  it('captures the summary returned when ending a session', async () => {
    mockApiResolved({ id: 's1', duration_minutes: 5, stars_used: 3, artifacts_count: 2, llm_calls: 4 });
    const { result } = renderHook(() => useExitSummary());
    await act(async () => {
      await result.current.endNow('s1');
    });
    await waitFor(() => expect(result.current.summary).toMatchObject({ id: 's1', stars_used: 3 }));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('dismiss clears the summary and returns to the studio hub', () => {
    const { result } = renderHook(() => useExitSummary());
    act(() => result.current.dismiss());
    expect(result.current.summary).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/learn/create');
  });
});
