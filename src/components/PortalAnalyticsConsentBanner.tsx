import { useEffect, useState } from 'react';

import { onConsentChange, readConsent, setAnalyticsConsent } from '@/lib/analytics';
import { marketingHref } from '@/lib/marketing';

/**
 * Opt-in prompt for Portal analytics.
 *
 * Rendered by PortalLayout only, so it can never appear on a kid surface — and
 * nothing is loaded from Google until a parent presses Allow (see analytics.ts).
 * Both answers are sticky: the banner disappears once a choice is stored.
 */
export function PortalAnalyticsConsentBanner() {
  const [choice, setChoice] = useState(() => readConsent());

  // Keep every mounted instance in sync — and re-render this one — when the
  // choice is made in another tab-local component.
  useEffect(() => onConsentChange(() => setChoice(readConsent())), []);

  if (choice) return null;

  // Sits at the top of the Portal content, like IncidentBanner: the mobile nav
  // is fixed to the bottom of the viewport, so a bottom-anchored bar would end
  // up underneath it on small screens.
  return (
    <div
      role="region"
      aria-label="Analytics choice"
      className="border-b-2 border-brand-sky/30 bg-wash-sky px-6 py-3"
      data-testid="portal-analytics-consent"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
        <span className="sticker-sky shrink-0">Privacy</span>
        <p className="min-w-0 flex-1 text-[13px] text-ink">
          Can we measure which Portal pages parents use? Aggregate page views only — never your
          child&apos;s activity, and never their name or account.{' '}
          <a
            href={marketingHref('/privacy')}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-sky underline"
          >
            Privacy Policy
          </a>
        </p>
        <button
          type="button"
          onClick={() => setAnalyticsConsent(false)}
          className="shrink-0 rounded-full px-4 py-1 text-[13px] font-semibold text-ink-soft hover:bg-brand-sky/10"
        >
          No thanks
        </button>
        <button type="button" onClick={() => setAnalyticsConsent(true)} className="btn-pill-secondary shrink-0">
          Allow
        </button>
      </div>
    </div>
  );
}
