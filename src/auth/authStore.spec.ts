import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from './authStore';

// authStore holds the access token in memory only (XSS-resilient) — see
// authStore.ts / auth-system-prd.md §3.1. These tests pin its exact contract,
// including the deliberate asymmetry that clear() nulls only the token.
describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    useAuthStore.getState().setBootstrapped(false);
  });

  it('starts with no token and not bootstrapped', () => {
    const s = useAuthStore.getState();
    expect(s.accessToken).toBeNull();
    expect(s.bootstrapped).toBe(false);
  });

  it('setAccessToken stores the token', () => {
    useAuthStore.getState().setAccessToken('jwt-abc');
    expect(useAuthStore.getState().accessToken).toBe('jwt-abc');
  });

  it('setBootstrapped flips the flag (set once after /auth/refresh resolves)', () => {
    useAuthStore.getState().setBootstrapped(true);
    expect(useAuthStore.getState().bootstrapped).toBe(true);
  });

  it('clear() wipes the access token', () => {
    useAuthStore.getState().setAccessToken('jwt-abc');
    useAuthStore.getState().clear();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('clear() leaves bootstrapped untouched (sign-out nulls only the token)', () => {
    useAuthStore.getState().setBootstrapped(true);
    useAuthStore.getState().setAccessToken('jwt-abc');
    useAuthStore.getState().clear();
    const s = useAuthStore.getState();
    expect(s.accessToken).toBeNull();
    expect(s.bootstrapped).toBe(true);
  });
});
