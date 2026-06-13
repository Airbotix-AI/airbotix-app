// @vitest-environment jsdom
//
// Regression: the share popup portals into `document.body`, OUTSIDE the
// playground's `data-theme` root. The `--pg-*` design tokens are scoped to
// `[data-theme]`, so without the theme being carried onto the portal the popup
// surface/border render transparent and the text near-invisible (the bug report:
// "the share link popup menu is barely seen"). These tests pin that the portal
// (a) carries the current theme and (b) uses the RAISED surface token, not the
// page-matching backdrop.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShareLinkPanel } from './ShareLinkPanel';
import { usePlaygroundStore } from './playgroundStore';

vi.mock('./sharingApi', () => ({
  getShareLink: vi.fn(() => Promise.resolve({ status: 'none' })),
  requestShareLink: vi.fn(),
  approveShareLink: vi.fn(),
  revokeShareLink: vi.fn(),
}));

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ShareLinkPanel projectId="p1" />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ShareLinkPanel popup theming (portal escapes the data-theme root)', () => {
  it('carries the current theme onto the portal so the --pg-* tokens resolve', async () => {
    act(() => usePlaygroundStore.setState({ theme: 'dark' }));
    renderPanel();

    fireEvent.click(screen.getByTestId('share-link-btn'));

    const dialog = await screen.findByRole('dialog', { name: 'Share link' });
    // Without this the popup renders unthemed (transparent) against document.body.
    expect(dialog.getAttribute('data-theme')).toBe('dark');
  });

  it('uses the RAISED surface token, not the page-matching desktop backdrop', async () => {
    act(() => usePlaygroundStore.setState({ theme: 'dark' }));
    renderPanel();

    fireEvent.click(screen.getByTestId('share-link-btn'));

    const dialog = await screen.findByRole('dialog', { name: 'Share link' });
    expect(dialog.className).toContain('bg-pg-surface');
    expect(dialog.className).not.toContain('bg-pg-desktop');
  });

  it('reflects a theme switch on the portal', async () => {
    act(() => usePlaygroundStore.setState({ theme: 'light' }));
    renderPanel();

    fireEvent.click(screen.getByTestId('share-link-btn'));

    const dialog = await screen.findByRole('dialog', { name: 'Share link' });
    expect(dialog.getAttribute('data-theme')).toBe('light');
  });
});
