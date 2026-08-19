// @vitest-environment jsdom
// Parent referral card (affiliate-partner-program-prd.md §10, §11.2).

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({ api }));

import { ReferralCard } from './ReferralCard';

function renderCard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ReferralCard />
    </QueryClientProvider>,
  );
}

const ELIGIBLE_WITH_CODE = {
  eligible: true,
  code: 'BCDF2345',
  share_url: 'https://airbotix.ai/?ref=BCDF2345',
  referred_count: 3,
  qualified_count: 1,
  credit_balance_aud_cents: 5000,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ReferralCard', () => {
  it('tells a family that has not booked yet why they have no code', async () => {
    // A blank panel reads as broken; a reason is something a parent can act on.
    api.mockResolvedValue({
      eligible: false,
      reason: 'no_purchase_yet',
      code: null,
      share_url: null,
      referred_count: 0,
      qualified_count: 0,
      credit_balance_aud_cents: 0,
    });
    renderCard();
    expect(await screen.findByText(/booked your first class/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Get my referral code/ })).not.toBeInTheDocument();
  });

  it('offers to mint a code for an eligible family that has none', async () => {
    api.mockResolvedValue({
      eligible: true,
      code: null,
      share_url: null,
      referred_count: 0,
      qualified_count: 0,
      credit_balance_aud_cents: 0,
    });
    renderCard();
    expect(
      await screen.findByRole('button', { name: /Get my referral code/ }),
    ).toBeInTheDocument();
  });

  it('mints the code and refreshes', async () => {
    api.mockImplementation((path: string, init?: { method?: string }) => {
      if (path === '/me/referral/code' && init?.method === 'POST') {
        return Promise.resolve({ code: 'BCDF2345', share_url: 'https://airbotix.ai/?ref=BCDF2345' });
      }
      return Promise.resolve({
        eligible: true,
        code: null,
        share_url: null,
        referred_count: 0,
        qualified_count: 0,
        credit_balance_aud_cents: 0,
      });
    });
    renderCard();
    const btn = await screen.findByRole('button', { name: /Get my referral code/ });
    await act(async () => {
      fireEvent.click(btn);
    });
    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/me/referral/code', { method: 'POST' });
    });
  });

  it('shows the code, the counts and the credit balance', async () => {
    api.mockResolvedValue(ELIGIBLE_WITH_CODE);
    renderCard();
    expect(await screen.findByText('BCDF2345')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('A$50')).toBeInTheDocument();
  });

  it('copies the share link, not the bare code', async () => {
    // The code alone makes a friend hunt for where to type it.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    api.mockResolvedValue(ELIGIBLE_WITH_CODE);
    renderCard();
    const btn = await screen.findByRole('button', { name: /Copy link/ });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(writeText).toHaveBeenCalledWith('https://airbotix.ai/?ref=BCDF2345');
    expect(await screen.findByRole('button', { name: /Copied/ })).toBeInTheDocument();
  });

  it('survives a blocked clipboard without breaking the card', async () => {
    // Clipboard access is permission-gated and refused outright in some
    // embedded browsers; the link is on screen and selectable either way.
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    api.mockResolvedValue(ELIGIBLE_WITH_CODE);
    renderCard();
    const btn = await screen.findByRole('button', { name: /Copy link/ });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(screen.getByText('BCDF2345')).toBeInTheDocument();
  });

  it('renders nothing when the read fails, rather than a broken panel', async () => {
    api.mockRejectedValue(new Error('boom'));
    const { container } = renderCard();
    await waitFor(() => {
      expect(container.querySelector('[data-testid="referral-card"]')).toBeNull();
    });
  });

  it('mentions the credit only when there is some', async () => {
    api.mockResolvedValue({ ...ELIGIBLE_WITH_CODE, credit_balance_aud_cents: 0 });
    renderCard();
    await screen.findByText('BCDF2345');
    expect(screen.queryByText(/comes off automatically/i)).not.toBeInTheDocument();
  });

  describe('credit expiry', () => {
    const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

    it('names the SOONEST deadline, not the furthest', async () => {
      // Showing the latest date buries the one that is about to pass.
      api.mockImplementation((path: string) => {
        if (path === '/me/tuition-credit') {
          return Promise.resolve({
            balance_aud_cents: 5000,
            entries: [
              { id: 'a', type: 'referral_grant', delta_aud_cents: 5000, expires_at: inDays(300) },
              { id: 'b', type: 'referee_discount', delta_aud_cents: 2500, expires_at: inDays(30) },
            ],
          });
        }
        return Promise.resolve(ELIGIBLE_WITH_CODE);
      });
      renderCard();
      const soon = new Date(inDays(30)).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      expect(await screen.findByText(new RegExp(`Use it by ${soon}`))).toBeInTheDocument();
    });

    it('ignores spends and already-lapsed grants', async () => {
      api.mockImplementation((path: string) => {
        if (path === '/me/tuition-credit') {
          return Promise.resolve({
            balance_aud_cents: 5000,
            entries: [
              { id: 'a', type: 'redeem', delta_aud_cents: -2500, expires_at: inDays(10) },
              { id: 'b', type: 'referral_grant', delta_aud_cents: 5000, expires_at: inDays(-5) },
            ],
          });
        }
        return Promise.resolve(ELIGIBLE_WITH_CODE);
      });
      renderCard();
      await screen.findByText('BCDF2345');
      await waitFor(() => {
        expect(screen.queryByText(/Use it by/)).not.toBeInTheDocument();
      });
    });

    it('does not ask for a statement when there is no credit', async () => {
      // A second request that can only ever say "nothing" is a request not
      // worth making.
      api.mockResolvedValue({ ...ELIGIBLE_WITH_CODE, credit_balance_aud_cents: 0 });
      renderCard();
      await screen.findByText('BCDF2345');
      await waitFor(() => {
        expect(api).not.toHaveBeenCalledWith('/me/tuition-credit');
      });
    });
  });
});
