// The module-level doubles the four `ChallengeRegisterPage.*.test.tsx` suites
// mock `@/lib/api` and `@/auth/useAuth` with.
//
// They live in a module of their own — imported by nothing but the mock
// factories and the test kit — for one mechanical reason: `vi.mock` is hoisted
// above every import in the file that declares it, so a factory may only reach
// its doubles through a LAZY `await import(...)`. Pointing that import at a
// module which itself pulls in React, the page or `@/lib/api` would re-enter
// the module currently being mocked. This file therefore imports nothing but
// `vitest`.

import { vi } from 'vitest';

/** Mirrors `@/lib/api`'s ApiError closely enough for `instanceof` to decide. */
export class MockApiError extends Error {
  constructor(
    public status: number,
    public code = 'ERR',
    message = 'err',
    public details?: unknown,
  ) {
    super(message);
  }
}

/** The mocked `api()` — every suite asserts against `api.mock.calls`. */
export const api = vi.fn();

/** The mocked `useMe()` result. Suites mutate `me.data` for their principal. */
export const me = {
  data: { kind: 'user', family_id: 'fam-1', email: 'parent@example.com' } as {
    kind: string;
    family_id: string | null;
    email: string;
  },
};
