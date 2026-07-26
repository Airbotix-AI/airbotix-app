// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock('@/lib/api', () => ({
  api,
  ApiError: class ApiError extends Error {},
}));
vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({
    data: {
      kind: 'user',
      sub: 'usr_1',
      email: 'parent@example.com',
      display_name: 'Alex',
      phone: '+61400123123',
      role: 'parent',
      family_id: 'fam_1',
      has_password: false,
    },
  }),
  useLogout: () => vi.fn(),
  setPassword: vi.fn(),
}));
vi.mock('./MobileNumberEditor', () => ({
  MobileNumberEditor: ({ current }: { current: string | null }) => (
    <div data-testid="mobile-editor">{current}</div>
  ),
}));

import { SettingsPage } from './SettingsPage';

function renderPage() {
  api.mockImplementation((path: string) => {
    if (path === '/families/fam_1') {
      return Promise.resolve({
        id: 'fam_1',
        name: 'The Wangs',
        code: 'WANG',
        region: 'AU',
        city: 'Brisbane',
        state: 'QLD',
        postcode: '4000',
        school_name: null,
        preferred_language: 'en',
        marketing_opt_in: false,
        parent_occupation: null,
        parent_industry: null,
        primary_email: 'parent@example.com',
        phone: 'legacy-family-phone-must-be-ignored',
      });
    }
    return Promise.resolve({});
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SettingsPage parent mobile profile', () => {
  it('edits User.phone in the account card and removes the legacy Family.phone input', async () => {
    renderPage();

    expect(screen.getByText('Mobile number')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-editor')).toHaveTextContent('+61400123123');
    expect(screen.queryByText('Phone (optional)')).not.toBeInTheDocument();
    expect(
      screen.queryByDisplayValue('legacy-family-phone-must-be-ignored'),
    ).not.toBeInTheDocument();
    expect(await screen.findByDisplayValue('The Wangs')).toBeInTheDocument();
  });
});
