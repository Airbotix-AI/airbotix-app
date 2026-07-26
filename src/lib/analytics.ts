// Google Analytics 4 (gtag.js) for the PARENT PORTAL ONLY.
//
// ## The hard boundary: kids are never measured
//
// `docs/legal/privacy-policy.md` (§8, §10) promises users that Google Analytics
// never runs on a surface used by children, and this app hosts BOTH surfaces:
//
//   /portal/*  parents            → measurable
//   /learn/*   kids               → NEVER
//   /try/*     no-signup kid demo → NEVER
//   /play/*    public share-play  → NEVER
//   /teacher/* in-app class view  → NEVER (teacher activity is measured in
//                                  teacher-console, so this app keeps the simple,
//                                  auditable rule "only /portal/* is ever sent")
//
// `isPortalSurface()` is that promise expressed in code, and it is enforced at
// BOTH ends on purpose: gtag.js is not even injected until a Portal route is
// reached, and every single hit re-checks before it is sent. A future route or
// layout change therefore cannot silently start reporting a child's activity —
// it would have to delete an explicit guard to do it.
//
// ## Consent
//
// The Portal is a logged-in parent surface, so analytics is opt-in: nothing is
// loaded until a parent accepts via PortalAnalyticsConsentBanner. Declining is
// sticky and equally silent.
//
// ## Configuration
//
// The measurement id comes from `VITE_GA4_MEASUREMENT_ID` at build time and has
// deliberately NO hardcoded fallback: an unconfigured build stays completely
// inert rather than silently reporting into whatever property a constant named.
// Each Airbotix frontend owns its own GA4 **data stream** (its own `G-…` id)
// rolling up into the one shared property.
//
// ## What deliberately never reaches Google
//
// gtag.js AUTO-COLLECTS `location.href`, `document.referrer` and `document.title`
// on every hit unless each one is explicitly overridden — so normalising only
// `page_path` would leak the raw URL anyway. Every hit overrides all four, and
// the path is first reduced to its route PATTERN
// (`/portal/family/cjld2cjxh0000qzrmn831i7rn` → `/portal/family/:id`) with the
// query string dropped. Those ids identify a real child.

const GTAG_SCRIPT_ID = 'ga4-script';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// ── surface guard ────────────────────────────────────────────────────────────

const PORTAL_PREFIX = '/portal';

/**
 * The only surface of this app that may ever be measured.
 *
 * Exact-prefix matching: `/portal` and `/portal/...` qualify, but a sibling
 * route such as `/portal-tour` must not.
 */
