import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { mockUseMe } from '@/test/mocks';
import { ClassroomListPage } from './ClassroomListPage';
import { listClasses } from './classroomApi';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('./classroomApi', async (orig) => ({
  ...(await orig<typeof import('./classroomApi')>()),
  listClasses: vi.fn(),
}));

const mockedListClasses = vi.mocked(listClasses);
const kid: AuthPrincipal = { kind: 'kid', sub: 'k1', nickname: 'Robo', family_id: 'f1' } as AuthPrincipal;

const classSummary = {
  id: 'c1',
  name: 'Room 5',
  term: 'T1',
  is_live: false,
  teacher_name: 'Ms. Lee',
  classmate_count: 12,
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
  mockedListClasses.mockReset();
  mockUseMe(kid);
});

describe('ClassroomListPage', () => {
  it('lists the kid’s classes', async () => {
    mockedListClasses.mockResolvedValue([classSummary] as never);
    renderPage(<ClassroomListPage />);
    expect(await screen.findByText(/Room 5/)).toBeInTheDocument();
    expect(screen.getByText(/Ms\. Lee/)).toBeInTheDocument();
  });

  it('shows the no-class state when the kid is in no class', async () => {
    mockedListClasses.mockResolvedValue([] as never);
    renderPage(<ClassroomListPage />);
    expect(await screen.findByText('No class yet')).toBeInTheDocument();
  });
});
