import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { api } from '@/lib/api';
import { mockApiByPath, mockUseMe } from '@/test/mocks';
import { FamilyNewPage } from './FamilyNewPage';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const parent = (family_id: string | null = 'f1'): AuthPrincipal =>
  ({ kind: 'user', sub: 'u1', email: 'p@e.com', display_name: 'Sam', role: 'parent', family_id }) as AuthPrincipal;

function renderPage(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  navigate.mockReset();
  mockedApi.mockReset();
  mockUseMe(parent());
});

describe('FamilyNewPage', () => {
  it('prompts to set up a family when there is none', () => {
    mockUseMe(parent(null));
    renderPage(<FamilyNewPage />);
    expect(screen.getByText('Set up your family first')).toBeInTheDocument();
  });

  it('adds a kid and returns to the family list', async () => {
    mockApiByPath(() => ({ id: 'k9' }));
    renderPage(<FamilyNewPage />);

    await userEvent.type(screen.getByLabelText('Nickname'), 'Mia');
    await userEvent.type(screen.getByLabelText('Age'), '9');
    await userEvent.type(screen.getByLabelText('4-digit PIN'), '1234');
    await userEvent.click(screen.getByRole('button', { name: /Add kid/ }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        '/families/f1/kids',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({ nickname: 'Mia', age: 9, pin: '1234' }),
        }),
      ),
    );
    expect(navigate).toHaveBeenCalledWith('/portal/family', { replace: true });
  });
});
