import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { useKidWallet, type Wallet } from '@/pages/learn/create/shared/useStudio';
import { mockUseMe, queryOk } from '@/test/mocks';
import { CodeHubPage } from './CodeHubPage';
import { createCodeProject, listProjects } from './codeApi';

const wallet: Wallet = { stars_balance: 20, daily_used: 0, daily_cap: 100, paused: false };

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('@/pages/learn/create/shared/useStudio', () => ({ useKidWallet: vi.fn() }));
vi.mock('./codeApi', async (orig) => ({
  ...(await orig<typeof import('./codeApi')>()),
  createCodeProject: vi.fn(),
  listProjects: vi.fn(),
}));

const mockedCreate = vi.mocked(createCodeProject);
const mockedList = vi.mocked(listProjects);
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
  mockedCreate.mockReset();
  mockedList.mockReset();
  mockUseMe(kid);
  vi.mocked(useKidWallet).mockReturnValue(queryOk(wallet));
});

describe('CodeHubPage', () => {
  it('renders the templates and the empty past-projects state', async () => {
    mockedList.mockResolvedValue([]);
    renderPage(<CodeHubPage />);
    expect(screen.getByRole('button', { name: /My Pet Website/ })).toBeInTheDocument();
    expect(await screen.findByText('Nothing yet')).toBeInTheDocument();
  });

  it('starts a project from a template and navigates into the studio', async () => {
    mockedList.mockResolvedValue([]);
    mockedCreate.mockResolvedValue({ id: 'cp1' });
    renderPage(<CodeHubPage />);

    await userEvent.click(screen.getByRole('button', { name: /My Pet Website/ }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('/learn/code/cp1'));
  });
});
