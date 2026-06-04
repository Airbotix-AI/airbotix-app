import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { api } from '@/lib/api';
import { mockApiByPath, mockUseMe } from '@/test/mocks';
import { ProjectNewPage } from './ProjectNewPage';

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
const kid: AuthPrincipal = { kind: 'kid', sub: 'k1', nickname: 'Robo', family_id: 'f1' } as AuthPrincipal;

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
  mockUseMe(kid);
});

describe('ProjectNewPage', () => {
  it('creates a project and navigates into it', async () => {
    mockApiByPath(() => ({ id: 'np1' }));
    renderPage(<ProjectNewPage />);

    await userEvent.type(screen.getByLabelText('Give it a name'), 'My amazing story');
    await userEvent.click(screen.getByRole('button', { name: /Make it/ }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        '/projects',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({ title: 'My amazing story', product_line: 'line_a_creative', kid_id: 'k1' }),
        }),
      ),
    );
    expect(navigate).toHaveBeenCalledWith('/learn/projects/np1', { replace: true });
  });

  it('blocks submit when the title is empty', async () => {
    renderPage(<ProjectNewPage />);
    await userEvent.click(screen.getByRole('button', { name: /Make it/ }));
    expect(mockedApi).not.toHaveBeenCalled();
  });
});
