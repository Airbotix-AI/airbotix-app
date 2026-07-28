// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  hasAnalyticsConsent,
  isPortalSurface,
  readConsent,
  resetAnalyticsForTests,
  setAnalyticsConsent,
  shouldTrack,
  subscribeToRoutes,
  toRoutePattern,
  trackEvent,
  trackPageView,
  type AnalyticsEnv,
} from './analytics';

const CONSENT_KEY = 'airbotix.portal.analytics-consent';
const MEASUREMENT_ID = 'G-TEST12345';

/** Every gtag call, flattened from the dataLayer `arguments` objects. */
function gtagCalls(): unknown[][] {
  return [...(window.dataLayer ?? [])].map((entry) => Array.from(entry as ArrayLike<unknown>));
}

function pageViews(): Record<string, unknown>[] {
  return gtagCalls()
    .filter((call) => call[0] === 'event' && call[1] === 'page_view')
    .map((call) => call[2] as Record<string, unknown>);
}

function gtagScript(): HTMLElement | null {
  return document.getElementById('ga4-script');
}

describe('isPortalSurface', () => {
  it('admits the parent Portal', () => {
    expect(isPortalSurface('/portal')).toBe(true);
    expect(isPortalSurface('/portal/wallet')).toBe(true);
    expect(isPortalSurface('/portal/family/cjld2cjxh0000qzrmn831i7rn?tab=stars')).toBe(true);
  });

  it('refuses every kid surface', () => {
    // privacy-policy.md §8/§10: Google Analytics must never run on a surface
    // used by children.
    expect(isPortalSurface('/learn')).toBe(false);
    expect(isPortalSurface('/learn/blocks/cjld2cjxh0000qzrmn831i7rn')).toBe(false);
    expect(isPortalSurface('/try/blocks')).toBe(false);
    expect(isPortalSurface('/play/cjld2cjxh0000qzrmn831i7rn')).toBe(false);
  });

  it('refuses the in-app teacher surface and the root redirect', () => {
    expect(isPortalSurface('/teacher/classes/cjld2cjxh0000qzrmn831i7rn')).toBe(false);
    expect(isPortalSurface('/')).toBe(false);
  });

  it('does not admit a sibling route that merely starts with the word', () => {
    expect(isPortalSurface('/portal-tour')).toBe(false);
  });
});

