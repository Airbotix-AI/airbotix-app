// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PortalAnalyticsConsentBanner } from './PortalAnalyticsConsentBanner';

const CONSENT_KEY = 'airbotix.portal.analytics-consent';

describe('PortalAnalyticsConsentBanner', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(cleanup);

  it('asks the parent while the choice is undecided', () => {
    render(<PortalAnalyticsConsentBanner />);

    expect(screen.getByTestId('portal-analytics-consent')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Allow' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No thanks' })).toBeInTheDocument();
  });

  it('links to the published privacy policy', () => {
    render(<PortalAnalyticsConsentBanner />);

    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      expect.stringContaining('/privacy'),
    );
  });

  it('stores consent and dismisses itself on Allow', () => {
    render(<PortalAnalyticsConsentBanner />);

    fireEvent.click(screen.getByRole('button', { name: 'Allow' }));

    expect(window.localStorage.getItem(CONSENT_KEY)).toBe('granted');
    expect(screen.queryByTestId('portal-analytics-consent')).not.toBeInTheDocument();
  });

  it('stores a refusal and dismisses itself on No thanks', () => {
    render(<PortalAnalyticsConsentBanner />);

    fireEvent.click(screen.getByRole('button', { name: 'No thanks' }));

    expect(window.localStorage.getItem(CONSENT_KEY)).toBe('declined');
    expect(screen.queryByTestId('portal-analytics-consent')).not.toBeInTheDocument();
  });

  it('stays hidden once the parent has already answered', () => {
    // Sticky both ways: a parent who declined must not be asked on every visit.
    window.localStorage.setItem(CONSENT_KEY, 'declined');

    render(<PortalAnalyticsConsentBanner />);

    expect(screen.queryByTestId('portal-analytics-consent')).not.toBeInTheDocument();
  });
});
