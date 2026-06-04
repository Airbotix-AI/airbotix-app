import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { useLogout } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { mockApiByPath, mockUseMe } from '@/test/mocks';
import { SettingsPage } from './SettingsPage';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn(), useLogout: vi.fn() }));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const parent: AuthPrincipal = { kind: 'user', sub: 'u1', email: 'p@e.com', display_name: 'Sam', role: 'parent', family_id: 'f1' } as AuthPrincipal;

const familyData = {
  id: 'f1',
  name: 'The Smiths',
  code: 'SMITH1',
  region: 'AU',
  city: 'Sydney',
  state: 'NSW',
  postcode: '2000',
  school_name: null,
  preferred_language: 'en',
  marketing_opt_in: false,
  phone: null,
  parent_occupation: null,
  parent_industry: null,
  primary_email: 'p@e.com',
};

function renderPage(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedApi.mockReset();
  mockUseMe(parent);
  vi.mocked(useLogout).mockReturnValue(vi.fn());
});

describe('SettingsPage', () => {
  it('populates the form from the loaded family profile', async () => {
    mockApiByPath(() => familyData);
    renderPage(<SettingsPage />);
    expect(await screen.findByDisplayValue('The Smiths')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sydney')).toBeInTheDocument();
  });
});
