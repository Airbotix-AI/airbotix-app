import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { createCodeProject } from '@/pages/learn/code/codeApi';
import { mockUseMe } from '@/test/mocks';
import { MissionCodeStep } from './MissionCodeStep';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('@/pages/learn/code/codeApi', async (orig) => ({
  ...(await orig<typeof import('@/pages/learn/code/codeApi')>()),
  createCodeProject: vi.fn(),
  submitMission: vi.fn(),
}));
vi.mock('@/pages/learn/code/CodeStudioPage', () => ({
  EmbeddedCodeStudio: () => <div>EMBEDDED STUDIO</div>,
}));

const mockedCreate = vi.mocked(createCodeProject);
const kid: AuthPrincipal = { kind: 'kid', sub: 'k1', nickname: 'Robo', family_id: 'f1' } as AuthPrincipal;

function renderStep(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  mockedCreate.mockReset();
  mockUseMe(kid);
});

describe('MissionCodeStep', () => {
  it('starts a mission code project when the kid taps Start coding', async () => {
    mockedCreate.mockResolvedValue({ id: 'cp1' } as never);
    renderStep(<MissionCodeStep missionId="m1" missionTitle="Pet Site" onComplete={() => {}} />);

    expect(screen.getByText('Build it with code')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Start coding/ }));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ missionId: 'm1', title: 'Pet Site', template: 'blank' }),
      ),
    );
  });
});
