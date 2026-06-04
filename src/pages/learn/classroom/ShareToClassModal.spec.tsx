import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { mockUseMe } from '@/test/mocks';
import { ShareToClassModal } from './ShareToClassModal';
import { listClasses, shareToClass, type ClassSummary } from './classroomApi';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('./classroomApi', async (orig) => ({
  ...(await orig<typeof import('./classroomApi')>()),
  listClasses: vi.fn(),
  shareToClass: vi.fn(),
}));

const mockedList = vi.mocked(listClasses);
const mockedShare = vi.mocked(shareToClass);
const kid: AuthPrincipal = { kind: 'kid', sub: 'k1', nickname: 'Robo', family_id: 'f1' } as AuthPrincipal;
const aClass: ClassSummary = { id: 'c1', name: 'Room 5', is_live: false };

function renderModal(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  mockedList.mockReset();
  mockedShare.mockReset();
  mockUseMe(kid);
});

describe('ShareToClassModal', () => {
  it('shares the project to the class and shows the sent state', async () => {
    mockedList.mockResolvedValue([aClass]);
    mockedShare.mockResolvedValue(undefined);
    const onShared = vi.fn();
    renderModal(<ShareToClassModal projectId="p1" onClose={() => {}} onShared={onShared} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Send to teacher' }));

    await waitFor(() =>
      expect(mockedShare).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p1', classId: 'c1' })),
    );
    expect(await screen.findByText('Off to your teacher!')).toBeInTheDocument();
    expect(onShared).toHaveBeenCalled();
  });

  it('tells the kid when they are not in any class', async () => {
    mockedList.mockResolvedValue([]);
    renderModal(<ShareToClassModal projectId="p1" onClose={() => {}} />);
    expect(await screen.findByText(/not in a class yet/)).toBeInTheDocument();
  });

  it('closes on Cancel without sharing', async () => {
    mockedList.mockResolvedValue([aClass]);
    const onClose = vi.fn();
    renderModal(<ShareToClassModal projectId="p1" onClose={onClose} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(mockedShare).not.toHaveBeenCalled();
  });
});
