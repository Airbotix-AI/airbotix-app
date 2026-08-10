// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { openKidPageInNewTab } from './openKidPage';

afterEach(() => vi.restoreAllMocks());

describe('openKidPageInNewTab', () => {
  it('opens a requested kid destination after the parent creates the kid session', async () => {
    const parentKidLogin = vi.fn().mockResolvedValue({ access_token: 'kid-token' });
    const navigateSameTab = vi.fn();
    const kidTab = { location: { href: '' }, closed: false, close: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(kidTab as unknown as Window);

    await openKidPageInNewTab(
      parentKidLogin,
      'kid-1',
      navigateSameTab,
      '/learn/challenge/creative-code-challenge-2026-junior/submit',
    );

    expect(open).toHaveBeenCalledWith('', '_blank');
    expect(parentKidLogin).toHaveBeenCalledWith('kid-1');
    expect(kidTab.location.href).toBe(
      `${window.location.origin}/learn/challenge/creative-code-challenge-2026-junior/submit`,
    );
    expect(navigateSameTab).not.toHaveBeenCalled();
  });

  it('uses the requested destination in the current tab when a popup is blocked', async () => {
    const parentKidLogin = vi.fn().mockResolvedValue({ access_token: 'kid-token' });
    const navigateSameTab = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue(null);

    await openKidPageInNewTab(
      parentKidLogin,
      'kid-1',
      navigateSameTab,
      '/learn/challenge/slug/submit',
    );

    expect(navigateSameTab).toHaveBeenCalledWith('/learn/challenge/slug/submit');
  });
});
