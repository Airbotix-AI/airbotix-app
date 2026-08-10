// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({
  api,
  ApiError: class ApiError extends Error {},
}));
vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'user', family_id: 'fam-1' } }),
}));
vi.mock('./AddCardModal', () => ({ AddCardModal: () => <div>Add card modal</div> }));

import { WalletAutoTopupPage } from './WalletAutoTopupPage';
import type { AutoTopupConfig } from './walletTypes';

const CONFIG: AutoTopupConfig = {
  enabled: false,
  threshold_stars: 500,
  sku: 'family_30',
  payment_method_id: 'pm-1',
  daily_cap_aud_cents: 3000,
  monthly_cap_aud_cents: 10000,
  daily_used_aud_cents: 0,
  monthly_used_aud_cents: 0,
  failure_threshold: 3,
  consecutive_failures: 0,
  cooldown_minutes: 30,
  last_auto_topup_at: null,
};

const METHODS = [
  { id: 'pm-1', brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030, status: 'active', is_default: true },
  { id: 'pm-2', brand: 'mastercard', last4: '4444', exp_month: 8, exp_year: 2031, status: 'active', is_default: false },
];

function wireApi(config = CONFIG) {
  api.mockImplementation((path: string, options?: { method?: string; body?: unknown }) => {
    if (path.endsWith('/wallet/auto-topup') && options?.method === 'PUT') {
      return Promise.resolve({ ...config, ...(options.body as object) });
    }
    if (path.endsWith('/wallet/auto-topup')) {
      return Promise.resolve({
        config,
        recent_attempts: [{ id: 'a-1', status: 'succeeded', amount_aud_cents: 3000, stars_credited: 1750, reason: null, payment_method_label: 'Visa ••4242', created_at: '2026-08-09T00:00:00.000Z' }],
      });
    }
    if (path.endsWith('/payment-methods')) return Promise.resolve(METHODS);
    return Promise.resolve({});
  });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><WalletAutoTopupPage /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => wireApi());
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('WalletAutoTopupPage', () => {
  it('renders the guided setup, exact server contract and attempt history', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Never run out mid-mission' })).toBeInTheDocument();
    expect(screen.getByText('Choose your low-balance trigger')).toBeInTheDocument();
    expect(screen.getByText('Pick the pack to add')).toBeInTheDocument();
    expect(screen.getByText('Choose the exact card to use for automatic charges.')).toBeInTheDocument();
    expect(screen.getByText('Recent auto-topups')).toBeInTheDocument();
    expect(screen.getByText('+1750★')).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('/families/fam-1/wallet/auto-topup');
  });

  it('selects an exact card and sends only supported update fields', async () => {
    renderPage();
    const toggle = await screen.findByRole('switch');
    fireEvent.click(toggle);
    fireEvent.click(screen.getByText('mastercard ••4444'));
    fireEvent.click(screen.getByRole('button', { name: 'Save auto-topup' }));

    await waitFor(() => expect(api).toHaveBeenCalledWith('/families/fam-1/wallet/auto-topup', {
      method: 'PUT',
      body: {
        enabled: true,
        threshold_stars: 500,
        sku: 'family_30',
        payment_method_id: 'pm-2',
        daily_cap_aud_cents: 3000,
        monthly_cap_aud_cents: 10000,
        failure_threshold: 3,
      },
    }));
  });

  it('blocks an enabled setup without a saved card', async () => {
    wireApi({ ...CONFIG, payment_method_id: null });
    renderPage();
    fireEvent.click(await screen.findByRole('switch'));
    expect(screen.getByText('Choose a saved card to finish setup.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save auto-topup' })).toBeDisabled();
  });
});
