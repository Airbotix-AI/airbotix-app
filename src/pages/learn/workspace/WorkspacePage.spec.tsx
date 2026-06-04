import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { api } from '@/lib/api';
import { mockApiByPath, mockUseMe } from '@/test/mocks';
import { WorkspacePage } from './WorkspacePage';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));
// Stub the heavy 3-pane children — this spec exercises WorkspacePage's
// orchestration (session → studio derivation → send), not their internals.
// The `: typeof import('./X')` return annotation makes each stub match the real
// module's exports, so renamed/removed exports break the build. Prop-level drift
// is caught by tsc on WorkspacePage.tsx; child behaviour by ChatPane.spec etc.
vi.mock('./SessionsPane', (): typeof import('./SessionsPane') => ({ SessionsPane: () => <div>SESSIONS</div> }));
vi.mock('./ChatPane', (): typeof import('./ChatPane') => ({ ChatPane: () => <div>CHAT PANE</div> }));
vi.mock('./CodePane', (): typeof import('./CodePane') => ({ CodePane: () => <></> }));
vi.mock('./PreviewPane', (): typeof import('./PreviewPane') => ({ PreviewPane: () => <></> }));
vi.mock('./ImportTrackPicker', (): typeof import('./ImportTrackPicker') => ({ ImportTrackPicker: () => <></> }));
vi.mock('./MusicScorePlayer', (): typeof import('./MusicScorePlayer') => ({ MusicScorePlayer: () => <></> }));
vi.mock('./MusicTrackList', (): typeof import('./MusicTrackList') => ({ MusicTrackList: () => <></> }));
vi.mock('./StudioPicker', (): typeof import('./StudioPicker') => ({ StudioPicker: () => <div>STUDIO PICKER</div> }));
vi.mock('./StudioSetup', (): typeof import('./StudioSetup') => ({ StudioSetup: () => <div>STUDIO SETUP</div> }));

const mockedApi = vi.mocked(api);
const setApi = mockApiByPath;

const kid = { kind: 'kid', sub: 'k1', nickname: 'Robo', family_id: 'f1' } as AuthPrincipal;

function renderWorkspace() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <WorkspacePage />
    </QueryClientProvider>,
  );
}

describe('WorkspacePage', () => {
  beforeEach(() => {
    mockedApi.mockReset();
    mockUseMe(kid);
  });

  it('shows the studio picker when the kid has no sessions', async () => {
    setApi((p) => {
      if (p.includes('/wallet')) return { stars_balance: 100 };
      if (p.includes('/kids/')) return []; // no learning sessions
      return [];
    });
    renderWorkspace();
    expect(await screen.findByText('STUDIO PICKER')).toBeInTheDocument();
  });

  it('auto-selects the most recent session and shows the chat composer', async () => {
    setApi((p) => {
      if (p.includes('/wallet')) return { stars_balance: 100 };
      if (p.includes('/messages')) return [];
      if (p.includes('/kids/')) return [{ id: 's1', studio: 'chat' }];
      return [];
    });
    renderWorkspace();

    expect(await screen.findByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText('CHAT PANE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send/ })).toBeInTheDocument();
  });

  it('sends a chat message to /llm/text-completion', async () => {
    setApi((p) => {
      if (p.includes('/llm/')) return {};
      if (p.includes('/wallet')) return { stars_balance: 100 };
      if (p.includes('/messages')) return [];
      if (p.includes('/kids/')) return [{ id: 's1', studio: 'chat' }];
      return [];
    });
    renderWorkspace();

    const box = await screen.findByRole('textbox');
    await userEvent.type(box, 'hello ai');
    await userEvent.click(screen.getByRole('button', { name: /Send/ }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        '/llm/text-completion',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