export function isPortalSurface(path: string): boolean {
  const pathname = path.split(/[?#]/)[0] ?? '';
  return pathname === PORTAL_PREFIX || pathname.startsWith(`${PORTAL_PREFIX}/`);
}

// ── route-pattern normalisation ──────────────────────────────────────────────

/** Platform primary keys are cuid: `c` + 24 lowercase alphanumerics. */
const CUID_RE = /^c[a-z0-9]{20,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Opaque tokens with no word structure: hex digests, nanoid, Mongo ObjectId. */
const OPAQUE_RE = /^[a-z0-9]{16,}$/i;
/** Provider-prefixed ids, e.g. Airwallex `int_hkdmr…`. */
const PREFIXED_RE = /^[a-z]{2,5}_[A-Za-z0-9]{10,}$/;
const NUMERIC_RE = /^\d+$/;

function isRecordId(segment: string): boolean {
  return (
    UUID_RE.test(segment) ||
    CUID_RE.test(segment) ||
    NUMERIC_RE.test(segment) ||
    OPAQUE_RE.test(segment) ||
    PREFIXED_RE.test(segment)
  );
}

/**
 * Reduce a concrete URL to its route pattern and drop the query string.
 *
 * Kebab-case slugs (`/portal/courses/story-blocks-season-1`) are CONTENT
 * identifiers, not person identifiers — they are preserved on purpose, because
 * they are the signal the reports exist to show. Only opaque record ids, which
 * in this app point at families and kids, are replaced.
 */
export function toRoutePattern(path: string): string {
  const pathname = path.split(/[?#]/)[0] ?? '';
  const pattern = pathname
    .split('/')
    .map((segment) => (isRecordId(segment) ? ':id' : segment))
    .join('/');
  return pattern || '/';
}

// ── consent ──────────────────────────────────────────────────────────────────

const CONSENT_KEY = 'airbotix.portal.analytics-consent';
const CONSENT_EVENT = 'airbotix:analytics-consent';

export type ConsentChoice = 'granted' | 'declined';

export function readConsent(): ConsentChoice | undefined {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'declined' ? value : undefined;
  } catch {
    // Private-mode / blocked storage: treat as undecided rather than crashing.
    return undefined;
  }
}

export function hasAnalyticsConsent(): boolean {
  return readConsent() === 'granted';
}

export function setAnalyticsConsent(granted: boolean): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'declined');
  } catch {
    // Storage unavailable — the banner will simply ask again next visit.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { granted } }));
  // Start measuring the page the parent is already on; otherwise the first
  // page_view would not arrive until they navigated somewhere else.
  if (granted) trackPageView(window.location.pathname + window.location.search);
}

export function onConsentChange(listener: () => void): () => void {
  window.addEventListener(CONSENT_EVENT, listener);
  return () => window.removeEventListener(CONSENT_EVENT, listener);
}

// ── environment gates ────────────────────────────────────────────────────────

export interface AnalyticsEnv {
  measurementId: string;
  isProd: boolean;
  /** Headless automation — Playwright/puppeteer set `navigator.webdriver`. */
  isHeadless: boolean;
  consented: boolean;
}

export function readAnalyticsEnv(): AnalyticsEnv {
  return {
    measurementId: (import.meta.env.VITE_GA4_MEASUREMENT_ID ?? '').trim(),
    isProd: import.meta.env.PROD,
    isHeadless: typeof navigator !== 'undefined' && navigator.webdriver === true,
    consented: hasAnalyticsConsent(),
  };
}

/**
 * Whether this build may talk to GA at all. Pure so the gates stay testable.
 *
 * - unconfigured build → inert (no fallback measurement id anywhere)
 * - `npm run dev` → never writes into the production property
 * - headless automation → the cross-repo harness and CI drive the real app;
 *   their traffic must not pollute production reports
 * - no parent consent → nothing loads at all
 */
export function shouldTrack(env: AnalyticsEnv): boolean {
  if (!env.measurementId) return false;
  if (!env.isProd) return false;
  if (env.isHeadless) return false;
  if (!env.consented) return false;
  return true;
}

// ── gtag bootstrap ───────────────────────────────────────────────────────────

let isInitialized = false;

function loadGtag(measurementId: string): void {
  if (document.getElementById(GTAG_SCRIPT_ID)) return;

  const script = document.createElement('script');
  script.async = true;
  script.id = GTAG_SCRIPT_ID;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag.js requires the real `arguments` object on the dataLayer; an array
    // built from rest params is silently ignored.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
}

/**
 * Load gtag.js if — and only if — the caller is on the Portal and every gate
 * passes. `path` is required so the surface check can never be skipped by
 * accident.
 */
export function initAnalytics(path: string): boolean {
  if (!isPortalSurface(path)) return false;
  if (isInitialized) return true;
  if (typeof window === 'undefined') return false;

  const env = readAnalyticsEnv();
  if (!shouldTrack(env)) return false;

  loadGtag(env.measurementId);
  window.gtag?.('js', new Date());
  window.gtag?.('config', env.measurementId, {
    // page_view is emitted per route change instead (see startPageTracking).
    send_page_view: false,
  });
  isInitialized = true;
  return true;
}

/** Reset module state. Test-support only — never called by app code. */
export function resetAnalyticsForTests(): void {
  isInitialized = false;
  lastRoute = undefined;
}

// ── hits ─────────────────────────────────────────────────────────────────────

let lastRoute: string | undefined;

export function trackPageView(path: string): void {
  // Re-checked here as well as in initAnalytics: once gtag is loaded on the
  // Portal, a kid route in the same tab (parent hands the laptop over) must
  // still send nothing.
  if (!isPortalSurface(path)) return;
  if (!initAnalytics(path)) return;

  const route = toRoutePattern(path);
  const origin = window.location.origin;
  window.gtag?.('event', 'page_view', {
    page_path: route,
    // Overriding these three is what actually keeps kid/family ids out of GA —
    // gtag would otherwise auto-collect the raw href/referrer/title.
    page_location: `${origin}${route}`,
    page_referrer: lastRoute ? `${origin}${lastRoute}` : '',
    page_title: document.title,
  });
  lastRoute = route;
}

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  const path = window.location.pathname + window.location.search;
  if (!isPortalSurface(path)) return;
  if (!initAnalytics(path)) return;
  window.gtag?.('event', eventName, params ?? {});
}

// ── router wiring ────────────────────────────────────────────────────────────

interface TrackableRouter {
  state: { location: { pathname: string; search: string } };
  subscribe: (fn: (state: { location: { pathname: string; search: string } }) => void) => () => void;
}

/**
 * Fire `onRoute` for the router's current location and once per subsequent
 * location change.
 *
 * `router.subscribe` fires on EVERY state transition — a single navigation goes
 * through loading/submitting states on the same location — so the callback is
 * deduped on the resolved route pattern. Without that, one click would report
 * several page_views.
 */
export function subscribeToRoutes(
  router: TrackableRouter,
  onRoute: (path: string) => void,
): () => void {
  const pathOf = (location: { pathname: string; search: string }) =>
    toRoutePattern(location.pathname + location.search);

  let previous = pathOf(router.state.location);
  onRoute(previous);

  return router.subscribe((state) => {
    const next = pathOf(state.location);
    if (next === previous) return;
    previous = next;
    onRoute(next);
  });
}

/** Wire GA4 page_view reporting to the app router. Call once, at startup. */
export function startPageTracking(router: TrackableRouter): () => void {
  return subscribeToRoutes(router, trackPageView);
}
