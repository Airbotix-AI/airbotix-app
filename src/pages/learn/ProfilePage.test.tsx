// @vitest-environment jsdom

// Walk-in kids' claim code on the profile (auth-system-prd §5.2): unclaimed
// kids see their code big + copyable; claimed/family kids never see the card.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';

let mePrincipal: AuthPrincipal;
vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: mePrincipal }),
  useLogout: () => vi.fn(),
}));
vi.mock('@/lib/api', () => ({ api: vi.fn().mockResolvedValue([]) }));

import { ProfilePage } from './ProfilePage';

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(cleanup);

describe('ProfilePage kid code', () => {
  it('shows the walk-in kid their claim code, grouped, with copy', async () => {
    mePrincipal = {
      kind: 'kid',
      sub: 'kid_w',
      nickname: 'Zoe',
      family_id: 'fam_eph',
      is_ephemeral: true,
      claim_code: 'ABCDEFGHJ3',
    };
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    mount();

    expect(screen.getByTestId('kid-code-card')).toBeInTheDocument();
    expect(screen.getByTestId('kid-code')).toHaveTextContent('ABCD-EFGH-J3');
    fireEvent.click(screen.getByRole('button', { name: 'Copy my code' }));
    expect(writeText).toHaveBeenCalledWith('ABCD-EFGH-J3');
  });

  it('never shows the card for a claimed / family kid', () => {
    mePrincipal = {
      kind: 'kid',
      sub: 'kid_1',
      nickname: 'Mia',
      family_id: 'fam_1',
      is_ephemeral: false,
    };
    mount();
    expect(screen.queryByTestId('kid-code-card')).not.toBeInTheDocument();
  });
});
