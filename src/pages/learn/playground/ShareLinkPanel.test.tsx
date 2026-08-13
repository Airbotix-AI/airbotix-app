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
import { getShareLink, requestShareLink } from './sharingApi';

vi.mock('./sharingApi', () => ({
  getShareLink: vi.fn(() => Promise.resolve({ status: 'none' })),
  requestShareLink: vi.fn(),
  approveShareLink: vi.fn(),
  revokeShareLink: vi.fn(),
}));

function renderPanel(props: { prepMode?: boolean; kind?: 'game' | 'website' } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ShareLinkPanel projectId="p1" {...props} />
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

// Teacher-prep host (teacher-prep-projects-prd.md D-PREP-6): sharing is immediate
// with no parent-approval gate — the copy drops the kid "grown-up" framing and one
// click mints the live link.
describe('ShareLinkPanel — teacher-prep immediate share (D-PREP-6)', () => {
  it('shows the adult "Create share link" copy, not "ask a grown-up"', async () => {
    renderPanel({ prepMode: true });
    fireEvent.click(screen.getByTestId('share-link-btn'));

    await screen.findByRole('dialog', { name: 'Share link' });
    expect(screen.getByText('Create share link')).toBeTruthy();
    expect(screen.queryByText('Ask my grown-up to share')).toBeNull();
    // The citizenship note drops the kid "real name or photo" framing.
    expect(screen.getByTestId('citizenship-note').textContent).toContain('no sign-in needed');
  });

  it('one click mints an ACTIVE link (backend returns active straight away — no pending beat)', async () => {
    // The prep request path returns `active` directly (no parent approval).
    vi.mocked(requestShareLink).mockResolvedValue({
      status: 'active',
      shareId: 'ps1',
      plays: 0,
    });
    vi.mocked(getShareLink).mockResolvedValue({ status: 'none' });

    renderPanel({ prepMode: true });
    fireEvent.click(screen.getByTestId('share-link-btn'));
    await screen.findByRole('dialog', { name: 'Share link' });

    fireEvent.click(screen.getByText('Create share link'));

    // The live URL appears with no "waiting for grown-up" pending state in between.
    const url = (await screen.findByTestId('share-url')) as HTMLInputElement;
    expect(url.value).toContain('/play/ps1');
    expect(screen.queryByTestId('share-approval-pending')).toBeNull();
    expect(requestShareLink).toHaveBeenCalledWith('p1');
  });
});

// Website sharing (creative-code-studio-website-prd D-WEB-22): the share
// lifecycle is IDENTICAL to a game — only the copy is kind-aware. A website
// says "see your website"; a game keeps "play your game". The request/approve
// machinery is untouched (same requestShareLink call).
describe('ShareLinkPanel — kind-aware copy (D-WEB-22)', () => {
  it('renders for a WEBSITE project with website citizenship copy', async () => {
    renderPanel({ kind: 'website' });
    fireEvent.click(screen.getByTestId('share-link-btn'));

    await screen.findByRole('dialog', { name: 'Share link' });
    const note = screen.getByTestId('citizenship-note').textContent ?? '';
    expect(note).toContain('see your website');
    expect(note).not.toContain('play your game');
    // The share affordance (request flow) is present, unchanged.
    expect(screen.getByText('Ask my grown-up to share')).toBeTruthy();
  });

  it('keeps the GAME copy unchanged (default kind)', async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('share-link-btn'));

    await screen.findByRole('dialog', { name: 'Share link' });
    const note = screen.getByTestId('citizenship-note').textContent ?? '';
    expect(note).toContain('play your game');
    expect(note).not.toContain('website');
  });

  it('a website prep host gets the adult website copy ("see this website")', async () => {
    renderPanel({ kind: 'website', prepMode: true });
    fireEvent.click(screen.getByTestId('share-link-btn'));

    await screen.findByRole('dialog', { name: 'Share link' });
    expect(screen.getByTestId('citizenship-note').textContent).toContain(
      'see this website — no sign-in needed',
    );
  });

  it('the request/approve flow still works for a website (same machinery)', async () => {
    vi.mocked(requestShareLink).mockResolvedValue({ status: 'pending', shareId: 'ws1', plays: 0 });
    vi.mocked(getShareLink).mockResolvedValue({ status: 'none' });

    renderPanel({ kind: 'website' });
    fireEvent.click(screen.getByTestId('share-link-btn'));
    await screen.findByRole('dialog', { name: 'Share link' });

    fireEvent.click(screen.getByText('Ask my grown-up to share'));

    // The pending "waiting for a grown-up" beat appears — identical to a game.
    await screen.findByTestId('share-approval-pending');
    expect(requestShareLink).toHaveBeenCalledWith('p1');
  });
});
