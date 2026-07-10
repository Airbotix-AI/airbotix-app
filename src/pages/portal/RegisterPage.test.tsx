// @vitest-environment jsdom
// Family-setup return-to threading (class-seat-checkout-prd.md D-CSC-8):
// after creating a family the parent lands back on the deep-link `from`
// (e.g. a pay-now checkout page), parents who ARRIVE with a family are
// redirected away, and the mid-creation `me` refetch (family_id flipping to
// non-null before the success screen renders) must NOT hijack the flow —
// the family-code screen stays visible and `from` is honoured.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface MockMe {
  data: {
    kind: string;
    role: string;
    email: string;
    family_id: string | null;
  };
  isLoading: boolean;
}

const { api, refreshAccessToken, me } = vi.hoisted(() => ({
  api: vi.fn(),
  refreshAccessToken: vi.fn(),
  me: {
    data: { kind: 'user', role: 'parent', email: 'parent@example.com', family_id: null },
    isLoading: false,
  } as MockMe,
}));
vi.mock('@/lib/api', () => ({
  api,
  refreshAccessToken,
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public code = 'ERR',
      message = 'err',
    ) {
      super(message);
    }
  },
}));
vi.mock('@/auth/useAuth', () => ({
  useMe: () => me,
  useLogout: () => vi.fn(),
}));
vi.mock('@/auth/authStore', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ tokens: { user: 'access-token' }, bootstrapped: true }),
}));

import { RegisterPage } from './RegisterPage';

const FROM = { pathname: '/portal/checkout/class/class-1', search: '', hash: '' };
const FAMILY = { id: 'fam-1', code: 'MINT', name: 'The Wangs' };

function wireApi(onKidCreate?: () => void) {
  api.mockImplementation((path: string) => {
    if (path === '/families') return Promise.resolve(FAMILY);
    if (path === `/families/${FAMILY.id}/kids`) {
      onKidCreate?.();
      return Promise.resolve({});
    }
    return Promise.resolve({});
  });
  refreshAccessToken.mockResolvedValue(undefined);
}

function renderPage(from?: typeof FROM) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter
        initialEntries={[{ pathname: '/portal/register', state: from ? { from } : undefined }]}
      >
        <Routes>
          <Route path="/portal/register" element={<RegisterPage />} />
          <Route path="/portal" element={<div>PORTAL DASHBOARD</div>} />
          <Route path="/portal/checkout/class/:classId" element={<div>CHECKOUT PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function fill({ consent = true }: { consent?: boolean } = {}) {
  fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Lightman' } });
  fireEvent.change(screen.getByLabelText('Family name'), { target: { value: 'The Wangs' } });
  fireEvent.change(screen.getByLabelText('Nickname'), { target: { value: 'Mia' } });
  fireEvent.change(screen.getByLabelText('Age'), { target: { value: '9' } });
  fireEvent.change(screen.getByLabelText('4-digit PIN'), { target: { value: '1234' } });
  if (consent) {
    fireEvent.click(screen.getByRole('checkbox', { name: /Terms of Service/ }));
  }
}

function fillAndSubmit() {
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Create family →' }));
}

beforeEach(() => {
  me.data = { kind: 'user', role: 'parent', email: 'parent@example.com', family_id: null };
  me.isLoading = false;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RegisterPage', () => {
  it('blocks submission until the legal-consent box is ticked, then sends accept_terms', async () => {
    wireApi();
    renderPage();

    // Submit with everything filled EXCEPT the consent checkbox → client-side block.
    fill({ consent: false });
    fireEvent.click(screen.getByRole('button', { name: 'Create family →' }));
    expect(
      await screen.findByText('You need to agree before we can set up your family.'),
    ).toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith('/families', expect.anything());

    // Tick the box → the POST goes out and records the consent flag.
    fireEvent.click(screen.getByRole('checkbox', { name: /Terms of Service/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Create family →' }));
    expect(await screen.findByText('MINT')).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith(
      '/families',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ accept_terms: true }),
      }),
    );
  });

  it('honours the threaded `from` after family creation (Continue → deep-link)', async () => {
    wireApi();
    renderPage(FROM);

    fillAndSubmit();

    // Success screen with the family code stays reachable…
    expect(await screen.findByText('MINT')).toBeInTheDocument();
    // …and Continue lands back on the deep-link, not the dashboard.
    fireEvent.click(screen.getByRole('button', { name: 'Continue →' }));
    expect(await screen.findByText('CHECKOUT PAGE')).toBeInTheDocument();
  });

  it('redirects a parent who ARRIVES with a family away from the form', async () => {
    wireApi();
    me.data = { ...me.data, family_id: 'fam-1' };
    renderPage();

    expect(await screen.findByText('PORTAL DASHBOARD')).toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith('/families', expect.anything());
  });

  it('does not redirect mid-creation when the `me` refetch flips family_id', async () => {
    // Simulate the race: by the time the success screen renders, `me` already
    // carries the new family_id (the invalidated query refetched).
    wireApi(() => {
      me.data = { ...me.data, family_id: FAMILY.id };
    });
    renderPage(FROM);

    fillAndSubmit();

    // The success screen must survive (no hard-nav to /portal)…
    expect(await screen.findByText('MINT')).toBeInTheDocument();
    expect(screen.queryByText('PORTAL DASHBOARD')).not.toBeInTheDocument();
    // …and `from` is still honoured on Continue.
    fireEvent.click(screen.getByRole('button', { name: 'Continue →' }));
    expect(await screen.findByText('CHECKOUT PAGE')).toBeInTheDocument();
  });
});
