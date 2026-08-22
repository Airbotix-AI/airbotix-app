// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LearnTopBar } from './LearnTopBar';

const logout = vi.fn();

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({
    data: {
      kind: 'kid',
      sub: 'kid-1',
      nickname: 'Mia',
      avatar_id: null,
      family_id: 'family-1',
      is_ephemeral: false,
    },
  }),
  useLogout: () => logout,
}));

vi.mock('@/components/KidAvatar', () => ({
  KidAvatar: () => <div data-testid="kid-avatar" />,
}));

vi.mock('@/pages/learn/playground/playgroundStore', () => ({
  usePlaygroundStore: (selector: (state: { theme: 'light' }) => unknown) =>
    selector({ theme: 'light' }),
}));

vi.mock('@/pages/learn/blocks/blocksTheme', () => ({
  useBlocksTheme: (selector: (state: { theme: 'light' }) => unknown) =>
    selector({ theme: 'light' }),
}));

function mount(path = '/learn') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LearnTopBar />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LearnTopBar', () => {
  it('uses the real Airbotix logo and the 1440px Learn shell', () => {
    const { container } = mount();

    const logo = screen.getByRole('img', { name: 'Airbotix' });
    expect(logo).toHaveAttribute('src', '/logo-black-horizontal.png');
    expect(screen.getByRole('link', { name: 'Airbotix Learn home' })).toHaveAttribute(
      'href',
      '/learn',
    );
    expect(container.querySelector('header > div')).toHaveClass('mx-auto', 'max-w-[1440px]');
  });

  it('keeps the main navigation focused and moves secondary destinations into More', () => {
    mount();

    const primary = screen.getByRole('navigation', { name: 'Learn primary' });
    expect(within(primary).getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(within(primary).getByRole('link', { name: 'AI Studio' })).toBeInTheDocument();
    expect(within(primary).getByRole('link', { name: 'Passport' })).toBeInTheDocument();
    expect(within(primary).queryByRole('link', { name: 'HSC Plan' })).not.toBeInTheDocument();

    fireEvent.click(within(primary).getByRole('button', { name: 'More' }));
    const more = screen.getByRole('navigation', { name: 'More Learn navigation' });
    expect(within(more).getByRole('link', { name: 'HSC Plan' })).toBeInTheDocument();
  });

  it('offers the complete navigation in the tablet and phone menu', () => {
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const mobile = screen.getByRole('navigation', { name: 'Learn mobile' });
    expect(within(mobile).getByRole('link', { name: 'AI Studio' })).toBeInTheDocument();
    expect(within(mobile).getByRole('link', { name: 'Passport' })).toBeInTheDocument();
    expect(within(mobile).getByRole('link', { name: 'HSC Plan' })).toBeInTheDocument();
  });
});
