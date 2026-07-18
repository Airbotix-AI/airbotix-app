// @vitest-environment jsdom
//
// Teacher-prep host (teacher-prep-projects-prd.md D-PREP-6): Story Blocks sharing is
// immediate for a prep project — the owner is an adult teacher, so there is no
// parent-approval gate. The copy drops the kid "ask a grown-up" framing and one
// click mints the live link (the backend returns `active` straight from request).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BlocksSharePanel } from './BlocksSharePanel';
import { getShareLink, requestShareLink } from '../playground/sharingApi';

vi.mock('../playground/sharingApi', () => ({
  getShareLink: vi.fn(() => Promise.resolve({ status: 'none' })),
  requestShareLink: vi.fn(),
  approveShareLink: vi.fn(),
  revokeShareLink: vi.fn(),
}));

function renderPanel(props: { prepMode?: boolean } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BlocksSharePanel projectId="p1" theme="light" {...props} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('BlocksSharePanel — teacher-prep immediate share (D-PREP-6)', () => {
  it('shows the adult "Create share link" copy, not "ask a grown-up"', async () => {
    renderPanel({ prepMode: true });
    fireEvent.click(screen.getByTestId('share-link-btn'));

    await screen.findByTestId('share-panel');
    expect(screen.getByText('Create share link')).toBeTruthy();
    expect(screen.queryByText('Ask my grown-up to share')).toBeNull();
    expect(screen.getByTestId('citizenship-note').textContent).toContain('no sign-in needed');
  });

  it('one click mints an ACTIVE link (no pending beat)', async () => {
    vi.mocked(requestShareLink).mockResolvedValue({ status: 'active', shareId: 'ps1', plays: 0 });
    vi.mocked(getShareLink).mockResolvedValue({ status: 'none' });

    renderPanel({ prepMode: true });
    fireEvent.click(screen.getByTestId('share-link-btn'));
    await screen.findByTestId('share-panel');

    fireEvent.click(screen.getByText('Create share link'));

    const url = (await screen.findByTestId('share-url')) as HTMLInputElement;
    expect(url.value).toContain('/play/ps1');
    expect(screen.queryByTestId('share-approval-pending')).toBeNull();
    expect(requestShareLink).toHaveBeenCalledWith('p1');
  });

  it('a KID project keeps the parent-approval copy (unchanged)', async () => {
    renderPanel({ prepMode: false });
    fireEvent.click(screen.getByTestId('share-link-btn'));

    await screen.findByTestId('share-panel');
    expect(screen.getByText('Ask my grown-up to share')).toBeTruthy();
    expect(screen.queryByText('Create share link')).toBeNull();
  });
});
