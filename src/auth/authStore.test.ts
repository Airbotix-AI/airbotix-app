// @vitest-environment jsdom
// The kid `class_id` JWT-claim selectors (D-LIVE-1). The raise-hand control is
// gated on the kid being in a live class; that signal comes from the `class_id`
// claim in the kid's access token (the same claim the WS gateway auto-joins on).
// Client-side decode is UX-only — the server is authz source of truth.

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { getKidClassId, useAuthStore, useKidClassId } from './authStore';

// Mint an unsigned JWT with the given body claims (header.body.sig, base64url).
function fakeJwt(claims: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(claims)}.sig`;
}

beforeEach(() => {
  useAuthStore.getState().clearAll();
});

describe('getKidClassId', () => {
  it('returns the class_id claim from the kid token', () => {
    useAuthStore.getState().setToken('kid', fakeJwt({ sub: 'kid_1', class_id: 'class_test_001' }));
    expect(getKidClassId()).toBe('class_test_001');
  });

  it('returns null when the kid has no class_id claim (home / family login)', () => {
    useAuthStore.getState().setToken('kid', fakeJwt({ sub: 'kid_1', family_id: 'fam_1' }));
    expect(getKidClassId()).toBeNull();
  });

  it('returns null when there is no kid token', () => {
    expect(getKidClassId()).toBeNull();
  });

  it('returns null for a malformed token (never throws)', () => {
    useAuthStore.getState().setToken('kid', 'not-a-jwt');
    expect(getKidClassId()).toBeNull();
  });
});

describe('useKidClassId (reactive)', () => {
  it('re-derives class_id when the kid token changes (login → logout)', () => {
    const { result } = renderHook(() => useKidClassId());
    expect(result.current).toBeNull();

    act(() => {
      useAuthStore.getState().setToken('kid', fakeJwt({ sub: 'kid_1', class_id: 'class_test_001' }));
    });
    expect(result.current).toBe('class_test_001');

    act(() => useAuthStore.getState().clearToken('kid'));
    expect(result.current).toBeNull();
  });
});
