// The Database window's store seam (creative-code-studio-website-prd): SiteFrame
// registers the frame-facing refresh trigger + writes read-db replies; the
// DbPane polls through `requestRefresh` and renders `{db, updatedAt}`.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSiteDbStore } from './siteDbStore';

beforeEach(() => {
  useSiteDbStore.setState({ db: null, updatedAt: null, refreshTrigger: null });
});

describe('siteDbStore', () => {
  it('setDb records the snapshot with its timestamp; reset drops it', () => {
    useSiteDbStore.getState().setDb({ pets: [1, 2] }, 1234);
    expect(useSiteDbStore.getState().db).toEqual({ pets: [1, 2] });
    expect(useSiteDbStore.getState().updatedAt).toBe(1234);

    useSiteDbStore.getState().reset();
    expect(useSiteDbStore.getState().db).toBeNull();
    expect(useSiteDbStore.getState().updatedAt).toBeNull();
  });

  it('requestRefresh invokes the registered trigger — and is a safe no-op without one', () => {
    expect(() => useSiteDbStore.getState().requestRefresh()).not.toThrow();

    const trigger = vi.fn();
    useSiteDbStore.getState().registerRefresh(trigger);
    useSiteDbStore.getState().requestRefresh();
    useSiteDbStore.getState().requestRefresh();
    expect(trigger).toHaveBeenCalledTimes(2);

    // SiteFrame unmount unregisters — later polls (a still-open pane after the
    // Website window closed) must not throw.
    useSiteDbStore.getState().registerRefresh(null);
    expect(() => useSiteDbStore.getState().requestRefresh()).not.toThrow();
    expect(trigger).toHaveBeenCalledTimes(2);
  });
});
