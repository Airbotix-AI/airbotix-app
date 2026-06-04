import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryOk } from '@/test/mocks';
import { CreateHubPage } from './CreateHubPage';
import { useKidWallet, type Wallet } from './shared/useStudio';

vi.mock('./shared/useStudio', () => ({ useKidWallet: vi.fn() }));
const mockedUseKidWallet = vi.mocked(useKidWallet);
const wallet: Wallet = { stars_balance: 42, daily_used: 0, daily_cap: 100, paused: false };

beforeEach(() => {
  mockedUseKidWallet.mockReturnValue(queryOk(wallet));
});

describe('CreateHubPage', () => {
  it('renders a card per studio and the kid’s Stars balance', () => {
    render(
      <MemoryRouter>
        <CreateHubPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Image Maker/ })).toHaveAttribute('href', '/learn/create/image');
    expect(screen.getByRole('link', { name: /Music Maker/ })).toHaveAttribute('href', '/learn/create/music');
    expect(screen.getByRole('link', { name: /Code Studio/ })).toHaveAttribute('href', '/learn/create/code');
    expect(screen.getByText('42★')).toBeInTheDocument();
  });
});