describe('toRoutePattern', () => {
  it('replaces the cuid ids that identify a family or kid', () => {
    expect(toRoutePattern('/portal/family/cjld2cjxh0000qzrmn831i7rn')).toBe('/portal/family/:id');
    expect(toRoutePattern('/portal/family/cjld2cjxh0000qzrmn831i7rn/images')).toBe(
      '/portal/family/:id/images',
    );
  });

  it('replaces uuid, numeric, opaque and provider-prefixed ids', () => {
    expect(toRoutePattern('/portal/audit/project/3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(
      '/portal/audit/project/:id',
    );
    expect(toRoutePattern('/portal/usage/1042')).toBe('/portal/usage/:id');
    expect(toRoutePattern('/portal/checkout/a1b2c3d4e5f60718')).toBe('/portal/checkout/:id');
    expect(toRoutePattern('/portal/academy/orders/int_hkdmr7v9rg1j5e8')).toBe(
      '/portal/academy/orders/:id',
    );
  });

  it('keeps kebab-case content slugs — they are the reporting signal', () => {
    expect(toRoutePattern('/portal/courses/story-blocks-season-1')).toBe(
      '/portal/courses/story-blocks-season-1',
    );
  });

  it('keeps ordinary route segments', () => {
    expect(toRoutePattern('/portal/wallet/auto-topup')).toBe('/portal/wallet/auto-topup');
  });

  it('drops the query string and hash', () => {
    // /portal/verify-otp carries an email; checkout URLs carry intent ids.
    expect(toRoutePattern('/portal/verify-otp?email=parent%40example.com')).toBe(
      '/portal/verify-otp',
    );
    expect(toRoutePattern('/portal/wallet?tab=history#top')).toBe('/portal/wallet');
  });

  it('normalises the root path', () => {
    expect(toRoutePattern('/')).toBe('/');
    expect(toRoutePattern('')).toBe('/');
  });
});

describe('shouldTrack', () => {
  const base: AnalyticsEnv = {
    measurementId: MEASUREMENT_ID,
    isProd: true,
    isHeadless: false,
    consented: true,
  };

  it('tracks a consented production browser session', () => {
    expect(shouldTrack(base)).toBe(true);
  });

  it('stays inert when no measurement id is configured', () => {
    expect(shouldTrack({ ...base, measurementId: '' })).toBe(false);
  });

  it('never reports from a dev build', () => {
    expect(shouldTrack({ ...base, isProd: false })).toBe(false);
  });

  it('never reports from headless automation', () => {
    expect(shouldTrack({ ...base, isHeadless: true })).toBe(false);
  });

  it('never reports without parent consent', () => {
    expect(shouldTrack({ ...base, consented: false })).toBe(false);
  });
});

describe('consent storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetAnalyticsForTests();
  });

  it('starts undecided', () => {
    expect(readConsent()).toBeUndefined();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('remembers both answers', () => {
    setAnalyticsConsent(true);
    expect(readConsent()).toBe('granted');
    expect(hasAnalyticsConsent()).toBe(true);

    setAnalyticsConsent(false);
    expect(readConsent()).toBe('declined');
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('notifies listeners so a mounted banner can dismiss itself', () => {
    const listener = vi.fn();
    window.addEventListener('airbotix:analytics-consent', listener);

    setAnalyticsConsent(true);

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('airbotix:analytics-consent', listener);
  });
});

// The tests below drive the REAL gtag bootstrap: they assert on the script tag
// and on the dataLayer the loader installs, so they prove what actually leaves
// the browser rather than re-stating the guard conditions.
describe('gtag delivery', () => {
  beforeEach(() => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', MEASUREMENT_ID);
    window.localStorage.setItem(CONSENT_KEY, 'granted');
    gtagScript()?.remove();
    delete window.dataLayer;
    delete window.gtag;
    resetAnalyticsForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  it('loads gtag.js and reports the route pattern on a Portal page', () => {
    trackPageView('/portal/family/cjld2cjxh0000qzrmn831i7rn?tab=stars');

    expect(gtagScript()).not.toBeNull();
    expect(gtagScript()?.getAttribute('src')).toContain(MEASUREMENT_ID);
    expect(pageViews()).toEqual([
      {
        page_path: '/portal/family/:id',
        page_location: `${window.location.origin}/portal/family/:id`,
        page_referrer: '',
        page_title: document.title,
      },
    ]);
  });

  it('suppresses gtag.js automatic page_view so SPA routes are counted once', () => {
    trackPageView('/portal');

    const config = gtagCalls().find((call) => call[0] === 'config');
    expect(config?.[2]).toEqual({ send_page_view: false });
  });

  it('sends the previous route pattern as the referrer, never the real URL', () => {
    trackPageView('/portal/family/cjld2cjxh0000qzrmn831i7rn');
    trackPageView('/portal/wallet');

    expect(pageViews()[1]?.page_referrer).toBe(`${window.location.origin}/portal/family/:id`);
  });

  it('LOADS NOTHING AND SENDS NOTHING on a kid route', () => {
    // The core privacy guarantee. Every other gate is green here — production
    // build, measurement id set, consent granted — and a kid route must still
    // produce no script tag and no hit at all.
    trackPageView('/learn/blocks/cjld2cjxh0000qzrmn831i7rn');
    trackPageView('/try/blocks');
    trackPageView('/play/cjld2cjxh0000qzrmn831i7rn');
    trackPageView('/teacher/classes/cjld2cjxh0000qzrmn831i7rn');

    expect(gtagScript()).toBeNull();
    expect(window.gtag).toBeUndefined();
    expect(window.dataLayer).toBeUndefined();
  });

  it('keeps sending nothing on a kid route after the Portal has loaded gtag', () => {
    // A parent browses the Portal, then hands the laptop to their child in the
    // same tab. gtag.js is already loaded; the kid's route must stay unreported.
    trackPageView('/portal');
    const afterPortal = pageViews().length;

    trackPageView('/learn/blocks/cjld2cjxh0000qzrmn831i7rn');
    trackEvent('kid_opened_project');

    expect(pageViews()).toHaveLength(afterPortal);
    expect(gtagCalls().some((call) => call[1] === 'kid_opened_project')).toBe(false);
  });

  it('sends nothing at all until a parent consents', () => {
    window.localStorage.setItem(CONSENT_KEY, 'declined');

    trackPageView('/portal/wallet');

    expect(gtagScript()).toBeNull();
    expect(window.dataLayer).toBeUndefined();
  });

  it('sends nothing from a dev build', () => {
    vi.stubEnv('PROD', false);

    trackPageView('/portal/wallet');

    expect(gtagScript()).toBeNull();
  });

  it('sends nothing from headless automation', () => {
    // The cross-repo harness drives the real production build. jsdom omits
    // navigator.webdriver entirely, so define it rather than spying on a getter.
    Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true });
    try {
      trackPageView('/portal/wallet');

      expect(gtagScript()).toBeNull();
    } finally {
      Reflect.deleteProperty(navigator, 'webdriver');
    }
  });

  it('sends nothing when the build has no measurement id', () => {
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', '');

    trackPageView('/portal/wallet');

    expect(gtagScript()).toBeNull();
  });
});

describe('subscribeToRoutes', () => {
  function fakeRouter(pathname: string, search = '') {
    const listeners: ((state: { location: { pathname: string; search: string } }) => void)[] = [];
    return {
      state: { location: { pathname, search } },
      subscribe(fn: (state: { location: { pathname: string; search: string } }) => void) {
        listeners.push(fn);
        return () => {
          listeners.splice(listeners.indexOf(fn), 1);
        };
      },
      navigate(next: string, nextSearch = '') {
        for (const fn of [...listeners]) {
          fn({ location: { pathname: next, search: nextSearch } });
        }
      },
      listenerCount: () => listeners.length,
    };
  }

  it('reports the initial location', () => {
    const router = fakeRouter('/portal/family/cjld2cjxh0000qzrmn831i7rn');
    const onRoute = vi.fn();

    subscribeToRoutes(router, onRoute);

    expect(onRoute.mock.calls).toEqual([['/portal/family/:id']]);
  });

  it('reports each subsequent navigation', () => {
    const router = fakeRouter('/portal');
    const onRoute = vi.fn();

    subscribeToRoutes(router, onRoute);
    router.navigate('/portal/wallet');

    expect(onRoute.mock.calls).toEqual([['/portal'], ['/portal/wallet']]);
  });

  it('deduplicates the repeated state transitions of one navigation', () => {
    // router.subscribe fires for every state change (loading → idle), all on the
    // same location; without dedupe one click would report several page_views.
    const router = fakeRouter('/portal');
    const onRoute = vi.fn();

    subscribeToRoutes(router, onRoute);
    router.navigate('/portal/wallet');
    router.navigate('/portal/wallet');
    router.navigate('/portal/wallet', '?tab=history');

    expect(onRoute.mock.calls).toEqual([['/portal'], ['/portal/wallet']]);
  });

  it('treats two different kids as one route pattern', () => {
    const router = fakeRouter('/portal/family/cjld2cjxh0000qzrmn831i7rn');
    const onRoute = vi.fn();

    subscribeToRoutes(router, onRoute);
    router.navigate('/portal/family/cjld2cjxh0001qzrmn831i7rn');

    expect(onRoute.mock.calls).toEqual([['/portal/family/:id']]);
  });

  it('stops reporting once unsubscribed', () => {
    const router = fakeRouter('/portal');
    const onRoute = vi.fn();

    const unsubscribe = subscribeToRoutes(router, onRoute);
    unsubscribe();
    router.navigate('/portal/wallet');

    expect(onRoute.mock.calls).toEqual([['/portal']]);
    expect(router.listenerCount()).toBe(0);
  });
});
