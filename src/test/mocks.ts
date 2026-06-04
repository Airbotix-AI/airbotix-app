import type { UseQueryResult } from '@tanstack/react-query';
import { vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';

/**
 * Shared test mocks. The casts that are unavoidable when mocking a generic
 * function (`api<T>`) or a fat hook result (`useMe`'s UseQueryResult) live HERE,
 * once — specs import these helpers and stay cast-free, so a future contract
 * change surfaces in one place instead of being silently swallowed in ten.
 *
 * Specs still declare the module mocks themselves (vi.mock is hoisted and can't
 * be moved into a helper):
 *   vi.mock('@/lib/api', async (o) => ({ ...(await o()), api: vi.fn() }));
 *   vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
 */

/** Route mocked api() calls by request path. */
export function mockApiByPath(route: (path: string, opts?: unknown) => unknown): void {
  vi.mocked(api).mockImplementation(
    ((path: string, opts?: unknown) => Promise.resolve(route(path, opts))) as typeof api,
  );
}

/** Make every mocked api() call resolve to the same value. */
export function mockApiResolved(value: unknown): void {
  vi.mocked(api).mockResolvedValue(value as never);
}

/** Set the mocked useMe() principal (undefined = still loading / signed out). */
export function mockUseMe(data: AuthPrincipal | undefined): void {
  vi.mocked(useMe).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useMe>);
}

/**
 * A settled, successful useQuery result for mocking data hooks (useKidWallet,
 * useRecentArtifacts, …). `data` stays fully typed so a shape change still
 * fails typecheck; only the fat UseQueryResult wrapper is cast — once, here.
 */
export function queryOk<T>(data: T): UseQueryResult<T> {
  return { data, isLoading: false, isError: false, isSuccess: true, status: 'success' } as unknown as UseQueryResult<T>;
}
